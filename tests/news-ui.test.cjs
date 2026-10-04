const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('news cards group by date with metadata only and open escaped long articles',async()=>{
 const {news,newsArticle}=await import('../js/views.js');const {newsParagraphs,newsTitle}=await import('../js/news-content.js');
 const h=harness(),s=signup(h).snapshot;
 for(const n of s.news){assert.ok(newsParagraphs(n,1).length>=10);assert.deepEqual(newsParagraphs(n,7).slice(0,10),newsParagraphs(n,1).slice(0,10));}
 const n={id:'article',title:'삼성전자 사업 환경 변화',fact:'반도체 가상 수요 지표가 -3% 변했습니다.',at:h.now,sector:'반도체',impact:-3};
 const cards=news(s,[n]);assert.match(cards,/newsArticle/);assert.ok(!cards.includes(n.fact));assert.match(newsTitle(n),/삼성전자, 수요 둔화/);
 assert.ok(newsParagraphs(n).length>=10);assert.match(newsParagraphs(n)[0],/3% 하락/);
 const html=newsArticle(s,{...n,fact:'<script>bad()</script>',title:'<img src=x onerror=bad()>'});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;script&gt;/);assert.match(html,/newsBack/);
});
test('achievement groups show the next stage and retain completed stages inside expansion',async()=>{
 const {achievements}=await import('../js/views.js');const h=harness(),s=signup(h).snapshot;
 s.account.achievements['time-1800']={kind:'time',goal:1800,at:h.now};s.account.statistics.progress.time=1800;
 const html=achievements(s);assert.equal((html.match(/<details /g)||[]).length,Object.keys(s.achievementTargets).length);
 assert.match(html,/실제 플레이 시간 30분/);assert.ok(!html.includes('0.5시간'));assert.match(html,/보상: 배지/);assert.match(html,/실제 플레이 시간 2시간/);
});
test('company marks use validated stock ids and all initial businesses have individual introductions',async()=>{
 const {companyLogoUrl,companyDescriptions}=await import('../js/companies.js');const h=harness(),s=signup(h).snapshot;
 for(const x of s.stocks.filter(x=>x.market!=='ETF')){assert.ok(companyDescriptions[x.id]?.length>80,x.name);assert.ok(companyLogoUrl(x)?.endsWith(x.id+'.png'));}
 assert.equal(companyLogoUrl({id:'../unsafe',market:'KOSPI'}),null);assert.equal(companyLogoUrl({id:'123456',market:'ETF'}),null);
});
