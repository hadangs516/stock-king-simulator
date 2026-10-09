const {performance}=require('node:perf_hooks'),assert=require('node:assert/strict');
const {harness,signup}=require('../tests/helpers.cjs');
const h=harness(),r=signup(h);for(const x of Object.values(h.s.market.stocks))x.history=Array.from({length:10080},(_,i)=>[h.now-(10079-i)*60000,x.price+i%11]);
const run=lightweight=>h.K.execute(h.s,{version:1,action:'records',token:r.token,offset:0,lightweight},h.env).response;
const baseline=run(false),optimized=run(true),{snapshot,...payload}=baseline;assert.equal(JSON.stringify(payload),JSON.stringify(optimized));
const times={baseline:[],optimized:[]};run(false);run(true);
for(let i=0;i<5;i++)for(const name of i%2?['optimized','baseline']:['baseline','optimized']){const start=performance.now();run(name==='optimized');times[name].push(performance.now()-start);}
const median=v=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)];
console.log(JSON.stringify({scenario:'synthetic 24 stocks, 7 days of minute history; authenticated records read; 5 alternating runs',identicalRecords:true,baseline:{medianMs:+median(times.baseline).toFixed(2),responseBytes:Buffer.byteLength(JSON.stringify(baseline))},optimized:{medianMs:+median(times.optimized).toFixed(2),responseBytes:Buffer.byteLength(JSON.stringify(optimized))}}));
