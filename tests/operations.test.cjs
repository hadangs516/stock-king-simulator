const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./engine.test.cjs');
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
 assert.equal(h.call('restore',{...auth,backup:b,requestId:'restore-valid'}).snapshot.account.cash,10000000);
 assert.throws(()=>h.call('restore',{...auth,backup:b,requestId:'restore-replay'}),/백업/);
 const altered=h.call('backup',auth).backup;altered.data.cash++;
 assert.throws(()=>h.call('restore',{...auth,backup:altered,requestId:'restore-forged'}),/백업/);
});
test('one unfillable reservation fails without blocking another account or mutating holdings',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id],x=h.s.market.stocks['005930'];
 a.cash=0;a.holdings[x.id]={quantity:1,cost:2,since:h.now};x.price=1;
 h.s.orders.bad={id:'bad',accountId:a.id,runId:a.runId,symbol:x.id,kind:'stop',quantity:1,price:2,at:h.now-1,status:'대기'};
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
