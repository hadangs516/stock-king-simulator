var King = typeof King === 'undefined' ? {} : King;
King.corporate = function(s,x,r,t,env) {
  if(r.operation==='listing'){
    var id=King.text(r.listingSymbol||'',6),name=King.text(r.name||'',40),sector=King.text(r.sector||'',20);
    if(!/^\d{6}$/.test(id)||s.market.stocks[id]||!name)King.fail('미등록 6자리 종목코드와 기업명을 확인해 주세요.');
    if(['KOSPI','KOSDAQ'].indexOf(r.market)<0||['반도체','자동차','에너지','바이오','디지털','소비재'].indexOf(sector)<0)King.fail('시장과 산업을 확인해 주세요.');
    if(Object.values(s.market.stocks).filter(function(v){return !v.fund&&v.status!=='비상장';}).length>=40)King.fail('운영 중인 일반 종목은 최대 40개입니다.');
    var price=King.int(r.price,1,1000000000);
    x={id,name,sector,market:r.market,status:'상장',price,base:price,fundamental:price,pressure:0,listed:King.date(t),high:price,low:price,float:30000000,liquidity:200000000,description:sector+' 관련 기업의 가상 투자 종목.',history:[[t,price]],financials:[{at:t,revenue:300000000000,profit:20000000000,debt:100000000000}]};s.market.stocks[id]=x;
    King.news(s,x,name+' 신규 상장','공통 시장에 신규 상장했습니다. 가격과 실적은 가상입니다.',t,0,env);return x;
  }
  if(x.fund)King.fail('일반 기업의 실적·배당 운영 메뉴입니다. ETF는 운용 장부 규칙을 따릅니다.');
  if(r.operation==='financial'){
    var data={at:t,revenue:King.int(r.revenue,0,900000000000000),profit:King.int(r.profit,-900000000000000,900000000000000),debt:King.int(r.debt,0,900000000000000)};
    x.financials.push(data);x.financials=x.financials.slice(-12);King.news(s,x,x.name+' 실적 정정 공시','가상 매출 '+data.revenue+'원, 영업이익 '+data.profit+'원, 부채 '+data.debt+'원으로 정정되었습니다.',t,0,env);
  }else if(r.operation==='dividend'){
    x.dividendOverride=King.int(r.perShare,0,Math.max(0,Math.floor(x.price*.3)));King.news(s,x,x.name+' 배당 정책 변경','다음 일요일 공시부터 주당 '+x.dividendOverride+'원 정책을 적용합니다. 권리 확정 시점의 주가보다 큰 배당은 감액 공시합니다. 권리 18시, 수령 19시.',t,0,env);
  }else King.fail('기업 운영 작업을 확인해 주세요.');
  return x;
};
