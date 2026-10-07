var King = typeof King === 'undefined' ? {} : King;
King.addAlert = function(a,id,kind,title,body,t,symbol) {
  a.alerts=a.alerts||[];if(a.alerts.some(function(n){return n.id===id;}))return;
  a.alerts.push({id,kind,title,body,at:t,symbol:symbol||null});a.alerts=a.alerts.slice(-200);
};
King.alertRisk = function(s,x,title,body,t,id) {
  if(!x||!/거래정지|거래 재개|거래재개|상장폐지/.test(title))return;
  if(/상장폐지/.test(title)&&x.status!=='비상장')return;
  Object.values(s.accounts).forEach(function(a){if(a.holdings[x.id]||a.settings.favorites.indexOf(x.id)>=0)King.addAlert(a,id,/상장폐지/.test(title)?'delisted':/재개/.test(title)?'resume':'halt',title,body,t,x.id);});
};
King.checkAlerts = function(s,t) {
  Object.values(s.accounts).forEach(function(a){(a.priceAlerts||[]).forEach(function(rule){
    var x=s.market.stocks[rule.symbol];if(rule.triggered||!x||x.status!=='상장'||t<=rule.at)return;
    if(rule.direction==='above'?x.price>=rule.price:x.price<=rule.price){rule.triggered=t;King.addAlert(a,rule.id,rule.direction==='above'?'targetAbove':'targetBelow',x.name+' 목표가 도달','설정 '+rule.price+'원 · 확인 시세 '+x.price+'원. 자동 주문은 실행하지 않습니다.',t,x.id);}
  });});
};
King.setPriceAlert = function(s,a,r,t,env) {
  a.priceAlerts=a.priceAlerts||[];
  if(r.remove){a.priceAlerts=a.priceAlerts.filter(function(v){return v.id!==r.remove;});return {};}
  King.instrument(s,a,r.symbol,t);if(['above','below'].indexOf(r.direction)<0)King.fail('목표가 방향을 확인해 주세요.');
  var price=King.int(r.price,1,1000000000);if(a.priceAlerts.filter(function(v){return !v.triggered;}).length>=20)King.fail('활성 목표가는 최대 20개입니다.');
  a.priceAlerts=a.priceAlerts.filter(function(v){return !v.triggered;});var rule={id:env.id(),symbol:r.symbol,direction:r.direction,price,at:t};a.priceAlerts.push(rule);return {priceAlert:rule};
};

