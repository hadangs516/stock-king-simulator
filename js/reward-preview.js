const owner=s=>s?.account.id+'|'+s?.account.runId;
export class RewardPreview {
 constructor(){this.operation=null;}
 begin(snapshot,request){
  if(!request.preview){request.preview=request.restored?{claimIds:[],date:''}:{claimIds:snapshot.claims.filter(c=>{
   if(request.data.claimId!=='all'&&request.data.claimId!==c.id||c.payAt>snapshot.serverTime||!c.reward&&c.runId!==snapshot.account.runId)return false;
   if(c.reward?.kind==='security'){const x=snapshot.stocks.find(x=>x.id===c.reward.symbol);return x?.status==='상장'&&(x.market!=='ETF'||snapshot.day>=4);}
   return true;
  }).map(c=>c.id),date:new Date(snapshot.serverTime+32400000).toISOString().slice(0,10)};}
  this.operation={owner:owner(snapshot),request};
 }
 clear(requestId){if(!requestId||this.operation?.request.data.requestId===requestId)this.operation=null;}
 project(snapshot){
  const op=this.operation;if(!op||op.owner!==owner(snapshot)||snapshot.proxy)return snapshot;
  const {action,data}=op.request;if(data.runId!==snapshot.account.runId)return snapshot;
  const s=structuredClone(snapshot),a=s.account;let count=0;
  const addCash=(value,newCapital)=>{a.cash+=value;s.availableCash+=value;if(newCapital){a.contributedCash+=value;s.total+=value;}};
  const date=new Date(s.serverTime+32400000).toISOString().slice(0,10);
  if(action==='attendance'&&!s.attendance.claimed&&date===op.request.preview.date){
   const value=s.attendance.amount;if(!Number.isSafeInteger(value)||value<0||a.cash+value>900000000000000)return snapshot;
   addCash(value,true);s.attendance.firstGranted=true;s.attendance.claimed=true;s.attendance.streak=s.attendance.nextDay;
   s.attendance.history.push({date,day:s.attendance.nextDay,amount:value});count=1;
  }else if(action==='claim'){
   const received=new Set();
   for(const c of s.claims){
    if(!op.request.preview.claimIds?.includes(c.id)||data.claimId!=='all'&&data.claimId!==c.id||c.payAt>s.serverTime||!c.reward&&c.runId!==a.runId)continue;
    if(c.reward?.kind==='security'){
     const x=s.stocks.find(x=>x.id===c.reward.symbol),q=c.reward.quantity;
     if(!x||x.status!=='상장'||x.market==='ETF'&&s.day<4||!Number.isSafeInteger(q)||q<1||!Number.isSafeInteger(q*x.price))continue;
     const h=s.holdings[x.id]||{quantity:0,cost:0,since:s.serverTime,price:x.price,value:0,available:0,profit:0,average:0};
     h.quantity+=q;h.available+=q;h.price=x.price;h.value=h.quantity*x.price;h.profit=h.value-h.cost;h.average=h.cost/h.quantity;s.holdings[x.id]=h;
     const value=q*x.price;s[x.market==='ETF'?'etfValue':'stockValue']+=value;s.total+=value;a.contributedCash+=value;
    }else if(c.reward?.kind==='badge')a.achievements['reward-'+c.id]={kind:'reward',title:c.reward.badge,at:s.serverTime};
    else{if(!Number.isSafeInteger(c.net)||c.net<0||a.cash+c.net>900000000000000)continue;addCash(c.net,!!c.reward);if(!c.reward)s.dividends-=c.net;}
    received.add(c.id);count++;
   }
   s.claims=s.claims.filter(c=>!received.has(c.id));
  }
  if(count)s.rewardPending={action,count,requestId:data.requestId};return s;
 }
}
