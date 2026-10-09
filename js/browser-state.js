// Account/run-scoped convenience data. Never use this cache to authorize a trade.
export function mergeRecordPage(cached,result,refresh=false){
 const previous=cached?.records||[],entries=refresh?[...result.records,...previous]:[...previous,...result.records];
 return {records:[...new Map(entries.map(r=>[r.id,r])).values()].sort((a,b)=>b.at-a.at),next:result.next};
}
export class BrowserCache {
 constructor(storage){this.storage=storage;this.memory=new Map();}
 key(owner,name){return 'king-cache-v1:'+encodeURIComponent(owner)+':'+encodeURIComponent(name);}
 read(owner,name){if(!owner)return null;const key=this.key(owner,name);try{const value=this.memory.get(key)||JSON.parse(this.storage?.getItem(key)||'null');return value?structuredClone(value.data):null;}catch{return null;}}
 write(owner,name,data){if(!owner)return;const key=this.key(owner,name),value={at:Date.now(),data};this.memory.set(key,structuredClone(value));try{const encoded=JSON.stringify(value);try{this.storage?.setItem(key,encoded);}catch(error){
   if(name!=='outbox')throw error;
   // Disposable history must not crowd out unsent read markers/preferences.
   // Never evict credentials, another feature's storage, or any account's outbox.
   const candidates=[];for(let i=0;i<this.storage.length;i++){const candidate=this.storage.key(i);if(candidate?.startsWith('king-cache-v1:')&&!candidate.endsWith(':outbox')){let at=0;try{at=JSON.parse(this.storage.getItem(candidate)).at||0;}catch{}candidates.push({key:candidate,at});}}
   candidates.sort((a,b)=>a.at-b.at);for(const candidate of candidates){this.storage.removeItem(candidate.key);try{this.storage.setItem(key,encoded);return;}catch{}}
  }}catch{/* Memory remains usable when storage is full or blocked. */}}
 clear(owner){const prefix=this.key(owner,'');for(const key of this.memory.keys())if(key.startsWith(prefix))this.memory.delete(key);try{for(let i=this.storage.length-1;i>=0;i--){const key=this.storage.key(i);if(key?.startsWith(prefix))this.storage.removeItem(key);}}catch{}}
}

// Durable, idempotent preferences/read markers only; no balances, orders or credentials.
export class DurableActions {
 constructor({cache,owner,context,send,changed,confirmed}){Object.assign(this,{cache,owner,context,send,changed,confirmed});this.running=false;this.timer=null;}
 read(){return this.cache.read(this.owner(),'outbox')||[];}
 enqueue(action,data){if(!['settings','readAlerts'].includes(action))throw new Error('Unsupported durable action');const queue=this.read(),last=queue.at(-1);if(action==='settings'&&last?.action===action&&last.data.runId===data.runId&&last.data.requestId!==this.activeId){last.data={...data,settings:{...last.data.settings,...data.settings}};}else queue.push({action,data});this.cache.write(this.owner(),'outbox',queue);this.changed();void this.drain();}
 project(snapshot,owner=this.owner()){const copy=structuredClone(snapshot);for(const op of this.cache.read(owner,'outbox')||[]){
  if(op.data.runId!==copy.account.runId)continue;
  if(op.action==='settings')Object.assign(copy.account.settings,op.data.settings);
  if(op.action==='readAlerts')copy.readAlerts=[...new Set([...(copy.readAlerts||[]),...op.data.ids])];
 }return copy;}
 async drain(){
  if(this.running||!this.owner())return;clearTimeout(this.timer);this.running=true;const owner=this.owner(),context=this.context();
  try{while(owner===this.owner()&&context===this.context()){
   const queue=this.read(),op=queue[0];if(!op)break;
   this.activeId=op.data.requestId;let result;try{result=await this.send(op.action,op.data,true);}catch{break;}
   if(owner!==this.owner()||context!==this.context())break;
   // Read again: another local edit may have been queued while this request ran.
   const latest=this.read();this.cache.write(owner,'outbox',latest.filter(x=>x.data.requestId!==op.data.requestId));
   if(result.snapshot)this.confirmed(result.snapshot);else this.changed();
  }}finally{this.activeId=null;this.running=false;if(this.owner()&&this.read().length){this.timer=setTimeout(()=>void this.drain(),10000);this.timer.unref?.();}}
 }
}
