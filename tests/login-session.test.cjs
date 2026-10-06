const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('duplicate login asks for confirmation without revoking or exposing the existing session',()=>{
 const h=harness(),first=signup(h),before=JSON.stringify(h.s);
 const conflict=h.call('login',{name:'투자자',pin:'0123'});
 assert.equal(conflict.loginConflict,true);assert.equal(conflict.token,undefined);assert.equal(conflict.snapshot,undefined);
 assert.equal(JSON.stringify(h.s),before);
 assert.equal(h.call('sync',{token:first.token}).snapshot.account.id,first.snapshot.account.id);
 assert.throws(()=>h.call('login',{name:'투자자',pin:'9999',takeover:true}),/아이디|PIN/);
});
test('confirmed login replaces previous session and blocks its reads and trades while preserving another account',()=>{
 const h=harness(),first=signup(h),other=signup(h,'다른사람');
 const second=h.call('login',{name:'투자자',pin:'0123',takeover:true,remember:true});
 assert.ok(second.token);assert.notEqual(second.token,first.token);
 for(const action of ['sync','trade'])assert.throws(()=>h.call(action,{token:first.token}),/다른.*로그인/);
 assert.equal(h.call('sync',{token:second.token}).snapshot.account.id,first.snapshot.account.id);
 assert.equal(h.call('sync',{token:other.token}).snapshot.account.id,other.snapshot.account.id);
 assert.equal(Object.values(h.s.sessions).filter(s=>s.accountId===first.snapshot.account.id&&!s.replacedAt&&s.expires>h.now).length,1);
});
test('expired sessions do not prompt, and replacing an administrator revokes its proofs and proxies',()=>{
 const h=harness(),first=h.call('signup',{name:'투자자',pin:'0123',consent:true,remember:false});h.advance(12*3600000+1);
 assert.ok(h.call('login',{name:'투자자',pin:'0123'}).token);
 const admin=signup(h,'운영자'),proof=h.call('adminUnlock',{token:admin.token,secret:'test-only-admin',requestId:'unlock-session'});
 const proxy=h.call('adminProxy',{token:admin.token,adminToken:proof.adminToken,targetId:first.snapshot.account.id,requestId:'proxy-session'});
 h.call('login',{name:'운영자',pin:'0123',takeover:true});
 assert.equal(h.s.adminSessions[h.env.hash(proof.adminToken)],undefined);
 assert.equal(h.s.proxies[h.env.hash(proxy.proxyToken)],undefined);
});
