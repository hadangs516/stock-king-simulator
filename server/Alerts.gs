var King = typeof King === 'undefined' ? {} : King;
King.addAlert = function(a,id,kind,title,body,t,symbol) {
  a.alerts=a.alerts||[];if(a.alerts.some(function(n){return n.id===id;}))return;
  a.alerts.push({id,kind,title,body,at:t,symbol:symbol||null});a.alerts=a.alerts.slice(-200);
};
King.alertRisk = function(s,x,title,body,t,id) {
  if(!x||!/거래정지|상장폐지/.test(title))return;
  Object.values(s.accounts).forEach(function(a){if(a.holdings[x.id]||a.settings.favorites.indexOf(x.id)>=0)King.addAlert(a,id,'risk',title,body,t,x.id);});
};
King.checkAlerts = function(s,t) {
  Object.values(s.accounts).forEach(function(a){(a.priceAlerts||[]).forEach(function(rule){
    var x=s.market.stocks[rule.symbol];if(rule.triggered||!x||x.status!=='상장'||t<=rule.at)return;
    if(rule.direction==='above'?x.price>=rule.price:x.price<=rule.price){rule.triggered=t;King.addAlert(a,rule.id,'targets',x.name+' 목표가 도달','설정 '+rule.price+'원 · 확인 시세 '+x.price+'원. 자동 주문은 실행하지 않습니다.',t,x.id);}
  });});
};
King.setPriceAlert = function(s,a,r,t,env) {
  a.priceAlerts=a.priceAlerts||[];
  if(r.remove){a.priceAlerts=a.priceAlerts.filter(function(v){return v.id!==r.remove;});return {};}
  King.instrument(s,a,r.symbol,t);if(['above','below'].indexOf(r.direction)<0)King.fail('목표가 방향을 확인해 주세요.');
  var price=King.int(r.price,1,1000000000);if(a.priceAlerts.filter(function(v){return !v.triggered;}).length>=20)King.fail('활성 목표가는 최대 20개입니다.');
  a.priceAlerts=a.priceAlerts.filter(function(v){return !v.triggered;});var rule={id:env.id(),symbol:r.symbol,direction:r.direction,price,at:t};a.priceAlerts.push(rule);return {priceAlert:rule};
};

King.notificationSettings=function(a){var old=a.settings.notifications||{},next={};['risk','orders','targets'].forEach(function(k){next[k]=old[k]!==false;});a.settings.notifications=next;return next;};
