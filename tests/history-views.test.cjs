const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('forked market updates and splits never mutate original retained price points',()=>{
 const h=harness(),original=h.s,x=original.market.stocks['005930'],old=JSON.stringify(original),copy=h.K.forkState(original);
 copy.market.stocks[x.id].history[0][1]=99;copy.market.stocks[x.id].history.push([h.now+60000,88]);assert.equal(JSON.stringify(original),old);
});
test('a lightweight friend read leaves archived history loaders untouched',()=>{
 const h=harness(),u=signup(h);let loads=0;
 for(const x of Object.values(h.s.market.stocks)){const points=x.history,bars={hour:h.K.chartBars(points,3600000),day:h.K.chartBars(points,h.K.DAY)};h.K.attachHistory(x,()=>{loads++;return points;},points.slice(-240),bars);}
 h.call('friends',{token:u.token,lightweight:true});assert.equal(loads,0);
});
test('public chart views match real retained samples and invalidate on new points',()=>{
 const h=harness(),x=h.s.market.stocks['005930'],points=Array.from({length:1500},(_,i)=>[h.now-(1500-i)*60000,100+i%73]);let loads=0;
 const bars={hour:h.K.chartBars(points,3600000),day:h.K.chartBars(points,h.K.DAY)};h.K.attachHistory(x,()=>{loads++;return points;},points.slice(-240),bars);
 assert.equal(JSON.stringify(h.K.historyBars(x)),JSON.stringify(bars));assert.equal(JSON.stringify(h.K.historyPreview(x)),JSON.stringify(points.slice(-240)));assert.equal(loads,0);
 x.history.push([h.now,222]);assert.equal(loads,1);assert.equal(JSON.stringify(h.K.historyBars(x)),JSON.stringify({hour:h.K.chartBars(points,3600000),day:h.K.chartBars(points,h.K.DAY)}));
});
test('many deferred copies keep one archive source without building a recursive loading chain',()=>{
 const h=harness(),points=[[h.now,100]];let loads=0,s=h.s;
 h.K.attachHistory(s.market.stocks['005930'],()=>{loads++;return points;},points,{});
 for(let i=0;i<600;i++)s=h.K.forkState(s);
 assert.equal(loads,0);s.market.stocks['005930'].history.push([h.now+60000,150]);assert.equal(loads,1);assert.equal(points.length,1);
});
