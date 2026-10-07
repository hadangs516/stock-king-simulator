const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers.cjs');
test('delisting advance disclosures stay in news without a risk alert',()=>{
 const h=harness(),r=h.call('signup',{name:'알림검증',pin:'0123',consent:true}),a=h.s.accounts[r.snapshot.account.id],x=Object.values(h.s.market.stocks).find(x=>!x.fund);
 a.settings.favorites=[x.id];x.status='상장';x.delistAt=h.now+86400000;
 h.K.news(h.s,x,x.name+' 상장폐지 확정','내일 상장폐지 예정',h.now,0,h.env);
 assert.ok(h.s.market.news.some(n=>n.title===x.name+' 상장폐지 확정'));
 assert.equal((a.alerts||[]).length,0);
 x.status='비상장';h.K.news(h.s,x,x.name+' 상장폐지','거래가 종료되었습니다.',h.now+1,0,h.env);
 assert.equal(a.alerts.length,1);
});
test('attendance grid repeats labels and reward amounts in the second cycle',async()=>{
 const {attendancePage}=await import('../js/progression-ui.js');
 const html=attendancePage({attendance:{nextDay:60,streak:59,history:[],claimed:false,amount:3000000}});
 assert.match(html,/2회차/);assert.match(html,/30일차/);assert.doesNotMatch(html,/<strong>60일차/);assert.doesNotMatch(html,/반복 지급되지/);
});
