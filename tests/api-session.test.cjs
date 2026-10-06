const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('logging out an old tab preserves a newer remembered session',()=>{
 const storage=()=>{const entries=new Map();return {getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};};
 const localStorage=storage(),sessionStorage=storage(),key='stock-king-session';localStorage.setItem(key,'old');
 const source=fs.readFileSync('js/api.js','utf8').replace(/import[^\n]+\n/,'').replace('export const api =','globalThis.api =');
 const ctx=vm.createContext({localStorage,sessionStorage});vm.runInContext(source,ctx);
 localStorage.setItem(key,'new');ctx.api.clear();assert.equal(localStorage.getItem(key),'new');assert.equal(ctx.api.token,'');
 sessionStorage.setItem(key,'stale');ctx.api.save('latest',false);assert.equal(sessionStorage.getItem(key),'latest');assert.equal(localStorage.getItem(key),null);
 ctx.api.clear();assert.equal(sessionStorage.getItem(key),null);
});
