const {performance}=require('node:perf_hooks'),assert=require('node:assert/strict');
const {harness,signup}=require('../tests/helpers.cjs');
const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id];a.started=h.now-8*h.K.DAY;
for(const x of Object.values(h.s.market.stocks))x.history=Array.from({length:10080},(_,i)=>[h.now-(10079-i)*60000,x.price+(i%11)]);
const optimized=h.K.snapshot;
const baselineSource=optimized.toString().replace('King.clone(Object.assign({},x,{history:x.history.slice(-240)}))','King.clone(x)').replace('if(King.day(a,t)<2)','v.history=v.history.slice(-240);if(King.day(a,t)<2)');
const baseline=optimized.constructor('return ('+baselineSource+')')();
const run=fn=>fn(h.s,a,h.now,false,h.env);
assert.equal(JSON.stringify(run(baseline)),JSON.stringify(run(optimized)),'public snapshot must be identical');
for(let i=0;i<3;i++){run(baseline);run(optimized);}
const times={baseline:[],optimized:[]};
for(let i=0;i<9;i++)for(const name of i%2?['optimized','baseline']:['baseline','optimized']){const start=performance.now();run(name==='baseline'?baseline:optimized);times[name].push(performance.now()-start);}
const median=v=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)],summary={};
for(const [name,fn] of [['baseline',baseline],['optimized',optimized]]){let copied=0;const clone=h.K.clone;h.K.clone=v=>{if(v?.history)copied+=v.history.length;return clone(v);};const s=run(fn);h.K.clone=clone;summary[name]={medianMs:Math.round(median(times[name])*100)/100,clonedHistoryPoints:copied,responseBytes:Buffer.byteLength(JSON.stringify(s))};}
console.log(JSON.stringify({scenario:'24 stocks, 7 days of minute history; alternating 9 runs after warmup',identicalResponse:true,...summary}));
const optimizedAchievements=h.K.achievements,baselineAchievements=optimizedAchievements.constructor('return ('+optimizedAchievements.toString().replace('total=King.totalAssets(s,a)','total=King.snapshot(s,a,t).total')+')')();
const runSync=name=>{h.K.snapshot=name==='baseline'?baseline:optimized;h.K.achievements=name==='baseline'?baselineAchievements:optimizedAchievements;return h.K.execute(h.s,{version:1,action:'sync',token:r.token,active:false},h.env).response;};
assert.equal(JSON.stringify(runSync('baseline')),JSON.stringify(runSync('optimized')),'sync response must be identical');
const syncTimes={baseline:[],optimized:[]};for(let i=0;i<5;i++)for(const name of i%2?['optimized','baseline']:['baseline','optimized']){const start=performance.now();runSync(name);syncTimes[name].push(performance.now()-start);}
console.log(JSON.stringify({scenario:'full sync; identical response; alternating 5 runs',baselineMedianMs:Math.round(median(syncTimes.baseline)*100)/100,optimizedMedianMs:Math.round(median(syncTimes.optimized)*100)/100}));
