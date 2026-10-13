const {test}=require('node:test'),assert=require('node:assert/strict');
test('inactive drafts are disabled for native validation and return intact on reselection',async()=>{
 const {syncConditionalFields}=await import('../js/conditional-fields.js');
 const selector={value:'cash'},inputs=[{dataset:{},disabled:false,value:'0'},{dataset:{},disabled:true,value:'reserved'}];
 const form={elements:{namedItem:()=>selector}},group={dataset:{dependsOn:'kind',values:'security|badge'},closest:()=>form,querySelectorAll:()=>inputs};
 const root={querySelectorAll:()=>[group]};syncConditionalFields(root);assert.equal(group.hidden,true);assert.ok(inputs.every(i=>i.disabled));
 selector.value='security';syncConditionalFields(root);assert.equal(group.hidden,false);assert.equal(inputs[0].disabled,false);assert.equal(inputs[0].value,'0');assert.equal(inputs[1].disabled,true);
});
test('duplicate reads share one request while different sessions and later refreshes remain independent',async()=>{
 const {CoalescedReads}=await import('../js/read-requests.js'),reads=new CoalescedReads();let count=0,resolve;
 const a=reads.run('session-a|friends',()=>{count++;return new Promise(r=>resolve=r);});
 assert.equal(reads.run('session-a|friends',()=>{throw Error('duplicate');}),a);assert.equal(count,1);
 const b=reads.run('session-b|friends',async()=>++count);assert.equal(await b,2);resolve('first');assert.equal(await a,'first');
 assert.equal(await reads.run('session-a|friends',async()=>++count),3);
 await assert.rejects(reads.run('failed',async()=>{throw Error('offline');}),/offline/);assert.equal(await reads.run('failed',async()=> 'retried'),'retried');
});
