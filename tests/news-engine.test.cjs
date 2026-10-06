const {test}=require('node:test'),assert=require('node:assert/strict');const {harness,signup}=require('./helpers.cjs');
test('administrator correction replaces public body and preserves the original in audit',()=>{
 const h=harness(),a=signup(h,'운영자'),proof=h.call('adminUnlock',{token:a.token,requestId:'news-unlock',secret:'test-only-admin'});
 const original=JSON.parse(JSON.stringify(h.s.market.news[0]));
 h.call('adminNews',{token:a.token,adminToken:proof.adminToken,requestId:'news-correction',newsId:original.id,symbol:original.symbol,title:'정정 제목',body:'첫 정정 문단\n\n둘째 정정 문단',reason:'기사 사실 정정'});
 const n=h.call('sync',{token:a.token}).snapshot.news.find(n=>n.id===original.id);
 assert.deepEqual(Array.from(n.body),['첫 정정 문단','둘째 정정 문단']);
 assert.equal(n.beginner,undefined);
 assert.ok(Object.values(h.s.audits).some(a=>JSON.stringify(a.before.body)===JSON.stringify(original.body)));
});
test('minute price noise does not form long same-direction runs from consecutive timestamps',()=>{
 const {K}=harness();
 for(const key of ['market','반도체','005930']){
  const values=Array.from({length:1440},(_,i)=>K.priceNoise('news-audit-0:'+key+':'+(29856000+i)));
  let same=0;for(let i=1;i<values.length;i++)if((values[i]>.5)===(values[i-1]>.5))same++;
  assert.ok(same/1439>.35&&same/1439<.65,key);
  assert.ok(values.every(v=>v>=0&&v<1));
  assert.equal(K.priceNoise('repeat'),K.priceNoise('repeat'));
 }
});
test('authored event library has distinct complete articles and uses a small reusable image set',()=>{
 const {K}=harness();assert.ok(K.newsLibrary.length>=12);assert.equal(new Set(K.newsLibrary.map(n=>n.id)).size,K.newsLibrary.length);
 for(const n of K.newsLibrary){assert.ok(n.body.length>=10,n.id);assert.ok(new Set(n.body).size>=10,n.id);assert.ok(['시장뉴스','기업뉴스','이벤트'].includes(n.category));}
 assert.ok(new Set(K.newsLibrary.map(n=>n.image)).size<=7);
});
test('news and prices are identical for minute processing and delayed catchup with irregular publication times',()=>{
 const a=harness(),b=harness(),ua=signup(a),ub=signup(b);for(let i=0;i<240;i++){a.advance(60000);a.call('sync',{token:ua.token});}b.advance(240*60000);b.call('sync',{token:ub.token});
 assert.equal(JSON.stringify(a.s.market.news),JSON.stringify(b.s.market.news));assert.equal(a.s.market.stocks['005930'].price,b.s.market.stocks['005930'].price);
 const generated=a.s.market.news.filter(n=>n.id.startsWith('event-'));assert.ok(generated.length>=2);assert.ok(generated.some(n=>new Date(n.at).getUTCMinutes()!==0));
 const count=a.s.market.news.length;a.call('sync',{token:ua.token});assert.equal(a.s.market.news.length,count);
});
test('DAY 5 has the same facts but no beginner explanation or private future market fields',()=>{
 const h=harness(),a=signup(h),id=a.snapshot.account.id;const first=h.call('sync',{token:a.token}).snapshot;h.s.accounts[id].started-=4*86400000;const later=h.call('sync',{token:a.token}).snapshot;
 assert.deepEqual(first.news.map(n=>n.body),later.news.map(n=>n.body));assert.ok(first.news.some(n=>n.beginner));assert.ok(later.news.every(n=>!('beginner' in n)));
 for(const n of later.news)for(const key of ['impact','difficulty','nextAt','seed'])assert.equal(key in n,false);
 for(const x of later.stocks)for(const key of ['fundamental','trend','pressure','tradeEpoch'])assert.equal(key in x,false);
});
