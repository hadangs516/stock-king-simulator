const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('26 approved notification options migrate explicit legacy opt-outs',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id];
 a.settings.notifications={risk:false,orders:false,targets:true};
 const n=h.K.notificationSettings(a);assert.equal(h.K.notificationOptions.length,26);
 assert.equal(n.halt,false);assert.equal(n.buyFilled,false);assert.equal(n.targetAbove,true);assert.equal(n.friendMessage,true);
 assert.ok(!h.K.notificationOptions.some(x=>/예고/.test(x.label)));
});
test('claim feed waits for payment time, preserves claims when muted and isolates accounts',()=>{
 const h=harness(),r=signup(h),v=signup(h,'다른유저'),a=h.s.accounts[r.snapshot.account.id];
 h.s.claims.claim1={id:'claim1',accountId:a.id,runId:a.runId,name:'배당종목',net:100,payAt:h.now+1,at:h.now,status:'대기'};
 assert.ok(!h.K.notificationFeed(h.s,a,h.now).some(n=>n.id==='claim-claim1'));
 assert.ok(h.K.notificationFeed(h.s,a,h.now+1).some(n=>n.kind==='dividend'));
 assert.ok(!h.K.notificationFeed(h.s,h.s.accounts[v.snapshot.account.id],h.now+1).some(n=>n.id==='claim-claim1'));
 a.settings.notifications.dividend=false;assert.ok(!h.K.notificationFeed(h.s,a,h.now+1).some(n=>n.kind==='dividend'));assert.equal(h.s.claims.claim1.status,'대기');
});
test('overlapping held/favorite news is one alert and either enabled subscription can receive it',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id],symbol='005930';a.holdings[symbol]={quantity:1,cost:1,since:h.now};a.settings.favorites=[symbol];
 const n={id:'overlap-news',symbol,title:'회사 소식',at:h.now};h.K.alertNews(h.s,n,h.now);h.K.alertNews(h.s,n,h.now);
 assert.equal(h.K.notificationFeed(h.s,a,h.now).filter(v=>v.id===n.id).length,1);
 a.settings.notifications.heldNews=false;assert.equal(h.K.notificationFeed(h.s,a,h.now).find(v=>v.id===n.id)?.kind,'favoriteNews');
 a.settings.notifications.favoriteNews=false;assert.ok(!h.K.notificationFeed(h.s,a,h.now).some(v=>v.id===n.id));
});
test('muting an alert and reading another does not erase its saved read state',()=>{
 const h=harness(),r=signup(h),id=r.snapshot.account.id,auth={token:r.token,runId:r.snapshot.account.runId};
 h.K.addAlert(h.s.accounts[id],'read-muted','targetAbove','목표가','',h.now);
 h.call('readAlerts',{...auth,requestId:'read-before-mute',ids:['read-muted']});
 h.call('settings',{...auth,requestId:'mute-before-read',settings:{notifications:{targetAbove:false}}});
 h.K.addAlert(h.s.accounts[id],'read-another','targetBelow','목표가','',h.now);
 const out=h.call('readAlerts',{...auth,requestId:'read-after-mute',ids:['read-another']});assert.ok(out.snapshot.readAlerts.includes('read-muted'));
});
test('order notifications distinguish fills and automatic closure without manual-cancel noise',()=>{
 const h=harness();for(const [type,kind,want] of [['예약 체결','limitBuy','buyFilled'],['예약 체결','limitSell','sellFilled'],['예약 체결','oco','stopFilled'],['예약 체결','stop','stopFilled'],['예약 실패','limitBuy','orderFailed'],['예약 만료','limitBuy','orderClosed'],['분할로 예약 취소','limitBuy','orderClosed'],['종목 상태로 예약 취소','limitBuy','orderClosed'],['예약 취소','limitBuy',null]])assert.equal(h.K.orderAlertKind(type,{kind}),want);
});
test('stock events and news obey exclusions, ownership and duplicate suppression',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id],x=h.s.market.stocks['005930'];a.settings.favorites=[x.id];
 h.K.news(h.s,x,x.name+' 거래정지','정지',h.now,0,h.env);h.K.news(h.s,x,x.name+' 거래재개','재개',h.now+1,0,h.env);
 assert.equal(a.alerts.filter(n=>n.kind==='halt').length,1);assert.equal(a.alerts.filter(n=>n.kind==='resume').length,1);assert.ok(!a.alerts.some(n=>n.kind==='favoriteNews'));
 h.K.alertNews(h.s,{id:'advance',symbol:x.id,title:'상장폐지 확정',fact:'내일 예정',at:h.now},h.now);assert.ok(!a.alerts.some(n=>n.id==='advance'));
});
test('all notification switches filter display without deleting stored events',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id];
 for(const o of h.K.notificationOptions)h.K.addAlert(a,'type-'+o.id,o.id,o.label,'',h.now);
 for(const o of h.K.notificationOptions){a.settings.notifications[o.id]=false;assert.ok(!h.K.notificationFeed(h.s,a,h.now).some(n=>n.kind===o.id));a.settings.notifications[o.id]=true;assert.ok(h.K.notificationFeed(h.s,a,h.now).some(n=>n.id==='type-'+o.id));}
 assert.equal(a.alerts.length,26);
});
test('notice types respect targets and every kind can be independently muted',()=>{
 const h=harness(),r=signup(h),v=signup(h,'공지타인'),a=h.s.accounts[r.snapshot.account.id];
 for(const kind of ['notice','update','maintenance'])h.s.announcements[kind]={id:kind,kind,title:kind,body:'내용',targets:[a.id],status:'게시',at:h.now};
 assert.equal(h.K.notificationFeed(h.s,a,h.now).filter(n=>n.category==='공지').length,3);
 assert.equal(h.K.notificationFeed(h.s,h.s.accounts[v.snapshot.account.id],h.now).filter(n=>n.category==='공지').length,0);
 a.settings.notifications.update=false;assert.ok(!h.K.notificationFeed(h.s,a,h.now).some(n=>n.kind==='update'));assert.equal(Object.keys(h.s.announcements).length,3);
});
test('administrator resume emits a single trading-resumed alert to affected players',()=>{
 const h=harness(),r=signup(h),admin=signup(h,'운영자'),proof=h.call('adminUnlock',{token:admin.token,requestId:'resume-unlock',secret:'test-only-admin'}),id=r.snapshot.account.id;
 h.s.accounts[id].settings.favorites=['005930'];h.s.market.stocks['005930'].status='거래정지';
 h.call('adminMarket',{token:admin.token,adminToken:proof.adminToken,requestId:'resume-market-test',symbol:'005930',operation:'resume',reason:'재개'});
 assert.equal(h.s.accounts[id].alerts.filter(n=>n.kind==='resume').length,1);
});
