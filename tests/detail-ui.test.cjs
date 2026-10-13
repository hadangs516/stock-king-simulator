const test=require('node:test'),assert=require('node:assert/strict');
const {harness,signup}=require('./helpers.cjs');

test('related news appears only at the end of stock detail, outside the price chart',async()=>{
 const {detail}=await import('../js/views.js'),s=signup(harness()).snapshot,x=s.stocks[0];
 s.news=[{id:'news-proof',symbol:x.id,title:'새 기업 소식',body:'확인한 기업 소식입니다.',at:s.serverTime}];
 const html=detail(s,x),chart=html.slice(html.indexOf('class="detail-chart"'),html.indexOf('class="trade-actions"'));
 assert.ok(!chart.includes('chartNews'));assert.ok(!chart.includes('새 기업 소식'));
 assert.ok(html.slice(html.indexOf('detail-related-news')).includes('새 기업 소식'));
 assert.ok(html.indexOf('detail-related-news')>html.indexOf('detail-company'));
});

test('stock detail keeps live price, holdings, trading actions and full company facts after the visual restoration',async()=>{
 const {detail}=await import('../js/views.js'),{money}=await import('../js/format.js');
 const h=harness(),s=signup(h).snapshot,x={...s.stocks.find(v=>v.market!=='ETF'),id:'detail-fixture',name:'<테스트 기업>',sector:'검증 산업',listed:'2020-01-02',description:'원본 설명 '.repeat(45),financials:[{at:s.serverTime,revenue:1230000,profit:456000,debt:789000}]};
 s.day=5;s.holdings[x.id]={quantity:13,available:8};
 const html=detail(s,x);
 assert.ok(html.includes('data-price="detail-fixture" data-amount="'+x.price+'"'));
 for(const action of ['buy','sell','reserve','priceAlert','favorite','market'])assert.ok(html.includes('data-action="'+action+'"'),action);
 for(const period of ['day','month','all'])assert.ok(html.includes('data-period="'+period+'"'),period);
 assert.ok(html.includes('13 / 8주'));assert.ok(html.includes(x.description));
 for(const value of [x.base,x.high,x.low])assert.ok(html.includes(money(value)));
 for(const label of ['매출','영업이익','부채','실제 기업 이름을 사용하지만 가격과 실적, 사건은 가상입니다.'])assert.ok(html.includes(label),label);
 assert.ok(html.includes('&lt;테스트 기업&gt;'));assert.ok(!html.includes('<테스트 기업>'));
});

test('ETF detail retains every fund ledger field and fund positions in its expandable section',async()=>{
 const {detail}=await import('../js/views.js');
 const h=harness(),s=signup(h).snapshot,base=s.stocks.find(v=>v.market!=='ETF');
 const x={...base,market:'ETF',fund:{units:123456,cash:34000,receivable:56000,liability:78000,positions:{[base.id]:17}},iNAV:12000,nav:11000};
 s.day=5;const html=detail(s,x);
 for(const label of ['추정 순자산가치 iNAV','확정 NAV','거래가 괴리율','발행 좌수','펀드 현금','배당 미수금','부채','17주','연 보수 0.2% · 일요일 자정 재조정 · 일요일 21시 분배 수령 가능'])assert.ok(html.includes(label),label);
 assert.ok(html.includes('123,456'));assert.ok(html.includes('ETF 운용 장부'));
});
