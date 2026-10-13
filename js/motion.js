import {money} from './format.js';
const counters=new WeakMap(),donuts=new WeakMap();
export const MONEY_DURATION=1200;
export function animateMoney(element,from,to,reduced=false,options={}){
 if(!element)return;
 to=Math.round(Number(to)||0);let previous=counters.get(element);
 if(options.restart&&previous){cancelAnimationFrame(previous.frame);counters.delete(element);previous=null;}
 if(previous?.to===to&&!reduced)return;
 if(previous)cancelAnimationFrame(previous.frame);
 from=previous?.value??from;from=Math.round(Number(from));element.dataset.amount=String(to);
 const write=value=>{element.textContent=money(value);element.dataset.displayed=String(value);};
 if(reduced||from===to||!Number.isFinite(from)){write(to);counters.delete(element);return;}
 const duration=Math.min(options.duration??MONEY_DURATION,Math.max(400,Math.abs(to-from)*20)),start=performance.now(),state={to,value:from,frame:0};
 write(from);counters.set(element,state);
 function draw(now){
  if(!element.isConnected){counters.delete(element);return;}
  const progress=Math.min(1,Math.max(0,(now-start)/duration)),distance=Math.floor(Math.abs(to-from)*progress);state.value=progress===1?to:from+Math.sign(to-from)*distance;write(state.value);
  if(progress<1)state.frame=requestAnimationFrame(draw);else counters.delete(element);
 }
 state.frame=requestAnimationFrame(draw);
}
export function animateDonut(element,reduced=false){
 const fill=element?.querySelector('.donut-sweep');if(!fill)return;
 cancelAnimationFrame(donuts.get(element));
 const paint=progress=>{fill.style.maskImage=`conic-gradient(#000 ${progress*360}deg, transparent 0deg)`;element.dataset.progress=String(progress);};
 if(reduced){paint(1);return;}
 const start=performance.now();paint(0);
 function draw(now){if(!element.isConnected)return;const progress=Math.min(1,(now-start)/MONEY_DURATION);paint(progress);if(progress<1)donuts.set(element,requestAnimationFrame(draw));else donuts.delete(element);}
 donuts.set(element,requestAnimationFrame(draw));
}
export function animateAssetAmounts(root,enter,reduced=false,previous=new Map(),deadline=Infinity){
 const duration=Math.min(MONEY_DURATION,Math.max(0,deadline-performance.now()));
 root.querySelectorAll('[data-money]').forEach(element=>{const value=Number(element.dataset.money),old=previous.get(element.dataset.moneyKey);animateMoney(element,enter?0:old??value,value,reduced||duration===0,{restart:enter,duration});});
 if(enter)root.querySelectorAll('.total-donut').forEach(element=>animateDonut(element,reduced));
}
export function rewardFlight(source,target,amount,reduced=false){
 if(!target||amount<=0)return;
 const end=target.getBoundingClientRect(),label=document.createElement('span');label.className='reward-gain';label.textContent='+'+money(amount);label.setAttribute('role','status');
 label.style.left=Math.min(innerWidth-150,Math.max(8,end.left))+'px';label.style.top=(end.bottom+8)+'px';
 const layer=document.createElement('div');layer.className='reward-layer';layer.setAttribute('popover','manual');document.body.append(layer);layer.append(label);layer.showPopover?.();
 if(!reduced)target.animate?.([{color:'#b56a00'},{color:'inherit'}],{duration:1200,easing:'ease-out'});
 setTimeout(()=>layer.remove(),1400);
}
