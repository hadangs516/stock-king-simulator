const {test}=require('node:test');const assert=require('node:assert/strict');
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
