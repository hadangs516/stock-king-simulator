var King = typeof King === 'undefined' ? {} : King;
King.friendFields = ['cash','total','holdings','day','playTime','roi','level'];
King.friendIdentity = function(a,env) {
  if(!a.social)a.social={id:env.id(),nickname:a.name,sharing:{}};
  King.friendFields.forEach(function(k){if(!(k in a.social.sharing))a.social.sharing[k]=true;});return a.social;
};
King.friendLink = function(s,a,b) {return (s.friendships||{})[[a.id,b.id].sort().join(':')];};
King.friendView = function(s,viewer,a,t,env) {
  var profile=King.friendIdentity(a,env),link=King.friendLink(s,viewer,a);
  var result={friendId:profile.id,nickname:profile.nickname,relationship:link?(link.status==='accepted'?'friend':link.from===viewer.id?'sent':'received'):'none',shared:{}};
  if(!link||link.status!=='accepted')return result;
  var fields=profile.sharing,holdings=Object.entries(a.holdings).map(function(pair){var x=s.market.stocks[pair[0]],q=pair[1].quantity,price=x&&x.status!=='비상장'?x.price:0;return {symbol:pair[0],name:x?x.name:pair[0],quantity:q,price,value:q*price};});
  King.ensureProgression(a);var total=a.cash+holdings.reduce(function(v,h){return v+h.value;},0)+Object.values(s.claims).filter(function(c){return c.accountId===a.id&&c.runId===a.runId&&!c.reward&&c.status==='대기';}).reduce(function(v,c){return v+c.net;},0);
  if(fields.roi)result.shared.roi=a.contributedCash>0?(total-a.contributedCash)/a.contributedCash*100:null;
  if(fields.level)result.shared.level=King.levelInfo(a.xp);
  if(fields.cash)result.shared.cash=a.cash;
  if(fields.total)result.shared.total=a.cash+holdings.reduce(function(v,h){return v+h.value;},0)+Object.values(s.claims).filter(function(c){return c.accountId===a.id&&c.runId===a.runId&&!c.reward&&c.status==='대기';}).reduce(function(v,c){return v+c.net;},0);
  if(fields.holdings)result.shared.holdings=holdings;
  if(fields.day)result.shared.day=King.day(a,t);
  if(fields.playTime)result.shared.playTime=a.playSeconds;
  return result;
};
King.friends = function(s,a,r,t,env,auth) {
  if(auth.proxy)King.fail('친구 설정과 조회는 본인 계정에서 이용해 주세요.');
  s.friendships=s.friendships||{};
  var me=King.friendIdentity(a,env),accounts=Object.values(s.accounts);
  if(r.action==='friendRanking'){
    var metric=r.metric;if(['roi','total','level','playTime'].indexOf(metric)<0)King.fail('순위 기준을 선택해 주세요.');
    var rows=accounts.filter(function(x){var link=King.friendLink(s,a,x);return x.id===a.id||link&&link.status==='accepted';}).map(function(x){
      King.ensureProgression(x);var p=King.friendIdentity(x,env),self=x.id===a.id,shared=self?null:King.friendView(s,a,x,t,env).shared,value=null;
      if(self){var total=King.totalAssets(s,x);value=metric==='total'?total:metric==='roi'?(x.contributedCash>0?(total-x.contributedCash)/x.contributedCash*100:null):metric==='level'?King.levelInfo(x.xp):x.playSeconds;}
      else if(metric in shared)value=shared[metric];
      return {friendId:p.id,nickname:p.nickname,self,value,rank:null};
    });
    var score=function(row){return row.value===null?null:metric==='level'?row.value.xp:row.value;};
    rows.sort(function(x,y){var xv=score(x),yv=score(y);return xv===null?(yv===null?x.nickname.localeCompare(y.nickname):1):yv===null?-1:yv-xv||x.nickname.localeCompare(y.nickname);});
    var previous=null,rank=0;rows.forEach(function(row,i){var value=score(row);if(value!==null){if(value!==previous)rank=i+1;row.rank=rank;previous=value;}});
    return {metric,at:t,rows};
  }
  if(r.action==='friendSettings'){
    var nickname=King.text(r.nickname,20).normalize('NFC');
    if(!/^[가-힣a-zA-Z0-9 _-]{2,20}$/.test(nickname))King.fail('닉네임은 한글·영문·숫자 2~20자로 입력해 주세요.');
    if(accounts.some(function(x){return x.id!==a.id&&(x.social?x.social.nickname:x.name).toLocaleLowerCase()===nickname.toLocaleLowerCase();}))King.fail('이미 사용 중인 닉네임입니다.');
    var sharing={};King.friendFields.forEach(function(k){sharing[k]=!!(r.sharing&&r.sharing[k]===true);});
    a.social.nickname=nickname;a.social.sharing=sharing;King.log(s,a,'친구 프로필 변경',{items:['닉네임','공개 항목']},t,env);
  }
  if(r.action==='friendSearch'){
    var query=King.text(r.query,20).normalize('NFC').toLocaleLowerCase();if(query.length<2)King.fail('닉네임을 두 글자 이상 입력해 주세요.');
    return {results:accounts.filter(function(x){return x.id!==a.id&&(x.social?x.social.nickname:x.name).toLocaleLowerCase().includes(query);}).slice(0,20).map(function(x){return King.friendView(s,a,x,t,env);})};
  }
  if(['friendRequest','friendRespond','friendRemove','friendProfile'].indexOf(r.action)>=0){
    var other=accounts.find(function(x){return x.id!==a.id&&x.social&&x.social.id===r.friendId;});if(!other)King.fail('친구를 찾을 수 없습니다.');
    var key=[a.id,other.id].sort().join(':'),link=s.friendships[key];
    if(r.action==='friendProfile'){if(!link||link.status!=='accepted')King.fail('서로 친구가 된 후 공개 정보를 볼 수 있어요.');return {friend:King.friendView(s,a,other,t,env)};}
    if(r.action==='friendRequest'){
      if(link)King.fail('이미 친구이거나 요청이 진행 중입니다.');
      if([a.id,other.id].some(function(id){return Object.values(s.friendships).filter(function(v){return v.from===id||v.to===id;}).length>=100;}))King.fail('친구 및 대기 요청은 최대 100개입니다.');
      s.friendships[key]={from:a.id,to:other.id,status:'pending',at:t};King.addAlert(other,env.id(),'friendRequest','친구 요청 도착','친구 메뉴에서 받은 요청을 확인해 주세요.',t);King.log(s,a,'친구 요청',{nickname:other.social.nickname},t,env);
    }
    if(r.action==='friendRespond'){
      if(!link||link.status!=='pending'||link.to!==a.id)King.fail('받은 친구 요청이 없습니다.');
      if(r.accept===true){link.status='accepted';link.accepted=t;King.addAlert(other,env.id(),'friendAccepted','친구 요청 수락','친구 메뉴에서 확인해 주세요.',t);}else delete s.friendships[key];
      King.log(s,a,r.accept===true?'친구 수락':'친구 거절',{nickname:other.social.nickname},t,env);
    }
    if(r.action==='friendRemove'){if(link){delete s.friendships[key];King.log(s,a,'친구 삭제·요청 취소',{nickname:other.social.nickname},t,env);}}
  }
  var linked=accounts.filter(function(x){return x.id!==a.id&&King.friendLink(s,a,x);});
  return {profile:{friendId:me.id,nickname:me.nickname,sharing:me.sharing},friends:linked.map(function(x){return King.friendView(s,a,x,t,env);})};
};
