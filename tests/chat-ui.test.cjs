const {test}=require('node:test'),assert=require('node:assert/strict');
test('latest messages after a long absence retain a cursor to the missing middle history',async()=>{
 const {ChatUI}=await import('../js/chat-ui.js');const ui=new ChatUI({context:()=> 'one',isChat:()=>true,read:async()=>({messages:[{id:'151',at:151},{id:'152',at:152}],before:'151'})});ui.mode='support';ui.id='c';ui.key='room';ui.messages=[{id:'1',at:1},{id:'2',at:2}];ui.render=()=>{};
 await ui.refresh();assert.equal(ui.before,'151');assert.deepEqual(ui.messages.map(m=>m.id),['1','2','151','152']);
 ui.hooks.read=async()=>({messages:[{id:'101',at:101},{id:'102',at:102}],before:'101'});await ui.refresh(true);assert.deepEqual(ui.messages.map(m=>m.id),['1','2','101','102','151','152']);assert.equal(ui.before,'101');
});
test('chat displays pending before acknowledgement and persists the server id after reopening the same room',async()=>{
 const {ChatUI}=await import('../js/chat-ui.js');let resolve;const ui=new ChatUI({context:()=> 'one',call:()=>new Promise(r=>resolve=r),isChat:()=>true});ui.mode='support';ui.id='c';ui.key='room';
 const input={dataset:{},value:'hello',isConnected:true};const sending=ui.send({elements:{body:input}});assert.equal(input.value,'');assert.equal(ui.messages[0].pending,true);
 ui.messages=structuredClone(ui.messages);resolve({sent:'server-id'});await sending;
 assert.equal(ui.messages[0].id,'server-id');assert.equal(ui.messages[0].pending,false);assert.ok(ui.messages[0].confirmedUntil>Date.now());
});
test('definitive chat rejection stays visibly unsent until an explicit retry',async()=>{
 const {ChatUI}=await import('../js/chat-ui.js');let fail=true,ids=[];const ui=new ChatUI({context:()=> 'one',call:async(action,data)=>{ids.push(data.requestId);if(fail)throw Object.assign(Error('rejected'),{definitive:true});return {sent:'ok'};},isChat:()=>false});ui.mode='support';ui.id='c';ui.key='room';
 await ui.send({elements:{body:{dataset:{},value:'hello'}}});const m=ui.messages[0];assert.equal(m.pending,true);assert.equal(m.blocked,true);assert.equal(m.confirmedUntil,undefined);fail=false;await ui.retry(m.requestId);assert.equal(m.pending,false);assert.notEqual(ids[0],ids[1]);
});
test('late support list never pulls the user away from another page or overwrites a newer list',async()=>{
 const {ChatUI}=await import('../js/chat-ui.js');
 for(const scenario of ['leave','newer']){
  let page='settings',resolveFirst,resolveSecond,calls=0;
  const ui=new ChatUI({context:()=> 'one',read:()=>new Promise(r=>{if(calls++===0)resolveFirst=r;else resolveSecond=r;}),navigate:async next=>{page=next;},isSupport:()=>page==='support'});
  ui.rememberDraft=()=>{};
  const first=ui.list();
  await Promise.resolve();
  if(scenario==='leave')page='home';else {const second=ui.list(true);await Promise.resolve();resolveSecond({conversations:[{id:'new'}]});await second;}
  resolveFirst({conversations:[{id:'old'}]});await first;
  if(scenario==='leave')assert.equal(page,'home');else assert.equal(ui.conversations[0].id,'new');
 }
});
test('late chat reads cannot overwrite another conversation or login',async()=>{
 const {ChatUI}=await import('../js/chat-ui.js');for(const change of ['chat','login']){
  let context='one',resolve;const ui=new ChatUI({context:()=>context,isChat:()=>true,read:()=>new Promise(r=>resolve=r)});ui.key='room-one';ui.id='one';ui.mode='support';const pending=ui.refresh();if(change==='chat')ui.key='room-two';else context='two';
  resolve({messages:[{id:'private',body:'secret'}]});await pending;assert.equal(ui.messages.length,0);
 }
});
test('sending never clears newer input and composing submit never sends',async()=>{
 const {ChatUI}=await import('../js/chat-ui.js');let resolve,calls=0;const ui=new ChatUI({context:()=> 'one',call:()=>{calls++;return new Promise(r=>resolve=r);}});ui.key='room-one';ui.id='one';ui.mode='support';ui.refresh=async()=>{};
 const input={dataset:{composing:'true'},value:'한글',isConnected:true},form={elements:{body:input}};
 await ui.send(form);assert.equal(calls,0);delete input.dataset.composing;const pending=ui.send(form);input.value='한글 계속 작성';resolve({sent:'one'});await pending;assert.equal(input.value,'한글 계속 작성');
});
