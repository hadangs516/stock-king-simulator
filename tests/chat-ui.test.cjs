const {test}=require('node:test'),assert=require('node:assert/strict');
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
