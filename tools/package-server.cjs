// Optional installation convenience. The static frontend never needs a build.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const out=path.resolve(process.argv[2]||path.join(root,'..','배포자료'));
fs.mkdirSync(out,{recursive:true});
const files=fs.readdirSync(path.join(root,'server')).filter(f=>f.endsWith('.gs')).sort();
const code='// 주식왕 시뮬레이션 '+version+' — 아래 전체 내용을 Apps Script Code.gs에 붙여넣으세요.\n'+files.map(f=>'\n// ===== '+f+' =====\n'+fs.readFileSync(path.join(root,'server',f),'utf8')).join('\n');
new vm.Script(code,{filename:'Code.gs'});
fs.writeFileSync(path.join(out,'주식왕_서버_'+version+'.gs'),code);
fs.copyFileSync(path.join(root,'server','appsscript.json'),path.join(out,'appsscript.json'));
fs.copyFileSync(path.join(root,'docs','DEPLOYMENT.md'),path.join(out,'설치순서.md'));
console.log('Installation bundle ('+files.length+' scripts): '+out);
