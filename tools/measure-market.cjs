// Offline, deterministic comparison. Never loads player data or deployment secrets.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const files=fs.readdirSync('server').filter(f=>f.endsWith('.gs')&&!['Code.gs','Storage.gs'].includes(f));
for(const mode of ['previous','unmixed','current'])for(let seed=0;seed<3;seed++){
 const context=vm.createContext({console});
 for(const file of files){let code=fs.readFileSync('server/'+file,'utf8');
  if(file==='Engine.gs'&&mode!=='current'){
   code=code.replaceAll('King.priceNoise(m.seed','King.random(m.seed').replace("-.5)*.004","-.5)*.001");
   if(mode==='previous')code=code.replace("-.5)*.0015","-.5)*.0005").replace("-.5)*.008","-.5)*.002");
  }
  vm.runInContext(code,context,{filename:file});
 }
 const K=context.King,start=Date.parse('2026-10-05T00:00:00+09:00'),state=K.initial(start);let counter=0;
 const env={id:()=>`audit-${counter++}`,hash:s=>crypto.createHash('sha256').update(s).digest('hex'),sign:s=>crypto.createHash('sha256').update(s).digest('hex')};
 state.market.seed='news-audit-'+seed;K.initFunds(state);
 const initial=Object.fromEntries(Object.values(state.market.stocks).filter(x=>!x.fund).map(x=>[x.id,x.price]));
 const end=start+1439*60000;while(!K.advance(state,end,env)){}
 const articles=state.market.news.filter(n=>n.id.startsWith('event-')),intervals=articles.slice(1).map((n,i)=>(n.at-articles[i].at)/60000);
 const stocks=Object.values(state.market.stocks).filter(x=>initial[x.id]&&x.status==='상장');
 const returns=stocks.map(x=>(x.price/initial[x.id]-1)*100).sort((a,b)=>a-b);
 const minutes=stocks.flatMap(x=>x.history.slice(1).map((p,i)=>Math.abs(p[1]/x.history[i][1]-1)*100));
 const round=x=>Math.round(x*1000)/1000;
 console.log(JSON.stringify({mode,seed,articles:articles.length,intervalMinutes:[Math.min(...intervals),Math.max(...intervals)],stocks:stocks.length,dailyReturn:[round(returns[0]),round(returns[Math.floor(returns.length/2)]),round(returns.at(-1))],meanAbsoluteMinute:round(minutes.reduce((a,b)=>a+b,0)/minutes.length),atDailyLimit:returns.filter(x=>Math.abs(x)>=29.99).length}));
}
