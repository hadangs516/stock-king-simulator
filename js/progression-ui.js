import {escape as e,money} from './format.js';
import {button} from './views.js';
export function tutorialPage(s,step,replay=false){
 const paid=s.attendance?.firstGranted??true;
 const pages=[
  `<h3>${e(s.account.name)}님! 만나서 반가워요.</h3>`,
  `<h3>첫 접속 보상으로 1,000,000원을 드려요.</h3><p class="welcome-wallet">내 현금 <strong id="welcome-cash">${money(s.account.cash)}</strong></p><div class="welcome-coins" aria-hidden="true">₩</div><p id="welcome-grant">${paid?'수령 완료':button('받기','firstGrant','','primary wide')}</p>`,
  '<h3>매일 출석하고 보상을 받아요!</h3><p>꾸준히 출석하면 더 많은 보상을 받을 수 있어요.</p>',
  '<h3>뉴스를 살펴보고 마음에 드는 기업을 찾아보세요.</h3>',
  '<h3>가볍게 즐기는 가상 투자</h3><p>게임의 주가와 사건은 현실과 달라요. 게임머니는 실제 현금으로 바꿀 수 없어요.</p>',
  '<h3>나만의 투자를 시작해요!</h3><p>기업의 주식과 ETF를 사고팔 수 있어요. 모든 플레이어가 같은 시장에서 투자해요.</p>',
  '<h3>친구와 함께 즐겨요!</h3><p>프로필을 꾸미고 친구와 투자 이야기를 나눠 보세요.</p>',
  `<h3>게임을 시작하기 전!</h3><p>앱을 설치하면 더 편하게 접속할 수 있어요.</p>${button('설치하기','tutorialInstall','','wide')}`,
  '<h3>준비됐어요. 게임을 시작해 볼까요?</h3>'
 ];
 const icons=['shortcut-gift-object','coin-transparent','calendar-transparent','book-transparent','info-transparent','book-transparent','support-transparent','account-transparent','shortcut-chest-object'];
 const coinPage=pages[step].replace('<div class="welcome-coins" aria-hidden="true">₩</div>','<div class="welcome-coins" aria-hidden="true"><img src="./assets/ui/reference/coin-transparent.webp" alt=""></div>');
 return `<section class="onboarding"><p class="eyebrow">첫 접속 안내 · ${step+1} / 9${replay?' · 다시 보기':''}</p><div class="tutorial-steps" aria-hidden="true">${pages.map((_,i)=>`<i class="${i<step?'done':i===step?'current':''}"></i>`).join('')}</div><div class="tutorial-content">${step===1?'':`<img class="tutorial-art" src="./assets/ui/reference/${icons[step]}.webp" alt="">`}${coinPage}</div><div class="row">${step?button('이전','tutorialPrevious','','grow'):''}${step===1&&!paid?'':button(step===8?'게임 시작':step===7?'나중에 설치하기':'다음',step===8?'finishTutorial':'tutorialNext','','primary grow')}</div></section>`;
}
export function attendancePage(s){
 const a=s.attendance;if(!a)return '<p>서버 업데이트 후 출석을 이용할 수 있어요.</p>';
 const start=Math.floor((a.nextDay-1)/30)*30+1,history=a.streak?a.history.slice(-a.streak):[],first=a.firstGranted===false||history.some(h=>h.day===1&&h.amount===1000000);
 return `<div class="attendance-scene" role="group" aria-label="출석 보상 · 연속 ${a.streak}일 · ${Math.floor((a.nextDay-1)/30)+1}회차"><div class="attendance-frame" aria-hidden="true"></div><img class="attendance-art" src="./assets/ui/reference/attendance-title-transparent.webp" width="941" height="378" alt="출석 체크. 매일 처음 접속하면 보상을 받을 수 있어요!"><div class="attendance-grid">${Array.from({length:30},(_,i)=>{
  const day=start+i,cycleDay=i+1,done=history.some(h=>h.day===day),today=day===a.nextDay,amount=day===1&&first?1000000:cycleDay===30?3000000:cycleDay%7===0?500000:100000;
  const kind=amount>=1000000?'bonus':cycleDay%7===0?'weekly':today&&!done?'today':'ordinary';
  return `<div class="attendance-day ${kind} ${done?'claimed':''} ${today?'current':''}" aria-label="${cycleDay}일차 ${money(amount)}${done?' 수령 완료':today?' 오늘':''}"><img src="./assets/ui/reference/attendance-${kind}.webp" alt=""><strong aria-hidden="true">${cycleDay}</strong><span class="attendance-amount ${amount===3000000?'override':'sr-label'}">${money(amount)}</span>${done?'<small>수령 완료</small>':''}</div>`;
 }).join('')}</div><img class="attendance-footer-art" src="./assets/ui/reference/attendance-footer-transparent.webp" width="941" height="218" alt="">${a.claimed?'<button type="button" class="attendance-received" data-action="close" aria-label="수령 완료 · 출석창 닫기"><span>수령 완료</span></button>':button('<span class="sr-label">받기</span>','attendanceClaim',`aria-label="출석 보상 ${money(a.amount)} 받기"`,'attendance-receive')}</div>`;
}
export function growthCard(g){return g?`<section class="growth-card"><div class="row spread"><strong>Lv. ${g.level}</strong><span>${g.xp.toLocaleString('ko-KR')} XP</span></div><progress max="${g.required}" value="${g.progress}" aria-label="다음 레벨까지 경험치"></progress><small>다음 레벨까지 ${(g.required-g.progress).toLocaleString('ko-KR')} XP</small></section>`:'';}
