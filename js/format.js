export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = value => Math.round(value || 0).toLocaleString('ko-KR') + '원';
export function compact(value) {
  const sign = value < 0 ? '-' : '', n = Math.abs(Math.trunc(value || 0));
  if (n < 10000) return sign + money(n);
  if (n < 1e8) return sign + Math.floor(n/10000).toLocaleString('ko-KR') + '만원';
  if (n < 1e12) return sign + Math.floor(n/1e8).toLocaleString('ko-KR') + '억 ' + (Math.floor(n%1e8/10000) ? Math.floor(n%1e8/10000).toLocaleString('ko-KR') + '만원' : '원');
  return sign + Math.floor(n/1e12).toLocaleString('ko-KR') + '조 ' + (Math.floor(n%1e12/1e8) ? Math.floor(n%1e12/1e8).toLocaleString('ko-KR') + '억원' : '원');
}
export const stamp = value => value ? new Date(value + 32400000).toISOString().slice(0,19).replace('T',' ') : '—';
export const percent = value => (value > 0 ? '+' : '') + (Number(value) || 0).toFixed(2) + '%';
export const change = x => (x.price / x.base - 1) * 100;
export function chart(points, label = '가격 흐름', markers = []) {
  if (!points?.length) return '<div class="empty">아직 기록이 없습니다.</div>';
  const values = points.map(p => p[1]), lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const coordinates = points.map((p,i) => `${(i / Math.max(1,points.length-1) * 360 + 10).toFixed(2)},${(130-(p[1]-lo)/span*110).toFixed(2)}`).join(' ');
  return `<figure class="chart"><svg viewBox="0 0 380 155" role="img" aria-label="${escape(label)}: 최저 ${money(lo)}, 최고 ${money(hi)}"><path d="M10 20H370M10 75H370M10 130H370" class="gridline"/><polyline points="${coordinates}"/><circle cx="370" cy="${130-(values.at(-1)-lo)/span*110}" r="4"/></svg><figcaption><span>${money(lo)}</span><span>${money(hi)}</span></figcaption>${markers.length ? `<div class="markers">${markers.map(m=>`<span>${escape(m)}</span>`).join('')}</div>` : ''}</figure>`;
}
export const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>', news: '<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h3M8 18h8"/>',
  market: '<path d="M4 20V10m5 10V4m6 16v-7m5 7V7M2 20h20"/>', assets: '<path d="M3 6h18v14H3zM3 6l14-3v3M15 11h6v5h-6z"/>', settings:'<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>'
};
export const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.market}</svg>`;
