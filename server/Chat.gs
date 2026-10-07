var King = typeof King === 'undefined' ? {} : King;
King.chatActions=['friendMessages','friendSend','supportList','supportCreate','supportRead','supportSend','adminSupportList','adminSupportRead','adminSupportSend'];
King.supportCategories=['오류·버그','기능 제안','이용 질문','기타'];
King.chatAuthorize=function(s,a,auth,r){
  if(auth.proxy)King.fail('대화는 본인 계정에서 이용해 주세요.');
  if(r.action.indexOf('adminSupport')===0&&!auth.admin)King.fail('관리자 인증이 필요합니다.');
  if(r.action==='friendMessages'||r.action==='friendSend'){
    var other=Object.values(s.accounts).find(function(v){return v.social&&v.social.id===r.friendId;}),link=other&&King.friendLink(s,a,other);
    if(!other||!link||link.status!=='accepted')King.fail('서로 친구인 계정과만 대화할 수 있어요.');return other;
  }
  if(/(?:Read|Send)$/.test(r.action)){
    var c=(s.conversations||{})[r.conversationId];if(!c||r.action.indexOf('admin')!==0&&c.accountId!==a.id)King.fail('문의 대화를 찾을 수 없습니다.');return c;
  }
};
King.chatPage=function(rows,r,mine){
  var end=r.before?rows.findIndex(function(v){return v.id===r.before;}):rows.length;if(end<0)King.fail('이전 메시지 위치를 확인해 주세요.');
  var start=Math.max(0,end-50),page=rows.slice(start,end);
  return {messages:page.map(function(v){return {id:v.id,body:v.body,at:v.at,role:v.role||'friend',mine:mine(v)};}),before:start&&page.length?page[0].id:null};
};
King.chatBody=function(a,r,t){
  var body=King.text(r.body,2000);if(!body)King.fail('메시지를 입력해 주세요.');
  var rate=a.messageRate;if(!rate||t-rate.at>=60000)rate=a.messageRate={at:t,count:0};if(rate.count>=20)King.fail('메시지가 너무 빠릅니다. 잠시 후 보내 주세요.');rate.count++;return body;
};
King.supportSummary=function(s,c,admin){var messages=c.messages||[],last=messages[messages.length-1];return {id:c.id,category:c.category,at:last?last.at:c.at,preview:last?last.body.slice(0,80):'',nickname:admin?(s.accounts[c.accountId]||{}).name:undefined,unread:messages.filter(function(m,i){return i>=(admin?c.adminRead||0:c.playerRead||0)&&m.role===(admin?'player':'admin');}).length};};
King.chats=function(s,a,r,t,env,auth){
  s.friendMessages=s.friendMessages||{};s.conversations=s.conversations||{};
  // Existing reports retain their ids so adoption and reward links continue to work.
  Object.values(s.reports).forEach(function(p){if(!s.conversations[p.id]&&s.accounts[p.accountId])s.conversations[p.id]={id:p.id,accountId:p.accountId,category:p.type==='기능 제안'?'기능 제안':p.type==='기타'?'기타':'오류·버그',at:p.at,messages:[{id:'report-'+p.id,role:'player',body:p.body,at:p.at}],playerRead:1,adminRead:0};});
  var target=King.chatAuthorize(s,a,auth,r),admin=r.action.indexOf('admin')===0;
  if(r.action==='friendMessages'||r.action==='friendSend'){
    var rows=Object.values(s.friendMessages).filter(function(v){return v.from===a.id&&v.to===target.id||v.from===target.id&&v.to===a.id;});
    if(r.action==='friendSend'){var id=env.id();s.friendMessages[id]={id,from:a.id,to:target.id,body:King.chatBody(a,r,t),at:t};King.addAlert(target,id,'friendMessage','친구 새 메시지','친구 대화에서 확인해 주세요.',t);return {sent:id};}
    return King.chatPage(rows,r,function(v){return v.from===a.id;});
  }
  if(r.action==='supportList'||r.action==='adminSupportList')return {conversations:Object.values(s.conversations).filter(function(c){return admin||c.accountId===a.id;}).map(function(c){return King.supportSummary(s,c,admin);}).sort(function(x,y){return y.at-x.at;})};
  if(r.action==='supportCreate'){
    if(King.supportCategories.indexOf(r.category)<0)King.fail('문의 종류를 선택해 주세요.');
    if(Object.values(s.conversations).filter(function(c){return c.accountId===a.id;}).length>=100)King.fail('문의 대화는 최대 100개입니다. 기존 문의를 이어 주세요.');
    var body=King.chatBody(a,r,t),cid=env.id(),c={id:cid,accountId:a.id,category:r.category,at:t,messages:[{id:env.id(),role:'player',body,at:t}],playerRead:1,adminRead:0};s.conversations[cid]=c;
    s.reports[cid]={id:cid,accountId:a.id,type:r.category,body,at:t,time:King.stamp(t),status:'접수',environment:King.text(r.environment||'',300)};
    return {conversation:King.supportSummary(s,c,false)};
  }
  var c=target;
  if(r.action==='supportSend'||r.action==='adminSupportSend'){
    if(c.messages.length>=2000)King.fail('새 문의 대화를 시작해 주세요.');
    var message={id:env.id(),role:admin?'admin':'player',body:King.chatBody(a,r,t),at:t};c.messages.push(message);if(admin)King.addAlert(s.accounts[c.accountId],message.id,'supportReply','고객센터 새 답변','고객센터에서 답변을 확인해 주세요.',t);
    c[admin?'adminRead':'playerRead']=c.messages.length;return {sent:message.id};
  }
  if(r.action==='supportRead'||r.action==='adminSupportRead'){
    if(!r.before)c[admin?'adminRead':'playerRead']=c.messages.length;
    return Object.assign({conversation:King.supportSummary(s,c,admin)},King.chatPage(c.messages,r,function(v){return v.role===(admin?'admin':'player');}));
  }
  King.fail('지원하지 않는 대화 요청입니다.');
};
