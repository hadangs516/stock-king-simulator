var King = typeof King === 'undefined' ? {} : King;
King.audit = function(s,actor,target,action,before,after,t,env,reason) {var id=env.id();s.audits[id]={id,actorId:actor.id,actor:actor.name,target,action,before:King.clone(before),after:King.clone(after),reason,at:t,time:King.stamp(t)};};
King.targets = function(s,input) {if(!Array.isArray(input)||!input.length||input.length>200)King.fail('대상을 1~200명 선택해 주세요.');var ids=Array.from(new Set(input));if(ids.some(function(id){return !s.accounts[id];}))King.fail('대상 계정을 확인해 주세요.');return ids;};
King.admin = function(s,a,auth,r,env) {
  var t=env.now(),actor=auth.actor;
  if(r.action==='adminUnlock'){
    if(!env.isAdmin(actor.name)||!env.adminCheck(r.secret||''))King.fail('관리자 인증에 실패했습니다.');
    var token=env.id()+env.id()+env.id();s.adminSessions[env.hash(token)]={accountId:actor.id,session:env.hash(r.token),expires:t+900000};
    return {adminToken:token,expires:t+900000};
  }
  if(!auth.admin||auth.proxy)King.fail('관리자 인증이 필요합니다.');
  if(r.action==='adminOverview'){
    var filter=King.text(r.search||'',30),offset=King.int(r.offset||0,0,10000000),players=Object.values(s.accounts).filter(function(u){return u.name.indexOf(filter)>=0;}).map(function(u){var v=King.snapshot(s,u,t);return {id:u.id,name:u.name,cash:u.cash,total:v.total,joined:u.joined,lastLogin:u.lastLogin,lastSeen:u.lastSeen,logins:u.logins,lifetimeSeconds:u.lifetimeSeconds,restricted:u.restricted||null};});
    var sort=['name','cash','total','lastSeen','joined','lifetimeSeconds'].indexOf(r.sort)>=0?r.sort:'name';players.sort(function(a,b){return sort==='name'?a.name.localeCompare(b.name):b[sort]-a[sort];});
    return {players:players.slice(offset,offset+30),next:offset+30<players.length?offset+30:null,count:players.length,marketTime:s.market.minute*60000,active:players.filter(function(p){return p.lastSeen>t-300000;}).length,receiptCount:Object.keys(s.receipts).length,reports:Object.values(s.reports).slice(-100).reverse(),notices:Object.values(s.announcements).slice(-100).reverse(),audits:Object.values(s.audits).slice(-100).reverse(),maintenance:s.maintenance};
  }
  var target=r.targetId?s.accounts[r.targetId]:null;
  if(r.targetId&&!target)King.fail('플레이어를 찾을 수 없습니다.');
  if(r.action==='adminPlayer')return {player:King.snapshot(s,target,t),restriction:target.restricted||null};
  if(r.action==='adminProxy'){
    if(!target)King.fail('플레이어를 선택해 주세요.');Object.keys(s.proxies).forEach(function(k){if(s.proxies[k].actorId===actor.id)delete s.proxies[k];});
    var proxyToken=env.id()+env.id();s.proxies[env.hash(proxyToken)]={actorId:actor.id,targetId:target.id,adminProof:env.hash(r.adminToken),expires:t+900000};King.audit(s,actor,target.id,'대리 시작',{}, {},t,env,'플레이어 시점');return {proxyToken};
  }
  if(r.action==='adminReturn'){Object.keys(s.proxies).forEach(function(k){if(s.proxies[k].actorId===actor.id)delete s.proxies[k];});return {};}
  var reason=King.text(r.reason||'',500),before={},after={},targets;
  if(r.action==='adminNotice'){
    targets=r.targets==='all'?'all':King.targets(s,r.targets);if(['초안','게시','내림'].indexOf(r.status)<0)King.fail('공지 상태를 확인해 주세요.');
    var title=King.text(r.title,100),body=King.text(r.body,4000);if(!title||!body)King.fail('제목과 내용을 입력해 주세요.');var id=r.noticeId||env.id();before=s.announcements[id]||{};after={id,title,body,targets,status:r.status,at:t};s.announcements[id]=after;
  }else if(r.action==='adminReward'){
    targets=King.targets(s,r.targets);var reward=King.clone(r.reward||{});if(!reason)King.fail('지급 사유를 입력해 주세요.');
    if(reward.kind==='cash')King.int(reward.amount,1,100000000000);
    else if(reward.kind==='security'){if(!s.market.stocks[reward.symbol])King.fail('종목을 확인해 주세요.');King.int(reward.quantity,1,100000000);}
    else if(reward.kind==='badge'){reward.badge=King.text(reward.badge,50);if(!reward.badge)King.fail('배지 이름을 입력해 주세요.');}
    else King.fail('보상 종류를 확인해 주세요.');
    var batch=env.id();targets.forEach(function(id){var cid=batch+':'+id;s.claims[cid]={id:cid,accountId:id,reward,net:reward.kind==='cash'?reward.amount:0,reason,at:t,payAt:t,status:'대기',batch,reportId:r.reportId||null};});if(r.reportId&&s.reports[r.reportId])s.reports[r.reportId].rewardBatch=batch;after={batch,targets,reward};
  }else if(r.action==='adminRestriction'){
    targets=King.targets(s,r.targets);if(targets.some(function(id){return env.isAdmin(s.accounts[id].name);}))King.fail('관리자 계정 제한은 복구 경로를 보호하기 위해 차단됩니다.');
    if(r.enabled&&!reason)King.fail('제한 사유를 입력해 주세요.');if(r.until)King.int(r.until,t+1,t+3650*King.DAY);
    targets.forEach(function(id){before[id]=s.accounts[id].restricted||null;s.accounts[id].restricted=r.enabled?{reason,until:r.until||null}:null;});after={targets,enabled:!!r.enabled,until:r.until||null};
  }else if(r.action==='adminMaintenance'){
    if(r.enabled&&!reason)King.fail('점검 사유를 입력해 주세요.');before=s.maintenance;s.maintenance={enabled:!!r.enabled,reason,until:King.text(r.until||'',100)};after=s.maintenance;
  }else if(r.action==='adminAdjust'){
    if(!target||!reason)King.fail('대상과 정정 사유가 필요합니다.');before={cash:target.cash,holdings:King.clone(target.holdings),started:target.started,achievements:King.clone(target.achievements)};
    // Any forced holding correction releases pending reservations explicitly.
    Object.values(s.orders).filter(function(o){return o.accountId===target.id&&o.status==='대기';}).forEach(function(o){o.status='취소';o.closed=t;});
    if(r.cash!==undefined)target.cash=King.int(r.cash,0,900000000000000);
    if(r.symbol){if(!s.market.stocks[r.symbol])King.fail('종목을 확인해 주세요.');var quantity=King.int(r.quantity,0,100000000);if(quantity)target.holdings[r.symbol]={quantity,cost:King.int(r.cost||0,0,900000000000000),since:t};else delete target.holdings[r.symbol];}
    if(r.day!==undefined)target.started=t-(King.int(r.day,1,10000)-1)*King.DAY;
    if(r.badge){var badge=King.text(r.badge,50);target.achievements['manual-'+env.id()]={kind:'reward',title:badge,at:t};}
    target.backupVersion=(target.backupVersion||0)+1;after={cash:target.cash,holdings:target.holdings,started:target.started,achievements:target.achievements};
  }else if(r.action==='adminCancelOrder'){
    var o=s.orders[r.orderId];if(!o)King.fail('주문이 없습니다.');before=King.clone(o);if(o.status==='대기'){o.status='취소';o.closed=t;}after=o;
  }else if(r.action==='adminMarket'){
    var x=s.market.stocks[r.symbol];if(!x||!reason)King.fail('종목과 운영 사유를 확인해 주세요.');before=King.clone(x);
    if(r.operation==='price'){if(x.fund)King.fail('ETF 가격은 장부와 괴리율로 결정됩니다.');x.price=King.int(r.price,Math.max(1,Math.ceil(x.base*.7)),Math.max(1,Math.floor(x.base*1.3)));x.fundamental=x.price/(1+x.pressure);x.history.push([t,x.price]);}
    else if(r.operation==='halt')x.status='거래정지';else if(r.operation==='resume'){if(x.status==='비상장')King.fail('폐지된 종목은 거래 재개할 수 없습니다.');x.status='상장';}
    else if(r.operation==='delist'){if(x.fund)King.fail('ETF 상장폐지는 펀드 청산 계획이 필요합니다.');x.delistAt=King.int(r.at,t+72*3600000,t+365*King.DAY);x.settlement=r.settlement===null?null:King.int(r.settlement,0,x.price);King.news(s,x,x.name+' 상장폐지 확정','최소 72시간 거래 기회 후 '+King.stamp(x.delistAt)+' 폐지 예정. '+(x.settlement===null?'비상장 보유로 전환됩니다.':'주당 회수금 '+x.settlement+'원입니다.'),t,0,env);}
    else if(r.operation==='split'){if(x.fund)King.fail('ETF 분할은 지원하지 않습니다.');var ratio=King.int(r.ratio,2,100);x.price=Math.max(1,Math.round(x.price/ratio));x.base=Math.max(1,Math.round(x.base/ratio));x.fundamental/=ratio;x.float*=ratio;x.high/=ratio;x.low/=ratio;x.history=x.history.map(function(p){return [p[0],p[1]/ratio];});Object.values(s.accounts).forEach(function(u){if(u.holdings[x.id])u.holdings[x.id].quantity*=ratio;});Object.values(s.market.stocks).filter(function(v){return v.fund;}).forEach(function(v){if(v.fund.positions[x.id])v.fund.positions[x.id]*=ratio;});Object.values(s.orders).filter(function(o){return o.symbol===x.id&&o.status==='대기';}).forEach(function(o){o.status='취소';King.log(s,s.accounts[o.accountId],'분할로 예약 취소',o,t,env);});King.news(s,x,x.name+' 주식 분할',ratio+'대 1 분할. 보유 수량이 조정되며 예약 주문은 취소됩니다.',t,0,env);}
    else King.fail('시장 작업을 확인해 주세요.');after=King.clone(x);
  }else if(r.action==='adminNews'){
    var newsTitle=King.text(r.title,100),fact=King.text(r.body,4000);if(!newsTitle||!fact)King.fail('제목과 내용을 입력해 주세요.');King.news(s,s.market.stocks[r.symbol]||null,newsTitle,fact,t,0,env);after={title:newsTitle,body:fact};
  }else if(r.action==='adminEconomy'){
    before=s.market.economy;after={rate:King.int(r.rate,0,3000)/100,inflation:King.int(r.inflation,-1000,10000)/100,activity:King.int(r.activity,0,200)};s.market.economy=after;
  }else if(r.action==='adminReport'){
    var report=s.reports[r.reportId];if(!report||['접수','검토','채택','종료'].indexOf(r.status)<0)King.fail('제보 상태를 확인해 주세요.');before=King.clone(report);report.status=r.status;after=report;
  }else King.fail('지원하지 않는 관리자 작업입니다.');
  King.audit(s,actor,r.targetId||targets||r.symbol||'전체',r.action,before,after,t,env,reason);return {ok:true,result:after};
};
