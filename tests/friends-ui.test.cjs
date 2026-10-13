const {test}=require('node:test'),assert=require('node:assert/strict');

test('friend settings is a dedicated screen and saves all seven sharing choices to the shared profile cache',async()=>{
 const {FriendsUI}=await import('../js/friends-ui.js');let payload,cached;
 const data={profile:{nickname:'검증친구',sharing:{cash:true}},friends:[]};
 const ui=new FriendsUI({context:()=> 'one',owner:()=> 'owner',isSettings:()=>true,call:async(action,p)=>{assert.equal(action,'friendSettings');payload=p;return data;},cache:{write:(owner,key,value)=>{cached={owner,key,value};}},render:()=>{},toast:()=>{}});ui.data=data;
 assert.ok(ui.view().includes('data-action="friendSettings"'));assert.ok(!ui.view().includes('friend-settings-form'));
 const html=ui.settingsView();assert.equal((html.match(/role="switch"/g)||[]).length,7);assert.ok(html.includes('friend-settings-form'));
 const fd=new Map([['nickname','새친구'],['total','on'],['roi','on']]);await ui.submit({id:'friend-settings-form'},fd);
 assert.deepEqual(payload.sharing,{cash:false,total:true,holdings:false,day:false,playTime:false,roi:true,level:false});
 assert.equal(cached.owner,'owner');assert.equal(cached.key,'friends');assert.equal(cached.value,data);
});
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

test('an older profile read cannot revert confirmed friend sharing settings or their cache',async()=>{
 const {FriendsUI}=await import('../js/friends-ui.js');let resolve,cached;
 const old={profile:{nickname:'이전친구',sharing:{cash:true}},friends:[]},saved={profile:{nickname:'새친구',sharing:{cash:false}},friends:[]};
 const ui=new FriendsUI({context:()=> 'one',owner:()=> 'owner',isSettings:()=>true,read:()=>new Promise(r=>resolve=r),call:async()=>saved,cache:{read:()=>old,write:(owner,key,value)=>cached=value},render:()=>{},toast:()=>{}});
 const loading=ui.load(false);await ui.submit({id:'friend-settings-form'},new Map([['nickname','새친구']]));resolve(old);await loading;
 assert.equal(ui.data,saved);assert.equal(cached,saved);
});

test('live privacy settings hydrate untouched switches without discarding a nickname draft or an edited sharing choice',async()=>{
 const {FriendsUI}=await import('../js/friends-ui.js'),ui=new FriendsUI({context:()=> 'one'});
 ui.data={profile:{nickname:'서버이름',sharing:{cash:false,total:false}},friends:[]};
 const inputs={nickname:{value:'작성중',dataset:{edited:'true'}},cash:{checked:true,dataset:{}},total:{checked:true,dataset:{edited:'true'}}};
 ui.hydrateSettings({elements:{namedItem:name=>inputs[name]}});
 assert.equal(inputs.nickname.value,'작성중');assert.equal(inputs.cash.checked,false);assert.equal(inputs.total.checked,true);
 delete inputs.nickname.dataset.edited;ui.hydrateSettings({elements:{namedItem:name=>inputs[name]}});assert.equal(inputs.nickname.value,'서버이름');
});
