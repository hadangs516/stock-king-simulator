const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');const {harness,signup}=require('./helpers.cjs');
test('all main views render funded snapshots without missing values and expose working destinations',async()=>{
 const v=await import('../js/views.js'),h=harness(),s=signup(h).snapshot;
 for(const [name,args] of [['home',[s]],['assets',[s]],['market',[s,{market:'KOSPI',search:'005930',sort:'name',favorites:false}]],['orders',[s,'자동매도']],['inbox',[s]],['rewards',[s]],['detail',[s,s.stocks[0],'all']],['news',[s]]]){
  const html=v[name](...args);assert.doesNotMatch(html,/NaN|Infinity|undefined/,name);assert.ok(html.length>100,name);
 }
 assert.match(v.home(s),/data-action="rewards"/);assert.match(v.assets(s),/asset-donut/);assert.match(v.market(s,{market:'KOSPI',search:'005930',sort:'name',favorites:false}),/삼성전자/);
});
test('all 100 supplied image variants exist and are excluded from initial offline preload',async()=>{
 const catalog=JSON.parse(fs.readFileSync('assets/news/catalog.json','utf8')),ids=new Set(catalog.map(x=>x.id));assert.equal(ids.size,100);
 const {newsImageUrl}=await import('../js/news-content.js');for(const n of catalog){for(const thumbnail of [false,true])assert.ok(fs.existsSync(newsImageUrl({image:n.id},thumbnail)));assert.match(n.sourceSha256,/^[a-f0-9]{64}$/);}
 assert.doesNotMatch(fs.readFileSync('sw.js','utf8'),/NEWS-\d/);
});
test('server chart summaries include history preceding the short realtime sample window',()=>{
 const h=harness(),r=signup(h),x=h.s.market.stocks['005930'];x.history=Array.from({length:400},(_,i)=>[h.now-(399-i)*60000,i===0?999999:100]);
 const stock=h.call('sync',{token:r.token}).snapshot.stocks.find(v=>v.id==='005930');assert.equal(stock.history.length,240);assert.ok(stock.chartBars.hour.some(b=>b.high===999999));assert.ok(stock.chartBars.day.some(b=>b.high===999999));
});
