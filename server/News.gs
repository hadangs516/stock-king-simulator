var King = typeof King === 'undefined' ? {} : King;
King.newsImage=function(sector){return ({반도체:'semiconductor',자동차:'automotive',에너지:'energy',바이오:'biotech',디지털:'digital',소비재:'consumer'})[sector]||'economy';};
King.publicNews=function(n,day){
  var out={id:n.id,symbol:n.symbol||null,sector:n.sector||'경제',category:n.category||'공시',title:n.title,fact:n.fact,at:n.at,time:n.time,image:King.newsImageFor(n),body:Array.isArray(n.body)?n.body:[n.fact]};
  if(day<5&&n.beginner)out.beginner=n.beginner;return out;
};
King.editorialNews=function(s,recipe,x,t,env,seedOnly){
  var economy=s.market.economy,data={name:x?x.name:'시장',rate:economy.rate,beforeRate:economy.rate,activity:economy.activity,beforeActivity:economy.activity,inflation:economy.inflation};
  if(!seedOnly&&recipe.id==='market-rate')economy.rate=Math.max(0,Math.min(12,Math.round((economy.rate+(King.random(s.market.seed+':rate-event:'+t)>.5?.25:-.25))*100)/100));
  if(!seedOnly&&recipe.id==='market-activity')economy.activity=Math.max(85,Math.min(115,economy.activity+(King.random(s.market.seed+':activity-event:'+t)>.5?1:-1)));
  data.rate=economy.rate;data.activity=economy.activity;
  var fill=function(text){return text.replace(/\{(\w+)\}/g,function(_,key){return String(data[key]);});},body=recipe.body.map(fill),id=(seedOnly?'intro-v2-':'event-')+env.hash(t+':'+recipe.id+':'+(x?x.id:'market')).slice(0,24);
  if(s.market.news.some(function(n){return n.id===id;}))return;
  var n={id,symbol:x?x.id:null,sector:x?x.sector:'경제',category:recipe.category,title:fill(recipe.title),fact:body[0],body,beginner:recipe.beginner,image:recipe.image,at:t,time:King.stamp(t),impact:seedOnly?0:recipe.impact};
  n.image=King.newsImageFor(n,recipe.id);s.market.news.push(n);if(!seedOnly&&x)x.trend=Math.max(-12,Math.min(12,(x.trend||0)+recipe.impact));
  if(King.alertNews)King.alertNews(s,n,t);
};
King.seedNews=function(s,t,env){
  var m=s.market;if(m.editorial)return;
  m.news=m.news.filter(function(n){return !n.id.startsWith('intro-')&&!n.title.endsWith(' 사업 환경 변화');});
  var base=m.minute*King.MINUTE;m.editorial={nextAt:base+(30+Math.floor(King.random(m.seed+':first-news')*61))*King.MINUTE,last:{},companies:{}};
  var start=Date.parse(King.date(base)+'T00:00:00+09:00');
  [['memory-validation','005930'],['vehicle-mix','005380'],['platform-billing','035420']].forEach(function(pair,i){var recipe=King.newsLibrary.find(function(n){return n.id===pair[0];}),x=m.stocks[pair[1]];if(x)King.editorialNews(s,recipe,x,start-(5-i)*3600000,env,true);});
};
King.publishScheduled=function(s,t,env){
  var m=s.market,e=m.editorial;if(!e||t<e.nextAt)return;
  var pool=[];King.newsLibrary.forEach(function(recipe){var stocks=recipe.symbols?recipe.symbols.map(function(id){return m.stocks[id];}).filter(function(x){return x&&x.status==='상장';}):[null];stocks.forEach(function(x){var key=recipe.id+':'+(x?x.id:'market');if(t-(e.last[key]||0)>=King.DAY&&(!x||t-(e.companies[x.id]||0)>=2*3600000))pool.push({recipe,x,key});});});
  if(pool.length){var selected=pool[Math.floor(King.random(m.seed+':article:'+t)*pool.length)];King.editorialNews(s,selected.recipe,selected.x,t,env,false);e.last[selected.key]=t;if(selected.x)e.companies[selected.x.id]=t;}
  e.nextAt=t+(30+Math.floor(King.random(m.seed+':news-interval:'+t)*61))*King.MINUTE;m.news=m.news.slice(-500);
};
King.disclosureBody=function(x,title,fact,t){
  var name=x?x.name:'공통 시장',rows=[fact,name+' 관련 공시가 '+King.stamp(t)+'에 등록됐다.'];
  if(x){rows.push('대상 종목은 '+x.market+'의 '+x.name+'('+x.id+')다.');
    rows.push('발표 시점에 기록된 종목 상태는 '+x.status+'이다.');
    if(x.delistAt)rows.push('예고된 상장폐지 시각은 '+King.stamp(x.delistAt)+'이다.');
    if(/폐지/.test(title))rows.push(x.settlement===null||x.settlement===undefined?'현금 회수금은 확정되지 않았으며 비상장 보유 조건을 따른다.':'확정된 주당 회수금은 '+Number(x.settlement).toLocaleString('en-US')+'원이다.');
    if(/실적/.test(title)){var f=x.financials[x.financials.length-1];rows.push('이번 공시에 반영된 매출은 '+f.revenue.toLocaleString('en-US')+'원이다.','영업이익은 '+f.profit.toLocaleString('en-US')+'원으로 기록됐다.','같은 자료의 부채는 '+f.debt.toLocaleString('en-US')+'원이다.');}
    rows.push('발표 시점에 기록된 거래 가격은 '+x.price.toLocaleString('en-US')+'원이다.');
    if(/배당|분배/.test(title))rows.push('지급 금액과 권리 확정 시각은 위 공시의 조건을 따른다.');
  }
  rows.push('이 기사는 위 시점에 확정된 발표 내용을 보존한 기록이다.','발표 후 정정된 내용이 있으면 별도의 공시에서 확인할 수 있다.','개인별 체결·보유·수령 기록은 해당 계정의 원장에 따로 저장된다.','현실 기업의 실제 공시가 아닌 게임 안의 공통 시장 사건이다.');return rows;
};
