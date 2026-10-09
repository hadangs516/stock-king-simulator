const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('optional lightweight list reads retain authentication and payload without building charts',()=>{
 const h=harness(),r=signup(h);let calls=0;const snapshot=h.K.snapshot;h.K.snapshot=(...args)=>{calls++;return snapshot(...args);};
 const records=h.call('records',{token:r.token,offset:0,lightweight:true});assert.equal(calls,0);assert.ok(records.records.length);assert.equal(records.snapshot,undefined);
 assert.throws(()=>h.call('records',{token:'invalid',lightweight:true}));
 const attendance=h.call('attendance',{token:r.token,runId:r.snapshot.account.runId,requestId:'light-claim-0001',lightweight:true});assert.ok(attendance.snapshot);assert.equal(calls,1);
});
test('record prefetch is bounded, paged, private and retains the default page size',()=>{
 const h=harness(),r=signup(h),id=r.snapshot.account.id;h.s.records={};
 for(let i=0;i<650;i++)h.s.records['own-'+i]={id:'own-'+i,accountId:id,at:h.now-i,data:{text:i,admin:'private'}};
 h.s.records.other={id:'other',accountId:'another-account',data:{text:'private'}};
 const read=(offset=0,limit)=>h.call('records',{token:r.token,offset,limit,lightweight:true});
 assert.equal(read().records.length,30);assert.equal(read().next,30);
 const first=read(0,300),second=read(first.next,300),last=read(second.next,300),all=[...first.records,...second.records,...last.records];
 assert.equal(all.length,650);assert.equal(new Set(all.map(x=>x.id)).size,650);assert.equal(last.next,null);
 assert.ok(all.every(x=>x.accountId===id&&!('admin' in x.data)));assert.throws(()=>read(0,301));assert.throws(()=>read(0,0));
});
test('snapshot bounds raw history copies while retaining old chart extremes and detached response data',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id],x=h.s.market.stocks['005930'];
 x.history=Array.from({length:1000},(_,i)=>[h.now-(999-i)*60000,i===0?999999:70000+i]);
 let copied=0;const clone=h.K.clone;h.K.clone=value=>{if(value?.history)copied=Math.max(copied,value.history.length);return clone(value);};
 const s=h.K.snapshot(h.s,a,h.now,false,h.env);
 assert.ok(copied<=240,'raw history copies must be bounded by the transmitted sample window');
 const stock=s.stocks.find(v=>v.id===x.id);assert.equal(stock.history.length,240);assert.ok(stock.chartBars.hour.some(b=>b.high===999999));
 stock.history[0][1]=1;assert.notEqual(x.history.at(-240)[1],1);assert.equal(x.history.length,1000);
});
test('public status does not copy private state and returns independent maintenance data',()=>{
 const h=harness();let wholeStateCopies=0;const clone=h.K.clone;h.K.clone=value=>{if(value===h.s)wholeStateCopies++;return clone(value);};
 const r=h.call('status');assert.equal(wholeStateCopies,0);r.maintenance.enabled=true;assert.equal(h.s.maintenance.enabled,false);
});
test('sync computes the public snapshot once rather than rebuilding charts for achievement totals',()=>{
 const h=harness(),r=signup(h);let calls=0;const snapshot=h.K.snapshot;h.K.snapshot=(...args)=>{calls++;return snapshot(...args);};
 h.call('sync',{token:r.token,active:false});assert.equal(calls,1);
});
test('lightweight total matches the public snapshot for reserved, halted, delisted and unpaid assets',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id];
 a.holdings['005930']={quantity:4,cost:200000,since:h.now};a.holdings['035720']={quantity:2,cost:100000,since:h.now};h.s.market.stocks['035720'].status='비상장';h.s.market.stocks['005930'].status='거래정지';
 h.s.orders.reserved={id:'reserved',accountId:a.id,runId:a.runId,symbol:'005930',kind:'limitBuy',status:'대기',quantity:1,price:50000,reserved:50025};
 h.s.claims={own:{accountId:a.id,runId:a.runId,status:'대기',net:900,payAt:h.now+86400000},old:{accountId:a.id,runId:'old',status:'대기',net:800},other:{accountId:'other',runId:a.runId,status:'대기',net:700},reward:{accountId:a.id,runId:a.runId,status:'대기',net:600,reward:{kind:'cash'}}};
 assert.equal(h.K.totalAssets(h.s,a),h.K.snapshot(h.s,a,h.now).total);assert.equal(h.K.totalAssets(h.s,a),1280900);
});
