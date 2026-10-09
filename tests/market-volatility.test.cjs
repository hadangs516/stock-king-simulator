const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers.cjs');
test('short-session prices have visible two-sided movement without violating daily limits',()=>{
 const changes=[],directions={up:0,down:0};
 for(const seed of ['pace-a','pace-b','pace-c']){
  const h=harness();h.K.seedNews=()=>{};h.K.calendar=()=>{};h.s.market.seed=seed;
  for(let i=0;i<30;i++){
   const old=Object.fromEntries(Object.values(h.s.market.stocks).map(x=>[x.id,x.price]));
   h.K.advance(h.s,(h.s.market.minute+1)*60000,h.env);
   for(const x of Object.values(h.s.market.stocks).filter(x=>!x.fund)){
    const move=(x.price/old[x.id]-1)*100;changes.push(Math.abs(move));if(move>0)directions.up++;if(move<0)directions.down++;
    assert.ok(x.price>=Math.ceil(x.base*.7)&&x.price<=Math.floor(x.base*1.3));assert.ok(Number.isSafeInteger(x.price)&&x.price>0);
   }
  }
 }
 const median=changes.sort((a,b)=>a-b)[Math.floor(changes.length/2)];
 assert.ok(median>.5&&median<1.5,'median absolute minute movement should be visible but bounded: '+median);
 assert.ok(directions.up>changes.length*.35&&directions.down>changes.length*.35,'both directions must remain available');
});
