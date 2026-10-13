const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('unchanged lightweight friend and record queries do not replace the authoritative checkpoint',()=>{
 const h=harness(),u=signup(h);h.call('friends',{token:u.token,lightweight:true});
 for(const action of ['friends','friendRanking','records']){const before=h.s;h.call(action,{token:u.token,lightweight:true,metric:'total'});assert.equal(h.s,before,action);}
});
test('lightweight reads still persist real defaults, market advance and reserved fills',()=>{
 const h=harness(),u=signup(h),before=h.s;h.call('friends',{token:u.token,lightweight:true});assert.notEqual(h.s,before);
 const s=h.s;h.advance(60000);h.call('friends',{token:u.token,lightweight:true});assert.notEqual(h.s,s);assert.equal(h.s.market.minute,Math.floor(h.now/60000));
});
