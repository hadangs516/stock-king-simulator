var King = typeof King === 'undefined' ? {} : King;
King.backupData = function(a) {return {schema:1,accountId:a.id,runId:a.runId,version:a.backupVersion||0,cash:a.cash,holdings:a.holdings,realized:a.realized,started:a.started,playSeconds:a.playSeconds,achievements:a.achievements,statistics:a.statistics,tutorial:a.tutorial,readNews:a.readNews,assetHistory:a.assetHistory,settings:a.settings};};
King.personal = function(s,a,r,t,env,auth) {
  if(r.action==='receipt'){var receipt=s.receipts[r.id];if(!receipt||receipt.accountId!==a.id)King.fail('영수증을 찾을 수 없습니다.');return {receipt};}
  if(r.action==='records'){var offset=King.int(r.offset||0,0,10000000);var list=Object.values(s.records).filter(function(v){return v.accountId===a.id;}).reverse();return {records:list.slice(offset,offset+30),next:offset+30<list.length?offset+30:null};}
  if(r.action==='claim'){
    var selected=Object.values(s.claims).filter(function(c){return c.accountId===a.id&&c.status==='대기'&&(r.claimId==='all'||r.claimId===c.id);}),claimed=[],waiting=[];
    selected.forEach(function(c){if(!c.reward&&c.runId!==a.runId)return;if(c.payAt>t){waiting.push(c.id);return;}
      if(c.reward&&c.reward.kind==='security'){var x=s.market.stocks[c.reward.symbol];if(!x||x.status!=='상장'||x.market==='ETF'&&King.day(a,t)<4){waiting.push(c.id);return;}var h=a.holdings[x.id]||(a.holdings[x.id]={quantity:0,cost:0,since:t});h.quantity+=c.reward.quantity;}
      else if(c.reward&&c.reward.kind==='badge'){a.achievements['reward-'+c.id]={kind:'reward',title:c.reward.badge,at:t};}
      else a.cash+=c.net;
      King.int(a.cash,0,900000000000000);c.status='수령';c.claimed=t;c.claimedRun=a.runId;claimed.push(c.id);King.log(s,a,c.reward?'보상 수령':'배당·분배 수령',c,t,env);
    });a.backupVersion=(a.backupVersion||0)+1;return {claimed,waiting};
  }
  if(r.action==='settings'){
    var input=r.settings||{};['terms','animation'].forEach(function(k){if(k in input){if(typeof input[k]!=='boolean')King.fail('설정을 확인해 주세요.');a.settings[k]=input[k];}});
    ['bgm','sfx'].forEach(function(k){if(k in input){if(typeof input[k]!=='number'||input[k]<0||input[k]>1)King.fail('음량 범위를 확인해 주세요.');a.settings[k]=input[k];}});
    if(input.favorites){if(!Array.isArray(input.favorites)||input.favorites.length>100||input.favorites.some(function(id){return !s.market.stocks[id];}))King.fail('관심종목을 확인해 주세요.');a.settings.favorites=Array.from(new Set(input.favorites));}
    if(input.notifications){var n=input.notifications;a.settings.notifications={risk:!!n.risk,orders:!!n.orders,targets:!!n.targets,start:King.int(n.start,0,23),end:King.int(n.end,1,24),limit:King.int(n.limit,0,100)};}
    return {savedAt:t};
  }
  if(r.action==='save')return {savedAt:t};
  if(r.action==='tutorial'){a.tutorial=true;return {};}
  if(r.action==='readNews'){if(!s.market.news.some(function(n){return n.id===r.id;}))King.fail('뉴스가 없습니다.');if(a.readNews.indexOf(r.id)<0)a.readNews.push(r.id);return {};}
  if(r.action==='explore'){var x=s.market.stocks[r.symbol];if(!x)King.fail('종목이 없습니다.');if(a.statistics.companies.indexOf(x.id)<0)a.statistics.companies.push(x.id);if(x.market!=='ETF'&&a.statistics.industries.indexOf(x.sector)<0)a.statistics.industries.push(x.sector);return {};}
  if(r.action==='pin'){if(auth.proxy)King.fail('대리 화면에서 PIN 변경은 허용하지 않습니다.');if(r.pin!==a.pin||!/^\d{4}$/.test(r.newPin||''))King.fail('현재 PIN과 새 PIN을 확인해 주세요.');a.pin=r.newPin;Object.keys(s.sessions).forEach(function(k){if(s.sessions[k].accountId===a.id)delete s.sessions[k];});return {loginRequired:true};}
  if(r.action==='reset'){if(auth.proxy||r.pin!==a.pin)King.fail('본인 PIN을 확인해 주세요.');Object.values(s.orders).filter(function(o){return o.accountId===a.id&&o.status==='대기';}).forEach(function(o){o.status='취소';o.closed=t;});Object.values(s.claims).filter(function(c){return c.accountId===a.id&&!c.reward&&c.status==='대기';}).forEach(function(c){c.status='포기';});King.log(s,a,'진행 초기화',{oldRun:a.runId},t,env);King.newRun(a,t,env);a.backupVersion=(a.backupVersion||0)+1;return {};}
  if(r.action==='backup'){var data=King.backupData(a),body=JSON.stringify(data);return {backup:{data,signature:env.sign(body)}};}
  if(r.action==='restore'){var b=r.backup;if(!b||!b.data||b.data.schema!==1||env.sign(JSON.stringify(b.data))!==b.signature||b.data.accountId!==a.id||b.data.runId!==a.runId||b.data.version!==(a.backupVersion||0))King.fail('백업이 변조되었거나 서버 최신 상태보다 오래되었습니다.');['cash','holdings','realized','started','playSeconds','achievements','statistics','tutorial','readNews','assetHistory','settings'].forEach(function(k){a[k]=King.clone(b.data[k]);});King.log(s,a,'백업 검증 복원',{version:b.data.version},t,env);return {restored:true};}
  if(r.action==='report'){var text=King.text(r.body,4000),email=King.text(r.email||'',200);if(!text||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))King.fail('내용과 이메일을 확인해 주세요.');var id=env.id();s.reports[id]={id,accountId:a.id,type:r.kind==='suggestion'?'기능 제안':'오류 신고',body:text,email,at:t,time:King.stamp(t),status:'접수',environment:King.text(r.environment||'',300)};return {reportId:id};}
  King.fail('지원하지 않는 요청입니다.');
};
