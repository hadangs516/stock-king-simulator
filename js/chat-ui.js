import {escape as e,stamp} from './format.js';
import {button} from './views.js';
export class ChatUI {
 constructor(hooks){this.hooks=hooks;this.owner='';this.key='';this.messages=[];this.drafts=new Map();this.before=null;this.sending=new Set();}
 context(){return this.hooks.context();}
 cached(name){return this.hooks.cache?.read(this.hooks.owner?.(),name);}
 save(){if(!this.mode?.startsWith('admin'))this.hooks.cache?.write(this.hooks.owner?.(),'chat:'+this.mode+':'+this.id,{messages:this.messages,before:this.before});}

 rememberDraft(){const form=document.querySelector('#chat-message-form');if(form?.dataset.key===this.key)this.drafts.set(this.key,form.elements.body.value);}
 async open(mode,id,title){
  this.rememberDraft();if(this.owner!==this.context()){this.owner=this.context();this.drafts.clear();}
  this.mode=mode;this.id=id;this.title=title;this.key=this.context()+'|'+mode+'|'+id;const cached=mode.startsWith('admin')?null:this.cached('chat:'+mode+':'+id);this.messages=cached?.messages||[];this.before=cached?.before||null;
  await this.hooks.navigate('chat');for(const m of this.messages.filter(m=>m.pending&&!m.blocked))void this.deliver(m);await this.refresh();
 }
 async list(admin=false){
  this.rememberDraft();this.listAdmin=admin;this.conversations=admin?[]:this.cached('support-list')||[];const context=this.context(),request={};this.listRequest=request;
  await this.hooks.navigate('support');
  const result=await this.hooks.read(admin?'adminSupportList':'supportList');if(context!==this.context()||this.listRequest!==request||!this.hooks.isSupport())return;
  this.conversations=result.conversations;if(!admin)this.hooks.cache?.write(this.hooks.owner?.(),'support-list',this.conversations);await this.hooks.navigate('support');
 }
 listView(){return `${button('돌아가기',this.listAdmin?'admin':'settings','','back')}<div class="page-head"><h2>${this.listAdmin?'고객센터 문의':'고객센터'}</h2>${this.listAdmin?'':button('새 채팅','chatNew','','primary')}</div><p class="footnote">문의별로 대화를 이어가세요. 답변은 이 화면에서 확인할 수 있습니다.</p><div class="list">${(this.conversations||[]).map(c=>button(`<strong>${e(c.category)}${c.nickname?' · '+e(c.nickname):''}</strong><span>${e(c.preview)}</span><small>${stamp(c.at,true)}${c.unread?' · 새 답변 '+c.unread:''}</small>`,'chatSupport',`data-id="${e(c.id)}" data-title="${e(c.category)}"`,'conversation-card')).join('')||'<p class="empty">아직 문의가 없어요.</p>'}</div>`;}
 newConversation(){this.hooks.modal('새 문의',`<form id="chat-create-form"><label>문의 종류<select name="category"><option>오류·버그</option><option>기능 제안</option><option>이용 질문</option><option>기타</option></select></label><label>첫 메시지<textarea name="body" maxlength="2000" rows="5" required placeholder="문의 내용을 적어 주세요."></textarea></label><button type="submit" class="primary wide">대화 시작</button></form>`);}
 async create(form){const context=this.context(),r=await this.hooks.call('supportCreate',{category:form.elements.category.value,body:form.elements.body.value});if(context!==this.context())return;this.hooks.close();await this.open('support',r.conversation.id,r.conversation.category);}
 render(){
  const main=document.querySelector('#main'),form=document.querySelector('#chat-message-form');
  if(form?.dataset.key!==this.key){main.innerHTML=`${button('대화 목록','chatBack','','back')}<div class="page-head"><h2>${e(this.title)}</h2><span class="tag">${this.mode==='friend'?'친구 대화':'고객센터'}</span></div><p id="chat-status" class="footnote" role="status"></p><section id="chat-messages" class="chat-messages" role="log" aria-label="대화 메시지"></section><form id="chat-message-form" data-key="${e(this.key)}"><label for="chat-body" class="sr-label">메시지</label><textarea id="chat-body" name="body" rows="3" maxlength="2000" required placeholder="메시지를 입력하세요"></textarea><div class="row spread"><small>Enter는 줄바꿈 · 최대 2,000자</small><button type="submit" class="primary">전송</button></div></form>`;
   const input=document.querySelector('#chat-body');input.value=this.drafts.get(this.key)||'';input.addEventListener('compositionstart',()=>input.dataset.composing='true');input.addEventListener('compositionend',()=>delete input.dataset.composing);
  }
  this.paint();
 }
 paint(){if(typeof document==='undefined')return;const el=document.querySelector('#chat-messages');if(!el)return;const bottom=el.scrollHeight-el.scrollTop-el.clientHeight<60,old=el.scrollHeight;
  const content=(this.before?button('이전 메시지','chatOlder','','wide'):'')+this.messages.map(m=>`<article class="message ${m.mine?'mine':'theirs'}" data-message-id="${e(m.id)}"><small>${m.mine?'나':m.role==='admin'?'관리자':this.mode==='friend'?e(this.title):'플레이어'}</small><p>${e(m.body)}</p><time>${stamp(m.at,true)}</time>${m.pending?`<small class="message-sending">${m.blocked?'전송 실패':m.failed?'연결 대기 · 다시 전송할게요':'전송중'}</small>${m.blocked?button('다시 보내기','chatRetry',`data-request-id="${e(m.requestId)}"`,'link-button'):''}`:m.confirmedUntil>Date.now()?'<small class="message-sent">전송완료</small>':''}</article>`).join('');
  if(el.innerHTML!==content){el.innerHTML=content;if(this.prepending)el.scrollTop+=el.scrollHeight-old;else if(bottom)el.scrollTop=el.scrollHeight;}this.prepending=false;
 }
 payload(){return this.mode==='friend'?{friendId:this.id}:{conversationId:this.id};}
 async refresh(older=false,background=false){
  if(!this.hooks.isChat()||!this.id)return;const key=this.key,context=this.context(),action=this.mode==='friend'?'friendMessages':this.mode==='adminSupport'?'adminSupportRead':'supportRead';
  const r=await this.hooks.read(action,{...this.payload(),...(older?{before:this.before}:{})},background);if(key!==this.key||context!==this.context()||!this.hooks.isChat())return;
  const known=new Set(this.messages.filter(m=>!m.pending).map(m=>m.id)),overlap=r.messages.some(m=>known.has(m.id));
  const all=older?[...r.messages,...this.messages]:[...this.messages,...r.messages];this.messages=[...new Map(all.map(m=>[m.id,m])).values()].sort((a,b)=>a.at-b.at);
  if(older||!known.size||!overlap&&r.before)this.before=r.before;this.prepending=older;this.save();this.render();
 }
 async send(form){
  const input=form.elements.body;if(input.dataset.composing==='true'||!input.value.trim())return;
  const message={id:'local-'+crypto.randomUUID(),requestId:crypto.randomUUID(),body:input.value,at:Date.now(),mine:true,pending:true};
  this.messages.push(message);input.value='';this.drafts.delete(this.key);this.save();this.paint();await this.deliver(message);
 }
 async deliver(message){
  if(this.sending.has(message.requestId))return;this.sending.add(message.requestId);
  const key=this.key,context=this.context(),owner=this.hooks.owner?.(),mode=this.mode,id=this.id;
  const action=mode==='friend'?'friendSend':mode==='adminSupport'?'adminSupportSend':'supportSend';
  try{
   const r=await this.hooks.call(action,{...this.payload(),body:message.body,requestId:message.requestId});
   if(context!==this.context())return;
   message.id=r.sent;message.pending=false;message.failed=false;message.confirmedUntil=Date.now()+1000;
   if(key===this.key){this.messages=[...new Map(this.messages.map(m=>m.requestId===message.requestId?message:m).map(m=>[m.id,m])).values()];this.save();if(this.hooks.isChat?.())this.paint();const timer=setTimeout(()=>{if(key===this.key&&this.hooks.isChat?.())this.paint();},1000);timer.unref?.();}
   else if(!mode.startsWith('admin')){const name='chat:'+mode+':'+id,cached=this.hooks.cache?.read(owner,name);if(cached){cached.messages=cached.messages.map(m=>m.requestId===message.requestId?message:m);this.hooks.cache.write(owner,name,cached);}}
  }catch(error){
   if(context!==this.context())return;message.failed=true;message.blocked=!!error.definitive;
   if(key===this.key){this.save();if(this.hooks.isChat?.())this.paint();}
   // Keep the same request id after an ambiguous response; never duplicate a sent message.
   if(!error.definitive&&!error.loginRequired){const timer=setTimeout(()=>{if(key===this.key&&context===this.context())void this.deliver(message);},10000);timer.unref?.();}
  }finally{this.sending.delete(message.requestId);}
 }
 async retry(requestId){const m=this.messages.find(m=>m.requestId===requestId);if(!m)return;if(m.blocked)m.requestId=crypto.randomUUID();m.blocked=false;m.failed=false;this.save();this.paint();await this.deliver(m);}
 async retried(body){const input=document.querySelector('#chat-body');if(input?.value===body)input.value='';await this.refresh();}
}
