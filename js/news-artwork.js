const key='king-news-artwork-v1',valid=image=>/^NEWS-\d{3}$/.test(image||'')&&Number(image.slice(5))>=1&&Number(image.slice(5))<=100;
const range=start=>Array.from({length:10},(_,i)=>'NEWS-'+String(start+i).padStart(3,'0'));
const starts={반도체:1,자동차:11,에너지:21,바이오:31,디지털:41,게임콘텐츠:51,소비재:61,경제:71};
const ids=values=>values.map(n=>'NEWS-'+String(n).padStart(3,'0'));
function sceneTiers(n){
 const title=n.title||'',sector=n.sector==='디지털'&&/게임|콘텐츠|공연|촬영/.test(title)?'게임콘텐츠':n.sector;
 const original=valid(n.image)?[n.image]:[],neutral=ids([71,82,90]);
 if(/금리|통화정책/.test(title))return [ids([72]),ids([71,82,90])];
 if(/배당|분배|실적|주주/.test(title))return [[...original,...ids([85,81,82,86,90])],range(starts[sector]||71),neutral];
 // One-off event scenes (recall, outage, restructuring, etc.) are not interchangeable.
 if(valid(n.image)&&Number(n.image.slice(5))>=81)return [original,range(starts[sector]||71),neutral];
 const group=valid(n.image)?Math.floor((Number(n.image.slice(5))-1)/10)*10+1:starts[sector]||71;
 return [original,range(group),range(starts[sector]||71),neutral];
}
function hash(value){let n=0;for(const c of value)n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;return n;}
export class NewsArtwork {
 constructor(storage){
  this.storage=storage;this.entries=new Map();this.recent=[];
  try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved?.version===1&&Array.isArray(saved.entries)&&Array.isArray(saved.recent)){
   for(const pair of saved.entries.slice(-600))if(Array.isArray(pair)&&typeof pair[0]==='string'&&pair[0].length<200&&valid(pair[1]))this.entries.set(pair[0],pair[1]);this.recent=saved.recent.filter(valid).slice(-20);
  }}catch{/* Browser storage must never block reading news. */}
 }
 assign(items){
  for(const n of [...items].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))){
   if(this.entries.has(n.id))continue;
   const tiers=sceneTiers(n).map(tier=>[...new Set(tier)]),candidates=[...new Set(tiers.flat())];
   const unused=tiers.map(tier=>tier.filter(image=>!this.recent.includes(image))).find(tier=>tier.length)||[];
   const preferred=unused.includes(n.image)?n.image:null;
   const pool=unused.length?unused:candidates.filter(image=>this.recent.lastIndexOf(image)===Math.min(...candidates.map(v=>this.recent.lastIndexOf(v))));
   const image=preferred||pool[hash(n.id)%pool.length];this.entries.set(n.id,image);this.recent.push(image);this.recent=this.recent.slice(-20);
  }
  while(this.entries.size>600)this.entries.delete(this.entries.keys().next().value);
  try{this.storage?.setItem(key,JSON.stringify({version:1,entries:[...this.entries],recent:this.recent}));}catch{/* Keep the in-memory mapping on quota errors. */}
  return items.map(n=>({...n,image:this.entries.get(n.id)||n.image}));
 }
}
