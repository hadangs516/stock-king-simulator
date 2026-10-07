import {miniCandles} from './game-panels.js';
import {api} from './api.js';
import {VERSION} from './config.js';
import {escape as e,money,compact,stamp,percent,icon,maxBuyQuantity} from './format.js';
import * as view from './views.js';
import {OptimisticActions} from './optimistic.js';
import {BrowserPreferences} from './preferences.js';
import {animateMoney,rewardFlight} from './motion.js';
import {tutorialPage,attendancePage} from './progression-ui.js';
import {ChatUI} from './chat-ui.js';
import {FriendsUI} from './friends-ui.js';
import {AdminUI} from './admin-ui.js';
import {sound,installApp,prepareInstall,installSuggestion,dismissInstall} from './platform.js';
const $=selector=>document.querySelector(selector), main=$('#main'), modal=$('#modal');
let confirmedSnapshot=null,snapshot=null,page='home',symbol=null,period='all',authMode='login',busy=false,syncing=null,pending=null,recordOffset=0,records=[];
let article=null,newsReturn='news',newsCategory='전체',orderTab='전체',rewardTab='보상',inboxTab='전체',chartPeriod='day';
let changedOrders=new Set(),totalChanged=false,lastChartTime=0;
let lastInput=Date.now(),receivedAt=0,toastAt=0,toastTimer,serverStatus='',lastCash=null,animationFrame;
const pendingKey='king-pending-operation';
let preferenceStorage;try{preferenceStorage=localStorage;}catch{}
const browserPreferences=new BrowserPreferences(preferenceStorage);
function rememberPending(req){try{if(req&&['trade','order','cancel','claim','attendance'].includes(req.action))sessionStorage.setItem(pendingKey,JSON.stringify({accountId:snapshot?.account.id,...req}));else if(!req)sessionStorage.removeItem(pendingKey);}catch{}}
const filter={market:'KOSPI',search:'',sort:'name',favorites:false};
if(VERSION.endsWith('-local')){const note=document.createElement('p');note.className='footnote';note.textContent='로컬 테스트 · 서버 종료 시 테스트 데이터 삭제';$('#header').append(note);}
const admin=new AdminUI({call:mutate,read:request,modal:showModal,close:()=>modal.close(),toast,navigate,apply,getSnapshot:()=>snapshot,api});
const friendsUI=new FriendsUI({context:()=>api.token+'|'+api.proxyToken,call:mutate,read:request,modal:showModal,close:()=>modal.close(),toast,render:()=>{if(page==='friends')render();}});
const chats=new ChatUI({context:()=>api.token+'|'+api.proxyToken,call:mutate,read:request,navigate,modal:showModal,close:()=>modal.close(),isChat:()=>page==='chat',isSupport:()=>page==='support'});
const optimistic=new OptimisticActions({context:()=>api.token+'|'+api.proxyToken+'|'+confirmedSnapshot?.account.runId,send:request,changed:()=>{if(confirmedSnapshot){apply(confirmedSnapshot,false);renderAfterPreference();}},confirmed:s=>{apply(s);renderAfterPreference();},failed:error=>{toast(error.message+' 설정을 다시 확인합니다.');void sync();}});
function renderAfterPreference(){document.querySelectorAll('#settings-form input').forEach(input=>{if(!snapshot)return;const value=snapshot.account.settings[input.name];if(input.type==='checkbox')input.checked=!!value;else if(!input.matches(':active'))input.value=value;});if(!modal.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))render();}
function localAction(action,data,patch){optimistic.enqueue(action,{...data,runId:snapshot.account.runId,requestId:crypto.randomUUID()},patch);}
function savePreferences(settings){
 const local={},server={};for(const [key,value] of Object.entries(settings))(['bgm','sfx','terms','animation'].includes(key)?local:server)[key]=value;
 if(Object.keys(local).length){Object.assign(snapshot.account.settings,browserPreferences.write(snapshot.account.id,local,snapshot.account.settings));sound.settings(snapshot.account.settings);}
 if(Object.keys(server).length)localAction('settings',{settings:server},s=>Object.assign(s.account.settings,server));
}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastAt=Date.now();toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
function celebrate(achievement,count){
 sound.effect('achievement');document.querySelector('.badge-celebration')?.remove();
 const card=document.createElement('aside');card.className='badge-celebration';card.setAttribute('role','status');
 card.innerHTML=`<span class="badge-medal" aria-hidden="true">★</span><div><small>배지 획득${count>1?' · '+count+'개':''}</small><strong>${e(view.achievementName(achievement))}</strong></div>`;
 document.body.append(card);setTimeout(()=>card.remove(),4200);
}
document.addEventListener('error',event=>{if(event.target.matches?.('.company-logo img'))event.target.remove();},true);
$('#toast').onclick=()=>{if(Date.now()-toastAt>=1000)$('#toast').hidden=true;};
function showModal(title,content){const receipt=title.includes('영수증');modal.classList.toggle('trade-receipt',receipt);$('#modal-close').hidden=receipt;$('#modal-title').textContent=title;$('#modal-content').innerHTML=content+(receipt?view.button('확인','close','','primary wide'):'');if(!modal.open)modal.showModal();}
$('#modal-close').onclick=()=>modal.close();modal.addEventListener('click',event=>{if(event.target===modal){const box=modal.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)modal.close();}});
function failure(error){if(error.loginRequired)return;showModal('확인이 필요해요',`<p class="error">${e(error.message)}</p>${pending?view.button('같은 요청으로 재시도','retry','','wide primary'):view.button('최신 상태 확인','sync','','wide')}`);}
function connection(message){$('#connection').hidden=!message;$('#connection').innerHTML=message?`${e(message)}${view.button('재시도','retrySync')}`:'';}
let foregroundRequests=0, loadingTimer;const requestLabels=[];
function processingLabel(action,data){const names={records:'로그 확인 중',receipt:'영수증 확인 중',order:'주문 등록 중',cancel:'주문 취소 중',claim:'보상 수령 중',attendance:'출석 보상 수령 중',tutorialProgress:'안내 저장 중',friends:'친구 목록 확인 중',friendSearch:'친구 검색 중',friendProfile:'친구 정보 확인 중',friendRequest:'친구 요청 보내는 중',friendRespond:'친구 요청 처리 중',friendRemove:'친구 목록 변경 중',friendSettings:'공개 설정 저장 중',friendRanking:'친구 순위 확인 중',friendMessages:'대화 불러오는 중',friendSend:'메시지 보내는 중',supportList:'문의 목록 확인 중',supportRead:'대화 불러오는 중',supportCreate:'새 문의 만드는 중',supportSend:'메시지 보내는 중',adminSupportList:'문의 목록 확인 중',adminSupportRead:'대화 불러오는 중',adminSupportSend:'답변 보내는 중',backup:'백업 준비 중',restore:'백업 확인 중',save:'진행 저장 중',reset:'진행 초기화 중',deleteAccount:'회원 탈퇴 처리 중',quote:'거래 가격 확인 중',report:'문의 보내는 중',pin:'비밀번호 변경 중',priceAlert:'목표가 알림 설정 중'};return action==='trade'?(data.side==='sell'?'주식 매도 중':data.side==='buy'?'주식 매수 중':'거래 처리 중'):names[action]||'요청 처리 중';}
function updateProcessingLabel(){const label=$('#request-loading-text');if(label)label.textContent=requestLabels.at(-1)?.label||'요청 처리 중';}
async function request(action,data={},background=false){
 const visible=!background&&!['sync','explore','login','signup','settings','readNews','tutorial'].includes(action),session=api.token+'|'+api.proxyToken;
 const job={label:processingLabel(action,data)};if(visible){requestLabels.push(job);updateProcessingLabel();}
 if(visible&&foregroundRequests++===0)loadingTimer=setTimeout(()=>{const overlay=$('#request-loading');overlay.hidden=false;if(overlay.showPopover)overlay.showPopover();else (modal.open?modal:document.body).append(overlay);},1000);
 try{const result=await api.send(action,data);if(!['login','signup'].includes(action)&&session!==api.token+'|'+api.proxyToken)throw Object.assign(new Error('계정이 변경되어 이전 응답을 적용하지 않았어요.'),{definitive:true});return result;}catch(error){if(!['login','signup'].includes(action)&&session!==api.token+'|'+api.proxyToken)throw Object.assign(new Error('계정이 변경되어 이전 응답을 적용하지 않았어요.'),{definitive:true});if(!['login','signup'].includes(action)&&/로그인 인증|다른 기기 또는 브라우저에서 로그인/.test(error.message)){error.loginRequired=true;api.clear();snapshot=null;confirmedSnapshot=null;pending=null;rememberPending(null);lastCash=null;modal.close();renderLogin(error.message);}throw error;}finally{if(visible){requestLabels.splice(requestLabels.indexOf(job),1);updateProcessingLabel();}if(visible&&--foregroundRequests===0){clearTimeout(loadingTimer);const overlay=$('#request-loading');if(overlay.hidePopover)overlay.hidePopover();overlay.hidden=true;if(!overlay.showPopover)document.body.append(overlay);}}
}
let bootTimer, bootRefresh;
function startLoading(stage){
 document.body.classList.add('is-auth');connection('');
 main.innerHTML=`<section class="boot"><h1>주식왕 시뮬레이션</h1><img class="boot-art" src="./assets/ui/header.webp" alt="" width="720" height="210"><div class="progress"><span></span></div><p id="loading-stage" role="status">${e(stage)}</p><button id="boot-refresh" data-action="reload" hidden>새로고침</button><small class="boot-version">v${VERSION}</small></section>`;
 let progress=10;clearInterval(bootTimer);clearTimeout(bootRefresh);
 bootTimer=setInterval(()=>{progress+=Math.max(.2,(92-progress)*.09);const bar=main.querySelector('.progress>span');if(bar)bar.style.width=progress+'%';},300);
 bootRefresh=setTimeout(()=>{if($('#boot-refresh'))$('#boot-refresh').hidden=false;},5000);
}
function finishLoading(){clearInterval(bootTimer);clearTimeout(bootRefresh);}
function installAfterLogin(){const content=installSuggestion();if(content)showModal('앱으로 더 편하게',content);}
function updateSearch(){const template=document.createElement('template');template.innerHTML=view.market(snapshot,filter);$('#market-results')?.replaceChildren(...template.content.querySelector('#market-results').childNodes);}

function reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
function apply(s,fromServer=true){
 if(!s)return;if(confirmedSnapshot&&s.revision<confirmedSnapshot.revision)return;confirmedSnapshot=s;s=optimistic.project(s);
 Object.assign(s.account.settings,browserPreferences.read(s.account.id,s.account.settings));
 if(friendsUI.owner!==s.account.id+'|'+api.token+'|'+api.proxyToken){friendsUI.owner=s.account.id+'|'+api.token+'|'+api.proxyToken;friendsUI.data=null;friendsUI.results=[];records=[];recordOffset=0;}
 const previous=snapshot;totalChanged=!!previous&&previous.total!==s.total;changedOrders=new Set(previous?s.orders.filter(o=>o.status==='체결'&&previous.orders.some(p=>p.id===o.id&&p.status==='대기')).map(o=>o.id):[]);snapshot=s;document.body.classList.remove('is-auth');document.body.classList.toggle('is-proxy',!!s.proxy);if(fromServer)receivedAt=Date.now();document.body.classList.toggle('no-motion',!s.account.settings.animation);sound.settings(s.account.settings);
 if(!previous){try{const saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(saved&&saved.accountId===s.account.id)pending={action:saved.action,data:saved.data};}catch{}}
 $('#ticker').hidden=false;$('#nav').hidden=false;$('#proxy-banner').hidden=!s.proxy;$('#proxy-banner').textContent=s.proxy?'플레이어 시점: '+s.proxy.name:'';
 $('#ticker').innerHTML=`<button data-action="amount" data-value="${s.account.cash}"><small>보유 현금</small><strong id="cash">${compact(s.account.cash)}</strong></button><button data-action="total"><small>총자산</small><strong>${money(s.total)}</strong></button><div class="day"><small>DAY</small><strong>${s.day}</strong></div><button data-action="inbox" class="ticker-inbox" aria-label="알림함">${icon("bell")}</button><div class="time"><small>다음 시세 확인 <span id="countdown">${countdownSeconds()}초</span></small></div>`;
 if(previous&&previous.account.id!==s.account.id)lastCash=null;
 animateMoney($('#cash'),lastCash??s.account.cash,s.account.cash,document.hidden||reduced());
 if(lastCash!==null&&lastCash!==s.account.cash&&!document.hidden&&!reduced()){$('#cash').classList.add('changed');toast((s.account.cash-lastCash>0?'+':'')+money(s.account.cash-lastCash)+' · 현금 변동');}lastCash=s.account.cash;
 if(previous&&previous.account.runId===s.account.runId){const old=Object.keys(previous.account.achievements),fresh=Object.keys(s.account.achievements).filter(id=>!old.includes(id));if(fresh.length)celebrate(s.account.achievements[fresh[0]],fresh.length);if(s.day>previous.day&&s.day<=4)toast('DAY '+s.day+' · 새로운 기능이 열렸습니다.');}
 if(changedOrders.size)toast('✓ 예약 주문 '+changedOrders.size+'건 체결 완료');
 if($('#trade-form')&&!busy)updateTradeOffer();
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
 catch(error){if(!error.loginRequired)connection(error.message);}finally{syncing=null;}})();return syncing;
}
function nav(){const tabs=[['home','홈'],['news','뉴스'],['market','거래소'],['assets','내 자산'],['settings','설정']];$('#nav').innerHTML=tabs.map(([id,name])=>`<button type="button" data-page="${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${icon(id)}${name}</button>`).join('');}
function render(){
 if(!snapshot)return renderLogin(serverStatus);if(page==='newsDetail'&&!article)page='news';if(page==='detail'&&!snapshot.stocks.some(x=>x.id===symbol))page='market';nav();const s=snapshot;
 const content={newsDetail:()=>view.newsArticle(s,article),friends:()=>friendsUI.view(),home:()=>view.home(s,period),market:()=>view.market(s,filter),news:()=>view.news(s,s.news,true,newsCategory),assets:()=>view.assets(s,period),settings:()=>view.settings(s),total:()=>view.total(s),orders:()=>view.orders(s,orderTab),inbox:()=>view.inbox(s,inboxTab),rewards:()=>view.rewards(s,rewardTab),achievements:()=>view.achievements(s),detail:()=>view.detail(s,s.stocks.find(x=>x.id===symbol),chartPeriod),economy:()=>economy(),records:()=>recordsView()};
 if(page==='chat'){chats.render();return;}if(page==='support'){main.innerHTML=chats.listView();return;}if(page==='admin'){admin.render();return;}main.classList.toggle('market-updated',lastChartTime!==s.marketTime);lastChartTime=s.marketTime;const expanded=[...main.querySelectorAll('details[data-achievement][open]')].map(el=>el.dataset.achievement);const oldPrices=new Map([...main.querySelectorAll('[data-price]')].map(el=>[el.dataset.price,Number(el.dataset.amount)]));main.innerHTML=(content[page]||content.home)();main.querySelectorAll('[data-price]').forEach(el=>animateMoney(el,oldPrices.get(el.dataset.price),Number(el.dataset.amount),reduced()));main.querySelectorAll('details[data-achievement]').forEach(el=>el.open=expanded.includes(el.dataset.achievement));if(page==='total'&&totalChanged)$('#total-number')?.classList.add('changed');main.querySelectorAll('[data-order]').forEach(el=>{if(changedOrders.has(el.dataset.order))el.classList.add('changed');});changedOrders.clear();if(s.account.settings.terms)main.querySelectorAll('.receipt span.muted').forEach(el=>{const term=Object.keys(terms).sort((a,b)=>b.length-a.length).find(t=>el.textContent.includes(t));if(term){const b=document.createElement('button');b.type='button';b.className='link-button';b.dataset.action='help';b.dataset.term=term;b.textContent=el.textContent+' ⓘ';el.replaceWith(b);}});
}
function finishAccountLifecycle(action,id){
 if(action==='deleteAccount')browserPreferences.remove(id);
 try{localStorage.removeItem('king-last-'+id);}catch{}
 api.clear();snapshot=null;confirmedSnapshot=null;pending=null;rememberPending(null);records=[];lastCash=null;friendsUI.data=null;friendsUI.results=[];page='home';modal.close();
 renderLogin(action==='deleteAccount'?'회원 탈퇴가 완료되었습니다.':'진행을 초기화했습니다. 다시 로그인해 주세요.');
}
function confirmLoginReplacement(){
 return new Promise(resolve=>{
  modal.returnValue='';
  showModal('이미 로그인 중입니다',`<p>이미 다른 기기 또는 브라우저에서 로그인 중입니다.</p><p>여기서 로그인하면 기존 접속은 로그아웃됩니다. 로그인하시겠어요?</p><div class="actions">${view.button('취소','close')}<button type="button" id="replace-login" class="primary">로그인</button></div>`);
  modal.addEventListener('close',()=>resolve(modal.returnValue==='login'),{once:true});
  $('#replace-login').onclick=()=>modal.close('login');
 });
}
function renderLogin(message=''){finishLoading();document.body.classList.add('is-auth');cancelAnimationFrame(animationFrame);$('#ticker').hidden=true;$('#nav').hidden=true;$('#proxy-banner').hidden=true;main.innerHTML=view.loginView(authMode,message);}
function refreshMarketPrices(){document.querySelectorAll('.stock[data-symbol]').forEach(el=>{const x=snapshot.stocks.find(v=>v.id===el.dataset.symbol);if(!x)return;const price=el.querySelector('.stock-price strong'),delta=el.querySelector('.stock-price p'),value=(x.price/x.base-1)*100;animateMoney(price,Number(price.dataset.amount)||x.price,x.price,reduced());delta.textContent=percent(value);delta.className=value>=0?'up':'down';const mini=el.querySelector('.stock-chart');if(mini)mini.innerHTML=miniCandles(x.history);});}
async function navigate(next,id){
 if(!snapshot)return;if(page==='chat')chats.rememberDraft();const order=['home','news','market','assets','settings'],direction=order.indexOf(next)>=order.indexOf(page)?1:-1;main.style.setProperty('--page-direction',direction);page=next;if(id)symbol=id;location.hash=next+(next==='detail'?'/'+symbol:'');modal.close();render();main.classList.remove('page-in');void main.offsetWidth;main.classList.add('page-in');window.scrollTo({top:0,behavior:'instant'});
 if(next==='total'){animateTotal();void sync(false).then(()=>{if(page==='total'&&snapshot){render();animateTotal();}});}
 if(next==='friends')await friendsUI.load();
 if(next==='records'){records=[];recordOffset=0;render();await loadRecords();}
 if(next==='detail'&&!snapshot.account.statistics.companies.includes(symbol)){void request('explore',{symbol,runId:snapshot.account.runId,requestId:crypto.randomUUID()}).then(r=>apply(r.snapshot)).catch(error=>connection(error.message));}
 if(next==='admin')await admin.load();
}
function animateTotal(){if(reduced())return;cancelAnimationFrame(animationFrame);const el=$('#total-number'),status=$('#sum-status'),items=[...document.querySelectorAll('.sum-item')];if(!el)return;const target=snapshot.total,start=performance.now();function frame(now){if(page!=='total')return;const p=Math.min(1,(now-start)/550),count=Math.ceil(items.length*p);el.textContent=compact(items.slice(0,count).reduce((sum,item)=>sum+Number(item.dataset.amount),0));status.textContent=p<1?`자산 합산 중 · ${count}/${items.length}`:`자산 합산 완료 · ${items.length}/${items.length}`;if(p<1)animationFrame=requestAnimationFrame(frame);else el.textContent=compact(target);}animationFrame=requestAnimationFrame(frame);}
function economy(){return `${view.button('돌아가기','home','','back')}<div class="page-head"><h2>경제 지표</h2><span class="tag">가상 경제</span></div>${snapshot.day<3?view.lockedView(snapshot,3,'경제 지표','금리·경기·물가를 함께 살펴봅니다.'):`<div class="metric-grid">${Object.entries({금리:snapshot.economy.rate+'%',물가:snapshot.economy.inflation+'%',경기:snapshot.economy.activity+'pt'}).map(([name,value])=>`<div class="metric"><span class="muted">${name}</span><strong>${value}</strong></div>`).join('')}</div><p class="footnote">공통 경제 상태입니다. 현실 경제 수치와 무관하며, 기업별 비용·수요·경쟁에 따라 영향이 다릅니다.</p>`}`;}
async function loadRecords(){const result=await request('records',{offset:recordOffset});records.push(...result.records);recordOffset=result.next;if(page==='records')render();}
function recordsView(){return `${view.button('돌아가기','settings','','back')}<div class="page-head"><h2>계정 로그 확인</h2><span class="tag">최신순</span></div>${records.map(r=>`<div class="news-card"><span class="eyebrow">DAY ${r.day} · ${stamp(r.at,true)}</span><h3>${e(r.type)}</h3>${r.data.title?`<p>${e(r.data.title)}</p>`:''}${r.data.items?`<p>${r.data.items.map(k=>e(({bgm:'배경음악',sfx:'효과음',terms:'용어 설명',animation:'애니메이션',favorites:'관심종목',notifications:'알림 설정'})[k]||k)).join(' · ')}</p>`:''}${r.data.category?`<p>${e(r.data.category)}</p>`:''}${r.data.name?`<p>${e(r.data.name)} · ${r.data.quantity||0}주</p>`:''}${r.data.price?`<p class="muted">체결가 ${money(r.data.price)}</p>`:''}${r.data.memo?`<p>투자 메모: ${e(r.data.memo)}</p>`:''}${r.data.total?`<p>${money(r.data.total)}</p>`:''}${r.data.net?`<p>${money(r.data.net)}</p>`:''}${r.data.side?view.button('영수증 보기','receipt',`data-id="${e(r.data.id)}"`,'link-button'):''}<p class="footnote">회차 ${e(r.runId.slice(0,8))}</p></div>`).join('')||'<p class="empty">아직 기록이 없습니다.</p>'}${recordOffset!==null?view.button('이전 기록 더 보기','moreRecords','','wide'):''}`;}
function tradingForm(id,side,reserve=false){
 const x=snapshot.stocks.find(v=>v.id===id);if(x.market==='ETF'&&snapshot.day<4)return showModal('ETF는 DAY 4에 열려요',view.lockedView(snapshot,4,'ETF','전체시장·반도체·소비재 ETF를 만나보세요.'));
 if(snapshot.catchingUp)throw new Error('시장 동기화 후 거래할 수 있습니다.');
 showModal(`${x.name} · ${reserve?'예약':side==='buy'?'매수':'매도'}`,`<p class="muted">현재가 <span id="trade-current">${money(x.price)}</span> · 사용 가능 현금 ${money(snapshot.availableCash)}</p><p class="muted">매도 가능 ${snapshot.holdings[id]?.available||0}주</p><form id="trade-form" data-symbol="${id}" data-side="${side}" data-reserve="${reserve}">${reserve?'<label>예약 종류<select name="kind"><option value="limitBuy">지정가 매수</option><option value="limitSell">지정가 매도</option><option value="stop">손절 조건부 매도</option><option value="oco">익절·손절 묶음 매도</option></select></label>':''}<label>수량 (1주 단위)<input name="quantity" type="number" min="1" max="100000000" step="1" value="1" required></label>${reserve?`<label>지정가 / 조건가 (원)<input name="price" type="number" min="1" max="1000000000" step="1" value="${x.price}" required></label><label>묶음 주문의 손절가 (원)<input name="stop" type="number" min="1" max="1000000000" step="1" value="${Math.max(1,Math.floor(x.price*.9))}"></label><label>만료<select name="expiryDays"><option value="1">1일 후</option><option value="7" selected>7일 후</option><option value="0">직접 취소 전까지</option></select></label><p class="footnote">매수 현금·매도 수량을 확보합니다. 묶음 주문은 수량을 한 번 확보하며 한쪽 체결 시 반대쪽 취소. 정지 중 대기, 폐지·분할 시 취소됩니다.</p>`:'<label>투자 이유 (선택)<textarea name="memo" maxlength="200" placeholder="이 기업을 선택한 이유를 남겨 보세요."></textarea></label>'}<div id="trade-estimate" class="card"></div><p class="footnote">${taxHint()}</p><button type="submit" class="primary wide">${reserve?'예약 내용 확인':side==='buy'?'매수':'매도'}</button></form>`);
 if(reserve&&side==='sell')$('#trade-form [name=kind]').value='limitSell';updateTradeOffer();
}
function updateTradeOffer(){const f=$('#trade-form');if(!f)return;const x=snapshot.stocks.find(x=>x.id===f.dataset.symbol);f._offer=x.offer?structuredClone(x.offer):null;const label=$('#trade-current');if(label)label.textContent=money(x.price);estimate();}
function taxHint(){return snapshot.taxPolicy?'매수·매도 수수료 0.05%. DAY 3부터 주식 매도 세금 0.20%, 국내 주식형 ETF 매매 세금 0%.':'매수·매도 수수료 0.05%, 주식 매도 세금 0.15%, ETF 세금 0%.';}
function estimatedTax(x,side,gross){if(side!=='sell'||x.market==='ETF')return 0;if(!snapshot.taxPolicy)return Math.ceil(gross*.0015);if(!snapshot.taxPolicy.enabled)return 0;return x.market==='KOSPI'?Math.floor(gross/2000)+Math.floor(gross*3/2000):Math.floor(gross/500);}
function estimate(){
 const f=$('#trade-form');if(!f)return;const fd=new FormData(f),x=snapshot.stocks.find(x=>x.id===f.dataset.symbol),reserve=f.dataset.reserve==='true',side=reserve?fd.get('kind')==='limitBuy'?'buy':'sell':f.dataset.side;
 const price=reserve?Number(fd.get('price')):f._offer?.price||x.price,gross=Number(fd.get('quantity'))*price,fee=Math.ceil(gross/2000),tax=estimatedTax(x,side,gross),max=side==='buy'?maxBuyQuantity(snapshot.availableCash,price):snapshot.holdings[x.id]?.available||0;
 $('#trade-estimate').innerHTML='<p>가능한 최대 수량 <strong>'+max.toLocaleString()+'주</strong> '+view.button('최대','maxQuantity','data-max="'+max+'"','link-button')+'</p><p class="muted">예상 거래대금 '+money(gross)+'<br>수수료 '+money(fee)+' · 세금 '+money(tax)+'</p><strong>예상 '+(side==='buy'?'출금':'입금')+' '+money(side==='buy'?gross+fee+tax:gross-fee-tax)+'</strong><p>거래 후 잔액 <strong>'+money(snapshot.account.cash+(side==='buy'?-(gross+fee+tax):gross-fee-tax))+'</strong></p>';
}
let tutorialStep=0,tutorialReplay=false;
function tutorial(replay=false){tutorialReplay=replay;tutorialStep=replay?0:(snapshot.account.tutorialStep||0);showTutorial();}
function showTutorial(){showModal('주식왕의 첫걸음',tutorialPage(snapshot,tutorialStep,tutorialReplay));}
function showAttendance(){showModal('출석 보상',attendancePage(snapshot));}
async function tutorialNext(){const step=Math.min(8,tutorialStep+1);if(!tutorialReplay&&snapshot.attendance)await mutate('tutorialProgress',{step});tutorialStep=step;showTutorial();}
async function collectAttendance(target,first){const source=target.getBoundingClientRect(),before=snapshot.account.cash;target.disabled=true;try{const r=await mutate('attendance');if(first){showTutorial();animateMoney($('#welcome-cash'),before,snapshot.account.cash,reduced());}else showAttendance();if(r.amount){sound.effect();rewardFlight(source,$('#cash'),r.amount,reduced());}}finally{if(target.isConnected)target.disabled=false;}}
const terms={'평균 매수가':'매수에 쓴 총금액을 보유 수량으로 나눈 값입니다. 이 게임은 매수 수수료를 포함합니다. 예: 10,005원에 1주를 사면 평균 매수가는 10,005원입니다.','평가손익':'아직 팔지 않은 주식의 현재 평가금액과 매입금액 차이입니다. 지금 매도할 때의 비용은 별도입니다.','실현손익':'주식을 팔아 확정된 손익입니다. 매수 원가와 매도 비용·세금을 함께 반영합니다.','상한가·하한가':'전일 기준가 대비 하루 상승·하락 범위입니다. 일반 주식은 ±30%이며 여러 날의 누적 손실은 제한하지 않습니다.','NAV':'ETF가 보유한 증권·현금·미수금에서 부채를 뺀 뒤 발행 좌수로 나눈 가치입니다. 거래 가격과 다를 수 있습니다.','배당':'권리 기준시점에 보유한 수량에 따라 확정되는 분배액입니다. 배당락과 세금을 반영하며 항상 지급되지는 않습니다.'};
Object.assign(terms,{
 '봉차트':'일정 시간의 시가·고가·저가·종가를 한 개의 봉으로 보여줘요. 빨강은 종가가 시가보다 높고, 파랑은 낮아요. 꼬리는 그 구간의 가장 높고 낮은 가격이에요.',
 '시가':'해당 구간에서 처음 기록된 가격이에요. 봉차트 몸통의 한쪽 끝이 돼요.',
 '종가':'해당 구간에서 마지막으로 기록된 가격이에요. 진행 중인 봉의 종가는 시세에 따라 바뀔 수 있어요.',
 '고가':'해당 기간에 기록된 가장 높은 가격이에요.',
 '저가':'해당 기간에 기록된 가장 낮은 가격이에요.',
 '거래량':'일정 기간 사고팔린 주식의 수량이에요. 가격 변화와 함께 시장의 거래 활동을 살펴볼 때 사용해요.',
 '매출':'기업이 제품이나 서비스를 판매해 얻은 수익이에요. 매출 전체가 기업의 이익이 되는 것은 아니에요.',
 '영업이익':'주된 사업의 매출에서 매출원가와 판매·관리 비용을 뺀 금액이에요. 이자나 세금까지 모두 반영한 최종 이익과는 달라요.',
 '부채':'기업이 앞으로 갚거나 이행해야 할 의무예요. 규모뿐 아니라 갚는 시점과 이자 부담도 함께 봐요.',
 '시가총액':'주가에 발행 주식 수를 곱한 금액이에요. 기업의 주식 전체를 시장 가격으로 평가한 크기예요.',
 '지정가':'원하는 가격을 정한 주문이에요. 매수는 지정가 이하, 매도는 지정가 이상에서 조건을 만족해야 체결돼요.',
 '손절':'손실이 커지는 것을 막으려 매도하는 행동이에요. 손절 조건을 예약해도 거래정지나 급격한 가격 변화로 원하는 가격에 팔지 못할 수 있어요.',
 '익절':'보유 주식을 팔아 이익을 확정하는 행동이에요. 보유 중 평가이익과 매도 후 실현이익은 비용 때문에 다를 수 있어요.',
 '분산 투자':'자금을 여러 투자 대상에 나누는 방식이에요. 한 종목에 집중된 위험을 줄일 수 있지만 손실을 없애지는 못해요.',
 '배당락':'배당받을 권리가 분리되면서 그 가치를 주가에 반영하는 과정이에요. 배당은 공짜로 생기는 추가 수익이 아니에요.',
 '분배금':'ETF 등이 운용 중 얻은 수익의 일부를 투자자에게 나눠주는 금액이에요. 지급 일정과 기준을 확인해야 해요.',
 'iNAV':'ETF 구성자산의 최신 가격 등을 반영한 추정 순자산가치예요. 확정된 NAV나 실제 거래 가격과 차이가 날 수 있어요.',
 '괴리율':'ETF 거래 가격과 순자산가치의 차이를 비율로 나타낸 값이에요. 양수면 거래 가격이 기준 가치보다 높다는 뜻이에요.',
 '수수료':'거래 과정에서 부과되는 비용이에요. 이 시뮬레이션에서는 매수·매도 대금의 0.05%를 적용해요.',
 '세금':'거래나 배당에 적용되는 비용이에요. DAY 3부터 적용하며 매수, 주식 매도, ETF 매도와 배당은 각각 규칙이 달라요.',
 '예약 주문':'가격 등 조건을 정해 두고 나중에 체결되도록 등록하는 주문이에요. 기다리는 동안 필요한 현금이나 수량이 묶여요.',
 '상장':'주식이 거래소에서 거래되도록 등록되는 것이에요. 상장 자체가 기업의 수익성이나 투자 수익을 보장하지는 않아요.',
 '거래정지':'해당 종목을 일시적으로 거래할 수 없는 상태예요. 정지 중에는 일반 매수·매도 주문이 체결되지 않아요.',
 '상장폐지':'거래소에서의 상장 자격이 끝나는 것이에요. 보유 주식의 권리가 바로 없어지는 것과는 다르지만 매매나 회수가 어려워질 수 있어요.',
 '총자산':'현금, 주식과 ETF 평가액, 받을 금액을 합한 값이에요. 예약에 묶인 돈과 주식도 한 번만 포함해요.'
});
function readNews(id){if(snapshot.readNews.includes(id))return;localAction('readNews',{id},s=>{if(!s.readNews.includes(id))s.readNews.push(id);});}
function help(name){showModal(name,`<p>${e(terms[name])}</p>`);}
function settingsForm(name){
 if(name==='pin')return showModal('비밀번호 변경','<form id="pin-form"><label>현재 비밀번호<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label><label>새 비밀번호<input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label><p class="footnote">변경 후 모든 기기에서 다시 로그인해야 합니다.</p><button class="primary wide">비밀번호 변경</button></form>');
 if(name==='reset'||name==='deleteAccount'){const deleting=name==='deleteAccount';return showModal(deleting?'회원 탈퇴':'처음부터 다시 시작',`<p class="error">${deleting?'아이디·비밀번호·설정과 모든 개인 데이터를 삭제합니다.':'아이디·비밀번호·설정을 제외한 모든 진행 데이터를 삭제합니다.'} 현금·주식·주문·보상·출석·경험치·누적 통계·친구 관계·대화·문의 내역은 복구할 수 없습니다.</p><p>완료하면 로그아웃됩니다. 이전 백업으로 되돌릴 수 없습니다.</p><form id="account-lifecycle-form" data-operation="${name}"><label>현재 비밀번호<input name="pin" type="password" pattern="[0-9]{4}" inputmode="numeric" maxlength="4" required></label><label class="check"><input name="confirm" type="checkbox" required>삭제되는 내용을 확인했으며 최종 진행에 동의합니다.</label><button class="danger wide">${deleting?'계정 영구 삭제':'진행 초기화'}</button></form>`);}
 if(name==='report')return showModal('오류 신고·기능 제안',`<form id="report-form"><p>제안이 채택되면 보상이 지급됩니다.</p><p class="footnote">보상 종류와 수량은 운영자가 결정하며 모든 제출에 자동 지급하지 않습니다.</p><label>종류<select name="kind"><option value="error">오류 신고</option><option value="suggestion">기능 제안</option>${snapshot.taxPolicy?'<option value="other">기타</option>':''}</select></label><label>내용<textarea name="body" maxlength="4000" required></textarea></label><label>답변 이메일 (선택)<input name="email" type="email" maxlength="200"></label><p class="footnote">계정, 접수 시각, 앱 버전과 브라우저 환경을 함께 전달합니다. 이메일은 답변 연락용이며 관리자만 조회합니다.</p><button class="primary wide">제출</button></form>`);
 if(name==='notifications'){const n=snapshot.account.settings.notifications;return showModal('알림 수신 설정',`<form id="notifications-form">${(snapshot.notificationOptions||[]).map(({id,label})=>`<label class="check"><input name="${id}" type="checkbox" ${n[id]?'checked':''}>${label}</label>`).join('')}<p class="footnote">앱 내 알림을 항목별로 선택합니다. 알림을 꺼도 거래 기록과 수령할 보상은 유지됩니다.</p><button class="primary wide">설정 저장</button></form>`);}
}
document.addEventListener('click',async event=>{
 lastInput=Date.now();sound.activate();const target=event.target.closest('button,[data-action],#consent');if(!target)return;
 try{
  if(target.id==='consent'){event.preventDefault();showModal('가상 투자 안내',`<p>가격·뉴스·실적·자금은 가상이며 현금으로 바꿀 수 없어요.</p><p>게임 성과가 실제 투자 실력을 보장하지는 않아요.</p><p>비밀번호는 숫자 4자리예요. 운영자 전용 시트에 원문으로 저장되므로 다른 서비스에서 쓰는 비밀번호는 피해주세요.</p>${view.button('확인했습니다','consentConfirm','','wide primary')}`);return;}
  if(target.dataset.page)return await navigate(target.dataset.page);const action=target.dataset.action;if(!action)return;
  if(action==='chatFriend')return await chats.open('friend',target.dataset.id,target.dataset.title);
  if(action==='chatSupport')return await chats.open(chats.listAdmin?'adminSupport':'support',target.dataset.id,target.dataset.title);
  if(action==='chatNew')return chats.newConversation();
  if(action==='chatOlder')return await chats.refresh(true);
  if(action==='chatBack')return chats.mode==='friend'?await navigate('friends'):await chats.list(chats.mode==='adminSupport');
  if(action==='support'||action==='adminSupport')return await chats.list(action==='adminSupport');
  if(action.startsWith('admin'))return await admin.action(action,target);
  if(action==='friends'){if(!snapshot.taxPolicy)return showModal('친구 기능 준비 중','<p>새 서버 배포 후 이용할 수 있어요.</p>');return await navigate('friends');}
  if(action.startsWith('friend'))return await friendsUI.action(action,target);
  if(action==='reload')return location.reload();
  if(action==='close')return modal.close();
  if(action==='consentConfirm'){$('#consent').checked=true;modal.close();return;}
  if(action==='updates')return showModal('업데이트 기록','<p><strong>2026.10.08 · 0.1.8</strong><br>26종 알림 설정, 상장폐지 예고 알림 제외, 30일 출석 보상표 반복.</p><p><strong>2026.10.07 · 0.1.7</strong><br>뉴스 삽화 100종, 홈 바로가기·자산 구성·예약 분류, 보상함과 알림 읽음 처리, 기간별 차트 개선.</p><p><strong>2026.10.06 · 0.1.6</strong><br>중복 로그인 확인과 기존 접속 종료.</p><p><strong>2026.10.06 · 0.1.5</strong><br>뉴스 분류·가상 기사와 수시 발행, 시세 변동 개선, 게임 화면과 아이콘 교체, 거래·고객센터 오류 수정.</p><p><strong>2026.09.28 · 0.1.4</strong><br>봉차트·뉴스 상세, 즉시 설정 반영, 회사 로고, 단계별 업적과 소리 개선.</p><p><strong>2026.09.28 · 0.1.3</strong><br>시작 자금 100만원, 친구와 공개 설정, DAY 3 세금과 계정 로그.</p><p><strong>2026.09.28 · 0.1.2</strong><br>로그인 화면과 기본 UI 개선, 한글 검색·로딩 표시 수정.</p><p><strong>2026.09.27 · 0.1.1</strong><br>공통 시장, 거래·예약, ETF·배당, 관리자 기능 추가.</p>');
  if(action==='financials')return showModal('기업 실적표',view.lockedView(snapshot,2,'기업 실적표','매출·영업이익·부채 추이를 확인할 수 있어요.'));
  if(action==='economy'&&snapshot.day<3)return showModal('경제 지표',view.lockedView(snapshot,3,'경제 지표','금리·경기·물가를 살펴볼 수 있어요.'));
  if(action==='help')return help(target.dataset.term);
  if(action==='chartNews'||action==='newsArticle'){article=snapshot.news.find(n=>n.id===target.dataset.id);if(!article)return;newsReturn=page==='detail'?'detail':'news';readNews(article.id);return navigate('newsDetail');}
  if(action==='rewardTab'){rewardTab=target.dataset.tab;return render();}
  if(action==='inboxTab'){inboxTab=target.dataset.tab;return render();}
  if(action==='readAlert'||action==='readAllAlerts'){const ids=action==='readAlert'?[target.dataset.id]:(snapshot.alerts||[]).map(n=>n.id);for(let i=0;i<ids.length;i+=500)await mutate('readAlerts',{ids:ids.slice(i,i+500)});return;}
  if(action==='orderTab'){orderTab=target.dataset.tab;return render();}
  if(action==='newsCategory'){newsCategory=target.dataset.category;return render();}
  if(action==='newsBack')return navigate(newsReturn);
  if(action==='removePriceAlert'){await mutate('priceAlert',{remove:target.dataset.id});return;}
  if(action==='priceAlert'){const x=snapshot.stocks.find(x=>x.id===target.dataset.symbol);return showModal('목표가 알림',`<form id="price-alert-form" data-symbol="${x.id}"><p>${e(x.name)} · 현재 ${money(x.price)}</p><label>목표 가격<input name="price" type="number" min="1" max="1000000000" value="${x.price}" required></label><label>조건<select name="direction"><option value="above">이상 도달</option><option value="below">이하 도달</option></select></label><p class="footnote">다음 시세부터 조건 충족 시 한 번 알립니다. 자동 주문은 실행하지 않으며, 외부 푸시는 아직 연결되지 않았습니다.</p><button class="primary wide">목표가 등록</button></form>`);}
  if(action==='dismissInstall'){dismissInstall();modal.close();return;}
  if(action==='loginTab'){authMode=target.dataset.mode;return renderLogin(serverStatus);}
  if(['home','news','market','assets','settings','total','orders','inbox','rewards','achievements','economy','records'].includes(action))return await navigate(action);
  if(action==='detail')return await navigate('detail',target.dataset.symbol);
  if(action==='chartPeriod'){chartPeriod=target.dataset.period;return render();}
  if(action==='period'){period=target.dataset.period;return render();}
  if(action==='marketTab'){if(target.dataset.market==='ETF'&&snapshot.day<4)return showModal('ETF',view.lockedView(snapshot,4,'ETF','여러 기업에 나누어 투자할 수 있어요.'));filter.market=target.dataset.market;return render();}
  if(action==='maxQuantity'){const f=$('#trade-form');f.elements.quantity.value=target.dataset.max;estimate();return;}
  if(action==='favorite'){const favorites=[...snapshot.account.settings.favorites],i=favorites.indexOf(target.dataset.symbol);if(i>=0)favorites.splice(i,1);else favorites.push(target.dataset.symbol);savePreferences({favorites});return;}
  if(['buy','sell','reserve'].includes(action))return tradingForm(target.dataset.symbol,action==='sell'||page==='assets'?'sell':'buy',action==='reserve');
  if(action==='amount')return showModal('정확한 금액',`<p class="balance">${money(Number(target.dataset.value))}</p>`);
  if(action==='cancel'){showModal('예약을 취소할까요?',`<p>대기 주문을 취소하고 잠긴 현금 또는 수량을 해제합니다.</p>${view.button('취소 확정','confirmCancel',`data-id="${target.dataset.id}"`,'wide primary')}`);return;}
  if(action==='confirmCancel'){await mutate('cancel',{orderId:target.dataset.id});modal.close();return toast('예약 주문을 취소했습니다.');}
  if(action==='readNews'){readNews(target.dataset.id);return;}
  if(action==='claim'){const source=target.getBoundingClientRect(),before=snapshot.account.cash,r=await mutate('claim',{claimId:target.dataset.id});if(r.claimed.length){sound.effect();rewardFlight(source,$('#cash'),snapshot.account.cash-before,reduced());toast(r.claimed.length+'건을 수령했습니다.');}else toast('지급 시각·해금·종목 상태를 확인해 주세요.');return;}
  if(action==='receipt'){const r=await request('receipt',{id:target.dataset.id});return showModal('거래 영수증',view.receipt(r.receipt));}
  if(action==='moreRecords')return await loadRecords();
  if(action==='sync'||action==='retrySync'){modal.close();if(!api.token){await boot();return;}return await sync();}
  if(action==='retry'){const action=pending?.action,body=pending?.data.body,id=snapshot?.account.id,r=await mutate('__retry');if(['reset','deleteAccount'].includes(action)){finishAccountLifecycle(action,id);return;}modal.close();if(['friendSend','supportSend','adminSupportSend'].includes(action)){await chats.retried(body);return;}if(action==='supportCreate'&&r.conversation){await chats.open('support',r.conversation.id,r.conversation.category);return;}if(action==='attendance'){if(!snapshot.account.tutorial)tutorial();else showAttendance();if(r.amount)rewardFlight(null,$('#cash'),r.amount,reduced());return;}if(r.receipt)showModal('거래 영수증',view.receipt(r.receipt));else toast('이전 요청 결과를 확인했습니다.');return;}
  if(action==='save'){await mutate('save');return toast('서버에 저장되었습니다.');}
  if(action==='logout'){await request('logout');api.clear();snapshot=null;confirmedSnapshot=null;pending=null;lastCash=null;modal.close();return renderLogin();}
  if(action==='tutorial')return tutorial(true);
  if(action==='tutorialNext')return await tutorialNext();
  if(action==='tutorialPrevious'){tutorialStep=Math.max(0,tutorialStep-1);return showTutorial();}
  if(action==='tutorialReturn')return showTutorial();
  if(action==='tutorialInstall')return installApp((title,body)=>showModal(title,body+view.button('안내로 돌아가기','tutorialReturn','','primary wide')));
  if(action==='firstGrant')return await collectAttendance(target,true);
  if(action==='attendance')return showAttendance();
  if(action==='attendanceClaim')return await collectAttendance(target,false);
  if(action==='finishTutorial'){if(!tutorialReplay)await mutate('tutorial');modal.close();dismissInstall();return;}
  if(['pin','reset','deleteAccount','report','notifications'].includes(action))return settingsForm(action);
  if(action==='terms'){showModal('주식 용어',Object.keys(terms).map(name=>view.button(e(name),'term',`data-name="${e(name)}"`,'wide')).join(''));return;}
  if(action==='term')return help(target.dataset.name);
  if(action==='install')return installApp(showModal);
  if(action==='backup'){const r=await request('backup'),url=URL.createObjectURL(new Blob([JSON.stringify(r.backup,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='주식왕_백업_'+stamp(snapshot.serverTime).slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return toast('PIN과 인증값을 제외한 백업을 내보냈습니다.');}
  if(action==='restore'){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>500000)throw new Error('백업 파일이 너무 큽니다.');await mutate('restore',{backup:JSON.parse(await file.text())});toast('서버 최신 기록과 백업을 검증했습니다.');}catch(error){failure(error);}};input.click();return;}
 }catch(error){failure(error);}
});
document.addEventListener('input',event=>{lastInput=Date.now();if(event.target.closest('#trade-form'))estimate();if(event.target.closest('#settings-form')&&event.target.type==='range')savePreferences({[event.target.name]:Number(event.target.value)});if(event.target.id==='search'){filter.search=event.target.value;if(!event.isComposing)updateSearch();}});
document.addEventListener('compositionend',event=>{if(event.target.id==='search'){filter.search=event.target.value;updateSearch();}});
document.addEventListener('change',event=>{if(event.target.id==='friend-rank'){void friendsUI.loadRank(event.target.value).catch(failure);return;}if(event.target.closest('#settings-form')&&event.target.type!=='range'){const input=event.target;savePreferences({[input.name]:input.type==='checkbox'?input.checked:Number(input.value)});}if(event.target.id==='sort'){filter.sort=event.target.value;render();}if(event.target.id==='favorites'){filter.favorites=event.target.checked;render();}});
document.addEventListener('submit',async event=>{
 event.preventDefault();const form=event.target,fd=new FormData(form),data=Object.fromEntries(fd);const submit=form.querySelector('button[type=submit],button:not([type])');if(submit)submit.disabled=true;
 try{
  if(form.id==='chat-message-form')return await chats.send(form);
  if(form.id==='chat-create-form')return await chats.create(form);
  if(form.id.startsWith('friend-'))return await friendsUI.submit(form,fd);
  if(form.id.startsWith('admin-'))return await admin.submit(form,fd);
  if(form.id==='auth-form'){
    if(form.dataset.mode==='signup'&&data.pin!==data.pinConfirm)throw new Error('비밀번호 확인이 일치하지 않아요.');
    if(!/^[가-힣]{2,12}$/.test(data.name.normalize('NFC')))throw new Error('아이디는 완성형 한글 2~12자로 입력해 주세요.');
    startLoading('계정 확인 · 투자 기록 불러오는 중');
    try{const credentials={name:data.name.normalize('NFC'),pin:data.pin,remember:fd.has('remember'),consent:fd.has('consent'),adminSecret:data.adminSecret||'',requestId:crypto.randomUUID()};let r=await request(form.dataset.mode,credentials);
    if(r.loginConflict){finishLoading();const accepted=await confirmLoginReplacement();if(!accepted){renderLogin('로그인을 취소했습니다. 기존 접속은 유지됩니다.');return;}startLoading('이전 접속 종료 · 로그인 중');r=await request('login',{...credentials,takeover:true});}
    api.save(r.token,fd.has('remember'));api.adminToken=r.adminToken||'';apply(r.snapshot);page='home';render();if(!snapshot.account.tutorial)tutorial();else if(snapshot.attendance?.visible&&!snapshot.attendance.claimed)showAttendance();else {welcomeSummary();if(!modal.open)installAfterLogin();}}
    catch(error){renderLogin(error.message);}finally{finishLoading();}return;
  }
  if(form.id==='trade-form'){
    const id=form.dataset.symbol,quantity=Number(data.quantity);if(!Number.isSafeInteger(quantity)||quantity<1)throw new Error('수량은 1주 단위로 입력해 주세요.');
    if(form.dataset.reserve==='true'){const req={symbol:id,quantity,kind:data.kind,price:Number(data.price),stop:Number(data.stop),expiryDays:Number(data.expiryDays)};showModal('예약 내용 확인',`<p>${e(snapshot.stocks.find(x=>x.id===id).name)} · ${quantity}주</p><p>조건가 ${money(req.price)}${req.kind==='oco'?' / 손절 '+money(req.stop):''}</p><p class="footnote">확정 시 필요한 현금 또는 수량을 확보합니다.</p><form id="confirm-order-form"><button type="submit" class="primary wide">예약 등록 확정</button></form>`);$('#confirm-order-form')._order=req;}
    else {
      let payload={symbol:id,side:form.dataset.side,quantity,memo:data.memo};
      if(form._offer){if(snapshot.serverTime+Date.now()-receivedAt>=form._offer.expires){await sync(false);throw new Error('시세를 갱신했어요. 가격을 확인하고 다시 눌러 주세요.');}payload.offer=form._offer;}
      else {const q=await request('quote',payload);payload={quoteId:q.quote.id,memo:data.memo};}
      const r=await mutate('trade',payload);sound.effect();showModal('거래 영수증',view.receipt(r.receipt));
    }return;
  }
  if(form.id==='confirm-trade-form'){const r=await mutate('trade',form._quote);sound.effect();return showModal('거래 영수증',view.receipt(r.receipt));}
  if(form.id==='confirm-order-form'){await mutate('order',form._order);modal.close();await navigate('orders');return toast('예약 주문을 등록했습니다.');}
  if(form.id==='price-alert-form'){await mutate('priceAlert',{symbol:form.dataset.symbol,price:Number(data.price),direction:data.direction});modal.close();return toast('목표가를 등록했습니다.');}
  if(form.id==='settings-form'){savePreferences({bgm:Number(data.bgm),sfx:Number(data.sfx),terms:fd.has('terms')});return toast('설정을 반영했어요.');}
  if(form.id==='notifications-form'){modal.close();savePreferences({notifications:Object.fromEntries((snapshot.notificationOptions||[]).map(o=>[o.id,fd.has(o.id)]))});return toast('알림 설정을 반영했어요.');}
  if(form.id==='pin-form'){await mutate('pin',data);api.clear();snapshot=null;confirmedSnapshot=null;modal.close();renderLogin('PIN이 변경되었습니다. 다시 로그인해 주세요.');return;}
  if(form.id==='account-lifecycle-form'){const action=form.dataset.operation,id=snapshot.account.id;await mutate(action,{pin:data.pin,confirm:fd.has('confirm')});finishAccountLifecycle(action,id);return;}
  if(form.id==='report-form'){await mutate('report',{...data,environment:'v'+VERSION+' '+navigator.userAgent.slice(0,250)});modal.close();return toast('제출했습니다. 운영자가 확인할 수 있습니다.');}
 }catch(error){failure(error);}finally{if(submit)submit.disabled=false;}
});
function welcomeSummary(){try{const key='king-last-'+snapshot.account.id,old=JSON.parse(localStorage.getItem(key)||'null');if(old&&old.runId===snapshot.account.runId&&snapshot.serverTime-old.at>1800000){showModal('다시 오신 것을 환영해요',`<p>지난 확인 이후 총자산 ${money(snapshot.total-old.total)} 변동</p><p>받을 배당·분배금 ${money(snapshot.dividends)}</p><p>예약 체결 ${snapshot.orders.filter(o=>o.status==='체결'&&o.closed>old.at).length}건</p><p>새 뉴스 ${snapshot.news.filter(n=>n.at>old.at).length}건</p>${view.button('내 기록 자세히 보기','records','','wide')}`);}localStorage.setItem(key,JSON.stringify({at:snapshot.serverTime,total:snapshot.total,runId:snapshot.account.runId}));}catch{}}
async function boot(){
 if(api.token){startLoading('로그인 확인 · 최신 시세 불러오는 중');await sync(false);finishLoading();if(snapshot){const [next,id]=location.hash.slice(1).split('/');if(['home','news','market','assets','settings','total','orders','inbox','rewards','achievements','economy','detail'].includes(next)){page=next;symbol=id;}render();welcomeSummary();if(!snapshot.account.tutorial)tutorial();else if(snapshot.attendance?.visible&&!snapshot.attendance.claimed)showAttendance();return;}if(!$('#auth-form'))renderLogin('다시 로그인해 주세요.');return;}
 renderLogin();try{const status=await api.status();serverStatus=status.maintenance.enabled?'점검 중: '+status.maintenance.reason:'';}catch{serverStatus='서버 연결을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.';}
 if(!snapshot&&$('#auth-status')){$('#auth-status').textContent=serverStatus;$('#auth-status').hidden=!serverStatus;}
}
document.addEventListener('visibilitychange',()=>{sound.visibility(!document.hidden);if(!document.hidden)sync();});window.addEventListener('online',()=>sync());window.addEventListener('offline',()=>connection('오프라인입니다. 거래 확정이 중지됩니다.'));
['pointerdown','keydown','scroll'].forEach(name=>document.addEventListener(name,()=>lastInput=Date.now(),{passive:true}));
window.addEventListener('hashchange',()=>{const [next,id]=location.hash.slice(1).split('/');if(snapshot&&next&&next!==page){page=next;if(id)symbol=id;render();}});
function countdownSeconds(){return Math.max(0,60-Math.floor(((snapshot.serverTime%60000)+Date.now()-receivedAt)/1000));}
setInterval(()=>{if(snapshot&&!document.hidden){const el=$('#countdown');if(el)el.textContent=countdownSeconds()+'초';}},1000);
setInterval(()=>{void sync();if(page==='chat'&&api.token&&!document.hidden&&!busy)void chats.refresh(false,true).catch(error=>{const el=$('#chat-status');if(el)el.textContent=error.message;});},15000);prepareInstall();boot();
