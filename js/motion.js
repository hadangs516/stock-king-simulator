import {money} from './format.js';
const frames=new WeakMap();
export function animateMoney(element,from,to,reduced=false){
 if(!element)return;cancelAnimationFrame(frames.get(element));element.dataset.amount=String(to);
 if(reduced||from===to||!Number.isFinite(from)){element.textContent=money(to);return;}
 const start=performance.now();function draw(now){if(!element.isConnected)return;const p=Math.min(1,(now-start)/550);element.textContent=money(from+(to-from)*(1-Math.pow(1-p,3)));if(p<1)frames.set(element,requestAnimationFrame(draw));else {element.textContent=money(to);frames.delete(element);}}frames.set(element,requestAnimationFrame(draw));
}
export function rewardFlight(source,target,amount,reduced=false){
 if(!target||amount<=0)return;const end=target.getBoundingClientRect(),start=source||{left:innerWidth/2,top:innerHeight*.65,width:0,height:0};
 const layer=document.createElement('div');layer.className='reward-layer';layer.setAttribute('popover','manual');document.body.append(layer);if(layer.showPopover)layer.showPopover();setTimeout(()=>layer.remove(),1900);
 const label=document.createElement('span');label.className='reward-gain';label.textContent='+'+money(amount);label.style.left=Math.min(innerWidth-150,Math.max(8,end.left))+'px';label.style.top=(end.bottom+8)+'px';label.setAttribute('role','status');layer.append(label);setTimeout(()=>label.remove(),1800);
 if(reduced)return;
 for(let i=0;i<6;i++){const coin=document.createElement('span');coin.className='reward-coin';coin.textContent='₩';coin.style.left=(start.left+start.width/2)+'px';coin.style.top=(start.top+start.height/2)+'px';layer.append(coin);coin.animate([{transform:'translate(0,0) scale(.7)',opacity:0},{offset:.15,opacity:1},{transform:'translate('+(end.left+end.width/2-start.left-start.width/2)+'px,'+(end.top-start.top-start.height/2)+'px) scale(.4)',opacity:0}],{duration:650,delay:i*65,easing:'ease-in'}).onfinish=()=>coin.remove();}
}
