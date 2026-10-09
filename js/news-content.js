// Shared topic illustrations: adding an article never requires another image.
const topics={반도체:'semiconductor',자동차:'automotive',바이오:'biotech',디지털:'digital',소비재:'consumer',에너지:'energy'};
const images=new Set([...Object.values(topics),'economy']);
export const newsCategories=['전체','시장뉴스','기업뉴스','공시','이벤트'];
export function newsCategory(n){return newsCategories.slice(1).includes(n.category)?n.category:n.symbol?'기업뉴스':'시장뉴스';}
export function newsImageUrl(n,thumbnail=false){
 if(/^NEWS-(0[0-9][1-9]|0[1-9]0|100)$/.test(n.image||''))return `./assets/news/${n.image}${thumbnail?'-thumb':''}.webp`;
 const topic=images.has(n.image)?n.image:topics[n.sector]||'economy';
 return `./assets/news/${topic}.png`;
}
export function newsTitle(n){return n.title||'';}
export function newsParagraphs(n){
 // Preserve reported facts; do not pad short legacy notices with generic lessons.
 const lines=Array.isArray(n.body)&&n.body.length?n.body.filter(v=>typeof v==='string'):[n.fact||''];
 if(lines.length<5)return lines;const paragraphs=[];for(let i=0;i<lines.length;i+=3)paragraphs.push(lines.slice(i,i+3).join(' '));return paragraphs;
}
