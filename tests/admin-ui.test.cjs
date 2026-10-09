const {test}=require('node:test'),assert=require('node:assert/strict');
async function fixture(t,read){
 const previous=global.document,main={dataset:{page:'admin'},innerHTML:''};
 global.document={addEventListener(){},querySelector(){return main;}};t.after(()=>global.document=previous);
 const {AdminUI}=await import('../js/admin-ui.js'),api={token:'account-a',adminToken:'proof-a'},dialogs=[];
 const ui=new AdminUI({api,read,modal:(...args)=>dialogs.push(args),getSnapshot:()=>null});return {ui,api,main,dialogs};
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
