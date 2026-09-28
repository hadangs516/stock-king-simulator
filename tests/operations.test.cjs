const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('maintenance login carries the strengthened proof into subsequent requests',()=>{
 const h=harness();signup(h,'운영자');h.s.maintenance={enabled:true,reason:'검사',until:''};
 const r=h.call('login',{name:'운영자',pin:'0123',adminSecret:'test-only-admin'});
 assert.ok(r.adminToken);assert.equal(h.call('sync',{token:r.token,adminToken:r.adminToken}).snapshot.admin,true);
 assert.throws(()=>h.call('sync',{token:r.token}),/점검/);
});
test('delisting cash recovery is credited to ETF backing exactly once',()=>{
 const h=harness();signup(h);h.K.initFunds(h.s);const x=h.s.market.stocks['005930'],f=h.s.market.stocks.ETF_ALL.fund;
 const before=f.cash,q=f.positions[x.id];x.delistAt=h.now;x.settlement=123;
 h.K.calendar(h.s,h.now,h.env);assert.equal(f.cash,before+q*123);assert.equal(f.positions[x.id],undefined);
 h.K.calendar(h.s,h.now,h.env);assert.equal(f.cash,before+q*123);
});
test('signed latest backup restores in place and cannot be replayed or tampered',()=>{
 const h=harness(),r=signup(h),auth={token:r.token,runId:r.snapshot.account.runId};const b=h.call('backup',auth).backup;
 h.s.accounts[r.snapshot.account.id].cash=999;
 assert.equal(h.call('restore',{...auth,backup:b,requestId:'restore-valid'}).snapshot.account.cash,1000000);
 assert.throws(()=>h.call('restore',{...auth,backup:b,requestId:'restore-replay'}),/백업/);
 const altered=h.call('backup',auth).backup;altered.data.cash++;
 assert.throws(()=>h.call('restore',{...auth,backup:altered,requestId:'restore-forged'}),/백업/);
});
test('one unfillable reservation fails without blocking another account or mutating holdings',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id],x=h.s.market.stocks['005930'];
 a.cash=0;a.holdings[x.id]={quantity:1,cost:2,since:h.now};x.price=1;
 h.s.orders.bad={id:'bad',accountId:a.id,runId:a.runId,symbol:x.id,kind:'stop',quantity:2,price:2,at:h.now-1,status:'대기'};
 const other=signup(h,'다른투자자'),b=h.s.accounts[other.snapshot.account.id],y=h.s.market.stocks['000660'];b.holdings[y.id]={quantity:1,cost:100,since:h.now};
 h.s.orders.good={id:'good',accountId:b.id,runId:b.runId,symbol:y.id,kind:'limitSell',quantity:1,price:1,at:h.now-1,status:'대기'};
 h.K.fillOrders(h.s,h.now,h.env);const current=h.s.accounts[a.id];assert.equal(h.s.orders.bad.status,'실패');assert.equal(current.cash,0);assert.equal(current.holdings[x.id].quantity,1);assert.equal(h.s.orders.good.status,'체결');
});
test('target alerts fire once, stay account private, and reset with the run',()=>{
 const h=harness(),r=signup(h),other=signup(h,'다른투자자'),auth={token:r.token,runId:r.snapshot.account.runId};
 h.call('priceAlert',{...auth,requestId:'target-001',symbol:'005930',direction:'above',price:1});h.advance(60000);
 let snap=h.call('sync',auth).snapshot;assert.equal(snap.alerts.filter(n=>n.kind==='targets').length,1);
 h.advance(60000);snap=h.call('sync',auth).snapshot;assert.equal(snap.alerts.filter(n=>n.kind==='targets').length,1);
 assert.equal(h.call('sync',{token:other.token}).snapshot.alerts.length,0);
 assert.equal(h.call('reset',{...auth,requestId:'target-reset',pin:'0123'}).snapshot.priceAlerts.length,0);
});
test('corporate controls validate listing, financials, dividends and preserve source news in audits',()=>{
 const h=harness(),a=signup(h,'운영자'),proof=h.call('adminUnlock',{token:a.token,requestId:'unlock-ops',secret:'test-only-admin'}),auth={token:a.token,adminToken:proof.adminToken};
 h.call('adminMarket',{...auth,requestId:'listing-ops',symbol:'005930',operation:'listing',listingSymbol:'012345',name:'검증기업',sector:'반도체',market:'KOSDAQ',price:10000,reason:'검증'});
 assert.equal(h.s.market.stocks['012345'].price,10000);
 h.call('adminMarket',{...auth,requestId:'financial-ops',symbol:'012345',operation:'financial',revenue:10000,profit:-20,debt:100,reason:'검증'});
 assert.equal(h.s.market.stocks['012345'].financials.at(-1).profit,-20);
 h.call('adminMarket',{...auth,requestId:'dividend-ops',symbol:'012345',operation:'dividend',perShare:100,reason:'검증'});
 assert.equal(h.s.market.stocks['012345'].dividendOverride,100);
 const n=h.s.market.news[0];h.call('adminNews',{...auth,requestId:'news-edit-ops',newsId:n.id,symbol:n.symbol,title:'정정 제목',body:'정정 사실',reason:'검증'});
 assert.equal(h.s.market.news[0].fact,'정정 사실');assert.ok(Object.values(h.s.audits).some(a=>a.before.fact===n.fact));
 assert.throws(()=>h.call('adminMarket',{...auth,requestId:'split-reject',symbol:'012345',operation:'split',ratio:3,reason:'검증'}),/평가액/);
});
test('macro input affects future prices while same state catches up deterministically',()=>{
 const h=harness();h.advance(120000);const a=h.K.initial(h.now),b=structuredClone(a);b.market.economy.rate=30;
 h.K.advance(a,h.now+600000,h.env);h.K.advance(b,h.now+600000,h.env);
 assert.ok(b.market.stocks['005930'].price<a.market.stocks['005930'].price);
});
test('backup created when a new asset achievement unlocks is immediately usable',()=>{
 const h=harness(),r=signup(h),auth={token:r.token,runId:r.snapshot.account.runId};h.s.accounts[r.snapshot.account.id].cash=20000000;
 const b=h.call('backup',auth).backup;assert.equal(h.call('restore',{...auth,requestId:'new-achievement-backup',backup:b}).restored,true);
});
test('logout revokes the server session even during maintenance',()=>{
 const h=harness(),r=signup(h);h.s.maintenance.enabled=true;h.call('logout',{token:r.token});h.s.maintenance.enabled=false;
 assert.throws(()=>h.call('sync',{token:r.token}),/인증/);
});
test('administrator own-account trades also stay out of player price pressure',()=>{
 const h=harness(),a=signup(h,'운영자'),q=h.call('quote',{token:a.token,symbol:'005930',side:'buy',quantity:1});
 h.call('trade',{token:a.token,runId:a.snapshot.account.runId,requestId:'admin-own-trade',quoteId:q.quote.id});
 assert.equal(h.s.market.flows.length,0);
 const user=signup(h,'일반투자자'),uq=h.call('quote',{token:user.token,symbol:'005930',side:'buy',quantity:1});
 h.call('trade',{token:user.token,runId:user.snapshot.account.runId,requestId:'player-own-trade',quoteId:uq.quote.id});
 assert.equal(h.s.market.flows.length,1);
});
