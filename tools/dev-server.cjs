// Local verification only. No deployment credentials; generated test state lives in memory.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),context=vm.createContext({console});
for(const name of fs.readdirSync(path.join(root,'server')).filter(n=>n.endsWith('.gs')&&!['Code.gs','Storage.gs'].includes(n)))vm.runInContext(fs.readFileSync(path.join(root,'server',name),'utf8'),context);
const localAdminSecret=crypto.randomBytes(24).toString('base64url');
const secret=crypto.randomBytes(32).toString('hex'),env={now:()=>Date.now(),id:()=>crypto.randomUUID(),hash:s=>crypto.createHash('sha256').update(s).digest('hex'),sign:s=>crypto.createHmac('sha256',secret).update(s).digest('hex'),isAdmin:n=>n==='테스트운영자',adminCheck:s=>s===localAdminSecret};
let state=context.King.initial(Date.now());context.King.initFunds(state);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{try{
const url=new URL(req.url,'http://127.0.0.1:4173');
if(url.pathname==='/api'){
 let request={action:'status',version:1};if(req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>600000)throw new Error('Too large');}request=JSON.parse(body);}
 try{const result=context.King.execute(state,request,env);state=result.state;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({service:'stock-king',version:1,...result.response}));}catch(error){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'REQUEST_FAILED',message:error.message}));}return;
}
if(url.pathname==='/js/config.js'){res.setHeader('Content-Type','text/javascript');res.end("export const VERSION='0.1.7-local'; export const API_URL='/api';");return;}
const relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,relative||'index.html');if(!file.startsWith(root+path.sep)||relative.startsWith('.')||/^(server|tests|tools)\//.test(relative)){res.writeHead(403);res.end();return;}
if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
res.setHeader('Content-Type',types[path.extname(file)]||'text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
}catch(error){res.writeHead(500);res.end('Local test error');}}).listen(4173,'127.0.0.1',()=>{console.log('Local verification: http://127.0.0.1:4173 (memory only)');console.log('Temporary local admin secret: '+localAdminSecret);});
