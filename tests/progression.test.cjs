const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers.cjs');
function start(){const h=harness(),r=h.call('signup',{name:'출석검증',pin:'0123',consent:true});return {h,r,auth:{token:r.token,runId:r.snapshot.account.runId}};}
function claim(h,auth,id){if(!h.s.sessions[h.env.hash(auth.token)]||h.s.sessions[h.env.hash(auth.token)].expires<=h.now)auth.token=h.call('login',{name:'출석검증',pin:'0123'}).token;return h.call('attendance',{...auth,requestId:'attendance-'+id});}
function tomorrow(h,days=1){h.advance(days*86400000);h.s.market.minute=Math.floor(h.now/60000);h.s.market.date=h.K.date(h.now);}
test('new account starts at zero; first attendance is one million exactly once even with a new request id',()=>{
 const {h,r,auth}=start();assert.equal(r.snapshot.account.cash,0);
 const paid=claim(h,auth,'first');assert.equal(paid.amount,1000000);assert.equal(paid.snapshot.attendance.visible,false);assert.equal(paid.snapshot.account.cash,1000000);
 assert.equal(paid.snapshot.assetHistory.at(-1).total,1000000);
 assert.equal(claim(h,auth,'first').snapshot.account.cash,1000000);assert.equal(claim(h,auth,'second').amount,0);
 assert.equal(h.s.accounts[r.snapshot.account.id].xp,20);
 tomorrow(h);const next=claim(h,auth,'tomorrow');assert.equal(next.amount,100000);assert.equal(next.snapshot.attendance.streak,2);assert.equal(next.snapshot.attendance.history[0].amount,1000000);
});
test('weekly and day 30 rewards replace ordinary rewards, missed days restart at one hundred thousand',()=>{
 const {h,r,auth}=start();claim(h,auth,'first');
 for(let day=2;day<=61;day++){tomorrow(h);const paid=claim(h,auth,String(day));assert.equal(paid.amount,(day-1)%30+1===30?3000000:((day-1)%30+1)%7===0?500000:100000,'day '+day);}
 tomorrow(h,2);const restart=claim(h,auth,'restart');assert.equal(restart.amount,100000);assert.equal(restart.snapshot.attendance.streak,1);
 assert.equal(h.s.accounts[r.snapshot.account.id].attendance.history.length,62);
});
test('legacy migration preserves balance and never reissues the initial gift',()=>{
 const {h,r,auth}=start(),a=h.s.accounts[r.snapshot.account.id];delete a.attendance;delete a.xp;a.cash=7654321;a.startingCash=1000000;
 const synced=h.call('sync',{token:r.token});assert.equal(synced.snapshot.account.cash,7654321);assert.equal(claim(h,auth,'same-day').amount,0);
 tomorrow(h);assert.equal(claim(h,auth,'next-day').amount,100000);
});
test('tutorial progress resumes and cannot skip the first grant',()=>{
 const {h,r,auth}=start();assert.throws(()=>h.call('tutorial',{...auth,requestId:'skip-tutorial'}),/보상/);
 h.call('tutorialProgress',{...auth,requestId:'step-next-one',step:1});assert.equal(h.call('sync',{token:r.token}).snapshot.account.tutorialStep,1);
 assert.throws(()=>h.call('tutorialProgress',{...auth,requestId:'step-next-two',step:2}),/보상/);
 claim(h,auth,'first');h.call('tutorialProgress',{...auth,requestId:'step-next-three',step:2});assert.equal(h.call('sync',{token:r.token}).snapshot.account.tutorialStep,2);
});
test('XP is server awarded, capped daily and repeated article clicks do not farm points',()=>{
 const {h,r,auth}=start();claim(h,auth,'first');const id=h.s.market.news[0].id;
 for(let i=0;i<20;i++)h.call('readNews',{...auth,requestId:'read-article-'+i,id,xp:999999});
 const a=h.s.accounts[r.snapshot.account.id];assert.equal(a.xp,25);
 for(let i=0;i<100;i++)h.K.awardXp(a,'trade',h.now);
 assert.equal(a.xp,55);assert.equal(h.K.levelInfo(300).level,3);
 tomorrow(h);h.K.awardXp(a,'trade',h.now);assert.equal(a.xp,65);
});
