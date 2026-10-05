const {test}=require('node:test'),assert=require('node:assert/strict');const {harness,signup}=require('./helpers.cjs');
function setup(){const h=harness(),a=signup(h,'첫친구'),b=signup(h,'둘친구'),c=signup(h,'다른사람'),admin=signup(h,'운영자');let n=0;const call=(u,action,data={})=>h.call(action,{token:u.token,runId:u.snapshot.account.runId,requestId:'social-chat-'+(++n),...data});const aid=call(a,'friends').profile.friendId,bid=call(b,'friends').profile.friendId;return {h,a,b,c,admin,call,aid,bid};}
function connect(f){f.call(f.a,'friendRequest',{friendId:f.bid});f.call(f.b,'friendRespond',{friendId:f.aid,accept:true});}
test('sharing defaults migrate missing choices only; ranking never returns hidden values',()=>{
 const f=setup(),{h,a,b,c,call,bid}=f;connect(f);assert.equal(call(a,'friendProfile',{friendId:bid}).friend.shared.total,1000000);
 h.s.accounts[b.snapshot.account.id].social.sharing={cash:false,total:false};
 let profile=call(b,'friends').profile;assert.equal(profile.sharing.total,false);assert.equal(profile.sharing.level,true);
 let rank=call(a,'friendRanking',{metric:'total'});assert.equal(rank.rows.length,2);assert.equal(rank.rows[0].self,true);assert.equal(rank.rows[1].value,null);assert.equal(rank.rows[1].rank,null);assert.equal(JSON.stringify(rank.rows).includes(c.snapshot.account.id),false);
 call(b,'friendSettings',{nickname:'둘친구',sharing:{total:true,roi:true,level:true}});rank=call(a,'friendRanking',{metric:'total'});assert.equal(rank.rows[0].rank,1);assert.equal(rank.rows[1].rank,1);
 h.s.accounts[b.snapshot.account.id].cash+=100000;h.s.accounts[b.snapshot.account.id].contributedCash+=100000;assert.equal(call(a,'friendRanking',{metric:'roi'}).rows.find(r=>!r.self).value,0);
});
test('friend messages require accepted friendship and retry cannot duplicate or leak messages',()=>{
 const f=setup(),{h,a,b,c,call,aid,bid}=f;assert.throws(()=>call(a,'friendSend',{friendId:bid,body:'안녕'}),/친구/);connect(f);
 const req={friendId:bid,body:'한글 메시지',requestId:'message-once-1'};call(a,'friendSend',req);call(a,'friendSend',req);
 assert.equal(call(b,'friendMessages',{friendId:aid}).messages.length,1);assert.throws(()=>call(c,'friendMessages',{friendId:aid}),/친구/);
 call(a,'friendRemove',{friendId:bid});assert.throws(()=>call(a,'friendSend',{friendId:bid,body:'차단 확인'}),/친구/);
 assert.throws(()=>call(a,'friendSend',req),/친구/);
});
test('support has multiple private conversations and requires strengthened admin proof to reply',()=>{
 const {h,a,b,admin,call}=setup();let first=call(a,'supportCreate',{category:'오류·버그',body:'첫 문의'}),second=call(a,'supportCreate',{category:'이용 질문',body:'둘째 문의'});
 assert.notEqual(first.conversation.id,second.conversation.id);assert.equal(call(a,'supportList').conversations.length,2);
 assert.throws(()=>call(b,'supportRead',{conversationId:first.conversation.id}),/문의/);assert.throws(()=>call(admin,'adminSupportSend',{conversationId:first.conversation.id,body:'안내'}),/인증/);
 const proof=call(admin,'adminUnlock',{secret:'test-only-admin'}).adminToken;
 call(admin,'adminSupportSend',{adminToken:proof,conversationId:first.conversation.id,body:'확인했습니다',requestId:'support-reply-1'});
 call(admin,'adminSupportSend',{adminToken:proof,conversationId:first.conversation.id,body:'확인했습니다',requestId:'support-reply-1'});
 const list=call(a,'supportList');assert.equal(list.conversations.find(c=>c.id===first.conversation.id).unread,1);
 const read=call(a,'supportRead',{conversationId:first.conversation.id});assert.equal(read.messages.length,2);assert.equal(read.messages[1].role,'admin');assert.equal(call(a,'supportList').conversations.find(c=>c.id===first.conversation.id).unread,0);
 call(a,'reset',{pin:'0123',confirm:true});assert.equal(Object.keys(h.s.conversations).length,0);
});
