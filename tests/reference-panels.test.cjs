const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('installed app uses the full name and separate maskable artwork rather than cropping the favicon',()=>{
 const fs=require('node:fs'),manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
 assert.equal(manifest.name,'주식왕 시뮬레이션');assert.equal(manifest.short_name,manifest.name);
 const maskable=manifest.icons.find(i=>i.purpose==='maskable'),normal=manifest.icons.find(i=>i.purpose==='any'&&i.sizes==='512x512');
 assert.notEqual(maskable.src,normal.src);for(const i of manifest.icons)assert.ok(fs.existsSync(i.src));
 assert.ok(fs.readFileSync('index.html','utf8').includes('name="apple-mobile-web-app-title" content="주식왕 시뮬레이션"'));
});
test('illustrated notification groups retain all approved choices and escape labels',async()=>{
 const {notificationSettings}=await import('../js/reference-panels.js'),s=signup(harness()).snapshot;
 s.account.settings.notifications.buyFilled=false;const html=notificationSettings(s);
 assert.equal((html.match(/role="switch"/g)||[]).length,26);
 for(const o of s.notificationOptions)assert.ok(html.includes('name="'+o.id+'"'));
 assert.ok(!html.match(/name="buyFilled"[^>]*checked/));assert.ok(html.includes('거래 관련 알림'));assert.ok(html.includes('가격 변동 알림'));
 assert.ok(!html.includes('상장폐지 예고'));
});
test('economy charts only plot available records and cannot invent missing days',async()=>{
 const {economyView}=await import('../js/reference-panels.js'),s={economy:{rate:3,inflation:2.3,activity:100},marketTime:Date.parse('2026-10-13T08:00:00Z')};
 const html=economyView(s);assert.ok(html.includes('data-metric="rate"'));assert.ok(html.includes('data-samples="1"'));assert.ok(html.includes('기록 1개'));assert.ok(!html.includes('3.53'));
 s.economyHistory=[{at:s.marketTime-86400000,rate:2.75,inflation:2.2,activity:99}];const withHistory=economyView(s);assert.ok(withHistory.includes('+0.25%p'));assert.ok(withHistory.includes('전일 대비'));assert.ok(withHistory.includes('data-samples="2"'));
});
test('economy history stays bounded, preserves daily actual observations, and is locked before DAY 3',()=>{
 const h=harness(),r=signup(h);assert.equal(h.call('sync',{token:r.token}).snapshot.economyHistory.length,0);
 const m=h.s.market;m.economyHistory=[];
 for(let d=0;d<50;d++){m.economy.rate=3+d*.01;h.K.recordEconomy(m,h.now+d*h.K.DAY);h.K.recordEconomy(m,h.now+d*h.K.DAY+60000);}
 assert.equal(m.economyHistory.length,40);assert.equal(m.economyHistory.at(-1).rate,3.49);assert.equal(new Set(m.economyHistory.map(p=>h.K.date(p.at))).size,40);
 const a=h.s.accounts[r.snapshot.account.id];a.started-=3*h.K.DAY;
 const s=h.call('sync',{token:r.token}).snapshot;assert.equal(s.economyHistory.length,40);assert.ok(Object.keys(s.economyHistory[0]).every(k=>['at','rate','inflation','activity'].includes(k)));
});
test('asset tab shares the reference total and keeps holdings, cash and reward navigation',async()=>{
 const {assets,total}=await import('../js/views.js'),s=signup(harness()).snapshot;
 for(const html of [assets(s),total(s)]){assert.ok(html.includes('total-donut'));assert.ok(html.includes('data-action="assetCategory"'));assert.ok(html.includes('data-final="'+s.total+'"'));assert.ok(html.includes('총자산'));}
 const html=assets(s);assert.ok(html.includes('보유 종목'));assert.ok(html.includes('data-action="rewards"'));assert.ok(html.includes('asset-donut'));
});
test('styled errors keep same-request retry for uncertain mutations and escape messages',async()=>{
 const {errorNotice}=await import('../js/reference-panels.js');assert.ok(errorNotice('<img src=x>',true).includes('data-action="retry"'));assert.ok(!errorNotice('unknown',true).includes('data-action="sync"'));
 assert.ok(errorNotice('확인',false).includes('data-action="sync"'));assert.ok(!errorNotice('<img src=x>',false).includes('<img src=x>'));
});
