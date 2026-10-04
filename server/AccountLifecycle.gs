var King = typeof King === 'undefined' ? {} : King;
King.clearAccountHistory = function(s,id) {
  ['orders','claims','receipts','reports','records','quotes','conversations','sessions','adminSessions','requests'].forEach(function(table){
    Object.keys(s[table]||{}).forEach(function(key){var value=s[table][key];if(value.accountId===id||table==='requests'&&key.indexOf(id+':')===0)delete s[table][key];});
  });
  ['friendships','friendMessages','proxies'].forEach(function(table){
    Object.keys(s[table]||{}).forEach(function(key){var value=s[table][key];if([value.from,value.to,value.actorId,value.targetId].indexOf(id)>=0)delete s[table][key];});
  });
  Object.values(s.announcements).forEach(function(value){if(Array.isArray(value.targets))value.targets=value.targets.filter(function(target){return target!==id;});});
  // Shared market prices remain intact; remove only the departing player's flow identity.
  s.market.flows.forEach(function(flow){if(flow.accountId===id)flow.accountId='removed:'+flow.at;});
  Object.values(s.audits).forEach(function(value){
    if(value.actorId===id){delete value.actorId;value.actor='삭제된 계정';}
    if(value.target===id||Array.isArray(value.target)&&value.target.indexOf(id)>=0){value.target=Array.isArray(value.target)?value.target.filter(function(target){return target!==id;}):'삭제된 계정';value.before={};value.after={};value.reason='개인 기록 삭제';}
  });
};
King.accountLifecycle = function(s,a,r,t,env,auth) {
  if(auth.proxy||r.pin!==a.pin)King.fail('본인 PIN을 확인해 주세요.');
  if(r.confirm!==true)King.fail('삭제되는 내용을 확인하고 최종 확인을 선택해 주세요.');
  King.clearAccountHistory(s,a.id);
  if(r.action==='deleteAccount'){delete s.accounts[a.id];return {deleted:true,loginRequired:true};}
  var next={id:a.id,name:a.name,pin:a.pin,settings:King.clone(a.settings),joined:t,logins:0,lifetimeSeconds:0,lastSeen:0,xp:0};
  if(a.social)next.social={id:env.id(),nickname:a.social.nickname,sharing:King.clone(a.social.sharing)};
  if(a.restricted)next.restricted=King.clone(a.restricted);
  King.newRun(next,t,env);s.accounts[a.id]=next;
  return {loginRequired:true,snapshot:King.snapshot(s,next,t,null,env)};
};
