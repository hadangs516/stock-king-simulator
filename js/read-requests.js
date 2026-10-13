export class CoalescedReads {
 constructor(){this.pending=new Map();}
 run(key,read){
  if(this.pending.has(key))return this.pending.get(key);
  const pending=Promise.resolve(read()).finally(()=>{if(this.pending.get(key)===pending)this.pending.delete(key);});
  this.pending.set(key,pending);return pending;
 }
}
