const {test}=require('node:test'),assert=require('node:assert/strict');
test('delayed friends responses cannot update another login or proxy context',async()=>{
 const {FriendsUI}=await import('../js/friends-ui.js');
 for(const operation of ['list','search','profile','settings','accept']){
  let context='account-a/session-a',resolve,rendered=0,opened=0;
  const response=new Promise(r=>resolve=r);
  const ui=new FriendsUI({context:()=>context,read:()=>response,call:()=>response,render:()=>rendered++,modal:()=>opened++,close:()=>{},toast:()=>{}});
  const fd=new Map([['query','친구'],['nickname','새이름']]);fd.has=()=>false;
  const pending=operation==='list'?ui.load():operation==='search'?ui.submit({id:'friend-search-form'},fd):operation==='settings'?ui.submit({id:'friend-settings-form'},fd):ui.action(operation==='profile'?'friendProfile':'friendAccept',{dataset:{friendId:'opaque-a'}});
  context='account-b/session-b';resolve({profile:{nickname:'PRIVATE A'},friends:[],results:[{nickname:'PRIVATE A'}],friend:{nickname:'PRIVATE A',shared:{cash:999}}});
  await pending;assert.equal(ui.data,null);assert.deepEqual(ui.results,[]);assert.equal(rendered,0);assert.equal(opened,0);
 }
});