King.notificationOptions=[
 ['buyFilled','예약 매수 체결','예약','orders'],['sellFilled','예약 매도 체결','예약','orders'],['stopFilled','손절·OCO 체결','예약','orders'],['orderFailed','예약 주문 실패','예약','orders'],['orderClosed','예약 만료·자동 취소','예약','orders'],
 ['targetAbove','목표 가격 이상 도달','시세','targets'],['targetBelow','목표 가격 이하 도달','시세','targets'],['halt','보유·관심 종목 거래정지','시세','risk'],['resume','보유·관심 종목 거래 재개','시세','risk'],['delisted','실제 상장폐지 처리 결과','시세','risk'],
 ['dividend','주식 배당 수령 가능','보상'],['distribution','ETF 분배금 수령 가능','보상'],['reward','관리자 보상 도착','보상'],['attendance','오늘 출석 보상','보상'],['achievement','업적 달성','성장'],['level','레벨 상승','성장'],
 ['heldNews','보유 종목 새 뉴스','뉴스'],['favoriteNews','관심 종목 새 뉴스','뉴스'],['marketNews','시장·경제 새 뉴스','뉴스'],['friendRequest','친구 요청 도착','친구'],['friendAccepted','친구 요청 수락','친구'],['notice','운영 공지','공지'],['update','업데이트 안내','공지'],['maintenance','점검 안내','공지'],['supportReply','고객센터 새 답변','대화'],['friendMessage','친구 새 메시지','대화']
].map(function(v){return {id:v[0],label:v[1],category:v[2],legacy:v[3]||null};});
King.notificationSettings=function(a){var old=a.settings.notifications||{},next={};King.notificationOptions.forEach(function(o){next[o.id]=o.id in old?old[o.id]!==false:!o.legacy||old[o.legacy]!==false;});a.settings.notifications=next;return next;};
King.orderAlertKind=function(type,data){if(type==='예약 체결')return data.kind==='stop'||data.kind==='oco'?'stopFilled':data.kind==='limitSell'?'sellFilled':'buyFilled';if(type==='예약 실패')return 'orderFailed';if(type==='예약 만료'||/로 예약 취소$/.test(type))return 'orderClosed';return null;};
King.alertNews=function(s,n,t){
 // Delisting forecasts remain articles, never advance warnings in the alert feed.
 if(/상장폐지/.test(n.title+' '+(n.fact||'')))return;
 Object.values(s.accounts).forEach(function(a){if(n.at<a.started)return;var kind=!n.symbol?'marketNews':a.holdings[n.symbol]?'heldNews':a.settings.favorites.indexOf(n.symbol)>=0?'favoriteNews':null;if(kind){King.addAlert(a,n.id,kind,n.title,'뉴스에서 내용을 확인해 주세요.',t,n.symbol);if(kind==='heldNews'&&a.settings.favorites.indexOf(n.symbol)>=0)a.alerts.find(function(v){return v.id===n.id;}).alsoFavorite=true;}});
};
King.notificationFeed=function(s,a,t,proxy,includeMuted){
 var settings=King.notificationSettings(a),items=[],options={};King.notificationOptions.forEach(function(o){options[o.id]=o;});
 function add(id,kind,title,body,at,symbol){items.push({id,kind,title,body,at,symbol:symbol||null});}
 (a.alerts||[]).forEach(function(n){var kind=n.kind;if(kind==='heldNews'&&n.alsoFavorite&&settings.heldNews===false)kind='favoriteNews';
   if(kind==='risk'){if(/상장폐지/.test(n.title)){var article=s.market.news.find(function(v){return v.id===n.id;});if(!article||!/상장폐지되었습니다/.test(article.fact||''))return;kind='delisted';}else kind=/재개/.test(n.title)?'resume':'halt';}
   if(kind==='orders'){var rec=s.records[n.id];kind=rec?King.orderAlertKind(rec.type,rec.data):'buyFilled';}
   if(kind==='targets'){var rule=(a.priceAlerts||[]).find(function(v){return v.id===n.id;});kind=rule&&rule.direction==='below'?'targetBelow':'targetAbove';}
   if(proxy&&['friendRequest','friendAccepted','supportReply','friendMessage'].indexOf(kind)>=0)return;
   add(n.id,kind,n.title,n.body,n.at,n.symbol);
 });
 Object.values(s.claims).forEach(function(c){if(c.accountId!==a.id||c.status!=='대기'||!c.reward&&c.runId!==a.runId||c.payAt>t)return;var kind=c.reward?'reward':(s.market.stocks[c.symbol]||{}).fund?'distribution':'dividend';add('claim-'+c.id,kind,options[kind].label,c.reward?c.reason||'보상함에서 확인해 주세요.':(c.name||'배당')+' · '+c.net+'원',c.payAt||c.at,c.symbol);});
 var attendance=King.attendanceView(a,t);if(attendance.firstGranted&&!attendance.claimed)add('attendance-'+a.runId+'-'+King.date(t),'attendance','오늘 출석 보상','출석 메뉴에서 '+attendance.amount+'원을 받아 주세요.',Date.parse(King.date(t)+'T00:00:00+09:00'));
 Object.values(s.announcements).forEach(function(n){if(n.status!=='게시'||n.targets!=='all'&&n.targets.indexOf(a.id)<0)return;add(n.id,['update','maintenance'].indexOf(n.kind)>=0?n.kind:'notice',n.title,n.body,n.at);});
 return items.filter(function(n){return options[n.kind]&&(includeMuted||settings[n.kind]!==false);}).map(function(n){n.category=options[n.kind].category;return n;}).sort(function(x,y){return y.at-x.at;});
};
