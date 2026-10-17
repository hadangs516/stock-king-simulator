const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');

test('editorial news arrives four to six times a day with short articles',()=>{
 const h=harness();signup(h);const start=h.s.market.minute*60000,initial=h.s.market.news.length;
 for(let minute=1;minute<=1440;minute++)h.K.publishScheduled(h.s,start+minute*60000,h.env);
 const added=h.s.market.news.slice(initial);assert.ok(added.length>=4&&added.length<=6,String(added.length));
 let previous=start;for(const n of added){assert.ok(n.at-previous>=4*3600000);assert.ok(n.at-previous<=6*3600000);previous=n.at;}
 for(const recipe of h.K.newsLibrary){assert.ok(recipe.body.length<=3,recipe.id);assert.ok(recipe.body.join('').length<180,recipe.id);}
});
test('weekly financial updates publish one digest while all company figures and dividend rights remain',()=>{
 const h=harness(),u=signup(h),a=h.s.accounts[u.snapshot.account.id];a.holdings['005930']={quantity:10,cost:700000,since:h.now};
 const at=Date.parse('2026-09-27T00:00:00+09:00');h.K.calendar(h.s,at,h.env);
 const notices=h.s.market.news.filter(n=>n.at===at&&/실적/.test(n.title));assert.equal(notices.length,1);
 for(const x of Object.values(h.s.market.stocks).filter(x=>!x.fund))assert.equal(x.financials.at(-1).at,at);
 h.K.calendar(h.s,at+18*3600000,h.env);assert.ok(Object.values(h.s.claims).some(c=>c.accountId===a.id&&c.symbol==='005930'));
});
test('a weekly digest respects holding and favorite news choices even when market news is muted',()=>{
 const h=harness(),u=signup(h),a=h.s.accounts[u.snapshot.account.id];a.holdings['005930']={quantity:1,cost:70000,since:h.now};a.settings.favorites=['005930'];
 a.settings.notifications.marketNews=false;a.settings.notifications.heldNews=true;
 const at=Date.parse('2026-09-27T00:00:00+09:00');h.K.calendar(h.s,at,h.env);const digest=h.s.market.news.find(n=>n.at===at&&/실적/.test(n.title));
 const alerts=h.K.notificationFeed(h.s,a,at,null).filter(n=>n.id===digest.id);assert.equal(alerts.length,1);assert.equal(alerts[0].kind,'heldNews');
 a.settings.notifications.heldNews=false;a.settings.notifications.favoriteNews=true;assert.equal(h.K.notificationFeed(h.s,a,at,null).find(n=>n.id===digest.id).kind,'favoriteNews');
});
test('the main exchange offers fourteen companies across six industries and keeps old holdings sellable',async()=>{
 const {market,assets,detail}=await import('../js/views.js'),h=harness(),u=signup(h);let s=u.snapshot;
 const listed=['KOSPI','KOSDAQ'].map(m=>market(s,{market:m,search:'',sort:'name',favorites:false})).join('');
 assert.equal((listed.match(/class="stock" /g)||[]).length,14);
 assert.equal(new Set(s.stocks.filter(x=>x.market!=='ETF'&&!x.browseHidden).map(x=>x.sector)).size,6);
 const hidden=s.stocks.find(x=>x.browseHidden);assert.ok(hidden);const a=h.s.accounts[s.account.id];a.holdings[hidden.id]={quantity:2,cost:10000,since:h.now};
 s=h.call('sync',{token:u.token}).snapshot;assert.ok(s.stocks.find(x=>x.id===hidden.id));assert.match(assets(s),new RegExp(hidden.name));assert.match(detail(s,s.stocks.find(x=>x.id===hidden.id)),/data-action="sell"/);
 const q=h.call('quote',{token:u.token,symbol:hidden.id,side:'sell',quantity:2});
 const sold=h.call('trade',{token:u.token,runId:a.runId,requestId:'hidden-holding-sale',quoteId:q.quote.id});assert.equal(sold.receipt.quantity,2);assert.equal(h.s.accounts[a.id].holdings[hidden.id],undefined);
});
test('exchange reduction does not erase histories, ETF assets or automatically grow the choices again',()=>{
 const h=harness();signup(h);const before=Object.keys(h.s.market.stocks),positions=JSON.stringify(Object.values(h.s.market.stocks).filter(x=>x.fund).map(x=>x.fund.positions));
 h.K.lifecycle(h.s,Date.parse('2026-09-28T19:00:00+09:00'),h.env);
 assert.deepEqual(Object.keys(h.s.market.stocks),before);assert.equal(JSON.stringify(Object.values(h.s.market.stocks).filter(x=>x.fund).map(x=>x.fund.positions)),positions);
 for(const id of before)assert.ok(h.s.market.stocks[id].history.length);
});
test('news opens with twelve stories and retains an explicit way to read earlier facts',async()=>{
 const {news,newsArticle}=await import('../js/views.js'),list=Array.from({length:30},(_,i)=>({id:'story-'+i,title:'기사 '+i,fact:'짧은 소식',body:['첫 소식','둘째 소식','추가 기록'],sector:'경제',at:1000+i})),s={news:list,day:1};
 const html=news(s);assert.equal((html.match(/data-action="newsArticle"/g)||[]).length,12);assert.match(html,/data-action="moreNews"/);
 assert.equal((news(s,list,true,'전체',24).match(/data-action="newsArticle"/g)||[]).length,24);
 const article=newsArticle(s,list[0]);assert.match(article,/<details[^>]*>[\s\S]*추가 기록[\s\S]*<\/details>/);assert.doesNotMatch(article,/처음 읽는 뉴스라면|주제별 공통 삽화/);
});
