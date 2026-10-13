const {test}=require('node:test'),assert=require('node:assert/strict');
async function fixture(t,read,extra={}){
 const previous=global.document,main={dataset:{page:'admin'},innerHTML:''};
 global.document={addEventListener(){},querySelector(){return main;}};t.after(()=>global.document=previous);
 const {AdminUI}=await import('../js/admin-ui.js'),api={token:'account-a',adminToken:'proof-a'},dialogs=[];
 const ui=new AdminUI({api,read,modal:(...args)=>dialogs.push(args),getSnapshot:()=>null,...extra});return {ui,api,main,dialogs};
}
test('late administrator overview cannot reveal data after changing login',async t=>{
 let resolve;const {ui,api,main}=await fixture(t,()=>new Promise(r=>resolve=r)),pending=ui.load();
 ui.selected.add('old-player');ui.names.set('old-player','private');api.token='account-b';api.adminToken='';resolve({players:[{name:'private'}]});await pending;
 assert.equal(ui.data,null);ui.render();assert.equal(ui.selected.size,0);assert.equal(ui.names.size,0);assert.ok(!main.innerHTML.includes('private'));
});
test('late administrator overview cannot replace the page after navigation',async t=>{
 let resolve;const {ui,main}=await fixture(t,()=>new Promise(r=>resolve=r)),pending=ui.load();main.dataset.page='home';main.innerHTML='home';
 resolve({players:[]});await pending;assert.equal(main.innerHTML,'home');assert.equal(ui.data,null);
});
test('expired administrator proof clears the overview and opens authentication again',async t=>{
 const {ui,api,main,dialogs}=await fixture(t,async()=>{throw Error('관리자 인증이 필요합니다.');});ui.dataContext=ui.authContext();ui.data={players:[{name:'private'}]};
 await ui.load();assert.equal(api.adminToken,'');assert.equal(ui.data,null);assert.equal(dialogs.length,1);assert.ok(dialogs[0][1].includes('admin-unlock-form'));assert.ok(!main.innerHTML.includes('private'));
});
test('certified ordinary admin login silently renews expired proof before loading overview',async t=>{
 let renewals=0,reads=0;const data={players:[],maintenance:{enabled:false},active:0,count:0,receiptCount:0,next:null};
 const {ui,api,main,dialogs}=await fixture(t,async()=>{if(++reads===1)throw Error('관리자 인증이 필요합니다.');return data;},{getSnapshot:()=>({passwordAdminLogin:true}),call:async(action,body)=>{assert.equal(action,'adminUnlock');assert.deepEqual(body,{});renewals++;return {adminToken:'renewed-proof'};}});
 await ui.load();assert.equal(api.adminToken,'renewed-proof');assert.equal(renewals,1);assert.equal(reads,2);assert.equal(dialogs.length,0);assert.ok(main.innerHTML.includes('운영 현황'));assert.ok(!main.innerHTML.includes('추가 관리자 암호'));
});
test('late automatic admin renewal cannot install authority in a different account or screen',async t=>{
 for(const change of ['account','page']){
  let resolve,reads=0;const {ui,api,main}=await fixture(t,async()=>{reads++;},{getSnapshot:()=>({passwordAdminLogin:true}),call:()=>new Promise(r=>resolve=r)});api.adminToken='';const pending=ui.load();
  if(change==='account')api.token='account-b';else main.dataset.page='home';main.innerHTML='unchanged';resolve({adminToken:'old-account-proof'});await pending;
  assert.equal(api.adminToken,'');assert.equal(reads,0);assert.equal(main.innerHTML,'unchanged');
 }
});
