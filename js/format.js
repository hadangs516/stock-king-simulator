export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = value => Math.round(value || 0).toLocaleString('ko-KR') + '원';
export function compact(value) {
  return money(value);
}
export function maxBuyQuantity(cash,price){
 if(!Number.isFinite(cash)||!Number.isSafeInteger(price)||price<1)return 0;
 let q=Math.max(0,Math.min(100000000,Math.floor(cash/(price*1.0005))));
 while(q&&q*price+Math.ceil(q*price/2000)>cash)q--;
 while(q<100000000&&(q+1)*price+Math.ceil((q+1)*price/2000)<=cash)q++;
 return q;
}
export const stamp = (value,seconds=false) => value ? new Date(value + 32400000).toISOString().slice(0,seconds?19:16).replace('T',' ') : '—';
export const percent = value => (value > 0 ? '+' : '') + (Number(value) || 0).toFixed(2) + '%';
export const change = x => (x.price / x.base - 1) * 100;
export function candleData(points, interval=300000) {
  const buckets=new Map();
  for(const [at,price] of [...(points||[])].sort((a,b)=>a[0]-b[0])){
    if(!Number.isFinite(at)||!Number.isFinite(price))continue;
    const time=Math.floor(at/interval)*interval,bar=buckets.get(time);
    if(bar){bar.high=Math.max(bar.high,price);bar.low=Math.min(bar.low,price);bar.close=price;bar.samples++;}
    else buckets.set(time,{time,open:price,high:price,low:price,close:price,samples:1});
  }
  return [...buckets.values()];
}
export function candles(points, markers=[]) {
  const bars=candleData(points).slice(-48);
  if(!bars.length)return '<p class="empty">시세를 기다리고 있어요.</p>';
  const low=Math.min(...bars.map(b=>b.low)),high=Math.max(...bars.map(b=>b.high)),pad=Math.max((high-low)*.12,1),lo=low-pad,hi=high+pad;
  const y=v=>20+(hi-v)/(hi-lo)*170,step=320/Math.max(bars.length,12),width=Math.max(2,Math.min(13,step*.65));
  const visible=markers.filter(m=>m.at>=bars[0].time&&m.at<bars.at(-1).time+300000);
  return `<figure class="chart candle-chart"><svg viewBox="0 0 380 225" role="img" aria-label="5분 봉차트. 최저 ${money(low)}, 최고 ${money(high)}"><path class="gridline" d="M10 20H330M10 105H330M10 190H330"/>${bars.map((b,i)=>{const cx=16+i*step,color=b.close>b.open?'#e13d48':b.close<b.open?'#2166db':'#718096';return `<g tabindex="0" aria-label="${stamp(b.time)} 시가 ${money(b.open)}, 고가 ${money(b.high)}, 저가 ${money(b.low)}, 종가 ${money(b.close)}"><title>${stamp(b.time)}\n시가 ${money(b.open)} / 고가 ${money(b.high)}\n저가 ${money(b.low)} / 종가 ${money(b.close)}</title><line x1="${cx}" x2="${cx}" y1="${y(b.high)}" y2="${y(b.low)}" stroke="${color}" stroke-width="1.5"/><rect x="${cx-width/2}" y="${Math.min(y(b.open),y(b.close))}" width="${width}" height="${Math.max(1.5,Math.abs(y(b.open)-y(b.close)))}" fill="${color}"/></g>`;}).join('')}<text x="335" y="24">${Math.round(hi).toLocaleString()}</text><text x="335" y="109">${Math.round((hi+lo)/2).toLocaleString()}</text><text x="335" y="194">${Math.round(lo).toLocaleString()}</text><text x="10" y="218">${stamp(bars[0].time).slice(11)}</text><text x="290" y="218">${stamp(bars.at(-1).time).slice(11)}</text></svg><figcaption><span><i class="up">■</i> 상승 <i class="down">■</i> 하락</span><span>5분봉 · 원</span></figcaption></figure>${visible.length?`<div class="markers">${visible.slice(-12).map(m=>`<button type="button" class="link-button" data-action="${m.kind==='news'?'chartNews':'receipt'}" data-id="${escape(m.id)}">${escape(m.label)} · ${stamp(m.at).slice(11)}</button>`).join('')}</div>`:''}`;
}
export function chart(points, label = '가격 흐름', markers = []) {
  if (!points?.length) return '<div class="empty">아직 기록이 없습니다.</div>';
  const values = points.map(p => p[1]), lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const coordinates = points.map((p,i) => `${(i / Math.max(1,points.length-1) * 360 + 10).toFixed(2)},${(130-(p[1]-lo)/span*110).toFixed(2)}`).join(' ');
  const visible=markers.filter(m=>m.at>=points[0][0]&&m.at<=points.at(-1)[0]);
  const dots=visible.map(m=>{const i=points.reduce((best,p,j)=>Math.abs(p[0]-m.at)<Math.abs(points[best][0]-m.at)?j:best,0);return `<circle cx="${i/Math.max(1,points.length-1)*360+10}" cy="${130-(points[i][1]-lo)/span*110}" r="5" style="fill:${m.kind==='buy'?'#b55742':m.kind==='sell'?'#36779a':'#b79739'};stroke:white;stroke-width:2"><title>${escape(m.label)} · ${stamp(m.at)}</title></circle>`;}).join('');
  return `<figure class="chart"><svg viewBox="0 0 380 155" role="img" aria-label="${escape(label)}: 최저 ${money(lo)}, 최고 ${money(hi)}"><path d="M10 20H370M10 75H370M10 130H370" class="gridline"/><polyline points="${coordinates.split(' ').slice(0,-1).join(' ')}"/><polyline class="latest-segment" pathLength="1" points="${coordinates.split(' ').slice(-2).join(' ')}"/><circle cx="370" cy="${130-(values.at(-1)-lo)/span*110}" r="4"/>${dots}</svg><figcaption><span>${money(lo)}</span><span>${money(hi)}</span></figcaption></figure>${visible.length?`<p class="footnote">차트 표시: 매수 빨강 · 매도 파랑 · 뉴스 금색</p><div class="markers">${visible.slice(-12).map(m=>`<button type="button" class="link-button" data-action="${m.kind==='news'?'chartNews':'receipt'}" data-id="${escape(m.id)}">${escape(m.label)} · ${stamp(m.at).slice(5,16)}</button>`).join('')}</div>`:''}`;
}
export const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>', news: '<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h3M8 18h8"/>',
  market: '<path d="M4 20V10m5 10V4m6 16v-7m5 7V7M2 20h20"/>', assets: '<path d="M3 6h18v14H3zM3 6l14-3v3M15 11h6v5h-6z"/>', settings:'<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>'
};
export const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.market}</svg>`;
