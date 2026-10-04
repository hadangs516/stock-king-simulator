// Original 16-bar instrumental: soft keys, bass and a light beat. No third-party recording.
let audioContext,musicGain,effectGain,musicTimer,step=0,nextBeat=0,lastTap=0,settings={bgm:0,sfx:.3},activated=false,visible=true;
const beat=60/94/2;
const harmony=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65],[60,64,67,71],[57,60,64,67],[62,65,69,72],[55,59,62,67]];
const melody=[[76,0,79,0,83,81,79,76],[76,0,72,74,76,0,79,0],[77,0,76,72,69,0,72,76],[74,0,71,74,79,0,77,74],[79,0,83,0,84,83,79,76],[76,0,79,81,79,76,72,0],[77,0,81,79,77,74,72,74],[79,0,77,74,71,0,72,0]];
function note(midi,at,duration,volume,type='sine',bus=musicGain){
 if(!audioContext||!bus)return;const osc=audioContext.createOscillator(),env=audioContext.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);
 env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(volume,at+.012);env.gain.exponentialRampToValueAtTime(.00001,at+duration);osc.connect(env);env.connect(bus);osc.start(at);osc.stop(at+duration+.03);osc.onended=()=>{osc.disconnect();env.disconnect();};
}
function percussion(at,kick){const osc=audioContext.createOscillator(),env=audioContext.createGain();osc.type=kick?'sine':'triangle';osc.frequency.setValueAtTime(kick?130:1800,at);osc.frequency.exponentialRampToValueAtTime(kick?45:350,at+.07);env.gain.setValueAtTime(kick?.13:.012,at);env.gain.exponentialRampToValueAtTime(.00001,at+(kick?.16:.04));osc.connect(env);env.connect(musicGain);osc.start(at);osc.stop(at+.2);osc.onended=()=>{osc.disconnect();env.disconnect();};}
function schedule(){
 if(!audioContext||audioContext.state!=='running')return;
 while(nextBeat<audioContext.currentTime+.12){
  if(nextBeat<audioContext.currentTime-.2)nextBeat=audioContext.currentTime+.02;
  const bar=Math.floor(step/8)%16,index=step%8,chord=harmony[bar%8],line=melody[bar%8];
  if(index===0)chord.forEach((n,i)=>note(n,nextBeat+i*.012,beat*6,.028,'triangle'));
  if(index%4===0)note(chord[0]-24,nextBeat,beat*2,.09);
  if(line[index])note(line[index]+(bar>=8?-12:0),nextBeat,beat*1.7,.055);
  if(index%2===0)percussion(nextBeat,index%4===0);
  step++;nextBeat+=beat;
 }
}
function music(){clearInterval(musicTimer);if(!audioContext)return;musicGain.gain.setTargetAtTime(activated&&visible?Number(settings.bgm)||0:0,audioContext.currentTime,.06);if(!activated||!visible||!settings.bgm)return;nextBeat=audioContext.currentTime+.04;schedule();musicTimer=setInterval(schedule,60);}
export const sound={
 activate(){if(!audioContext){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;audioContext=new Context();musicGain=audioContext.createGain();effectGain=audioContext.createGain();musicGain.gain.value=0;effectGain.gain.value=settings.sfx;musicGain.connect(audioContext.destination);effectGain.connect(audioContext.destination);}if(!activated){activated=true;audioContext.resume().then(music).catch(()=>{});}else if(audioContext.state==='suspended'&&visible)audioContext.resume().catch(()=>{});},
 settings(value){const changed=settings.bgm!==value.bgm;settings={...value};if(effectGain)effectGain.gain.setTargetAtTime(Number(settings.sfx)||0,audioContext.currentTime,.02);if(changed)music();},
 effect(kind='success'){if(!audioContext||!visible||!settings.sfx)return;const at=audioContext.currentTime;if(kind==='tap'){if(at-lastTap<.08)return;lastTap=at;note(76,at,.055,.075,'sine',effectGain);return;}const line=kind==='achievement'?[72,76,79,84]:[76,79];line.forEach((n,i)=>note(n,at+i*.1,.32,.12,'sine',effectGain));},
 visibility(value){visible=value;music();if(!visible)audioContext?.suspend();else if(activated)audioContext?.resume().then(music).catch(()=>{});}
};
let installPrompt;
export function prepareInstall(){window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}
export function installSuggestion(){try{if(localStorage.getItem('king-install-choice')||matchMedia('(display-mode: standalone)').matches||navigator.standalone)return '';return '<aside class="card"><h3>더 편하게 접속해요</h3><p class="muted">설치하면 홈 화면에서 바로 들어올 수 있어요.<br>원하는 알림은 설정에서 고를 수 있어요.</p><p class="footnote">앱 밖으로 보내는 알림은 아직 준비 중이에요.</p><div class="row"><button data-action="install">설치 안내</button><button data-action="dismissInstall">나중에</button></div></aside>';}catch{return '';}}
export function dismissInstall(){try{localStorage.setItem('king-install-choice','dismissed');}catch{}}
export async function installApp(show){
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;if(standalone)return show('앱으로 실행 중이에요','<p>이미 설치된 환경에서 실행하고 있습니다.</p>');
 if(installPrompt){await installPrompt.prompt();const choice=await installPrompt.userChoice;installPrompt=null;try{localStorage.setItem('king-install-choice',choice.outcome);}catch{}return;}
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);show('홈 화면에 설치하기',`<p>${ios?'Safari에서 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택하세요.':'Chrome 또는 Edge 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택하세요.'}</p><p class="footnote">브라우저에 해당 메뉴가 없다면 이 환경에서는 설치를 지원하지 않을 수 있습니다. 설치 앱과 브라우저의 저장 공간이 다르면 다시 로그인해야 합니다.</p>`);
}
