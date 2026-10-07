/* Pure server engine. Loaded by Apps Script and the Node verification harness. */
var King = typeof King === 'undefined' ? {} : King;
King.VERSION = 1;
King.MINUTE = 60000;
King.DAY = 86400000;
King.clone = function(v) { return JSON.parse(JSON.stringify(v)); };
King.fail = function(message) { throw new Error(message); };
King.date = function(t) { return new Date(t + 32400000).toISOString().slice(0,10); };
King.stamp = function(t) { return new Date(t + 32400000).toISOString().slice(0,19).replace('T',' '); };
King.day = function(a,t) { return Math.floor((Date.parse(King.date(t))-Date.parse(King.date(a.started)))/King.DAY)+1; };
King.int = function(v,min,max) { if(!Number.isSafeInteger(v)||v<min||v>max) King.fail('유효한 정수 범위를 확인해 주세요.'); return v; };
King.text = function(v,max) { if(typeof v!=='string'||v.length>max) King.fail('입력 길이를 확인해 주세요.'); return v.trim(); };
King.random = function(seed) { var x=2166136261; for(var i=0;i<seed.length;i++){x^=seed.charCodeAt(i);x=Math.imul(x,16777619);} return (x>>>0)/4294967296; };
// Mix all hash bits so adjacent minute strings do not cause sustained price drift.
King.priceNoise = function(seed) {var x=Math.floor(King.random(seed)*4294967296);x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return (x>>>0)/4294967296;};
King.catalog = function(t) {
  var rows=[
    ['005930','삼성전자','반도체',70000],['000660','SK하이닉스','반도체',170000],
    ['005380','현대자동차','자동차',220000],['000270','기아','자동차',100000],
    ['051910','LG화학','에너지',300000],['006400','삼성SDI','에너지',350000],
    ['207940','삼성바이오로직스','바이오',900000],['068270','셀트리온','바이오',180000],
    ['035420','NAVER','디지털',200000],['035720','카카오','디지털',50000],
    ['090430','아모레퍼시픽','소비재',130000],['097950','CJ제일제당','소비재',320000],
    ['240810','원익IPS','반도체',35000],['058470','리노공업','반도체',200000],
    ['067990','도이치모터스','자동차',5000],['053270','구영테크','자동차',2500],
    ['247540','에코프로비엠','에너지',180000],['086520','에코프로','에너지',90000],
    ['196170','알테오젠','바이오',200000],['145020','휴젤','바이오',220000],
    ['263750','펄어비스','디지털',40000],['293490','카카오게임즈','디지털',20000],
    ['214150','클래시스','소비재',45000],['237880','클리오','소비재',30000]
  ];
  var descriptions={'반도체':'반도체 설계·제조 또는 장비와 부품 사업. AI 수요, 공급 능력과 설비 비용의 영향을 받습니다.','자동차':'자동차 제조·부품 또는 유통 사업. 소비 심리, 원재료와 수출 여건의 영향을 받습니다.','에너지':'배터리·소재와 화학 관련 사업. 원자재 가격, 수요와 생산 비용의 영향을 받습니다.','바이오':'바이오 의약품 또는 의료 관련 사업. 연구 결과, 허가와 경쟁의 영향을 받습니다.','디지털':'플랫폼·콘텐츠 또는 게임 사업. 이용자 수, 광고와 콘텐츠 경쟁의 영향을 받습니다.','소비재':'식품·뷰티·소비 관련 사업. 소비 지출, 브랜드 경쟁과 해외 수요의 영향을 받습니다.'};
  var stocks={}; rows.forEach(function(r,i){stocks[r[0]]={id:r[0],name:r[1],sector:r[2],price:r[3],base:r[3],fundamental:r[3],pressure:0,market:i<12?'KOSPI':'KOSDAQ',status:'상장',listed:King.date(t),high:r[3],low:r[3],float:10000000+i*1700000,liquidity:200000000,description:descriptions[r[2]],history:[[Math.floor(t/60000)*60000,r[3]]],financials:[{at:t,revenue:100000000000*(i+1),profit:10000000000*(i+1),debt:30000000000*(i+1)}]};});return stocks;
};
King.initial = function(t) {return {schema:1,revision:0,market:{minute:Math.floor(t/60000),date:King.date(t),stocks:King.catalog(t),flows:[],news:[],economy:{rate:3,inflation:2.3,activity:100},calendar:[]},accounts:{},sessions:{},quotes:{},requests:{},orders:{},receipts:{},records:{},claims:{},announcements:{},reports:{},audits:{},adminSessions:{},proxies:{},maintenance:{enabled:false,reason:'',until:''}};};
King.log = function(s,a,type,data,t,env) {a.backupVersion=(a.backupVersion||0)+1;var id=env.id();if(King.addAlert&&/^예약 (체결|실패|만료)/.test(type))King.addAlert(a,id,'orders',type,(s.market.stocks[data.symbol]||{}).name||'예약 상태가 변경되었습니다.',t,data.symbol);s.records[id]={id,accountId:a.id,runId:a.runId,day:King.day(a,t),at:t,time:King.stamp(t),type,data:King.clone(data)};return id;};
King.advance = function(s,t,env) {
  if(King.seedNews)King.seedNews(s,t,env);
  if(!s.market.seed)s.market.seed=env.sign('market-seed:'+s.market.minute);
  var end=Math.min(Math.floor(t/60000),s.market.minute+360),m=s.market;
  while(m.minute<end){m.minute++;var at=m.minute*60000,date=King.date(at);
    if(date!==m.date){Object.values(m.stocks).forEach(function(x){x.base=x.price;});m.date=date;}
    if(King.calendar)King.calendar(s,at,env);
    m.flows=m.flows.filter(function(f){return f.at>at-900000;});
    Object.values(m.stocks).filter(function(x){return !x.fund&&x.status==='상장';}).forEach(function(x){
      var net={};m.flows.filter(function(f){return f.symbol===x.id;}).forEach(function(f){net[f.accountId]=(net[f.accountId]||0)+f.amount;});
      var target=Object.keys(net).length>=3?Math.max(-.05,Math.min(.05,Object.values(net).reduce(function(v,n){return v+Math.max(-x.liquidity*.02,Math.min(x.liquidity*.02,n));},0)/x.liquidity)):0;
      x.pressure=x.pressure*.8+target*.2;
      var economy=m.economy,rateSensitivity={반도체:1.2,자동차:1,에너지:1.1,바이오:1.5,디지털:1.3,소비재:.7}[x.sector]||1;
      var common=(King.priceNoise(m.seed+':market:'+m.minute)-.5)*.0015,sector=(King.priceNoise(m.seed+':'+x.sector+':'+m.minute)-.5)*.004;
      var last=x.financials[x.financials.length-1],debtLoad=last.debt/Math.max(1,last.revenue);
      var macro=((economy.activity-100)*.15-(economy.rate-3)*rateSensitivity*(1+debtLoad)-(economy.inflation-2.3)*.3)*.000003;
      var shock=common+sector+(King.priceNoise(m.seed+':'+x.id+':'+m.minute)-.5)*.008+macro+(x.trend||0)*.00001;
      x.trend=(x.trend||0)*.9985;
      x.fundamental=Math.max(1,x.fundamental*(1+shock));
      x.price=Math.max(Math.ceil(x.base*.7),Math.min(Math.floor(x.base*1.3),Math.round(x.fundamental*(1+x.pressure))));
      x.price=Math.max(1,x.price);x.high=Math.max(x.high,x.price);x.low=Math.min(x.low,x.price);x.history.push([at,x.price]);
    });
    if(King.updateFunds)King.updateFunds(s,at);
    if(King.fillOrders)King.fillOrders(s,at,env);if(King.checkAlerts)King.checkAlerts(s,at);
    if(m.minute%60===0) Object.values(m.stocks).forEach(function(x){x.history=x.history.filter(function(p){var age=at-p[0];return age<=7*King.DAY||age<=90*King.DAY&&p[0]%3600000===0||p[0]%(King.DAY)===0;});});
  }
  return m.minute===Math.floor(t/60000);
};
// OHLC from retained samples only; older hourly/daily samples are never expanded into invented prices.
King.chartBars = function(points,interval) {
  var buckets={},offset=interval===King.DAY?32400000:0;
  points.forEach(function(p){var time=Math.floor((p[0]+offset)/interval)*interval-offset,b=buckets[time];
    if(b){b.high=Math.max(b.high,p[1]);b.low=Math.min(b.low,p[1]);b.close=p[1];b.samples++;}
    else buckets[time]={time:time,open:p[1],high:p[1],low:p[1],close:p[1],samples:1};
  });return Object.keys(buckets).map(Number).sort(function(a,b){return a-b;}).slice(-48).map(function(time){return buckets[time];});
};
King.snapshot = function(s,a,t,proxy,env) {
  King.ensureProgression(a);King.notificationSettings(a);var holdings={},stockValue=0,etfValue=0;
  Object.keys(a.holdings).forEach(function(id){var h=King.clone(a.holdings[id]),x=s.market.stocks[id];h.price=x&&x.status!=='비상장'?x.price:0;h.value=h.price*h.quantity;h.available=h.quantity-King.lockedQuantity(s,a,id);h.profit=h.value-h.cost;h.average=h.quantity?h.cost/h.quantity:0;holdings[id]=h;if(x&&x.fund)etfValue+=h.value;else stockValue+=h.value;});
  var claims=Object.values(s.claims).filter(function(c){return c.accountId===a.id&&c.status==='대기'&&(c.reward||c.runId===a.runId);});
  var dividends=claims.filter(function(c){return !c.reward;}).reduce(function(v,c){return v+c.net;},0);
  var stocks=Object.values(s.market.stocks).map(function(x){var v=King.clone(x);['fundamental','trend','pressure','tradeEpoch'].forEach(function(key){delete v[key];});if(env&&x.status==='상장'&&s.market.minute===Math.floor(t/60000))v.offer=King.priceOffer(a,x,t,env);v.chartBars={hour:King.chartBars(x.history,3600000),day:King.chartBars(x.history,King.DAY)};v.history=v.history.slice(-240);if(King.day(a,t)<2)delete v.financials;if(v.fund&&King.day(a,t)<4){delete v.fund;delete v.history;delete v.chartBars;}return v;});
  return {revision:s.revision,serverTime:t,marketTime:s.market.minute*60000,catchingUp:s.market.minute<Math.floor(t/60000),taxPolicy:{version:'kr-2026-day3-v1',enabled:King.day(a,t)>=3,fromDay:3,stockRate:.002,etfRate:0,dividendRate:.154},achievementTargets:King.achievementTargets,day:King.day(a,t),account:{id:a.id,name:a.name,runId:a.runId,started:a.started,joined:a.joined,cash:a.cash,startingCash:a.startingCash||10000000,realized:a.realized,playSeconds:a.playSeconds,lifetimeSeconds:a.lifetimeSeconds,logins:a.logins,lastLogin:a.lastLogin,settings:a.settings,tutorial:a.tutorial,tutorialStep:a.tutorialStep,growth:King.levelInfo(a.xp),contributedCash:a.contributedCash,achievements:a.achievements,statistics:a.statistics},attendance:King.attendanceView(a,t),holdings,stocks,news:s.market.news.slice(-80).reverse().map(function(n){return King.publicNews(n,King.day(a,t));}),readNews:a.readNews,readAlerts:a.readAlerts||[],availableCash:a.cash-King.lockedCash(s,a),stockValue,etfValue,dividends,total:a.cash+stockValue+etfValue+dividends,claims,orders:Object.values(s.orders).filter(function(o){return o.accountId===a.id&&o.runId===a.runId;}).slice(-100).reverse().map(function(o){var v=King.clone(o);delete v.admin;return v;}),announcements:Object.values(s.announcements).filter(function(n){return n.status==='게시'&&(n.targets==='all'||n.targets.indexOf(a.id)>=0);}).map(function(n){return {id:n.id,title:n.title,body:n.body,at:n.at};}),economy:King.day(a,t)>=3?s.market.economy:null,assetHistory:a.assetHistory,alerts:(a.alerts||[]).filter(function(n){return a.settings.notifications[n.kind]!==false;}).slice().reverse(),priceAlerts:a.priceAlerts||[],trades:Object.values(s.receipts).filter(function(v){return v.accountId===a.id&&v.runId===a.runId;}).slice(-100).map(function(v){return {id:v.id,symbol:v.symbol,side:v.side,quantity:v.quantity,price:v.price,at:v.at,memo:v.memo};}),admin:!!proxy||false,proxy:proxy?{name:a.name,id:a.id}:null};
};
King.execute = function(original,req,env) {
  var s=King.clone(original),t=env.now(),action=req.action;
  if(req.version!==King.VERSION)King.fail('버전이 다릅니다. 새로고침 후 다시 시도해 주세요.');
  if(action==='status')return {state:original,response:{service:'stock-king',version:1,maintenance:s.maintenance,serverTime:t}};
  if(action==='signup'||action==='login')return King.login(s,req,env);
  var auth=King.authenticate(s,req,env),a=auth.account;King.ensureProgression(a);
  var adminAction=action.indexOf('admin')===0;
  if(action==='logout'){if(!auth.proxy&&!env.isAdmin(a.name))King.log(s,a,'로그아웃',{},t,env);delete s.sessions[env.hash(req.token)];s.revision++;return {state:s,response:{ok:true}};}
  if(s.maintenance.enabled&&!auth.admin&&!(action==='adminUnlock'&&env.isAdmin(auth.actor.name)&&env.adminCheck(req.secret||'')))King.fail('점검 중: '+s.maintenance.reason);
  if(a.restricted&&(!a.restricted.until||a.restricted.until>t)&&!auth.admin)King.fail('이용 제한: '+a.restricted.reason);
  if(action==='logout'){if(!auth.proxy&&!env.isAdmin(a.name))King.log(s,a,'로그아웃',{},t,env);delete s.sessions[env.hash(req.token)];s.revision++;return {state:s,response:{ok:true}};}
  var ready=King.advance(s,t,env);
  if(!ready&&action!=='sync')return {state:s,response:{error:'MARKET_CATCHUP',message:'시장을 동기화하고 있습니다. 잠시 후 다시 시도해 주세요.',remaining:Math.floor(t/60000)-s.market.minute}};
  var reads=['friendRanking','friendMessages','supportList','supportRead','adminSupportList','adminSupportRead','friends','friendSearch','friendProfile','sync','quote','records','receipt','backup','adminOverview','adminPlayer'];
  var mutation=reads.indexOf(action)<0;
  if(mutation&&!adminAction&&req.runId!==a.runId)King.fail('회차가 변경되었습니다. 다시 동기화해 주세요.');
  if(adminAction&&action!=='adminUnlock'&&(!auth.admin||auth.proxy))King.fail('관리자 인증이 필요합니다.');
  if(King.chatActions.indexOf(action)>=0&&action!=='supportRead'&&action!=='adminSupportRead')King.chatAuthorize(s,a,auth,req);
  var requestKey;
  if(mutation){if(typeof req.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(req.requestId))King.fail('요청 식별자를 확인해 주세요.');requestKey=auth.actor.id+':'+req.requestId;var previous=s.requests[requestKey];if(previous){if(previous.action!==action||previous.accountId!==a.id)King.fail('이미 사용한 요청 식별자입니다.');var cachedResult=['friendSettings','friendRequest','friendRespond','friendRemove'].indexOf(action)>=0?King.friends(s,a,{action:'friends'},t,env,auth):previous.result;return {state:s,response:Object.assign({},cachedResult,{snapshot:King.snapshot(s,a,t,auth.proxy,env)})};}}
  if(action==='reset'||action==='deleteAccount'){var lifecycle=King.accountLifecycle(s,a,req,t,env,auth);s.revision++;if(lifecycle.snapshot)lifecycle.snapshot.revision=s.revision;return {state:s,response:lifecycle};}
  if(action==='backup'&&King.achievements)King.achievements(s,a,t,env);
  var result={},proxyBefore=auth.proxy&&mutation?King.proxyState(s,a):null;
  if(action==='sync'){if(!auth.proxy)King.activity(s,a,req,t,env);}
  else if(King.chatActions.indexOf(action)>=0)result=King.chats(s,a,req,t,env,auth);
  else if(adminAction)result=King.admin(s,a,auth,req,env);
  else if(action==='quote')result=King.quote(s,a,req,t,env);
  else if(action==='trade')result=King.trade(s,a,req,t,env,env.isAdmin(auth.actor.name));
  else if(action==='order')result=King.order(s,a,req,t,env,env.isAdmin(auth.actor.name));
  else if(action==='cancel')result=King.cancel(s,a,req,t,env);
  else if(['friendRanking','friends','friendSearch','friendProfile','friendSettings','friendRequest','friendRespond','friendRemove'].indexOf(action)>=0)result=King.friends(s,a,req,t,env,auth);
  else if(King.personal)result=King.personal(s,a,req,t,env,auth);
  else King.fail('지원하지 않는 요청입니다.');
  if(King.achievements)King.achievements(s,a,t,env);
  if(auth.proxy&&mutation)King.audit(s,auth.actor,a.id,action,proxyBefore,King.proxyState(s,a),t,env,'대리 조작');
  if(mutation&&!adminAction)a.backupVersion=(a.backupVersion||0)+1;
  if(result.order){result.order=King.clone(result.order);delete result.order.admin;}
  s.revision++;
  if(mutation)s.requests[requestKey]={action,accountId:a.id,at:t,result:King.clone(result)};
  if(action==='quote')s.quotes[result.quote.id]=result.quote;
  Object.keys(s.quotes).forEach(function(id){if(s.quotes[id].expires<t-60000)delete s.quotes[id];});
  result.snapshot=King.snapshot(s,a,t,auth.proxy,env);result.snapshot.admin=env.isAdmin(auth.actor.name);
  return {state:s,response:result};
};
