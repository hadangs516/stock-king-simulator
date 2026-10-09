const {test}=require('node:test'),assert=require('node:assert/strict');
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i],get length(){return m.size;}};}
test('browser cache survives reload, isolates account/run and returns detached data',async()=>{
 const {BrowserCache}=await import('../js/browser-state.js'),s=storage(),c=new BrowserCache(s);c.write('a|run1','friends',{friends:['one']});const r=new BrowserCache(s).read('a|run1','friends');r.friends.push('two');assert.deepEqual(c.read('a|run1','friends').friends,['one']);assert.equal(c.read('b|run1','friends'),null);assert.equal(c.read('a|run2','friends'),null);c.clear('a|run1');assert.equal(c.read('a|run1','friends'),null);
});
test('pending read/settings are saved by evicting disposable caches when storage is full',async()=>{
 const {BrowserCache}=await import('../js/browser-state.js'),s=storage(),set=s.setItem;
 s.setItem=(key,value)=>{if(!s.getItem(key)&&s.length>=3)throw Error('QuotaExceededError');set(key,value);};
 s.setItem('stock-king-session','credential');const c=new BrowserCache(s);
 c.write('b|r','outbox',[{action:'settings',data:{requestId:'other'}}]);c.write('a|r','records',{records:['large']});
 c.write('a|r','outbox',[{action:'readAlerts',data:{requestId:'pending',ids:['notice']}}]);
 const restored=new BrowserCache(s);assert.equal(restored.read('a|r','outbox')[0].data.requestId,'pending');
 assert.equal(restored.read('b|r','outbox')[0].data.requestId,'other');assert.equal(s.getItem('stock-king-session'),'credential');
 assert.equal(restored.read('a|r','records'),null);assert.deepEqual(c.read('a|r','records').records,['large']);
});
test('read markers survive a failed send and reload, then retry the same request exactly once',async()=>{
 const {BrowserCache,DurableActions}=await import('../js/browser-state.js'),s=storage(),cache=new BrowserCache(s);let fail=true,calls=[];
 const hooks={cache,owner:()=> 'a|r',context:()=> 'session',send:async(action,data)=>{calls.push(data.requestId);if(fail)throw Error('offline');return {};},changed:()=>{},confirmed:()=>{}};
 const q=new DurableActions(hooks);q.enqueue('readAlerts',{ids:['n'],runId:'r',requestId:'same'});await new Promise(r=>setImmediate(r));assert.deepEqual(q.project({account:{runId:'r',settings:{}},readAlerts:[]}).readAlerts,['n']);assert.equal(q.read().length,1);clearTimeout(q.timer);
 fail=false;const restored=new DurableActions({...hooks,cache:new BrowserCache(s)});await restored.drain();assert.deepEqual(calls,['same','same']);assert.equal(restored.read().length,0);
});
test('late durable response cannot alter another account and newer settings stay projected',async()=>{
 const {BrowserCache,DurableActions}=await import('../js/browser-state.js');let owner='a',resolve,confirmed=0;const q=new DurableActions({cache:new BrowserCache(storage()),owner:()=>owner,context:()=>owner,send:()=>new Promise(r=>resolve=r),changed:()=>{},confirmed:()=>confirmed++});
 q.enqueue('settings',{settings:{terms:false},runId:'r',requestId:'1'});q.enqueue('settings',{settings:{terms:true},runId:'r',requestId:'2'});assert.equal(q.project({account:{runId:'r',settings:{terms:false}}}).account.settings.terms,true);owner='b';resolve({snapshot:{}});await new Promise(r=>setImmediate(r));assert.equal(confirmed,0);assert.equal(q.read().length,0);
});
test('record refresh follows server pages without skipping a gap between new and cached history',async()=>{
 const {mergeRecordPage}=await import('../js/browser-state.js'),all=Array.from({length:1000},(_,i)=>({id:String(i),at:1000-i}));
 let cached={records:all.slice(700),next:null};cached=mergeRecordPage(cached,{records:all.slice(0,300),next:300},true);
 assert.equal(cached.next,300);cached=mergeRecordPage(cached,{records:all.slice(cached.next,600),next:600});
 cached=mergeRecordPage(cached,{records:all.slice(cached.next,900),next:900});cached=mergeRecordPage(cached,{records:all.slice(cached.next),next:null});
 assert.deepEqual(cached.records.map(x=>x.id),all.map(x=>x.id));assert.equal(cached.next,null);
});
