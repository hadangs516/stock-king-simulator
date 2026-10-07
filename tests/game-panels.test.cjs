const {test}=require('node:test'),assert=require('node:assert/strict');
test('asset composition counts reserved cash once and keeps zero assets finite',async()=>{
 const {compositionParts}=await import('../js/game-panels.js');
 const parts=compositionParts({account:{cash:1000},stockValue:2000,etfValue:500,dividends:500,total:4000,availableCash:600});
 assert.deepEqual(parts.map(p=>p.value),[1000,2000,500,500]);assert.equal(parts.reduce((n,p)=>n+p.share,0),100);
 assert.ok(compositionParts({account:{cash:0},stockValue:0,etfValue:0,dividends:0,total:0}).every(p=>p.share===0));
});
test('small charts only draw actual samples and order filters preserve completed history',async()=>{
 const {miniCandles,orderSubset}=await import('../js/game-panels.js');
 assert.match(miniCandles([]),/기록 대기/);assert.doesNotMatch(miniCandles([[1,100]]),/NaN|Infinity/);
 const orders=[{kind:'limitBuy',status:'대기'},{kind:'limitSell',status:'체결'},{kind:'oco',status:'대기'}];
 assert.equal(orderSubset(orders,'예약매수').length,1);assert.equal(orderSubset(orders,'예약매도')[0].status,'체결');assert.equal(orderSubset(orders,'자동매도')[0].kind,'oco');assert.equal(orderSubset(orders,'전체').length,3);
});
