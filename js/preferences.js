const defaults={bgm:0,sfx:.3,terms:true};
function clean(value={}){
 const out={};for(const k of ['bgm','sfx'])if(typeof value[k]==='number'&&Number.isFinite(value[k]))out[k]=Math.max(0,Math.min(1,value[k]));
 if(typeof value.terms==='boolean')out.terms=value.terms;return out;
}
export class BrowserPreferences {
 constructor(storage){this.storage=storage;this.memory=new Map();}
 key(id){return 'king-preferences-'+id;}
 read(id,legacy={}){
  if(!this.memory.has(id)){let saved={};try{saved=clean(JSON.parse(this.storage?.getItem(this.key(id))||'{}')||{});}catch{}
   this.memory.set(id,{...defaults,...clean(legacy),...saved});
  }
  return {...this.memory.get(id),animation:true};
 }
 write(id,patch,legacy={}){const value={...this.read(id,legacy),...clean(patch)};delete value.animation;this.memory.set(id,value);try{this.storage?.setItem(this.key(id),JSON.stringify(value));}catch{}return {...value,animation:true};}
 remove(id){this.memory.delete(id);try{this.storage?.removeItem(this.key(id));}catch{}}
}
