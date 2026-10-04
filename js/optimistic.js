// Only reversible preferences and read markers belong here. Never money or orders.
export class OptimisticActions {
 constructor(hooks){this.hooks=hooks;this.queue=[];this.running=false;}
 project(snapshot){
  const copy=structuredClone(snapshot),context=this.hooks.context();
  for(const op of this.queue)if(op.context===context)op.patch(copy);
  return copy;
 }
 enqueue(action,data,patch){
  if(!['settings','readNews','tutorial'].includes(action))throw new Error('즉시 반영할 수 없는 요청입니다.');
  this.queue.push({action,data,patch,context:this.hooks.context()});this.hooks.changed();void this.drain();
 }
 async drain(){
  if(this.running)return;this.running=true;
  try{while(this.queue.length){
   const op=this.queue[0];
   if(op.context!==this.hooks.context()){this.queue.shift();continue;}
   let response,error;
   for(let attempt=0;attempt<2;attempt++){
    try{response=await this.hooks.send(op.action,op.data);break;}catch(e){error=e;if(e.definitive||op.context!==this.hooks.context())break;}
   }
   this.queue.shift();
   if(op.context!==this.hooks.context())continue;
   if(response)this.hooks.confirmed(response.snapshot);
   else {this.hooks.changed();this.hooks.failed(error);}
  }}finally{this.running=false;}
 }
}
