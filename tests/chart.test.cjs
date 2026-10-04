const {test}=require('node:test'),assert=require('node:assert/strict');
test('candles aggregate chronological real samples without manufacturing gaps or wicks',async()=>{
 const {candleData,candles}=await import('../js/format.js');
 const points=[[120000,105],[0,100],[60000,90],[240000,101],[900000,88]];
 assert.deepEqual(candleData(points),[{time:0,open:100,high:105,low:90,close:101,samples:4},{time:900000,open:88,high:88,low:88,close:88,samples:1}]);
 const html=candles([[60000,100],[120000,110],[300000,100],[360000,90]]);
 assert.ok(html.includes('#e13d48'));assert.ok(html.includes('#2166db'));assert.ok(!html.includes('NaN'));
 assert.ok(!candles([[60000,10]]).includes('NaN'));
});
