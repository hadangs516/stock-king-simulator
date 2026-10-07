const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers.cjs');
test('actual delisting still notifies a holder whose shares are settled and removed',()=>{
 const h=harness(),r=h.call('signup',{name:'정산검증',pin:'0123',consent:true}),a=h.s.accounts[r.snapshot.account.id],x=Object.values(h.s.market.stocks).find(x=>!x.fund);
 a.holdings[x.id]={quantity:1,cost:100,since:h.now};x.delistAt=h.now;x.settlement=0;
 h.K.calendar(h.s,h.now,h.env);
 assert.equal(x.status,'비상장');assert.equal(a.holdings[x.id],undefined);
 assert.ok((a.alerts||[]).some(n=>n.symbol===x.id&&/상장폐지/.test(n.title)));
});
