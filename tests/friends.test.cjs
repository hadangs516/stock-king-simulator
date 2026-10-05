const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
function setup(){const h=harness(),a=signup(h,'첫투자자'),b=signup(h,'둘투자자'),c=signup(h,'셋투자자');let n=0;const call=(user,action,data={})=>h.call(action,{token:user.token,runId:user.snapshot.account.runId,requestId:'friend-test-'+(++n),...data});return {h,a,b,c,call};}
test('friends search exposes nickname and opaque friend id, never login or private finance',()=>{
 const {a,b,call}=setup();call(b,'friendSettings',{nickname:'별빛친구',sharing:{cash:true}});
 assert.equal(call(a,'friendSearch',{query:'둘투자자'}).results.length,0);
 const rows=call(a,'friendSearch',{query:'별빛'}).results;
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0].shared),[]);
 const json=JSON.stringify(rows);for(const secret of ['둘투자자','pin','runId','settings',b.snapshot.account.id])assert.ok(!json.includes(secret));
});
test('friendship requires recipient acceptance and selective fields update immediately',()=>{
 const {a,b,c,call}=setup();const bId=call(a,'friendSearch',{query:'둘투자자'}).results[0].friendId;
 const aId=call(b,'friendSearch',{query:'첫투자자'}).results[0].friendId;
 call(a,'friendRequest',{friendId:bId});assert.throws(()=>call(a,'friendProfile',{friendId:bId}),/서로 친구/);
 assert.throws(()=>call(a,'friendRespond',{friendId:bId,accept:true}),/받은/);
 call(b,'friendRespond',{friendId:aId,accept:true});call(b,'friendSettings',{nickname:'둘친구',sharing:{cash:true,day:true}});
 const shown=call(a,'friendProfile',{friendId:bId}).friend;assert.equal(shown.shared.cash,1000000);assert.equal(shown.shared.day,1);assert.equal(shown.shared.total,undefined);assert.equal(shown.shared.holdings,undefined);
 assert.throws(()=>call(c,'friendProfile',{friendId:bId}),/서로 친구/);
 call(b,'friendSettings',{nickname:'둘친구',sharing:{}});assert.deepEqual(Object.keys(call(a,'friendProfile',{friendId:bId}).friend.shared),[]);
 call(a,'friendRemove',{friendId:bId});assert.throws(()=>call(a,'friendProfile',{friendId:bId}),/서로 친구/);
});
test('friend requests reject duplicates, foreign decisions and keep account resets private',()=>{
 const {h,a,b,call}=setup(),bId=call(a,'friendSearch',{query:'둘투자자'}).results[0].friendId;
 call(a,'friendRequest',{friendId:bId});assert.throws(()=>call(a,'friendRequest',{friendId:bId}),/이미/);
 assert.throws(()=>call(a,'friendSettings',{nickname:'둘투자자',sharing:{}}),/사용 중/);
 const r=call(a,'reset',{pin:'0123',confirm:true});assert.equal(h.s.accounts[a.snapshot.account.id].social.nickname,'첫투자자');assert.equal(Object.keys(h.s.friendships).length,0);
 assert.equal(r.snapshot.account.cash,0);
});
