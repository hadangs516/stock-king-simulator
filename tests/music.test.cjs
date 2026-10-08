const {test}=require('node:test'),assert=require('node:assert/strict');
test('supplied BGM respects interaction, independent volume and visibility',async()=>{
 const {createMusicPlayer}=await import('../js/music.js');let plays=0,pauses=0;
 const audio={paused:true,volume:0,play(){plays++;this.paused=false;return Promise.resolve();},pause(){pauses++;this.paused=true;}};
 const player=createMusicPlayer(()=>audio);player.settings({bgm:.4,sfx:1});assert.equal(plays,0);
 player.activate();await Promise.resolve();assert.equal(plays,1);assert.equal(audio.volume,.4);assert.equal(audio.loop,true);
 player.settings({bgm:.4,sfx:0});assert.equal(plays,1);
 player.visibility(false);assert.ok(pauses>0);player.visibility(true);assert.equal(plays,2);
 player.settings({bgm:0});assert.equal(audio.paused,true);
});
test('blocked playback retries on a later interaction without an unhandled rejection',async()=>{
 const {createMusicPlayer}=await import('../js/music.js');let plays=0;
 const audio={paused:true,play(){plays++;if(plays===1)return Promise.reject(new Error('autoplay blocked'));this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};
 const player=createMusicPlayer(()=>audio);player.settings({bgm:.5});player.activate();await Promise.resolve();
 assert.equal(plays,1);player.activate();await Promise.resolve();assert.equal(plays,2);assert.equal(audio.paused,false);
 player.visibility(false);assert.equal(audio.paused,true);
});
