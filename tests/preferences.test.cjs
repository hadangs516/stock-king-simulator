const {test}=require('node:test');const assert=require('node:assert/strict');
test('confirmed server settings update an older browser preference cache without copying permissions',async()=>{
 const {BrowserPreferences}=await import('../js/preferences.js'),saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const p=new BrowserPreferences(storage);p.write('a',{bgm:.1,terms:false});
 assert.deepEqual(p.reconcile('a',{bgm:.7,sfx:.2,terms:true,admin:true}),{bgm:.7,sfx:.2,terms:true,animation:true});
 assert.equal(new BrowserPreferences(storage).read('a').bgm,.7);assert.equal(new BrowserPreferences(storage).read('a').terms,true);assert.ok(![...saved.values()][0].includes('admin'));
});
test('pending local preferences still win when reconciling a server snapshot',async()=>{
 const {BrowserPreferences}=await import('../js/preferences.js'),{BrowserCache,DurableActions}=await import('../js/browser-state.js');
 const cache=new BrowserCache(),owner='a|run';cache.write(owner,'outbox',[{action:'settings',data:{runId:'run',requestId:'pending',settings:{terms:false,bgm:.6}}}]);
 const q=new DurableActions({cache,owner:()=>owner}),projected=q.project({account:{runId:'run',settings:{terms:true,bgm:0,sfx:.3}},readAlerts:[]});
 const actual=new BrowserPreferences().reconcile('a',projected.account.settings);assert.equal(actual.terms,false);assert.equal(actual.bgm,.6);
});
test('browser preferences survive reload per account without storing server permissions',async()=>{
 const {BrowserPreferences}=await import('../js/preferences.js');const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const p=new BrowserPreferences(storage);p.write('a',{bgm:.4,sfx:0,terms:false,animation:false,favorites:['005930'],notifications:{orders:false}});
 const restored=new BrowserPreferences(storage);assert.deepEqual(restored.read('a',{bgm:0,sfx:.3,terms:true}),{bgm:.4,sfx:0,terms:false,animation:true});
 assert.equal(restored.read('b',{bgm:.1}).bgm,.1);assert.equal([...data.values()].some(v=>v.includes('notifications')||v.includes('favorites')),false);
 restored.remove('a');assert.equal(restored.read('a',{bgm:.2}).bgm,.2);
});
test('blocked or corrupt storage keeps preferences working in the current tab',async()=>{
 const {BrowserPreferences}=await import('../js/preferences.js');const p=new BrowserPreferences({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}});
 p.write('a',{sfx:.6});assert.equal(p.read('a',{}).sfx,.6);p.remove('a');assert.equal(p.read('a',{}).sfx,.3);
 const broken=new BrowserPreferences({getItem:()=>'{oops',setItem(){},removeItem(){}});assert.equal(broken.read('a',{animation:false}).animation,true);
});
