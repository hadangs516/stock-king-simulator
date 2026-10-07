const {test}=require('node:test'),assert=require('node:assert/strict');const {harness,signup}=require('./helpers.cjs');

test('notification defaults are all on, legacy choices survive and obsolete limits disappear',()=>{
 const h=harness(),r=signup(h),a=h.s.accounts[r.snapshot.account.id];
 assert.deepEqual(JSON.parse(JSON.stringify(r.snapshot.account.settings.notifications)),{risk:true,orders:true,targets:true});
 a.settings.notifications={risk:false,orders:true,targets:true,start:7,end:24,limit:2};
 const s=h.call('sync',{token:r.token}).snapshot;assert.equal(s.account.settings.notifications.risk,false);assert.equal('start' in s.account.settings.notifications,false);
 const changed=h.call('settings',{token:r.token,runId:a.runId,requestId:'notify-pref-test',settings:{notifications:{orders:false}}});
 assert.equal(changed.snapshot.account.settings.notifications.orders,false);assert.equal(changed.snapshot.account.settings.notifications.targets,true);
 h.K.addAlert(h.s.accounts[a.id],'muted-order','orders','예약 체결','기록',h.now);h.K.addAlert(h.s.accounts[a.id],'target','targets','목표가','기록',h.now);
 const refreshed=h.call('sync',{token:r.token}).snapshot;assert.equal(refreshed.alerts.some(n=>n.id==='muted-order'),false);assert.equal(refreshed.alerts.some(n=>n.id==='target'),true);
});

test('notification read state is account scoped and cannot mark another account private notice',()=>{
 const h=harness(),r=signup(h),other=signup(h,'다른사람'),id=r.snapshot.account.id;
 h.K.addAlert(h.s.accounts[id],'own-alert','targets','목표 도달','',h.now);
 h.K.addAlert(h.s.accounts[other.snapshot.account.id],'foreign-alert','targets','비공개','',h.now);
 const out=h.call('readAlerts',{token:r.token,runId:r.snapshot.account.runId,requestId:'read-alert-test',ids:['own-alert','foreign-alert']});
 assert.deepEqual(Array.from(out.snapshot.readAlerts),['own-alert']);assert.equal(h.call('sync',{token:other.token}).snapshot.readAlerts.length,0);
});
