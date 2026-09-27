const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let count=0;
for(const name of fs.readdirSync('server').filter(n=>n.endsWith('.gs'))){new vm.Script(fs.readFileSync('server/'+name,'utf8'),{filename:name});count++;}
for(const name of ['package.json','manifest.webmanifest','server/appsscript.json'])JSON.parse(fs.readFileSync(name,'utf8').replace(/^\uFEFF/,''));
const html=fs.readFileSync('index.html','utf8');for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)){if(!fs.existsSync(match[1]))throw new Error('Missing file '+match[1]);}
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));for(const icon of manifest.icons)if(!fs.existsSync(icon.src))throw new Error('Missing icon '+icon.src);
for(const name of fs.readdirSync('js')){execFileSync(process.execPath,['--check','js/'+name]);const code=fs.readFileSync('js/'+name,'utf8');for(const match of code.matchAll(/from ['"](\.\/[^'"]+)['"]/g))if(!fs.existsSync(path.join('js',match[1])))throw new Error('Missing module '+match[1]);}
execFileSync(process.execPath,['--check','sw.js']);
console.log(`Syntax and static references checked: ${count} server files, manifest, HTML and JS imports.`);
