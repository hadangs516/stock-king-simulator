const {test}=require('node:test'),assert=require('node:assert/strict'),service=require('./segmented-service.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
function login(h){const u=h.post({action:'signup',name:'구획검증',pin:'0012',consent:true});assert.ok(u.token);h.post({action:'attendance',token:u.token,runId:u.snapshot.account.runId,requestId:'first-grant-fixture'});return u;}
test('explicit migration and inverse migration preserve all accounts, receipts, retained prices and Korean text',()=>{
 const h=service(),u=login(h),before=plain(h.read());h.ctx.enableSegmentedStockKingStorage();assert.equal(h.ledger.rows[0][0],'스키마 2');assert.deepEqual(plain(h.read()),before);
 h.ctx.restoreLegacyStockKingStorage();assert.equal(h.ledger.rows[0][0],'스키마 1');assert.deepEqual(plain(h.read()),before);assert.equal(h.members.rows[1][2],'0012');
});
test('friend queries do not read retained price blocks and settings do not rewrite unchanged price history',()=>{
 const h=service(),u=login(h),s=h.read();for(const x of Object.values(s.market.stocks))x.history=Array.from({length:10080},(_,i)=>[Date.parse('2026-09-26T10:00:00Z')-(10079-i)*60000,x.price+i%41]);h.ctx.KingStore.write(h.ctx.KingStore.open(),s);
 h.ctx.enableSegmentedStockKingStorage();h.cache.clear();h.resetMetrics();const r=h.post({action:'friends',token:u.token,lightweight:true});assert.ok(r.friends);assert.ok(h.metrics.reads.filter(x=>x.name==='서버구획').every(x=>x.r===2));
 h.resetMetrics();assert.ok(h.post({action:'settings',token:u.token,runId:u.snapshot.account.runId,requestId:'settings-only-fixture',settings:{terms:false}}).snapshot);const payload=JSON.stringify(h.metrics.batches);assert.ok(payload.length<100000);assert.equal(h.read().accounts[u.snapshot.account.id].settings.terms,false);
});
test('a lost trade save response is retried exactly once against the segmented authoritative state',()=>{
 const h=service(),u=login(h);h.ctx.enableSegmentedStockKingStorage();const q=h.post({action:'quote',token:u.token,symbol:'005930',side:'buy',quantity:10}),req={action:'trade',token:u.token,runId:u.snapshot.account.runId,requestId:'partition-trade-fixture',quoteId:q.quote.id};h.loseCommit();assert.equal(h.post(req).error,'COMMIT_UNKNOWN');const r=h.post(req);assert.equal(r.snapshot.account.cash,299650);assert.equal(Object.keys(h.read().receipts).length,1);
});
test('failed migration cannot switch authority or corrupt a prior state checkpoint',()=>{
 const h=service();login(h);const before=plain(h.read());h.rejectCommit();assert.throws(()=>h.ctx.enableSegmentedStockKingStorage(),/503 unavailable/);assert.equal(h.ledger.rows[0][0],'스키마 1');assert.deepEqual(plain(h.read()),before);
});
test('cache eviction and corrupt cached segments fall back to checked authoritative blocks',()=>{
 const h=service();login(h);h.ctx.enableSegmentedStockKingStorage();const before=plain(h.read());h.cache.clear();assert.deepEqual(plain(h.read()),before);for(const key of h.cache.keys())h.cache.set(key,'corrupt');assert.deepEqual(plain(h.read()),before);
});
test('in-place periodic market changes still update the private account mirror atomically',()=>{
 const h=service(),u=login(h);h.ctx.enableSegmentedStockKingStorage();const db=h.ctx.KingStore.open(),state=h.ctx.KingStore.read(db);state.accounts[u.snapshot.account.id].cash+=12345;h.ctx.KingStore.write(db,state);assert.equal(h.members.rows[1][9],state.accounts[u.snapshot.account.id].cash);assert.equal(h.read().accounts[u.snapshot.account.id].cash,state.accounts[u.snapshot.account.id].cash);
});


test('legacy four-column sheets still permit status and login before migration',()=>{
 const h=service(),range=h.ledger.getRange;h.ledger.getMaxColumns=()=>4;
 h.ledger.getRange=(r,c,n=1,w=1)=>{if(c+w-1>4)throw Error('Range exceeds grid limits');return range(r,c,n,w);};
 assert.equal(JSON.parse(h.ctx.doGet()).service,'stock-king');assert.ok(h.post({action:'signup',name:'기존장부',pin:'0012',consent:true}).token);
});
test('unchanged reads in migrated storage commit nothing, while the next minute still commits',()=>{
 const h=service(),u=login(h);h.ctx.enableSegmentedStockKingStorage();h.post({action:'friends',token:u.token,lightweight:true});h.resetMetrics();
 assert.ok(h.post({action:'friends',token:u.token,lightweight:true}).friends);assert.equal(h.metrics.batches.length,0);
 h.advance(60000);h.post({action:'friends',token:u.token,lightweight:true});assert.equal(h.metrics.batches.length,1);
});


test('conversion verification ignores object insertion order in a fresh ledger and extended stocks',()=>{
 for(const extended of [false,true]){const h=service();if(extended){const s=h.read();s.market.stocks['005930'].dividendOverride=12;s.market.stocks['005930'].tradeEpoch=2;h.ctx.KingStore.write(h.ctx.KingStore.open(),s);}const before=plain(h.read());assert.equal(h.ctx.enableSegmentedStockKingStorage().format,2);assert.deepEqual(plain(h.read()),before);}
});
