const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
function configured(){const h=harness(),legacy=h.env.isAdmin;h.env.isAdmin=name=>name==='관리자'||legacy(name);h.env.isAdminLoginName=name=>name==='관리자';h.env.verifyAdminLogin=(name,pin)=>name==='관리자'&&pin==='4826';h.env.adminLoginProof=id=>h.env.sign('synthetic-admin-role:'+id);h.env.isPasswordAdmin=a=>a.name==='관리자'&&a.adminLoginProof===h.env.adminLoginProof(a.id);return h;}
test('reserved admin name cannot be claimed through public registration or client flags',()=>{
 const h=configured();assert.throws(()=>signup(h,'관리자'),/관리자/);assert.throws(()=>h.call('login',{name:'관리자',pin:'1234',admin:true}),/PIN|비밀번호|아이디/);assert.equal(Object.keys(h.s.accounts).length,0);
});
test('configured admin ordinary login issues session-bound authority without separate secret and stores no plaintext PIN',()=>{
 const h=configured(),r=h.call('login',{name:'관리자',pin:'4826',remember:true});
 assert.ok(r.adminToken);assert.equal(r.snapshot.passwordAdminLogin,true);assert.equal(r.snapshot.admin,true);
 const a=h.s.accounts[r.snapshot.account.id];assert.equal(a.pin,undefined);assert.ok(a.pinHash);assert.ok(!JSON.stringify(r.snapshot).includes('pinHash'));assert.ok(!JSON.stringify(r.snapshot).includes('adminLoginProof'));
 assert.ok(h.call('adminOverview',{token:r.token,adminToken:r.adminToken}).players);
});
test('automatic renewal needs a certified login, maintains proof expiry, and fails after session takeover',()=>{
 const h=configured(),first=h.call('login',{name:'관리자',pin:'4826',remember:true});h.advance(901000);
 assert.throws(()=>h.call('adminOverview',{token:first.token,adminToken:first.adminToken}),/관리자/);
 const renew=h.call('adminUnlock',{token:first.token,requestId:'auto-renew-admin'});assert.ok(renew.adminToken);
 const conflict=h.call('login',{name:'관리자',pin:'4826'});assert.equal(conflict.loginConflict,true);assert.equal(conflict.adminToken,undefined);
 const newer=h.call('login',{name:'관리자',pin:'4826',takeover:true});assert.ok(newer.adminToken);
 assert.throws(()=>h.call('adminUnlock',{token:first.token,requestId:'old-admin-renew'}),/로그아웃/);
 const ordinary=signup(h);assert.throws(()=>h.call('adminUnlock',{token:ordinary.token,requestId:'fake-auto-renew',passwordAdmin:true}),/관리자/);
});
test('normal PIN users and legacy administrator protection remain unchanged',()=>{
 const h=configured(),u=signup(h);assert.ok(h.call('login',{name:'투자자',pin:'0123',takeover:true}).token);
 const old=signup(h,'운영자');assert.throws(()=>h.call('adminUnlock',{token:old.token,requestId:'legacy-no-secret'}),/관리자/);assert.ok(h.call('adminUnlock',{token:old.token,secret:'test-only-admin',requestId:'legacy-strong-secret'}).adminToken);
});
test('a preexisting admin-named account changes no credentials or records before takeover confirmation',()=>{
 const h=configured(),old=signup(h,'이전계정'),a=h.s.accounts[old.snapshot.account.id];a.name='관리자';a.cash=7654321;
 const before=JSON.stringify(h.s),conflict=h.call('login',{name:'관리자',pin:'4826'});assert.equal(conflict.loginConflict,true);assert.equal(JSON.stringify(h.s),before);
 const accepted=h.call('login',{name:'관리자',pin:'4826',takeover:true});assert.equal(accepted.snapshot.account.id,a.id);assert.equal(accepted.snapshot.account.cash,7654321);assert.ok(accepted.adminToken);
});
test('admin PIN changes and resets preserve hashed authentication while revoking previous sessions',()=>{
 const h=configured(),r=h.call('login',{name:'관리자',pin:'4826'}),id=r.snapshot.account.id;
 h.call('pin',{token:r.token,adminToken:r.adminToken,runId:r.snapshot.account.runId,requestId:'admin-pin-change',pin:'4826',newPin:'5937'});
 assert.equal(h.s.accounts[id].pin,undefined);assert.throws(()=>h.call('login',{name:'관리자',pin:'4826'}),/PIN|아이디/);
 const next=h.call('login',{name:'관리자',pin:'5937'});assert.ok(next.adminToken);
 h.call('reset',{token:next.token,adminToken:next.adminToken,runId:next.snapshot.account.runId,requestId:'admin-reset-proof',pin:'5937',confirm:true});assert.ok(h.call('login',{name:'관리자',pin:'5937'}).adminToken);
});
test('ordinary login form contains no admin inputs, passwords or setup links',async()=>{
 const {loginView}=await import('../js/views.js');for(const mode of ['login','signup']){const html=loginView(mode);assert.ok(!html.includes('adminSecret'));assert.ok(!html.includes('관리자 로그인'));assert.ok(!html.includes('setup.html#admin'));}
});
