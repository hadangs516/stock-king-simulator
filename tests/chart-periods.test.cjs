const {test}=require('node:test'),assert=require('node:assert/strict');
test('daily candles use Korean market midnight and hour/day summaries include older source samples',async()=>{
 const {candleData}=await import('../js/format.js');const points=[[Date.parse('2026-10-06T23:59:00+09:00'),100],[Date.parse('2026-10-07T00:01:00+09:00'),110]];
 assert.equal(candleData(points,86400000).length,2);
 const {harness}=require('./helpers.cjs'),h=harness();assert.equal(h.K.chartBars(points,86400000).length,2);
});
