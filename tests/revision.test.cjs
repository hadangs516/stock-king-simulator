const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('new runs start with one million and legacy balances remain unchanged',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id];
 assert.equal(r.snapshot.account.cash,1000000);assert.equal(r.snapshot.account.startingCash,1000000);
 delete a.startingCash;a.cash=7654321;
 const s=h.call('sync',{token:r.token}).snapshot;
 assert.equal(s.account.cash,7654321);assert.equal(s.account.startingCash,10000000);
 const reset=h.call('reset',{token:r.token,runId:a.runId,requestId:'reset-new-money',pin:'0123',confirm:true}).snapshot;
 assert.equal(reset.account.cash,1000000);assert.equal(reset.account.startingCash,1000000);
});
test('DAY 3 tax uses KOSPI components and KOSDAQ rate while ETFs remain exempt',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id],start=a.started;
 for(const market of ['KOSPI','KOSDAQ']){
  assert.equal(h.K.costs({market},'sell',10,100000,a,start).tax,0);
  assert.equal(h.K.costs({market},'sell',10,100000,a,start+60000).tax,0);
  const c=h.K.costs({market},'sell',10,100000,a,start+86460000);
  assert.equal(c.tax,2000);assert.equal(c.taxRate,.002);
  assert.equal(c.taxDetails.reduce((v,x)=>v+x.amount,0),c.tax);
 }
 assert.equal(h.K.costs({market:'ETF'},'sell',10,100000,a,start+86460000).tax,0);
 assert.equal(h.K.costs({market:'KOSPI'},'buy',10,100000,a,start+86460000).tax,0);
});
test('reservation settlement charges DAY 3 tax and retries keep immutable receipt',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id];
 a.holdings['005930']={quantity:10,cost:700000,since:h.now};
 const auth={token:r.token,runId:a.runId};
 const o=h.call('order',{...auth,requestId:'tax-sell-order',symbol:'005930',kind:'limitSell',quantity:10,price:1,expiryDays:7});
 h.s.accounts[a.id].started=h.now-2*86400000;h.advance(60000);
 const s=h.call('sync',{token:r.token}).snapshot,receipt=h.s.receipts[s.orders[0].receiptId];
 assert.equal(receipt.taxRate,.002);assert.ok(receipt.tax>0);
 const copy=JSON.stringify(receipt);h.call('sync',{token:r.token});assert.equal(JSON.stringify(h.s.receipts[receipt.id]),copy);
});
test('dividend tax is exempt before DAY 3 and fixed at scheduled payment day',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id],x=h.s.market.stocks['005930'];
 a.holdings[x.id]={quantity:10,cost:700000,since:h.now};
 h.K.makeDividend(h.s,x,100,h.now,h.now+60000,h.env);
 h.K.makeDividend(h.s,x,100,h.now,h.now+86460000,h.env);
 const claims=Object.values(h.s.claims);assert.equal(claims[0].tax,0);assert.equal(claims[1].tax,154);
});
test('player login/settings/other reports are logged without secret values',()=>{
 const h=harness(),r=signup(h),auth={token:r.token,runId:r.snapshot.account.runId};
 h.call('settings',{...auth,requestId:'settings-log-test',settings:{bgm:.2}});
 h.call('report',{...auth,requestId:'report-other-test',kind:'other',body:'기타 문의'});
 const rows=h.call('records',{token:r.token}).records;
 assert.ok(rows.some(x=>x.type==='로그인'));assert.ok(rows.some(x=>x.type==='설정 변경'));
 assert.equal(Object.values(h.s.reports)[0].type,'기타');assert.ok(!JSON.stringify(rows).includes('0123'));
 const admin=signup(h,'운영자');assert.ok(!h.call('records',{token:admin.token}).records.some(x=>x.type==='로그인'));
});
test('initial news has previous-day timestamps without modifying prices or repeating',()=>{
 const h=harness(),r=signup(h);assert.ok(r.snapshot.news.length>=3);
 assert.ok(r.snapshot.news.every(n=>h.K.date(n.at)<h.K.date(h.now)));
 assert.equal(r.snapshot.stocks.find(x=>x.id==='005930').price,70000);
 const count=r.snapshot.news.length;assert.equal(h.call('sync',{token:r.token}).snapshot.news.length,count);
});
