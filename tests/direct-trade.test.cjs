const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
const request=(a,id='direct-0001')=>({token:a.token,runId:a.snapshot.account.runId,requestId:id,side:'buy',quantity:1,symbol:'005930',offer:a.snapshot.stocks.find(x=>x.id==='005930').offer});
test('one request settles the displayed signed price across a minute boundary and retries once',()=>{
 const h=harness();h.advance(59000);const a=signup(h),req=request(a);h.advance(2000);
 const r=h.call('trade',req);assert.equal(r.receipt.price,70000);assert.equal(r.snapshot.account.cash,929965);
 h.advance(40000);const again=h.call('trade',req);assert.equal(again.receipt.id,r.receipt.id);assert.equal(again.snapshot.account.cash,929965);
});
test('displayed price cannot be forged, borrowed from another account, expired or reused after reset',()=>{
 const h=harness(),a=signup(h),b=signup(h,'다른투자자'),req=request(a);
 assert.ok(req.offer,'snapshot must include an authenticated displayed price');
 const forged=structuredClone(req);forged.offer.price=1;
 assert.throws(()=>h.call('trade',forged),/시세/);
 assert.throws(()=>h.call('trade',{...req,token:b.token,runId:b.snapshot.account.runId}),/시세/);
 h.s.market.stocks['005930'].float*=2;
 assert.throws(()=>h.call('trade',req),/시세/);
 h.s.market.stocks['005930'].float/=2;
 h.advance(30001);assert.throws(()=>h.call('trade',req),/시세/);
 const fresh=h.call('sync',{token:a.token});const ticket=fresh.snapshot.stocks.find(x=>x.id==='005930').offer;
 const reset=h.call('reset',{token:a.token,runId:req.runId,requestId:'reset-ticket-1',pin:'0123',confirm:true});
 assert.throws(()=>h.call('trade',{...req,token:h.call('login',{name:'투자자',pin:'0123'}).token,requestId:'new-run-trade',runId:reset.snapshot.account.runId,offer:ticket}),/시세/);
 assert.equal(Object.keys(h.s.receipts).length,0);
});
test('maximum includes reservations and rounded fees and one extra share is rejected',async()=>{
 const {maxBuyQuantity}=await import('../js/format.js');const h=harness(),a=signup(h);
 const r=h.call('order',{token:a.token,runId:a.snapshot.account.runId,requestId:'reserve-max-1',symbol:'005930',kind:'limitBuy',quantity:10,price:60000,expiryDays:7});
 assert.equal(maxBuyQuantity(r.snapshot.availableCash,70000),5);
 assert.equal(maxBuyQuantity(70034,70000),0);assert.equal(maxBuyQuantity(70035,70000),1);
 const req=request({...a,snapshot:r.snapshot});assert.throws(()=>h.call('trade',{...req,quantity:6}),/현금/);
 const done=h.call('trade',{...req,quantity:5});assert.equal(done.snapshot.availableCash,49525);assert.equal(done.snapshot.account.cash,649825);
});
