import {api} from './api.js';
import {VERSION} from './config.js';
import {escape as e,money,compact,stamp,percent,icon} from './format.js';
import * as view from './views.js';
import {AdminUI} from './admin-ui.js';
import {sound,installApp,prepareInstall} from './platform.js';
const $=selector=>document.querySelector(selector), main=$('#main'), modal=$('#modal');
let snapshot=null,page='home',symbol=null,period='all',authMode='login',busy=false,syncing=null,pending=null,recordOffset=0,records=[];
let lastInput=Date.now(),receivedAt=0,toastAt=0,toastTimer,serverStatus='',lastCash=null,animationFrame;
const pendingKey='king-pending-operation';
function rememberPending(req){try{if(req&&['trade','order','cancel','claim'].includes(req.action))sessionStorage.setItem(pendingKey,JSON.stringify({accountId:snapshot?.account.id,...req}));else if(!req)sessionStorage.removeItem(pendingKey);}catch{}}
const filter={market:'KOSPI',search:'',sort:'name',favorites:false};
const admin=new AdminUI({call:mutate,read:request,modal:showModal,close:()=>modal.close(),toast,navigate,apply,getSnapshot:()=>snapshot,api});
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastAt=Date.now();toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
$('#toast').onclick=()=>{if(Date.now()-toastAt>=1000)$('#toast').hidden=true;};
function showModal(title,content){$('#modal-title').textContent=title;$('#modal-content').innerHTML=content;if(!modal.open)modal.showModal();}
$('#modal-close').onclick=()=>modal.close();modal.addEventListener('click',event=>{if(event.target===modal){const box=modal.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)modal.close();}});
function failure(error){showModal('확인이 필요해요',`<p class="error">${e(error.message)}</p>${pending?view.button('같은 요청으로 재시도','retry','','wide primary'):view.button('최신 상태 확인','sync','','wide')}`);}
function connection(message){$('#connection').hidden=!message;$('#connection').innerHTML=message?`${e(message)}${view.button('재시도','retrySync')}`:'';}
async function request(action,data={}){return api.send(action,data);}
function reduced(){return !snapshot?.account.settings.animation||matchMedia('(prefers-reduced-motion: reduce)').matches;}
function apply(s){
 if(!s)return;if(snapshot&&s.revision<snapshot.revision)return;
 const previous=snapshot;snapshot=s;receivedAt=Date.now();document.body.classList.toggle('no-motion',!s.account.settings.animation);sound.settings(s.account.settings);
 if(!previous){try{const saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(saved&&saved.accountId===s.account.id)pending={action:saved.action,data:saved.data};}catch{}}
 $('#ticker').hidden=false;$('#nav').hidden=false;$('#proxy-banner').hidden=!s.proxy;$('#proxy-banner').textContent=s.proxy?'플레이어 시점: '+s.proxy.name:'';
 $('#ticker').innerHTML=`<button data-action="amount" data-value="${s.account.cash}"><small>현금 잔액</small><strong id="cash">${compact(s.account.cash)}</strong></button><div class="day"><small>나의 회차</small><strong>DAY ${s.day}</strong></div><div class="time"><small>다음 시세 확인</small><strong id="countdown">60초</strong></div>`;
 if(previous&&previous.account.id!==s.account.id)lastCash=null;
 if(lastCash!==null&&lastCash!==s.account.cash&&!document.hidden&&!reduced()){$('#cash').classList.add('changed');toast((s.account.cash-lastCash>0?'+':'')+money(s.account.cash-lastCash)+' · 현금 변동');}lastCash=s.account.cash;
 if(previous&&previous.account.runId===s.account.runId){const old=Object.keys(previous.account.achievements),fresh=Object.keys(s.account.achievements).filter(id=>!old.includes(id));if(fresh.length)toast('새 업적 달성 · '+view.achievementName(s.account.achievements[fresh[0]]));if(s.day>previous.day&&s.day<=4)toast('DAY '+s.day+' · 새로운 기능이 열렸습니다.');}
 connection(s.catchingUp?'밀린 시장을 처리하고 있습니다. 거래는 동기화 후 가능합니다.':'');
 if(pending){$('#connection').hidden=false;$('#connection').innerHTML='이전 요청 결과를 확인해 주세요.'+view.button('같은 요청 재시도','retry');}
}
async function mutate(action,data={}){
 if(busy)throw new Error('이전 요청 처리 중입니다. 잠시 기다려 주세요.');
 if(pending&&action!=='__retry')throw new Error('이전 요청의 결과를 먼저 확인해 주세요. 같은 요청으로 재시도할 수 있습니다.');
 const req=action==='__retry'?pending:{action,data:{runId:snapshot?.account.runId,requestId:crypto.randomUUID(),...data}};
 if(!req)throw new Error('재시도할 요청이 없습니다.');busy=true;rememberPending(req);
 try{const result=await request(req.action,req.data);pending=null;rememberPending(null);apply(result.snapshot);if(snapshot&&page!=='admin')render();return result;}
 catch(error){if(!error.definitive)pending=req;else {pending=null;rememberPending(null);}throw error;}
 finally{busy=false;}
}
async function sync(renderAfter=true){
 if(!api.token||document.hidden)return;if(syncing)return syncing;if(busy)return;
 syncing=(async()=>{try{const result=await request('sync',{active:document.hasFocus()&&Date.now()-lastInput<300000});apply(result.snapshot);if(renderAfter&&!modal.open&&document.activeElement?.tagName!=='INPUT'&&document.activeElement?.tagName!=='TEXTAREA'&&!['admin','market'].includes(page))render();if(page==='market')refreshMarketPrices();if(snapshot?.catchingUp)setTimeout(()=>sync(),1500);}
 catch(error){connection(error.message);if(/인증.*만료|로그인 인증/.test(error.message)){api.clear();snapshot=null;renderLogin(error.message);}}finally{syncing=null;}})();return syncing;
}
function nav(){const tabs=[['home','홈'],['news','뉴스'],['market','거래소'],['assets','내 자산'],['settings','설정']];$('#nav').innerHTML=tabs.map(([id,name])=>`<button type="button" data-page="${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${icon(id)}${name}</button>`).join('');}
function render(){
 if(!snapshot)return renderLogin(serverStatus);nav();const s=snapshot;
 const content={home:()=>view.home(s,period),market:()=>view.market(s,filter),news:()=>view.news(s),assets:()=>view.assets(s),settings:()=>view.settings(s),total:()=>view.total(s),orders:()=>view.orders(s),inbox:()=>view.inbox(s),achievements:()=>view.achievements(s),detail:()=>view.detail(s,s.stocks.find(x=>x.id===symbol)),economy:()=>economy(),records:()=>recordsView()};
 if(page==='admin'){admin.render();return;}main.innerHTML=(content[page]||content.home)();
}
function renderLogin(message=''){cancelAnimationFrame(animationFrame);$('#ticker').hidden=true;$('#nav').hidden=true;$('#proxy-banner').hidden=true;main.innerHTML=view.loginView(authMode,message);}
function refreshMarketPrices(){document.querySelectorAll('.stock[data-symbol]').forEach(el=>{const x=snapshot.stocks.find(v=>v.id===el.dataset.symbol);if(!x)return;const price=el.querySelector('.stock-price strong'),delta=el.querySelector('.stock-price p'),value=(x.price/x.base-1)*100;price.textContent=money(x.price);delta.textContent=percent(value);delta.className=value>=0?'up':'down';});}
async function navigate(next,id){
 if(!snapshot)return;page=next;if(id)symbol=id;location.hash=next+(next==='detail'?'/'+symbol:'');modal.close();render();window.scrollTo({top:0,behavior:'instant'});
 if(next==='total'){await sync(false);render();animateTotal();}
 if(next==='records'){records=[];recordOffset=0;await loadRecords();}
 if(next==='detail'){const result=await mutate('explore',{symbol});apply(result.snapshot);}
 if(next==='admin')await admin.load();
}
function animateTotal(){if(reduced())return;cancelAnimationFrame(animationFrame);const el=$('#total-number'),status=$('#sum-status'),items=[...document.querySelectorAll('.sum-item')];if(!el)return;const target=snapshot.total,start=performance.now();function frame(now){if(page!=='total')return;const p=Math.min(1,(now-start)/550),count=Math.ceil(items.length*p);el.textContent=compact(items.slice(0,count).reduce((sum,item)=>sum+Number(item.dataset.amount),0));status.textContent=p<1?`자산 합산 중 · ${count}/${items.length}`:`자산 합산 완료 · ${items.length}/${items.length}`;if(p<1)animationFrame=requestAnimationFrame(frame);else el.textContent=compact(target);}animationFrame=requestAnimationFrame(frame);}
function economy(){return `${view.button('← 홈으로','home','','back')}<div class="page-head"><h2>경제 지표</h2><span class="tag">가상 경제</span></div>${snapshot.day<3?view.lockedView(snapshot,3,'경제 지표','금리·경기·물가를 함께 살펴봅니다.'):`<div class="metric-grid">${Object.entries({금리:snapshot.economy.rate+'%',물가:snapshot.economy.inflation+'%',경기:snapshot.economy.activity+'pt'}).map(([name,value])=>`<div class="metric"><span class="muted">${name}</span><strong>${value}</strong></div>`).join('')}</div><p class="footnote">공통 경제 상태입니다. 현실 경제 수치와 무관하며, 기업별 비용·수요·경쟁에 따라 영향이 다릅니다.</p>`}`;}
async function loadRecords(){const result=await request('records',{offset:recordOffset});records.push(...result.records);recordOffset=result.next;render();}
function recordsView(){return `${view.button('← 홈으로','home','','back')}<div class="page-head"><h2>내 기록</h2><span class="tag">최신순</span></div>${records.map(r=>`<div class="news-card"><span class="eyebrow">DAY ${r.day} · ${stamp(r.at)}</span><h3>${e(r.type)}</h3>${r.data.name?`<p>${e(r.data.name)} · ${r.data.quantity||0}주</p>`:''}${r.data.price?`<p class="muted">체결가 ${money(r.data.price)}</p>`:''}${r.data.memo?`<p>투자 메모: ${e(r.data.memo)}</p>`:''}${r.data.total?`<p>${money(r.data.total)}</p>`:''}${r.data.net?`<p>${money(r.data.net)}</p>`:''}${r.data.side?view.button('영수증 보기','receipt',`data-id="${e(r.data.id)}"`,'link-button'):''}<p class="footnote">회차 ${e(r.runId.slice(0,8))}</p></div>`).join('')||'<p class="empty">아직 기록이 없습니다.</p>'}${recordOffset!==null?view.button('이전 기록 더 보기','moreRecords','','wide'):''}`;}
function tradingForm(id,side,reserve=false){
 const x=snapshot.stocks.find(v=>v.id===id);if(x.market==='ETF'&&snapshot.day<4)return showModal('ETF는 DAY 4에 열려요',view.lockedView(snapshot,4,'ETF','전체시장·반도체·소비재 ETF를 만나보세요.'));
 if(snapshot.catchingUp)throw new Error('시장 동기화 후 거래할 수 있습니다.');
 showModal(`${x.name} · ${reserve?'예약':side==='buy'?'매수':'매도'}`,`<p class="muted">현재가 ${money(x.price)} · 사용 가능 현금 ${money(snapshot.availableCash)}</p><p class="muted">매도 가능 ${snapshot.holdings[id]?.available||0}주</p><form id="trade-form" data-symbol="${id}" data-side="${side}" data-reserve="${reserve}">${reserve?'<label>예약 종류<select name="kind"><option value="limitBuy">지정가 매수</option><option value="limitSell">지정가 매도</option><option value="stop">손절 조건부 매도</option><option value="oco">익절·손절 묶음 매도</option></select></label>':''}<label>수량 (1주 단위)<input name="quantity" type="number" min="1" max="100000000" step="1" value="1" required></label>${reserve?`<label>지정가 / 조건가 (원)<input name="price" type="number" min="1" max="1000000000" step="1" value="${x.price}" required></label><label>묶음 주문의 손절가 (원)<input name="stop" type="number" min="1" max="1000000000" step="1" value="${Math.max(1,Math.floor(x.price*.9))}"></label><label>만료<select name="expiryDays"><option value="1">1일 후</option><option value="7" selected>7일 후</option><option value="0">직접 취소 전까지</option></select></label><p class="footnote">매수 현금·매도 수량을 확보합니다. 묶음 주문은 수량을 한 번 확보하며 한쪽 체결 시 반대쪽 취소. 정지 중 대기, 폐지·분할 시 취소됩니다.</p>`:'<label>투자 이유 (선택)<textarea name="memo" maxlength="200" placeholder="이 기업을 선택한 이유를 남겨 보세요."></textarea></label>'}<div id="trade-estimate" class="card"></div><p class="footnote">매수·매도 수수료 0.05%, 주식 매도 게임 거래세 0.15%, ETF 거래세 0%. 현실 세법을 재현하지 않는 게임 규칙입니다.</p><button type="submit" class="primary wide">${reserve?'예약 내용 확인':'최신 시세로 거래 확인'}</button></form>`);
 if(reserve&&side==='sell')$('#trade-form [name=kind]').value='limitSell';estimate();
}
function estimate(){const f=$('#trade-form');if(!f)return;const fd=new FormData(f),x=snapshot.stocks.find(x=>x.id===f.dataset.symbol),reserve=f.dataset.reserve==='true',side=reserve?fd.get('kind')==='limitBuy'?'buy':'sell':f.dataset.side;const gross=Number(fd.get('quantity'))*(reserve?Number(fd.get('price')):x.price),fee=Math.ceil(gross/2000),tax=side==='sell'&&x.market!=='ETF'?Math.ceil(gross*.0015):0;$('#trade-estimate').innerHTML=`<p class="muted">예상 거래대금 ${money(gross)}<br>수수료 ${money(fee)} · 세금 ${money(tax)}</p><strong>예상 ${side==='buy'?'출금':'입금'} ${money(side==='buy'?gross+fee+tax:gross-fee-tax)}</strong>`;}
function tutorial(){showModal('주식왕의 첫걸음',`<div class="card"><span class="eyebrow">01 / 함께 흐르는 시장</span><h3>내가 쉬어도 시장은 움직여요.</h3><p class="muted">모든 플레이어에게 같은 가격과 사건이 적용됩니다. DAY는 한국 시간 자정에 바뀝니다.</p></div><div class="card"><span class="eyebrow">02 / 뉴스에서 기업으로</span><h3>뉴스를 읽고, 기업을 살펴보세요.</h3><p class="muted">매수·매도에는 수수료와 세금이 있습니다. 예약으로 가격 조건을 정할 수 있지만 손절 가격은 보장되지 않습니다.</p></div><div class="card"><span class="eyebrow">03 / 조금씩 넓어지는 투자</span><p class="muted">DAY 2 실적표 → DAY 3 경제 지표 → DAY 4 ETF. 배당은 알림함에서 직접 수령하세요.</p></div>${view.button('시작하기','finishTutorial','','wide primary')}${view.button('건너뛰기','finishTutorial','','wide')}`);}
const terms={'평균 매수가':'매수에 쓴 총금액을 보유 수량으로 나눈 값입니다. 이 게임은 매수 수수료를 포함합니다. 예: 10,005원에 1주를 사면 평균 매수가는 10,005원입니다.','평가손익':'아직 팔지 않은 주식의 현재 평가금액과 매입금액 차이입니다. 지금 매도할 때의 비용은 별도입니다.','실현손익':'주식을 팔아 확정된 손익입니다. 매수 원가와 매도 비용·세금을 함께 반영합니다.','상한가·하한가':'전일 기준가 대비 하루 상승·하락 범위입니다. 일반 주식은 ±30%이며 여러 날의 누적 손실은 제한하지 않습니다.','NAV':'ETF가 보유한 증권·현금·미수금에서 부채를 뺀 뒤 발행 좌수로 나눈 가치입니다. 거래 가격과 다를 수 있습니다.','배당':'권리 기준시점에 보유한 수량에 따라 확정되는 분배액입니다. 배당락과 세금을 반영하며 항상 지급되지는 않습니다.'};
function help(name){showModal(name,`<p>${e(terms[name])}</p>`);}
function settingsForm(name){
 if(name==='pin')return showModal('PIN 변경','<form id="pin-form"><label>현재 PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label><label>새 PIN<input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label><p class="footnote">변경 후 모든 기기에서 다시 로그인해야 합니다.</p><button class="primary wide">PIN 변경</button></form>');
 if(name==='reset')return showModal('처음부터 다시 시작',`<p class="error">현금·보유주식·회차 업적을 초기화하고 예약을 취소합니다. 받을 배당·분배금 ${money(snapshot.dividends)}도 포기합니다. DAY와 해금, 뉴스 단계는 처음으로 돌아갑니다.</p><p class="footnote">가입일·평생 통계·설정은 보존합니다. 먼저 백업 파일을 내보낼 수 있습니다. 오래된 백업으로 진행을 되돌릴 수는 없습니다.</p>${view.button('백업 내보내기','backup','','wide')}<form id="reset-form"><label>본인 PIN<input name="pin" type="password" pattern="[0-9]{4}" inputmode="numeric" maxlength="4" required></label><label class="check"><input name="confirm" type="checkbox" required>위 초기화 내용을 확인했습니다.</label><button class="danger wide">진행 초기화</button></form>`);
 if(name==='report')return showModal('오류 신고·기능 제안','<form id="report-form"><p>제안이 채택되면 보상이 지급됩니다.</p><p class="footnote">보상 종류와 수량은 운영자가 결정하며 모든 제출에 자동 지급하지 않습니다.</p><label>종류<select name="kind"><option value="error">오류 신고</option><option value="suggestion">기능 제안</option></select></label><label>내용<textarea name="body" maxlength="4000" required></textarea></label><label>답변 이메일 (선택)<input name="email" type="email" maxlength="200"></label><p class="footnote">계정, 접수 시각, 앱 버전과 브라우저 환경을 함께 전달합니다. 이메일은 답변 연락용이며 관리자만 조회합니다.</p><button class="primary wide">제출</button></form>');
 if(name==='notifications'){const n=snapshot.account.settings.notifications;return showModal('알림 수신 설정',`<form id="notifications-form">${[['risk','거래정지·상장폐지'],['orders','예약 체결'],['targets','목표가 도달']].map(([id,label])=>`<label class="check"><input name="${id}" type="checkbox" ${n[id]?'checked':''}>${label}</label>`).join('')}<label>수신 시작 (한국 시간)<input name="start" type="number" min="0" max="23" value="${n.start}" required></label><label>수신 종료 (한국 시간)<input name="end" type="number" min="1" max="24" value="${n.end}" required></label><label>하루 상한 (0 = 제한 없음)<input name="limit" type="number" min="0" max="100" value="${n.limit}" required></label><p class="footnote">외부 푸시 발송은 미연결입니다. 설정을 보관하며 현재 소식은 앱 내 알림함에서 확인합니다.</p><button class="primary wide">설정 저장</button></form>`);}
}
document.addEventListener('click',async event=>{
 lastInput=Date.now();sound.activate();const target=event.target.closest('button,[data-action]');if(!target)return;
 try{
  if(target.dataset.page)return await navigate(target.dataset.page);const action=target.dataset.action;if(!action)return;
  if(action.startsWith('admin'))return await admin.action(action,target);
  if(action==='loginTab'){authMode=target.dataset.mode;return renderLogin(serverStatus);}
  if(['home','news','market','assets','settings','total','orders','inbox','achievements','economy','records'].includes(action))return await navigate(action);
  if(action==='detail')return await navigate('detail',target.dataset.symbol);
  if(action==='period'){period=target.dataset.period;return render();}
  if(action==='marketTab'){filter.market=target.dataset.market;return render();}
  if(action==='favorite'){const favorites=[...snapshot.account.settings.favorites],i=favorites.indexOf(target.dataset.symbol);if(i>=0)favorites.splice(i,1);else favorites.push(target.dataset.symbol);await mutate('settings',{settings:{favorites}});return;}
  if(['buy','sell','reserve'].includes(action))return tradingForm(target.dataset.symbol,action==='sell'||page==='assets'?'sell':'buy',action==='reserve');
  if(action==='amount')return showModal('정확한 금액',`<p class="balance">${money(Number(target.dataset.value))}</p>`);
  if(action==='cancel'){showModal('예약을 취소할까요?',`<p>대기 주문을 취소하고 잠긴 현금 또는 수량을 해제합니다.</p>${view.button('취소 확정','confirmCancel',`data-id="${target.dataset.id}"`,'wide primary')}`);return;}
  if(action==='confirmCancel'){await mutate('cancel',{orderId:target.dataset.id});modal.close();return toast('예약 주문을 취소했습니다.');}
  if(action==='readNews'){await mutate('readNews',{id:target.dataset.id});return;}
  if(action==='claim'){const r=await mutate('claim',{claimId:target.dataset.id});if(r.claimed.length){sound.effect();if(!reduced()){const coin=document.createElement('span');coin.className='coins';coin.textContent='● · ●';document.body.append(coin);setTimeout(()=>coin.remove(),700);}toast(r.claimed.length+'건을 수령했습니다.');}else toast('지급 시각·해금·종목 상태를 확인해 주세요.');return;}
  if(action==='receipt'){const r=await request('receipt',{id:target.dataset.id});return showModal('거래 영수증',view.receipt(r.receipt));}
  if(action==='moreRecords')return await loadRecords();
  if(action==='sync'||action==='retrySync'){modal.close();if(!api.token){await boot();return;}return await sync();}
  if(action==='retry'){const r=await mutate('__retry');modal.close();if(r.receipt)showModal('거래 영수증',view.receipt(r.receipt));else toast('이전 요청 결과를 확인했습니다.');return;}
  if(action==='save'){await mutate('save');return toast('서버에 저장되었습니다.');}
  if(action==='logout'){await request('logout');api.clear();snapshot=null;pending=null;lastCash=null;modal.close();return renderLogin();}
  if(action==='tutorial')return tutorial();if(action==='finishTutorial'){await mutate('tutorial');modal.close();return;}
  if(['pin','reset','report','notifications'].includes(action))return settingsForm(action);
  if(action==='terms'){showModal('주식 용어',Object.keys(terms).map(name=>view.button(e(name),'term',`data-name="${e(name)}"`,'wide')).join(''));return;}
  if(action==='term')return help(target.dataset.name);
  if(action==='install')return installApp(showModal);
  if(action==='backup'){const r=await request('backup'),url=URL.createObjectURL(new Blob([JSON.stringify(r.backup,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='주식왕_백업_'+stamp(snapshot.serverTime).slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return toast('PIN과 인증값을 제외한 백업을 내보냈습니다.');}
  if(action==='restore'){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>50000)throw new Error('백업 파일이 너무 큽니다.');await mutate('restore',{backup:JSON.parse(await file.text())});toast('서버 최신 기록과 백업을 검증했습니다.');}catch(error){failure(error);}};input.click();return;}
 }catch(error){failure(error);}
});
document.addEventListener('input',event=>{lastInput=Date.now();if(event.target.closest('#trade-form'))estimate();if(event.target.id==='search'){filter.search=event.target.value;const pos=event.target.selectionStart;render();$('#search').focus();try{$('#search').setSelectionRange(pos,pos);}catch{}}});
document.addEventListener('change',event=>{if(event.target.id==='sort'){filter.sort=event.target.value;render();}if(event.target.id==='favorites'){filter.favorites=event.target.checked;render();}});
document.addEventListener('submit',async event=>{
 event.preventDefault();const form=event.target,fd=new FormData(form),data=Object.fromEntries(fd);const submit=form.querySelector('button[type=submit],button:not([type])');if(submit)submit.disabled=true;
 try{
  if(form.id.startsWith('admin-'))return await admin.submit(form,fd);
  if(form.id==='auth-form'){
    if(!/^[가-힣]{2,12}$/.test(data.name.normalize('NFC')))throw new Error('아이디는 완성형 한글 2~12자로 입력해 주세요.');
    const begin=performance.now();main.innerHTML=`<section class="boot"><span class="eyebrow">STOCK KING</span><h2 style="margin-top:20px">내 투자를 불러옵니다.</h2><div class="progress"><span style="width:15%"></span></div><p>계정 확인 · 서버 응답 대기</p><p id="elapsed" class="muted">0초 경과</p><p class="loading-tip">공통 시장은 내가 접속하지 않아도 계속 움직입니다.</p><small>v${VERSION}</small></section>`;
    const interval=setInterval(()=>{if($('#elapsed'))$('#elapsed').textContent=Math.floor((performance.now()-begin)/1000)+'초 경과';},1000);
    try{const r=await request(form.dataset.mode,{name:data.name.normalize('NFC'),pin:data.pin,remember:fd.has('remember'),consent:fd.has('consent'),adminSecret:data.adminSecret||'',requestId:crypto.randomUUID()});api.save(r.token,fd.has('remember'));apply(r.snapshot);page='home';render();if(!snapshot.account.tutorial)tutorial();else welcomeSummary();}
    catch(error){renderLogin(error.message);}finally{clearInterval(interval);}return;
  }
  if(form.id==='trade-form'){
    const id=form.dataset.symbol,quantity=Number(data.quantity);if(!Number.isSafeInteger(quantity)||quantity<1)throw new Error('수량은 1주 단위로 입력해 주세요.');
    if(form.dataset.reserve==='true'){const req={symbol:id,quantity,kind:data.kind,price:Number(data.price),stop:Number(data.stop),expiryDays:Number(data.expiryDays)};showModal('예약 내용 확인',`<p>${e(snapshot.stocks.find(x=>x.id===id).name)} · ${quantity}주</p><p>조건가 ${money(req.price)}${req.kind==='oco'?' / 손절 '+money(req.stop):''}</p><p class="footnote">확정 시 필요한 현금 또는 수량을 확보합니다.</p><form id="confirm-order-form"><button type="submit" class="primary wide">예약 등록 확정</button></form>`);$('#confirm-order-form')._order=req;}
    else {const r=await request('quote',{symbol:id,side:form.dataset.side,quantity});const q=r.quote;showModal('거래 확인',`<p>${e(snapshot.stocks.find(x=>x.id===id).name)} · ${q.side==='buy'?'매수':'매도'} ${q.quantity}주</p><div class="receipt"><div><span>체결 예상가</span><strong>${money(q.price)}</strong></div><div><span>수수료 · 세금</span><strong>${money(q.fee)} · ${money(q.tax)}</strong></div><div class="total"><span>${q.side==='buy'?'출금':'입금'} 예정</span><strong>${money(q.net)}</strong></div></div><p class="footnote">시세가 바뀌거나 20초가 지나면 다시 확인해야 합니다.</p><form id="confirm-trade-form"><button type="submit" class="primary wide">${q.side==='buy'?'매수':'매도'} 확정</button></form>`);$('#confirm-trade-form')._quote={quoteId:q.id,memo:data.memo};}return;
  }
  if(form.id==='confirm-trade-form'){const r=await mutate('trade',form._quote);sound.effect();return showModal('거래 영수증',view.receipt(r.receipt));}
  if(form.id==='confirm-order-form'){await mutate('order',form._order);modal.close();await navigate('orders');return toast('예약 주문을 등록했습니다.');}
  if(form.id==='settings-form'){await mutate('settings',{settings:{bgm:Number(data.bgm),sfx:Number(data.sfx),terms:fd.has('terms'),animation:fd.has('animation')}});return toast('설정을 저장했습니다.');}
  if(form.id==='notifications-form'){await mutate('settings',{settings:{notifications:{risk:fd.has('risk'),orders:fd.has('orders'),targets:fd.has('targets'),start:Number(data.start),end:Number(data.end),limit:Number(data.limit)}}});modal.close();return toast('알림 설정을 저장했습니다.');}
  if(form.id==='pin-form'){await mutate('pin',data);api.clear();snapshot=null;modal.close();renderLogin('PIN이 변경되었습니다. 다시 로그인해 주세요.');return;}
  if(form.id==='reset-form'){await mutate('reset',{pin:data.pin});page='home';modal.close();render();return tutorial();}
  if(form.id==='report-form'){await mutate('report',{...data,environment:'v'+VERSION+' '+navigator.userAgent.slice(0,250)});modal.close();return toast('제출했습니다. 운영자가 확인할 수 있습니다.');}
 }catch(error){failure(error);}finally{if(submit)submit.disabled=false;}
});
function welcomeSummary(){try{const key='king-last-'+snapshot.account.id,old=JSON.parse(localStorage.getItem(key)||'null');if(old&&old.runId===snapshot.account.runId&&snapshot.serverTime-old.at>1800000){showModal('다시 오신 것을 환영해요',`<p>지난 확인 이후 총자산 ${money(snapshot.total-old.total)} 변동</p><p>받을 배당·분배금 ${money(snapshot.dividends)}</p><p>예약 체결 ${snapshot.orders.filter(o=>o.status==='체결'&&o.closed>old.at).length}건</p><p>새 뉴스 ${snapshot.news.filter(n=>n.at>old.at).length}건</p>${view.button('내 기록 자세히 보기','records','','wide')}`);}localStorage.setItem(key,JSON.stringify({at:snapshot.serverTime,total:snapshot.total,runId:snapshot.account.runId}));}catch{}}
async function boot(){renderLogin();try{const status=await api.status();serverStatus=status.maintenance.enabled?'점검 중: '+status.maintenance.reason+' · 예상 종료 '+status.maintenance.until:'';}catch{serverStatus='게임 서버 연결을 확인하지 못했습니다. 설치·배포 상태를 확인한 뒤 다시 시도해 주세요.';}
 if(api.token){await sync(false);if(snapshot){render();welcomeSummary();if(!snapshot.account.tutorial)tutorial();return;}}renderLogin(serverStatus);}
document.addEventListener('visibilitychange',()=>{sound.visibility(!document.hidden);if(!document.hidden)sync();});window.addEventListener('online',()=>sync());window.addEventListener('offline',()=>connection('오프라인입니다. 거래 확정이 중지됩니다.'));
['pointerdown','keydown','scroll'].forEach(name=>document.addEventListener(name,()=>lastInput=Date.now(),{passive:true}));
window.addEventListener('hashchange',()=>{const [next,id]=location.hash.slice(1).split('/');if(snapshot&&next&&next!==page){page=next;if(id)symbol=id;render();}});
setInterval(()=>{if(snapshot&&!document.hidden){const el=$('#countdown');if(el)el.textContent=Math.max(0,60-Math.floor((Date.now()-receivedAt)/1000))+'초';}},1000);
setInterval(()=>sync(),60000);prepareInstall();boot();
