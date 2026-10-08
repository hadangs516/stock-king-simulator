export const BGM_URL='./assets/audio/bmg/main_bmg.mp3';
export function createMusicPlayer(makeAudio=()=>new Audio(BGM_URL)){
 let audio,activated=false,visible=true,volume=0,pending=false;
 function update(){
  if(!audio&&activated&&volume>0){audio=makeAudio();audio.loop=true;audio.preload='none';}
  if(!audio)return;audio.volume=volume;
  if(!activated||!visible||volume===0){audio.pause();return;}
  if(audio.paused&&!pending){pending=true;Promise.resolve(audio.play()).then(()=>{pending=false;update();},()=>{pending=false;});}
 }
 return {activate(){activated=true;update();},settings(value){volume=Math.max(0,Math.min(1,Number(value.bgm)||0));update();},visibility(value){visible=value;update();},effect(){/* User-provided effects will be connected when supplied. */}};
}
