const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function engine(){const ctx=vm.createContext({console});for(const f of fs.readdirSync('server').filter(f=>f.endsWith('.gs')&&!['Code.gs','Storage.gs'].includes(f)))vm.runInContext(fs.readFileSync('server/'+f,'utf8'),ctx,{filename:f});return ctx.King;}
function harness(){const K=engine();let now=Date.parse('2026-09-26T14:59:00Z');let n=0;const env={now:()=>now,id:()=>`id-${++n}-abcdefghijk`,hash:s=>crypto.createHash('sha256').update(s).digest('hex'),sign:s=>crypto.createHmac('sha256','test-only').update(s).digest('hex'),isAdmin:name=>name==='운영자',adminCheck:s=>s==='test-only-admin'};let state=K.initial(now);function call(action,data={}){const out=K.execute(state,{action,version:1,...data},env);state=out.state;return out.response;}return {K,call,env,get s(){return state;},get now(){return now;},time:n=>now=n,advance:ms=>now+=ms};}
function signup(h,name='투자자'){return h.call('signup',{name,pin:'0123',consent:true,requestId:'signup-'+name,remember:true});}

module.exports={harness,signup};
