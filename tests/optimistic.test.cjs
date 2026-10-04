const {test}=require('node:test'),assert=require('node:assert/strict');
test('preferences show immediately, keep newest pending edit, then reconcile server state',async()=>{
 const {OptimisticActions}=await import('../js/optimistic.js');let resolve,base={account:{settings:{bgm:0}}},display,context='a';
 const sends=[];const q=new OptimisticActions({context:()=>context,send:(a,d)=>{sends.push(d);return new Promise(r=>resolve=r);},changed:()=>display=q.project(base),confirmed:s=>{base=s;display=q.project(base);},failed:()=>{}});
 q.enqueue('settings',{requestId:'first'},s=>s.account.settings.bgm=.2);assert.equal(display.account.settings.bgm,.2);
 q.enqueue('settings',{requestId:'second'},s=>s.account.settings.bgm=.8);
 resolve({snapshot:{account:{settings:{bgm:.2}}}});await new Promise(r=>setImmediate(r));assert.equal(display.account.settings.bgm,.8);
 resolve({snapshot:{account:{settings:{bgm:.75}}}});await new Promise(r=>setImmediate(r));assert.equal(display.account.settings.bgm,.75);
 assert.equal(sends.length,2);assert.throws(()=>q.enqueue('trade',{},()=>{}),/즉시/);
});
test('definitive rejection rolls back while ambiguous retry uses the same request id',async()=>{
 const {OptimisticActions}=await import('../js/optimistic.js');let calls=0,ids=[],base={value:1},display,failures=0;
 const q=new OptimisticActions({context:()=>1,send:async(a,d)=>{ids.push(d.requestId);calls++;throw Object.assign(new Error('failed'),{definitive:calls===2});},changed:()=>display=q.project(base),confirmed:()=>{},failed:()=>failures++});
 q.enqueue('settings',{requestId:'same-id'},s=>s.value=2);assert.equal(display.value,2);
 await new Promise(r=>setImmediate(r));assert.deepEqual(ids,['same-id','same-id']);assert.equal(display.value,1);assert.equal(failures,1);
});
test('late preference result cannot overwrite a different account',async()=>{
 const {OptimisticActions}=await import('../js/optimistic.js');let context='a',resolve,applied=0;
 const q=new OptimisticActions({context:()=>context,send:()=>new Promise(r=>resolve=r),changed:()=>{},confirmed:()=>applied++,failed:()=>{}});
 q.enqueue('settings',{},s=>s.value=2);context='b';assert.equal(q.project({value:9}).value,9);resolve({snapshot:{value:2}});await new Promise(r=>setImmediate(r));assert.equal(applied,0);
});
