var King = typeof King === 'undefined' ? {} : King;
King.costs = function(x,side,q,p,a,t) {
 var gross=King.int(q*p,1,900000000000000),fee=Math.ceil(gross*.0005),taxDetails=[],rate=0;
 if(side==='sell'&&x.market!=='ETF'&&a&&King.day(a,t)>=3){
  rate=.002;
  taxDetails=x.market==='KOSPI'?[{name:'증권거래세',rate:.0005,amount:Math.floor(gross/2000)},{name:'농어촌특별세',rate:.0015,amount:Math.floor(gross*3/2000)}]:[{name:'증권거래세',rate:.002,amount:Math.floor(gross/500)}];
 }
 var tax=taxDetails.reduce(function(v,x){return v+x.amount;},0);
 return {gross,fee,feeRate:.0005,tax,taxRate:rate,taxDetails,taxName:'세금',taxVersion:'kr-2026-day3-v1',totalCost:fee+tax,net:side==='buy'?gross+fee+tax:gross-fee-tax};
};
King.lockedCash = function(s,a) {return Object.values(s.orders).filter(function(o){return o.accountId===a.id&&o.runId===a.runId&&o.status==='대기'&&o.kind==='limitBuy';}).reduce(function(v,o){return v+o.reserved;},0);};
King.lockedQuantity = function(s,a,symbol) {return Object.values(s.orders).filter(function(o){return o.accountId===a.id&&o.runId===a.runId&&o.symbol===symbol&&o.status==='대기'&&o.kind!=='limitBuy';}).reduce(function(v,o){return v+o.quantity;},0);};
King.instrument = function(s,a,id,t) {var x=s.market.stocks[id];if(!x||x.status!=='상장')King.fail('현재 거래할 수 없는 종목입니다.');if(x.market==='ETF'&&King.day(a,t)<4)King.fail('ETF는 DAY 4에 열립니다.');return x;};
King.quote = function(s,a,r,t,env) {var x=King.instrument(s,a,r.symbol,t),q=King.int(r.quantity,1,100000000);if(['buy','sell'].indexOf(r.side)<0)King.fail('거래 방향을 확인해 주세요.');return {quote:Object.assign({id:env.id(),accountId:a.id,runId:a.runId,symbol:x.id,side:r.side,quantity:q,price:x.price,minute:s.market.minute,expires:t+20000},King.costs(x,r.side,q,x.price,a,t))};};
King.validateSettlement = function(s,a,x,side,q,price,t) {
  var c=King.costs(x,side,q,price,a,t),h=a.holdings[x.id];
  if(side==='buy'){
    if(a.cash-King.lockedCash(s,a)<c.net)King.fail('사용 가능한 현금이 부족합니다.');
    King.int((h?h.quantity:0)+q,1,900000000000000);King.int((h?h.cost:0)+c.net,0,900000000000000);
  }else if(!h||h.quantity-King.lockedQuantity(s,a,x.id)<q)King.fail('매도 가능한 수량이 부족합니다.');
  King.int(a.cash+(side==='buy'?-c.net:c.net),0,900000000000000);
};
King.settle = function(s,a,x,side,q,price,t,env,orderId,memo,admin) {
  King.validateSettlement(s,a,x,side,q,price,t);
  var c=King.costs(x,side,q,price,a,t),h=a.holdings[x.id];
  if(side==='buy'){
    if(a.cash-King.lockedCash(s,a)<c.net)King.fail('사용 가능한 현금이 부족합니다.');a.cash-=c.net;
    if(!h)h=a.holdings[x.id]={quantity:0,cost:0,since:t};h.quantity+=q;h.cost+=c.net;
  }else{
    if(!h||h.quantity-King.lockedQuantity(s,a,x.id)<q)King.fail('매도 가능한 수량이 부족합니다.');
    var basis=q===h.quantity?h.cost:Math.floor(h.cost*q/h.quantity);h.quantity-=q;h.cost-=basis;a.cash+=c.net;c.realized=c.net-basis;a.realized+=c.realized;if(!h.quantity)delete a.holdings[x.id];
  }
  King.int(a.cash,0,900000000000000);
  var id=env.id(),receipt=Object.assign({id,orderId:orderId||id,accountId:a.id,runId:a.runId,symbol:x.id,name:x.name,side,quantity:q,price,at:t,time:King.stamp(t),cashAfter:a.cash,memo:memo||'',newsIds:s.market.news.filter(function(n){return !n.symbol||n.symbol===x.id;}).slice(-4).map(function(n){return n.id;}),newsAtTrade:s.market.news.filter(function(n){return !n.symbol||n.symbol===x.id;}).slice(-4).map(function(n){return {title:n.title,fact:n.fact,at:n.at};})},c);s.receipts[id]=receipt;
  King.log(s,a,side==='buy'?'매수':'매도',receipt,t,env);
  if(!admin)King.awardXp(a,'trade',t);if(memo)a.statistics.memos++;
  if(!admin&&x.market!=='ETF')s.market.flows.push({at:t,accountId:a.id,symbol:x.id,amount:(side==='buy'?1:-1)*c.gross});
  return receipt;
};
King.offerSignature = function(a,x,o,env) {return env.sign(JSON.stringify(['trade-offer-v1',a.id,a.runId,x.id,x.float,x.tradeEpoch||0,o.price,o.issued,o.expires]));};
King.priceOffer = function(a,x,t,env) {var o={price:x.price,issued:t,expires:t+20000};o.signature=King.offerSignature(a,x,o,env);return o;};
King.trade = function(s,a,r,t,env,admin) {
 if(r.offer){
  var x=King.instrument(s,a,r.symbol,t),o=r.offer;
  if(!Number.isSafeInteger(o.price)||o.price<1||!Number.isSafeInteger(o.issued)||o.issued>t||o.expires!==o.issued+20000||t>=o.expires||o.signature!==King.offerSignature(a,x,o,env))King.fail('시세 확인 시간이 지났거나 유효하지 않습니다. 최신 시세를 확인해 주세요.');
  if(['buy','sell'].indexOf(r.side)<0)King.fail('거래 방향을 확인해 주세요.');
  return {receipt:King.settle(s,a,x,r.side,King.int(r.quantity,1,100000000),o.price,t,env,null,King.text(r.memo||'',200),admin)};
 }
 var q=s.quotes[r.quoteId];if(!q||q.accountId!==a.id||q.runId!==a.runId||q.expires<=t||q.minute!==s.market.minute)King.fail('시세가 변경되거나 만료되었습니다. 다시 확인해 주세요.');var x=King.instrument(s,a,q.symbol,t);if(x.price!==q.price)King.fail('시세가 변경되었습니다.');var receipt=King.settle(s,a,x,q.side,q.quantity,q.price,t,env,null,King.text(r.memo||'',200),admin);delete s.quotes[q.id];return {receipt};
};
King.order = function(s,a,r,t,env,admin) {
  var x=King.instrument(s,a,r.symbol,t),q=King.int(r.quantity,1,100000000),price=King.int(r.price,1,1000000000);
  if(['limitBuy','limitSell','stop','oco'].indexOf(r.kind)<0)King.fail('예약 종류를 확인해 주세요.');
  var expiry=r.expiryDays===undefined?7:r.expiryDays;if([0,1,7].indexOf(expiry)<0)King.fail('만료 기간을 확인해 주세요.');
  var o={id:env.id(),accountId:a.id,runId:a.runId,symbol:x.id,kind:r.kind,quantity:q,price,at:t,expires:expiry?t+expiry*King.DAY:null,status:'대기',admin:!!admin};
  if(r.kind==='oco'){o.stop=King.int(r.stop,1,price-1);}
  if(r.kind==='limitBuy'){o.reserved=King.costs(x,'buy',q,price).net;if(a.cash-King.lockedCash(s,a)<o.reserved)King.fail('사용 가능한 현금이 부족합니다.');}
  else if(!a.holdings[x.id]||a.holdings[x.id].quantity-King.lockedQuantity(s,a,x.id)<q)King.fail('매도 가능한 수량이 부족합니다.');
  s.orders[o.id]=o;King.log(s,a,'예약 등록',o,t,env);return {order:o};
};
King.cancel = function(s,a,r,t,env) {var o=s.orders[r.orderId];if(!o||o.accountId!==a.id||o.runId!==a.runId)King.fail('주문을 찾을 수 없습니다.');if(o.status==='대기'){o.status='취소';o.closed=t;King.log(s,a,'예약 취소',o,t,env);}return {order:o};};
King.fillOrders = function(s,t,env) {
  Object.values(s.orders).filter(function(o){return o.status==='대기';}).sort(function(a,b){return a.at-b.at||a.id.localeCompare(b.id);}).forEach(function(o){
    var a=s.accounts[o.accountId],x=s.market.stocks[o.symbol];
    if(!a||a.runId!==o.runId){o.status='취소';return;}
    if(o.expires&&t>=o.expires){o.status='만료';King.log(s,a,'예약 만료',o,t,env);return;}
    if(!x||x.status==='비상장'){o.status='취소';King.log(s,a,'종목 상태로 예약 취소',o,t,env);return;}
    if(t<=o.at||x.status!=='상장')return;
    var buy=o.kind==='limitBuy',hit=buy?x.price<=o.price:o.kind==='limitSell'?x.price>=o.price:o.kind==='stop'?x.price<=o.price:x.price>=o.price||x.price<=o.stop;
    if(!hit)return;
    o.status='체결';o.closed=t;
    // Release this order's reservation before applying the fill; other reservations remain.
    try{King.validateSettlement(s,a,x,buy?'buy':'sell',o.quantity,x.price,t);}catch(error){o.status='실패';o.reason=error.message;King.log(s,a,'예약 실패',o,t,env);return;}
    var receipt=King.settle(s,a,x,buy?'buy':'sell',o.quantity,x.price,t,env,o.id,'',o.admin);o.receiptId=receipt.id;King.log(s,a,'예약 체결',o,t,env);
    if(o.kind==='oco'){o.filledLeg=x.price>=o.price?'익절':'손절';o.otherLeg='취소';}
  });
};
