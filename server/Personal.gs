var King = typeof King === 'undefined' ? {} : King;
King.backupData = function(a) {return {schema:1,accountId:a.id,runId:a.runId,version:a.backupVersion||0,startingCash:a.startingCash||10000000,cash:a.cash,holdings:a.holdings,realized:a.realized,started:a.started,playSeconds:a.playSeconds,achievements:a.achievements,statistics:a.statistics,tutorial:a.tutorial,readNews:a.readNews,assetHistory:a.assetHistory,settings:a.settings};};
King.personal = function(s,a,r,t,env,auth) {
  if(r.action==='readAlerts'){
    if(!Array.isArray(r.ids)||r.ids.length>500||r.ids.some(function(id){return typeof id!=='string';}))King.fail('알림을 확인해 주세요.');
    var allowed=(a.alerts||[]).map(function(n){return n.id;}).concat(Object.values(s.announcements).filter(function(n){return n.status==='게시'&&(n.targets==='all'||n.targets.indexOf(a.id)>=0);}).map(function(n){return n.id;}));
    a.readAlerts=Array.from(new Set((a.readAlerts||[]).concat(r.ids.filter(function(id){return allowed.indexOf(id)>=0;})))).filter(function(id){return allowed.indexOf(id)>=0;});return {};
  }
  if(r.action==='attendance')return King.attend(s,a,t,env,auth);
  if(r.action==='tutorialProgress'){if(auth.proxy)King.fail('본인 계정에서 안내를 진행해 주세요.');var step=King.int(r.step,0,8);if(step>1&&!a.attendance.firstGranted)King.fail('첫 접속 보상을 먼저 받아 주세요.');if(step>a.tutorialStep+1)King.fail('안내를 순서대로 확인해 주세요.');a.tutorialStep=Math.max(a.tutorialStep,step);return {};}
  if(r.action==='priceAlert')return King.setPriceAlert(s,a,r,t,env);
  if(r.action==='receipt'){var receipt=s.receipts[r.id];if(!receipt||receipt.accountId!==a.id)King.fail('영수증을 찾을 수 없습니다.');var copy=King.clone(receipt),x=s.market.stocks[receipt.symbol],h=a.holdings[receipt.symbol];copy.currentPrice=x&&x.status!=='비상장'?x.price:0;copy.currentHoldingProfit=h?copy.currentPrice*h.quantity-h.cost:null;return {receipt:copy};}
  if(r.action==='records'){var offset=King.int(r.offset||0,0,10000000);var list=Object.values(s.records).filter(function(v){return v.accountId===a.id;}).reverse();return {records:list.slice(offset,offset+30).map(function(v){var clean=King.clone(v);delete clean.data.admin;return clean;}),next:offset+30<list.length?offset+30:null};}
  if(r.action==='claim'){
    var selected=Object.values(s.claims).filter(function(c){return c.accountId===a.id&&c.status==='대기'&&(r.claimId==='all'||r.claimId===c.id);}),claimed=[],waiting=[];
    selected.forEach(function(c){if(!c.reward&&c.runId!==a.runId)return;if(c.payAt>t){waiting.push(c.id);return;}
      if(c.reward&&c.reward.kind==='security'){var x=s.market.stocks[c.reward.symbol];if(!x||x.status!=='상장'||x.market==='ETF'&&King.day(a,t)<4){waiting.push(c.id);return;}var h=a.holdings[x.id]||(a.holdings[x.id]={quantity:0,cost:0,since:t});h.quantity+=c.reward.quantity;a.contributedCash+=c.reward.quantity*x.price;}
      else if(c.reward&&c.reward.kind==='badge'){a.achievements['reward-'+c.id]={kind:'reward',title:c.reward.badge,at:t};}
      else {a.cash+=c.net;if(c.reward&&c.reward.kind==='cash')a.contributedCash+=c.net;}
      King.int(a.cash,0,900000000000000);c.status='수령';c.claimed=t;c.claimedRun=a.runId;claimed.push(c.id);King.log(s,a,c.reward?'보상 수령':'배당·분배 수령',c,t,env);
    });a.backupVersion=(a.backupVersion||0)+1;return {claimed,waiting};
  }
  if(r.action==='settings'){
    var input=r.settings||{};['terms','animation'].forEach(function(k){if(k in input){if(typeof input[k]!=='boolean')King.fail('설정을 확인해 주세요.');a.settings[k]=input[k];}});
    ['bgm','sfx'].forEach(function(k){if(k in input){if(typeof input[k]!=='number'||input[k]<0||input[k]>1)King.fail('음량 범위를 확인해 주세요.');a.settings[k]=input[k];}});
    if(input.favorites){if(!Array.isArray(input.favorites)||input.favorites.length>100||input.favorites.some(function(id){return !s.market.stocks[id];}))King.fail('관심종목을 확인해 주세요.');a.settings.favorites=Array.from(new Set(input.favorites));}
    if(input.notifications){var n=input.notifications,current=King.notificationSettings(a);['risk','orders','targets'].forEach(function(k){if(k in n){if(typeof n[k]!=='boolean')King.fail('알림 설정을 확인해 주세요.');current[k]=n[k];}});}
    if(!auth.proxy)King.log(s,a,'설정 변경',{items:Object.keys(input).filter(function(k){return ['terms','animation','bgm','sfx','favorites','notifications'].indexOf(k)>=0;})},t,env);return {savedAt:t};
  }
  if(r.action==='save'){King.log(s,a,'수동 저장',{},t,env);return {savedAt:t};}
  if(r.action==='tutorial'){if(!a.attendance.firstGranted)King.fail('첫 접속 보상을 먼저 받아 주세요.');a.tutorialStep=8;if(!a.tutorial)King.log(s,a,'튜토리얼 확인',{},t,env);a.tutorial=true;return {};}
  if(r.action==='readNews'){if(!s.market.news.some(function(n){return n.id===r.id;}))King.fail('뉴스가 없습니다.');if(a.readNews.indexOf(r.id)<0){a.readNews.push(r.id);if(!auth.proxy)King.awardXp(a,'news',t);King.log(s,a,'뉴스 읽기',{title:s.market.news.find(function(n){return n.id===r.id;}).title},t,env);}return {};}
  if(r.action==='explore'){var x=s.market.stocks[r.symbol];if(!x)King.fail('종목이 없습니다.');if(a.statistics.companies.indexOf(x.id)<0){a.statistics.companies.push(x.id);if(!auth.proxy)King.awardXp(a,'explore',t);}if(x.market!=='ETF'&&a.statistics.industries.indexOf(x.sector)<0)a.statistics.industries.push(x.sector);return {};}
  if(r.action==='pin'){if(auth.proxy)King.fail('대리 화면에서 PIN 변경은 허용하지 않습니다.');if(r.pin!==a.pin||!/^\d{4}$/.test(r.newPin||''))King.fail('현재 PIN과 새 PIN을 확인해 주세요.');King.log(s,a,'비밀번호 변경',{},t,env);a.pin=r.newPin;Object.keys(s.sessions).forEach(function(k){if(s.sessions[k].accountId===a.id)delete s.sessions[k];});return {loginRequired:true};}
  if(r.action==='backup'){var data=King.backupData(a),body=JSON.stringify(data);return {backup:{data,signature:env.sign(body)}};}
  if(r.action==='restore'){var b=r.backup;if(!b||!b.data||b.data.schema!==1||env.sign(JSON.stringify(b.data))!==b.signature||b.data.accountId!==a.id||b.data.runId!==a.runId||b.data.version!==(a.backupVersion||0))King.fail('백업이 변조되었거나 서버 최신 상태보다 오래되었습니다.');['cash','holdings','realized','started','playSeconds','achievements','statistics','tutorial','readNews','assetHistory','settings'].forEach(function(k){a[k]=King.clone(b.data[k]);});King.log(s,a,'백업 검증 복원',{version:b.data.version},t,env);return {restored:true};}
  if(r.action==='report'){var text=King.text(r.body,4000),email=King.text(r.email||'',200);if(!text||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))King.fail('내용과 이메일을 확인해 주세요.');var id=env.id();s.reports[id]={id,accountId:a.id,type:r.kind==='suggestion'?'기능 제안':r.kind==='other'?'기타':'오류 신고',body:text,email,at:t,time:King.stamp(t),status:'접수',environment:King.text(r.environment||'',300)};King.log(s,a,'문의 제출',{category:s.reports[id].type},t,env);return {reportId:id};}
  King.fail('지원하지 않는 요청입니다.');
};
