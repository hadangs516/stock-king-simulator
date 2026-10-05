import {escape as e,money,percent} from './format.js';
import {button} from './views.js';
const fields={cash:'현금',total:'총자산',holdings:'주식 보유 현황',day:'현재 DAY',playTime:'플레이 시간',roi:'수익률',level:'레벨·경험치'};
export class FriendsUI {
 constructor(hooks){this.hooks=hooks;this.data=null;this.results=[];this.metric='roi';this.ranking=null;}
 async load(){const context=this.hooks.context(),r=await this.hooks.read('friends');if(context!==this.hooks.context())return;this.data=r;if(r.profile.friendId)await this.loadRank(this.metric,false);if(context!==this.hooks.context())return;this.hooks.render();}
 async loadRank(metric,paint=true){const context=this.hooks.context();this.metric=metric;const r=await this.hooks.read('friendRanking',{metric});if(context!==this.hooks.context()||metric!==this.metric)return;this.ranking=r;if(paint){const el=document.querySelector('#friend-ranking');if(el)el.innerHTML=this.rankView();}}
 rankView(){return (this.ranking?.rows||[]).map(r=>`<div class="friend-stat"><span>${r.rank===null?'—':r.rank+'위'} · ${e(r.nickname)}${r.self?' (나)':''}</span><strong>${r.value===null?'해당 정보 없음':this.metric==='roi'?percent(r.value):this.metric==='level'?'Lv. '+r.value.level+' · '+r.value.xp+' XP':this.metric==='playTime'?Math.floor(r.value/60)+'분':money(r.value)}</strong></div>`).join('')||'<p>순위를 불러오는 중이에요.</p>';}
 card(p){return `<div class="friend-card"><strong>${e(p.nickname)}</strong><div class="row">${p.relationship==='friend'?button('공개 정보','friendProfile',`data-friend-id="${e(p.friendId)}"`)+button('메시지','chatFriend',`data-id="${e(p.friendId)}" data-title="${e(p.nickname)}"`):p.relationship==='received'?button('수락','friendAccept',`data-friend-id="${e(p.friendId)}"`)+button('거절','friendDecline',`data-friend-id="${e(p.friendId)}"`):p.relationship==='sent'?'<span class="tag">요청 중</span>':button('친구 추가','friendRequest',`data-friend-id="${e(p.friendId)}"`)}${['sent','friend'].includes(p.relationship)?button(p.relationship==='sent'?'요청 취소':'친구 삭제','friendRemove',`data-friend-id="${e(p.friendId)}"`,'link-button'):''}</div></div>`;}
 view(){
  if(!this.data)return `${button('돌아가기','home','','back')}<h2>친구</h2><p class="empty">친구 목록 불러오는 중</p>`;
  const {profile,friends}=this.data;
  return `${button('돌아가기','home','','back')}<div class="page-head"><h2>친구</h2>${button('새로고침','friendRefresh')}</div><section class="card"><form id="friend-search-form"><label for="friend-search">닉네임으로 친구 찾기</label><div class="row"><input id="friend-search" name="query" minlength="2" maxlength="20" required placeholder="닉네임 입력"><button type="submit">검색</button></div></form><div id="friend-results">${this.results.map(p=>this.card(p)).join('')}</div></section><section class="card"><h3>친구끼리 순위</h3><label>비교 기준<select id="friend-rank">${Object.entries({roi:'수익률',total:'총자산',level:'레벨·경험치',playTime:'플레이 시간'}).map(([id,title])=>`<option value="${id}" ${id===this.metric?'selected':''}>${title}</option>`).join('')}</select></label><div id="friend-ranking">${this.rankView()}</div><p class="footnote">나와 수락한 친구를 같은 시점에 비교합니다. 수익률은 출석·운영 지원 자금을 제외하며 비공개 항목에는 순위를 매기지 않습니다.</p></section><section class="section"><h3>내 친구 · ${friends.filter(p=>p.relationship==='friend').length}</h3>${friends.filter(p=>p.relationship==='friend').map(p=>this.card(p)).join('')||'<p class="empty">닉네임으로 친구를 찾아보세요.</p>'}</section><section class="section"><h3>친구 요청</h3>${friends.filter(p=>p.relationship!=='friend').map(p=>this.card(p)).join('')||'<p class="empty">대기 중인 요청이 없어요.</p>'}</section><details class="card"><summary>내 닉네임과 공개 항목</summary><form id="friend-settings-form"><label for="friend-nickname">친구에게 보일 닉네임</label><input id="friend-nickname" name="nickname" minlength="2" maxlength="20" value="${e(profile.nickname)}" required><p class="footnote">처음 닉네임은 아이디와 같아요.<br>바꾸면 친구에게 아이디는 따로 보이지 않아요.</p>${Object.entries(fields).map(([k,v])=>`<label class="check"><input name="${k}" type="checkbox" ${profile.sharing[k]?'checked':''}>${v} 공개</label>`).join('')}<button type="submit" class="primary wide">저장</button></form></details>`;
 }
 async action(action,target){
  const friendId=target.dataset.friendId,context=this.hooks.context();
  if(action==='friendRefresh')return this.load();
  if(action==='friendProfile'){
   const {friend:p}=await this.hooks.read('friendProfile',{friendId});if(context!==this.hooks.context())return;const v=p.shared;
   const content=Object.entries(fields).filter(([k])=>k in v).map(([k,title])=>k==='holdings'?`<section class="card"><h3>${title}</h3>${v.holdings.map(h=>`<p>${e(h.name)} · ${h.quantity}주<br><span class="muted">${money(h.value)}</span></p>`).join('')||'<p>보유 종목이 없어요.</p>'}</section>`:`<div class="friend-stat"><span>${title}</span><strong>${v[k]===null?'해당 정보 없음':k==='roi'?percent(v[k]):k==='level'?'Lv. '+v[k].level+' · '+v[k].xp+' XP':k==='day'?'DAY '+v[k]:k==='playTime'?Math.floor(v[k]/60)+'분':money(v[k])}</strong></div>`).join('');
   return this.hooks.modal(p.nickname,content||'<p>아직 공개한 항목이 없어요.</p>');
  }
  if(action==='friendRemove'){this.hooks.modal('친구 관계를 해제할까요?',`<p>서로의 공개 정보를 더 이상 볼 수 없어요.</p>${button('해제','friendConfirmRemove',`data-friend-id="${e(friendId)}"`,'wide primary')}`);return;}
  const name=action==='friendAccept'||action==='friendDecline'?'friendRespond':action==='friendConfirmRemove'?'friendRemove':action;
  const r=await this.hooks.call(name,{friendId,accept:action==='friendAccept'});if(context!==this.hooks.context())return;this.data=r;this.results=[];await this.loadRank(this.metric,false);if(context!==this.hooks.context())return;this.hooks.close();this.hooks.render();
 }
 async submit(form,fd){
  const context=this.hooks.context();
  if(form.id==='friend-search-form'){const r=await this.hooks.read('friendSearch',{query:fd.get('query')});if(context!==this.hooks.context())return;this.results=r.results;const el=document.querySelector('#friend-results');if(el)el.innerHTML=this.results.map(p=>this.card(p)).join('')||'<p class="empty">검색 결과가 없어요.</p>';return;}
  const sharing=Object.fromEntries(Object.keys(fields).map(k=>[k,fd.has(k)])),r=await this.hooks.call('friendSettings',{nickname:fd.get('nickname'),sharing});if(context!==this.hooks.context())return;this.data=r;await this.loadRank(this.metric,false);if(context!==this.hooks.context())return;this.hooks.render();this.hooks.toast('친구 프로필을 저장했어요.');
 }
}
