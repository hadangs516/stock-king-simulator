const {test}=require('node:test'),assert=require('node:assert/strict');
test('single-image dividend disclosures rotate compatible supplied art without recent or adjacent duplicates',async()=>{
 const {NewsArtwork}=await import('../js/news-artwork.js'),art=new NewsArtwork(),items=Array.from({length:35},(_,i)=>({id:'article-'+i,at:i,title:'기업 배당 공시',sector:'반도체',image:'NEWS-085'})).reverse(),result=art.assign(items);
 for(let i=0;i<result.length;i++){assert.match(result[i].image,/^NEWS-\d{3}$/);if(i)assert.notEqual(result[i].image,result[i-1].image);assert.ok(!result.slice(Math.max(0,i-12),i).some(x=>x.image===result[i].image));}assert.equal(items[0].image,'NEWS-085');
});
test('interest-rate artwork stays in matching or neutral financial scenes, and semiconductor fallback prioritizes its own sector',async()=>{
 const {NewsArtwork}=await import('../js/news-artwork.js'),q=new NewsArtwork(),items=Array.from({length:15},(_,i)=>({id:'rate-'+i,at:i,title:'금리 발표',sector:'경제',image:'NEWS-072'}));
 assert.ok(q.assign(items).every(n=>['NEWS-072','NEWS-071','NEWS-082','NEWS-090'].includes(n.image)));
 const sectors=new NewsArtwork().assign(Array.from({length:8},(_,i)=>({id:'equipment-'+i,at:i,title:'반도체 설비 점검',sector:'반도체',image:'NEWS-004'})));assert.ok(sectors.every(n=>Number(n.image.slice(5))<=10));
});
test('supply-delay news never borrows unrelated service outage, recall or restructuring artwork',async()=>{
 const {NewsArtwork}=await import('../js/news-artwork.js');const result=new NewsArtwork().assign(Array.from({length:10},(_,i)=>({id:'supply-'+i,at:i,title:'자동차 부품 공급 지연',sector:'자동차',image:'NEWS-093'})));
 for(const n of result)assert.ok(n.image==='NEWS-093'||Number(n.image.slice(5))>=11&&Number(n.image.slice(5))<=20||['NEWS-071','NEWS-082','NEWS-090'].includes(n.image),n.image);
});
test('article mapping survives reload and new arrivals; corrupt or failing storage is harmless',async()=>{
 const {NewsArtwork}=await import('../js/news-artwork.js'),data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},items=[{id:'a',at:1,title:'금리 발표',sector:'경제',image:'NEWS-072'},{id:'b',at:2,title:'금리 회의',sector:'경제',image:'NEWS-072'}],first=new NewsArtwork(storage).assign(items),restored=new NewsArtwork(storage).assign([{id:'c',at:3,title:'새 금리',sector:'경제',image:'NEWS-072'},...items]);for(const n of first)assert.equal(restored.find(x=>x.id===n.id).image,n.image);const broken=new NewsArtwork({getItem:()=>'{broken',setItem:()=>{throw Error('quota');}});assert.equal(broken.assign(items).length,2);
});
