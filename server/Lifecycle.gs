var King = typeof King === 'undefined' ? {} : King;
King.lifecycle = function(s,t,env) {
  var local=new Date(t+32400000),m=s.market,live=Object.values(m.stocks).filter(function(x){return !x.fund&&x.status!=='비상장';});
  // A halt never consumes the promised 72 hours of trading opportunity.
  live.forEach(function(x){if(x.delistAt&&x.status==='거래정지')x.delistAt+=60000;});
  if(local.getUTCMinutes()!==0)return;
  var hours=local.getUTCHours();
  if(local.getUTCDay()===1&&hours===19&&live.length<34){
    var pool=[['005490','POSCO홀딩스','에너지','KOSPI',350000],['012330','현대모비스','자동차','KOSPI',250000],['259960','크래프톤','디지털','KOSPI',250000],['004170','신세계','소비재','KOSPI',180000],['009150','삼성전기','반도체','KOSPI',150000],['128940','한미약품','바이오','KOSPI',280000],['039030','이오테크닉스','반도체','KOSDAQ',170000],['095340','ISC','반도체','KOSDAQ',65000],['041510','에스엠','디지털','KOSDAQ',80000],['041190','우리기술투자','디지털','KOSDAQ',7000],['214450','파마리서치','바이오','KOSDAQ',150000],['027360','아주IB투자','디지털','KOSDAQ',2500],['078340','컴투스','디지털','KOSDAQ',45000],['035900','JYP Ent.','디지털','KOSDAQ',60000],['035760','CJ ENM','소비재','KOSDAQ',70000],['000100','유한양행','바이오','KOSPI',90000]];
    var next=pool.find(function(r){return !m.stocks[r[0]];});if(next){var x={id:next[0],name:next[1],sector:next[2],market:next[3],price:next[4],base:next[4],fundamental:next[4],pressure:0,status:'상장',listed:King.date(t),high:next[4],low:next[4],float:30000000,liquidity:200000000,description:next[2]+' 관련 기업. 수요·비용·경쟁에 따라 가상 실적과 주가가 변합니다.',history:[[t,next[4]]],financials:[{at:t,revenue:300000000000,profit:20000000000,debt:100000000000}]};m.stocks[x.id]=x;King.news(s,x,x.name+' 신규 상장','공통 시장에 신규 상장했습니다. 모든 플레이어가 같은 종목과 가격을 이용합니다.',t,0,env);}
  }
  if(hours===20&&live.length>30){
    var pick=live[Math.floor(King.random(m.seed+':risk:'+King.date(t))*live.length)];
    if(pick&&!pick.delistAt&&King.random(m.seed+':risk-roll:'+King.date(t))<.02){pick.riskStage=(pick.riskStage||0)+1;King.news(s,pick,pick.name+' 경영 위험 공시','가상 사업의 위험 단계가 '+pick.riskStage+'단계로 올라갔습니다. 중요한 위험은 해금 여부와 무관하게 공개됩니다.',t,-8,env);if(pick.riskStage>=3){pick.delistAt=t+72*3600000;pick.settlement=King.random(m.seed+':recovery:'+t)>.5?0:null;King.news(s,pick,pick.name+' 상장폐지 확정',King.stamp(pick.delistAt)+' 이후 상장폐지 예정. '+(pick.settlement===0?'회수금은 0원입니다.':'비상장 보유로 전환됩니다.'),t,0,env);}}
  }
};
