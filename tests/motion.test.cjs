const {test}=require('node:test'),assert=require('node:assert/strict');
test('money enters at zero, advances through integer steps, and finishes within 1500ms',async()=>{
 const {animateMoney}=await import('../js/motion.js');const saved={performance:global.performance,raf:global.requestAnimationFrame,cancel:global.cancelAnimationFrame};let now=0,id=0;const frames=new Map();
 global.performance={now:()=>now};global.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};global.cancelAnimationFrame=n=>frames.delete(n);
 try{const el={textContent:'24원',isConnected:true,dataset:{}};animateMoney(el,0,24);assert.equal(el.textContent,'0원');const values=[0];
  for(now=16;now<=1504;now+=16){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));const value=Number(el.textContent.replace(/[^\d-]/g,''));assert.ok(Number.isInteger(value)&&value>=values.at(-1)&&value<=24);values.push(value);}
  assert.equal(el.textContent,'24원');assert.equal(frames.size,0);assert.ok(new Set(values).size>=20);
 }finally{global.performance=saved.performance;global.requestAnimationFrame=saved.raf;global.cancelAnimationFrame=saved.cancel;}
});
test('an interrupted large counter continues from the displayed value, settles exactly, and reduced motion is immediate',async()=>{
 const {animateMoney}=await import('../js/motion.js');const saved={performance:global.performance,raf:global.requestAnimationFrame,cancel:global.cancelAnimationFrame};let now=0,id=0;const frames=new Map();
 global.performance={now:()=>now};global.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};global.cancelAnimationFrame=n=>frames.delete(n);
 try{const el={textContent:'0원',isConnected:true,dataset:{}};animateMoney(el,0,900000000000000);now=400;let callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));const displayed=Number(el.dataset.displayed);assert.ok(displayed>0&&displayed<900000000000000);animateMoney(el,0,700000000000000);assert.equal(Number(el.dataset.displayed),displayed);now=2000;callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));assert.equal(el.textContent,'700,000,000,000,000원');animateMoney(el,0,20,true);assert.equal(el.textContent,'20원');assert.equal(frames.size,0);
 }finally{global.performance=saved.performance;global.requestAnimationFrame=saved.raf;global.cancelAnimationFrame=saved.cancel;}
});
