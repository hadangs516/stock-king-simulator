var King = typeof King === 'undefined' ? {} : King;
King.newRun = function(a,t,env) {a.runId=env.id();a.started=t;a.cash=10000000;a.holdings={};a.realized=0;a.playSeconds=0;a.tutorial=false;a.achievements={};a.statistics={companies:[],industries:[],dates:[],memos:0};a.readNews=[];a.assetHistory=[];a.activityUntil=t;};
King.login = function(s,r,env) {
  var t=env.now(),name=King.text(r.name,30).normalize('NFC');
  if(!/^[가-힣]{2,12}$/.test(name))King.fail('아이디는 한글 2~12자로 입력해 주세요.');
  if(typeof r.pin!=='string'||!/^\d{4}$/.test(r.pin))King.fail('PIN은 숫자 4자리입니다.');
  var a=Object.values(s.accounts).find(function(x){return x.name===name;});
  if(r.action==='signup'){
    if(s.maintenance.enabled)King.fail('점검 중: '+s.maintenance.reason);
    if(a)King.fail('이미 사용 중인 아이디입니다.');if(r.consent!==true)King.fail('가상 투자 안내에 동의해 주세요.');
    a={id:env.id(),name,pin:r.pin,joined:t,logins:0,lifetimeSeconds:0,settings:{terms:true,animation:true,bgm:0,sfx:.3,favorites:[],notifications:{risk:true,orders:false,targets:true,start:7,end:24,limit:0}},lastSeen:0};King.newRun(a,t,env);s.accounts[a.id]=a;King.log(s,a,'회원가입',{},t,env);
  }else if(!a||a.pin!==r.pin)King.fail('아이디 또는 PIN이 올바르지 않습니다.');
  var isAdmin=env.isAdmin(name)&&env.adminCheck(r.adminSecret||'');
  if(s.maintenance.enabled&&!isAdmin)King.fail('점검 중: '+s.maintenance.reason);
  if(a.restricted&&(!a.restricted.until||a.restricted.until>t)&&!isAdmin)King.fail('이용 제한: '+a.restricted.reason);
  a.lastLogin=t;a.lastSeen=t;a.logins++;
  var token=env.id()+env.id()+env.id();s.sessions[env.hash(token)]={accountId:a.id,expires:t+(r.remember?30*King.DAY:12*3600000)};
  King.advance(s,t,env);if(King.achievements)King.achievements(s,a,t,env);s.revision++;
  var snapshot=King.snapshot(s,a,t);snapshot.admin=env.isAdmin(a.name);
  return {state:s,response:{token,snapshot}};
};
King.authenticate = function(s,r,env) {
  if(typeof r.token!=='string')King.fail('로그인 인증이 필요합니다.');var session=s.sessions[env.hash(r.token)],t=env.now();
  if(!session||session.expires<=t||!s.accounts[session.accountId])King.fail('로그인 인증이 만료되었습니다.');
  var actor=s.accounts[session.accountId],proof=s.adminSessions[env.hash(r.adminToken||'')];
  var admin=env.isAdmin(actor.name)&&proof&&proof.accountId===actor.id&&proof.session===env.hash(r.token)&&proof.expires>t;
  if(r.proxyToken){var proxy=s.proxies[env.hash(r.proxyToken)];if(!admin||!proxy||proxy.actorId!==actor.id||proxy.adminProof!==env.hash(r.adminToken)||proxy.expires<=t)King.fail('대리 인증이 만료되었습니다.');return {actor,account:s.accounts[proxy.targetId],admin:true,proxy:true};}
  return {actor,account:actor,admin:!!admin,proxy:false};
};
King.activity = function(s,a,r,t,env) {
  if(t-a.lastSeen>=1800000){a.logins++;a.lastLogin=t;}
  a.lastSeen=t;
  // Only overlap of consecutive active heartbeats counts; never trust elapsed client seconds.
  if(r.active===true&&a.lastActive&&t-a.lastActive<=90000){var start=Math.max(a.lastActive,a.activityUntil||0),seconds=Math.max(0,Math.min(60,Math.floor((t-start)/1000)));a.playSeconds+=seconds;a.lifetimeSeconds+=seconds;a.activityUntil=t;}
  a.lastActive=r.active===true?t:0;
  var date=King.date(t);if(r.active&&a.statistics.dates.indexOf(date)<0)a.statistics.dates.push(date);
};
