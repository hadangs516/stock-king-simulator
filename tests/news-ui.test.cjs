const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');
test('news categories filter before grouping, retain legacy articles and show an empty category',async()=>{
 const {news}=await import('../js/views.js');
 const list=[
  {id:'market',category:'시장뉴스',sector:'경제',title:'시장 기사',at:1000},
  {id:'company',category:'기업뉴스',sector:'반도체',symbol:'005930',title:'기업 기사',at:2000},
  {id:'notice',category:'공시',sector:'자동차',title:'공시 기사',at:3000},
  {id:'legacy',sector:'반도체',symbol:'005930',title:'옛 기업 기사',at:4000},
  {id:'unknown',category:'알 수 없음',sector:'경제',title:'옛 시장 기사',at:5000}
 ];
 const s={news:list};const html=news(s,list,true,'기업뉴스');
 assert.match(html,/data-id="company"/);assert.match(html,/data-id="legacy"/);
 assert.doesNotMatch(html,/data-id="(?:market|notice|unknown)"/);
 assert.match(html,/data-category="기업뉴스" aria-pressed="true"/);
 for(const category of ['전체','시장뉴스','기업뉴스','공시','이벤트'])assert.ok(html.includes(`data-category="${category}"`));
 assert.match(news(s,list,true,'이벤트'),/이 분류에 등록된 뉴스가 없습니다/);
 assert.match(news(s,list,true,'시장뉴스'),/data-id="unknown"/);
 assert.equal((news(s).match(/data-action="newsArticle"/g)||[]).length,5);
 assert.doesNotMatch(news(s,list,false),/data-action="newsCategory"/);
 assert.equal((news(s,list,true,'<invalid>').match(/data-action="newsArticle"/g)||[]).length,5);
});
test('news preserves authored facts, escapes articles and reuses topic pictures without requiring an image per article',async()=>{
 const {news,newsArticle}=await import('../js/views.js');const {newsParagraphs,newsTitle}=await import('../js/news-content.js');
 const h=harness(),s=signup(h).snapshot;
 for(const n of s.news){assert.ok(newsParagraphs(n,1).length>=10);assert.deepEqual(newsParagraphs(n,7).slice(0,10),newsParagraphs(n,1).slice(0,10));}
 const n={id:'article',title:'삼성전자 사업 환경 변화',fact:'반도체 가상 수요 지표가 -3% 변했습니다.',at:h.now,sector:'반도체',impact:-3};
 const cards=news(s,[n]);assert.match(cards,/newsArticle/);assert.ok(cards.includes(n.fact));assert.equal(newsTitle(n),n.title);
 assert.deepEqual(newsParagraphs(n),[n.fact]);
 const {newsImageUrl}=await import('../js/news-content.js');const fs=require('node:fs'),path=require('node:path');
 assert.equal(newsImageUrl(n),'./assets/news/semiconductor.png');
 assert.equal(newsImageUrl({...n,id:'another',title:'다른 기사'}),newsImageUrl(n));
 assert.equal(newsImageUrl({image:'https://untrusted/image.png',sector:'새 산업'}),'./assets/news/economy.png');
 for(const sector of ['반도체','자동차','에너지','바이오','디지털','소비재','경제'])assert.ok(fs.existsSync(path.resolve(__dirname,'..',newsImageUrl({sector}))));
 assert.match(cards,/loading="lazy"/);assert.match(cards,/onerror="this.remove\(\)"/);
 const html=newsArticle(s,{...n,fact:'<script>bad()</script>',title:'<img src=x onerror=bad()>'});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;script&gt;/);assert.match(html,/newsBack/);
 assert.ok(!newsArticle({...s,day:5},{...n,beginner:'초보 해설'}).includes('초보 해설'));
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
