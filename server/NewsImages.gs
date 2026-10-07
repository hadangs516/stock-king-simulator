var King = typeof King === 'undefined' ? {} : King;
// User-supplied NEWS-001..100. Keep selection stable for each article, never infer price direction from art.
King.newsImageFor=function(n,recipe,recent){
 if(/^NEWS-(0[0-9][1-9]|0[1-9]0|100)$/.test(n.image||''))return n.image;
 var pools={'memory-validation':[1,3,7,8,9,10],'equipment-maintenance':[4,5],'vehicle-mix':[11,17,19],'dealer-service':[14,18,20],'materials-procurement':[23,24,29],'battery-inspection':[21,22],'bio-batch':[32,34,39],'medical-training':[36,40],'research-schedule':[33,37,38],'platform-billing':[43,49],'game-patch':[42,50,51,52],'retail-distribution':[63,64,68,69],'food-delivery':[65,66],'market-rate':[72],'market-activity':[73,74,76,78,79,80],'ir-materials':[81,82,86,90]};
 var title=n.title||'',pool=pools[recipe];
 if(!pool){
  var rules=[[/공급.*지연|물류.*지연/,[93]],[/배당|분배금/,[85]],[/금리|통화정책/,[72]],[/거래정지|생산.*중단/,[91]],[/상장폐지|구조.*조정/,[100]],[/신규 상장/,[84]],[/리콜|회수/,[92]],[/재고/,[94]],[/파업|정비|고장/,[95]],[/보안.*사고/,[96]],[/가격.*상승|원가.*상승/,[97]],[/규제|임상.*지연/,[98]],[/태풍|재해/,[99]],[/계약.*체결/,[83]],[/신공장|준공/,[87]],[/박람회|전시회/,[88]],[/해외.*협력/,[89]],[/실적|주주/,[81,86]],[/환율/,[75]]];
  for(var i=0;i<rules.length;i++)if(rules[i][0].test(title)){pool=rules[i][1];break;}
 }
 if(!pool){var sector=n.sector||'경제';if(sector==='디지털'&&/게임|콘텐츠|공연|촬영/.test(title))sector='게임콘텐츠';var start={반도체:1,자동차:11,에너지:21,바이오:31,디지털:41,게임콘텐츠:51,소비재:61,경제:71,기업공통:81,위험공통:91}[sector]||71;pool=Array.from({length:10},function(_,i){return start+i;});}
 // Prefer unused or least recently used art within the matching scene pool.
 if(recent&&recent.length){var images=recent.slice(-20).map(function(v){return v.image;}),last=pool.map(function(v){return images.lastIndexOf('NEWS-'+String(v).padStart(3,'0'));}),oldest=Math.min.apply(null,last);pool=pool.filter(function(v,i){return last[i]===oldest;});}
 var index=Math.floor(King.random('news-image:'+n.id+':'+title)*pool.length),number=pool[index];return 'NEWS-'+String(number).padStart(3,'0');
};
