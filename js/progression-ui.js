import {escape as e,money} from './format.js';
import {button} from './views.js';
export function tutorialPage(s,step,replay=false){
 const paid=s.attendance?.firstGranted??true;
 const pages=[
  `<h3>${e(s.account.name)}님! 만나서 반가워요.</h3>`,
  `<h3>첫 접속 보상으로 1,000,000원을 드려요.</h3><p class="welcome-wallet">내 현금 <strong id="welcome-cash">${money(s.account.cash)}</strong></p><div class="welcome-coins" aria-hidden="true">₩</div><p id="welcome-grant">${paid?'수령 완료':button('받기','firstGrant','','primary wide')}</p>`,
  '<h3>앞으로도 연속 출석하면 보상을 드릴게요!</h3><p>매일 100,000원, 보상표의 7·14·21·28일차에 500,000원을 드려요.<br>연속 출석 30일차에는 3,000,000원을 드려요.</p><p>30일 보상표는 반복돼요. 출석이 끊기면 1일차부터 다시 시작하고, 첫 접속 100만 원은 다시 지급되지 않아요.</p>',
  '<h3>시작 전, 간단하게 게임에 대한 설명하고 넘어갈게요.</h3>',
  '<h3>주의 사항!</h3><p>이 게임은 주식 투자를 직접 해보는 게임이에요. 용어·세금·수수료처럼 현실을 반영한 요소도 있지만 실제와 다른 점이 많아요.</p><p>여기서 투자를 잘한다고 현실에서도 잘한다는 보장은 없어요. 번 돈은 실제 현금과 교환할 수 없어요.</p><p>주가는 현실 주가와 무관해요. 현실에서 오른다고 게임에서 오르지 않으며 반대도 마찬가지예요.</p>',
  '<h3>이 게임은 이래요!</h3><p>그날그날 뉴스를 읽고 투자 상품을 골라요. 상장 기업 주식을 구매하고 코스피·코스닥과 ETF를 거래해요. ETF는 DAY 4부터 열려요.</p><p>다른 사람과 경쟁할 수 있도록 모든 사람의 주가가 연동되어 같은 시간에 같은 만큼 오르고 내려요. 주가는 매분 변해요.</p>',
  '<h3>궁금한 점이 있나요?</h3><p>게임 중 궁금한 점, 오류·버그, 새 기능 제안은 설정의 고객센터에서 문의를 작성하면 관리자가 확인 후 답변해요.</p>',
  `<h3>게임을 시작하기 전!</h3><p>자주 접속해야 더 유리해요. 편하게 접속할 수 있도록 앱을 설치해 보세요.</p><p>지금 설치하지 않아도 언제든 설정에서 설치할 수 있어요. 설치 후 삭제해도 불이익은 없어요.</p>${button('설치하기','tutorialInstall','','wide')}`,
  '<h3>모든 설명이 끝났어요. 이제 바로 게임 시작할게요!</h3>'
 ];
 return `<section class="onboarding"><p class="eyebrow">첫 접속 안내 · ${step+1} / 9${replay?' · 다시 보기':''}</p><div class="tutorial-content">${pages[step]}</div><div class="row">${step?button('이전','tutorialPrevious','','grow'):''}${step===1&&!paid?'':button(step===8?'게임 시작':step===7?'나중에 설치하기':'다음',step===8?'finishTutorial':'tutorialNext','','primary grow')}</div></section>`;
}
export function attendancePage(s){
 const a=s.attendance;if(!a)return '<p>서버 업데이트 후 출석을 이용할 수 있어요.</p>';
 const start=Math.floor((a.nextDay-1)/30)*30+1,history=a.streak?a.history.slice(-a.streak):[],first=history.some(h=>h.day===1&&h.amount===1000000);
 return `<div class="attendance-heading"><strong>매일 만나는 출석 선물</strong><span>연속 ${a.streak}일 · ${Math.floor((a.nextDay-1)/30)+1}회차</span></div><div class="attendance-grid">${Array.from({length:30},(_,i)=>{const day=start+i,cycleDay=i+1,done=history.some(h=>h.day===day),amount=day===1&&first?1000000:cycleDay===30?3000000:cycleDay%7===0?500000:100000;return `<div class="attendance-day ${done?'claimed':''} ${day===a.nextDay?'today':''}"><strong>${cycleDay}일차</strong><span>${amount===1000000?'100만':amount===3000000?'300만':amount===500000?'50만':'10만'}원</span><small>${done?'수령 완료':day===a.nextDay?'오늘':'출석 보상'}</small></div>`;}).join('')}</div>${a.claimed?'<p class="success">오늘 보상을 받았어요. 내일 다시 만나요!</p>':button(money(a.amount)+' 받기','attendanceClaim','','primary wide')}<p class="footnote">한국 시간 자정 갱신 · 미출석 시 1일차부터<br>7일마다 50만 원 · 30일마다 300만 원 · 첫 보상 100만 원은 1회</p>`;
}
export function growthCard(g){return g?`<section class="growth-card"><div class="row spread"><strong>Lv. ${g.level}</strong><span>${g.xp.toLocaleString('ko-KR')} XP</span></div><progress max="${g.required}" value="${g.progress}" aria-label="다음 레벨까지 경험치"></progress><small>다음 레벨까지 ${(g.required-g.progress).toLocaleString('ko-KR')} XP · 하루 최대 100 XP</small></section>`:'';}
