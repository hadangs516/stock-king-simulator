const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function configFixture(initial={},bootstrap){
 const properties=new Map([['SIGNING_KEY','test-only-signing'],['STOCK_KING_SHEET_ID','private-test-sheet'],...Object.entries(initial)]),writes=[];
 const ctx=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key)||null,setProperties:(values,remove)=>{writes.push({values,remove});if(remove)properties.clear();Object.entries(values).forEach(([k,v])=>properties.set(k,v));}})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],computeHmacSha256Signature:(s,key)=>[...crypto.createHmac('sha256',key).update(s).digest()]},...(bootstrap?{kingPrivateAdminLoginConfig_:bootstrap}:{})});
 vm.runInContext(fs.readFileSync('server/Code.gs','utf8'),ctx);return {ctx,properties,writes};
}
const synthetic={name:'관리자',salt:'synthetic-config-salt',hash:digest('synthetic-config-salt:4826')};
test('private bootstrap merges only admin properties and survives later public code updates',()=>{
 const h=configFixture({},()=>synthetic),env=h.ctx.kingEnv_();assert.equal(env.verifyAdminLogin('관리자','4826'),true);assert.equal(env.verifyAdminLogin('관리자','1111'),false);
 assert.equal(h.writes.length,1);assert.equal(h.writes[0].remove,false);assert.deepEqual(Object.keys(h.writes[0].values).sort(),['ADMIN_LOGIN_NAME','ADMIN_LOGIN_PIN_HASH','ADMIN_LOGIN_PIN_SALT']);assert.equal(h.properties.get('SIGNING_KEY'),'test-only-signing');assert.equal(h.properties.get('STOCK_KING_SHEET_ID'),'private-test-sheet');
 delete h.ctx.kingPrivateAdminLoginConfig_;assert.equal(h.ctx.kingEnv_().verifyAdminLogin('관리자','4826'),true);assert.equal(h.writes.length,1);
});
test('old bootstrap cannot override owner configuration or revive a partially removed configuration',()=>{
 const changed={ADMIN_LOGIN_NAME:'관리자',ADMIN_LOGIN_PIN_SALT:'changed-test-salt',ADMIN_LOGIN_PIN_HASH:digest('changed-test-salt:5937')},h=configFixture(changed,()=>synthetic);
 assert.equal(h.ctx.kingEnv_().verifyAdminLogin('관리자','5937'),true);assert.equal(h.ctx.kingEnv_().verifyAdminLogin('관리자','4826'),false);assert.equal(h.writes.length,0);
 h.properties.delete('ADMIN_LOGIN_PIN_HASH');assert.equal(h.ctx.kingEnv_().isAdminLoginName('관리자'),false);assert.equal(h.writes.length,0);
});
test('admin account certification is bound to both account identity and private server signing key',()=>{
 const h=configFixture({},()=>synthetic),env=h.ctx.kingEnv_(),a={id:'account-a',name:'관리자'};a.adminLoginProof=env.adminLoginProof(a.id);
 assert.equal(env.isPasswordAdmin(a),true);assert.equal(env.isPasswordAdmin({...a,id:'account-b'}),false);assert.equal(env.isPasswordAdmin({...a,name:'일반계정'}),false);h.properties.set('SIGNING_KEY','rotated-test-key');assert.equal(h.ctx.kingEnv_().isPasswordAdmin(a),false);
});
