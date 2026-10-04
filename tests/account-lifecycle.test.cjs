const {test}=require('node:test'),assert=require('node:assert/strict');const {harness,signup}=require('./helpers.cjs');
function fixture(){const h=harness(),a=signup(h),b=signup(h,'보존할계정'),id=a.snapshot.account.id,other=b.snapshot.account.id;
 h.s.accounts[id].lifetimeSeconds=999;h.s.accounts[id].xp=80;h.s.accounts[id].settings.terms=false;
 h.s.accounts[id].social={id:'old-social',nickname:'별명',sharing:{cash:false}};
 h.s.friendships={link:{from:id,to:other,status:'accepted'}};
 for(const table of ['orders','claims','receipts','reports','records','quotes']){h.s[table].mine={accountId:id,runId:a.snapshot.account.runId,status:'대기',net:123,reward:{kind:'cash'}};h.s[table].other={accountId:other,status:'보존'};}
 h.s.conversations={mine:{accountId:id,messages:[{body:'private'}]},other:{accountId:other,messages:[]}};
 h.s.friendMessages={mine:{from:id,to:other,body:'private'}};h.s.proxies={mine:{actorId:other,targetId:id}};
 return {h,a,b,id,other,req:{token:a.token,runId:a.snapshot.account.runId,requestId:'account-change-1',pin:'0123',confirm:true}};
}
test('reset removes progress and personal history while preserving credentials and chosen settings',()=>{
 const {h,a,id,other,req}=fixture();const market=JSON.stringify(h.s.market);const r=h.call('reset',req);
 assert.equal(r.loginRequired,true);assert.throws(()=>h.call('sync',{token:a.token}),/인증/);
 const x=h.s.accounts[id];assert.equal(x.name,'투자자');assert.equal(x.pin,'0123');assert.equal(x.settings.terms,false);assert.equal(x.social.sharing.cash,false);assert.equal(x.lifetimeSeconds,0);assert.equal(x.xp||0,0);
 for(const table of ['orders','claims','receipts','reports','records','quotes','conversations'])assert.equal(Object.values(h.s[table]).some(v=>v.accountId===id),false,table);
 assert.equal(Object.keys(h.s.friendships).length,0);assert.equal(Object.keys(h.s.friendMessages).length,0);assert.equal(Object.keys(h.s.proxies).length,0);assert.ok(h.s.accounts[other]);assert.equal(JSON.stringify(h.s.market),market);
});
test('delete removes authentication and private history without touching another account',()=>{
 const {h,a,b,id,other,req}=fixture();const backup=h.K.backupData(h.s.accounts[id]);const r=h.call('deleteAccount',req);
 assert.equal(r.deleted,true);assert.equal(r.snapshot,undefined);assert.equal(h.s.accounts[id],undefined);
 assert.throws(()=>h.call('sync',{token:a.token}),/인증/);assert.throws(()=>h.call('login',{name:'투자자',pin:'0123'}),/아이디/);
 for(const table of ['orders','claims','receipts','reports','records','quotes','conversations']){assert.equal(h.s[table].mine,undefined,table);assert.ok(h.s[table].other,table);}
 assert.equal(Object.keys(h.s.friendMessages).length,0);assert.equal(h.call('sync',{token:b.token}).snapshot.account.id,other);
 const next=signup(h);assert.notEqual(next.snapshot.account.id,id);assert.throws(()=>h.call('restore',{token:next.token,runId:next.snapshot.account.runId,requestId:'old-backup-1',backup:{data:backup,signature:h.env.sign(JSON.stringify(backup))}}),/백업/);
});
test('account destruction requires password and explicit confirmation',()=>{
 const {h,id,req}=fixture();for(const action of ['reset','deleteAccount']){assert.throws(()=>h.call(action,{...req,pin:'9999'}));assert.throws(()=>h.call(action,{...req,confirm:false}));}assert.ok(h.s.accounts[id]);
});
