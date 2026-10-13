var KingStore = typeof KingStore === 'undefined' ? {} : KingStore;
KingStore.segmentHash=function(text){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');};
KingStore.segmentStateHash=function(state){return KingStore.segmentHash(JSON.stringify(state,function(key,value){if(value&&typeof value==='object'&&!Array.isArray(value)){var sorted=Object.create(null);Object.keys(value).sort().forEach(function(k){sorted[k]=value[k];});return sorted;}return value;}));};
KingStore.segmentPack=function(value){return Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(value),'application/json')).getBytes());};
KingStore.segmentUnpack=function(value){return JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(value),'application/gzip')).getDataAsString('UTF-8'));};
KingStore.segmentCache=function(){try{return CacheService.getScriptCache();}catch(ignored){return null;}};
KingStore.segmentKey=function(db,record){return 'king-segment-v1:'+KingStore.segmentHash(db.book.getId())+':'+record.hash;};
KingStore.segmentCached=function(db,record){try{var cache=KingStore.segmentCache(),value=cache&&cache.get(KingStore.segmentKey(db,record));return value&&KingStore.segmentHash(value)===record.hash?value:null;}catch(ignored){return null;}};
KingStore.segmentRemember=function(db,record,value){if(value.length>90000)return;try{var cache=KingStore.segmentCache();if(cache)cache.put(KingStore.segmentKey(db,record),value,300);}catch(ignored){}};
KingStore.segmentValidate=function(record){if(!record||!Number.isSafeInteger(record.row)||record.row<2||!Number.isSafeInteger(record.count)||record.count<1||!Number.isSafeInteger(record.capacity)||record.capacity<record.count||record.capacity>100000||!/^[a-f0-9]{64}$/.test(record.hash||''))throw Error('서버 구획 메타데이터를 확인해 주세요.');};
KingStore.segmentRead=function(db,record,rows,first){
  KingStore.segmentValidate(record);var value=KingStore.segmentCached(db,record);
  if(!value){var data=rows?rows.slice(record.row-first,record.row-first+record.count):db.segmentSheet.getRange(record.row,1,record.count,1).getValues();value=data.map(function(r){return r[0];}).join('');
    if(KingStore.segmentHash(value)!==record.hash){var error=Error('서버 구획이 변경되었습니다. 다시 확인해 주세요.');error.checkpointChanged=true;throw error;}KingStore.segmentRemember(db,record,value);}
  return KingStore.segmentUnpack(value);
};
KingStore.segmentReadState=function(db,header){
  var index=JSON.parse(header[4]);if(!index||index.version!==2||!index.core||!index.histories)throw Error('서버 구획 인덱스를 확인해 주세요.');
  db.segmentSheet=db.book.getSheetByName('서버구획');if(!db.segmentSheet)throw Error('서버 구획 시트를 찾을 수 없습니다. 운영자 복구가 필요합니다.');
  db.segments=index;var state=KingStore.segmentRead(db,index.core),historyData=null;
  db.originalMemberRows=KingStore.memberRows(state);Object.keys(state.market.stocks).forEach(function(id){
    var stock=state.market.stocks[id],view=stock._series;if(!view||!index.histories[id])throw Error('종목 시세 구획을 확인해 주세요.');delete stock._series;
    King.attachHistory(stock,function(){
      if(!historyData){historyData={};var missing=Object.keys(index.histories).filter(function(k){var rec=index.histories[k],cached=KingStore.segmentCached(db,rec);if(cached){historyData[k]=KingStore.segmentUnpack(cached);return false;}return true;});
        if(missing.length){var records=missing.map(function(k){KingStore.segmentValidate(index.histories[k]);return index.histories[k];}),first=Math.min.apply(null,records.map(function(r){return r.row;})),end=Math.max.apply(null,records.map(function(r){return r.row+r.count;}));var rows=db.segmentSheet.getRange(first,1,end-first,1).getValues();missing.forEach(function(k){historyData[k]=KingStore.segmentRead(db,index.histories[k],rows,first);});}}
      return historyData[id];
    },view.preview,view.bars);
  });return state;
};
KingStore.memberRows=function(state){return [['계정번호','한글아이디','PIN 원문','가입일시','마지막 로그인','로그인 횟수','평생 플레이 초','회차 플레이 초','회차','현금','이용 제한']].concat(Object.values(state.accounts).map(function(a){return [a.id,a.name,a.pin===undefined?'':a.pin,King.stamp(a.joined),King.stamp(a.lastLogin),a.logins,a.lifetimeSeconds,a.playSeconds,a.runId,a.cash,a.restricted?a.restricted.reason:'없음'];}));};
KingStore.segmentWrite=function(db,state,beforeCommit){
  if(typeof Sheets==='undefined'||!Sheets.Spreadsheets||typeof Sheets.Spreadsheets.batchUpdate!=='function')throw KingStore.problem('SHEETS_SERVICE_MISSING',KingStore.failureMessage('SHEETS_SERVICE_MISSING'));
  var members=db.book.getSheetByName('회원정보');if(!members)throw KingStore.problem('MEMBERS_SHEET_MISSING',KingStore.failureMessage('MEMBERS_SHEET_MISSING'));
  var sheet=db.segmentSheet||db.book.getSheetByName('서버구획')||db.book.insertSheet('서버구획'),previous=db.segments,index=previous?King.clone(previous):{version:2,nextRow:2,histories:{}},requests=[],remember=[];
  function update(range,rows){requests.push({updateCells:{range:range,rows:rows.map(function(row){return {values:row.map(KingStore.cell)};}),fields:'userEnteredValue'}});}
  function store(value,record){var packed=KingStore.segmentPack(value),hash=KingStore.segmentHash(packed);if(!previous&&JSON.stringify(KingStore.segmentUnpack(packed))!==JSON.stringify(value))throw Error('장부 전환 사전 대조 실패. 원본은 변경하지 않았습니다.');if(record&&hash===record.hash)return record;
    var parts=[];for(var i=0;i<packed.length;i+=30000)parts.push(packed.slice(i,i+30000));var next=record&&record.capacity>=parts.length?King.clone(record):{row:index.nextRow,capacity:parts.length+1};if(next.row===index.nextRow)index.nextRow+=next.capacity;
    next.count=parts.length;next.hash=hash;update({sheetId:sheet.getSheetId(),startRowIndex:next.row-1,endRowIndex:next.row-1+next.capacity,startColumnIndex:0,endColumnIndex:1},Array.from({length:next.capacity},function(_,j){return [parts[j]||''];}));
    if(record&&record.row!==next.row)update({sheetId:sheet.getSheetId(),startRowIndex:record.row-1,endRowIndex:record.row-1+record.capacity,startColumnIndex:0,endColumnIndex:1},[]);
    remember.push({record:next,value:packed});return next;
  }
  var core=King.coreCopy(state);Object.keys(state.market.stocks).forEach(function(id){var stock=state.market.stocks[id],meta=stock._kingHistory;
    if(previous&&(!meta||meta.loaded||!index.histories[id]))index.histories[id]=store(stock.history,index.histories[id]);
    core.market.stocks[id]._series={preview:King.historyPreview(stock),bars:King.historyBars(stock)};
  });
  Object.keys(index.histories).forEach(function(id){if(!state.market.stocks[id]){var rec=index.histories[id];update({sheetId:sheet.getSheetId(),startRowIndex:rec.row-1,endRowIndex:rec.row-1+rec.capacity,startColumnIndex:0,endColumnIndex:1},[]);delete index.histories[id];}});
  // The live core is placed first on initial conversion, before price archive blocks.
  if(!previous){index.nextRow=2;requests=[];remember=[];index.histories={};index.core=store(core,null);Object.keys(state.market.stocks).forEach(function(id){index.histories[id]=store(state.market.stocks[id].history,null);});}
  else index.core=store(core,index.core);
  if(index.nextRow-1>sheet.getMaxRows())requests.unshift({appendDimension:{sheetId:sheet.getSheetId(),dimension:'ROWS',length:index.nextRow-1-sheet.getMaxRows()}});
  if(db.sheet.getMaxColumns()<6)requests.unshift({appendDimension:{sheetId:db.sheet.getSheetId(),dimension:'COLUMNS',length:6-db.sheet.getMaxColumns()}});
  if(members.getMaxColumns()<11)requests.unshift({appendDimension:{sheetId:members.getSheetId(),dimension:'COLUMNS',length:11-members.getMaxColumns()}});
  var rows=KingStore.memberRows(state),old=db.originalMemberRows||null;
  if(rows.length>members.getMaxRows())requests.unshift({appendDimension:{sheetId:members.getSheetId(),dimension:'ROWS',length:rows.length-members.getMaxRows()}});
  for(var row=0;row<Math.max(rows.length,old?old.length:members.getLastRow());row++)if(!old||JSON.stringify(rows[row]||[])!==JSON.stringify(old[row]||[]))update({sheetId:members.getSheetId(),startRowIndex:row,endRowIndex:row+1,startColumnIndex:0,endColumnIndex:11},rows[row]?[rows[row]]:[]);
  update({sheetId:db.sheet.getSheetId(),startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:6},[['스키마 2',0,state.revision,King.stamp(Date.now()),JSON.stringify(index),JSON.stringify(state.maintenance)]]);
  if(!previous&&db.sheet.getLastRow()>1)update({sheetId:db.sheet.getSheetId(),startRowIndex:1,endRowIndex:db.sheet.getLastRow(),startColumnIndex:0,endColumnIndex:4},[]);
  var bookId=db.book.getId();if(beforeCommit)beforeCommit();Sheets.Spreadsheets.batchUpdate({requests:requests},bookId);
  db.segments=index;db.segmentSheet=sheet;db.originalMemberRows=KingStore.memberRows(state);remember.forEach(function(item){KingStore.segmentRemember(db,item.record,item.value);});
};
function enableSegmentedStockKingStorage(){
  var lock=LockService.getScriptLock();lock.waitLock(30000);try{var db=KingStore.open(),state=KingStore.read(db);if(db.segments)return {changed:false,format:2};var expected=KingStore.segmentStateHash(state);KingStore.segmentWrite(db,state);var verified=KingStore.read(KingStore.open());if(KingStore.segmentStateHash(verified)!==expected)throw Error('장부 전환 대조가 필요합니다.');console.log(JSON.stringify({changed:true,format:2,retainedHistory:true}));return {changed:true,format:2};}finally{lock.releaseLock();}
}
function restoreLegacyStockKingStorage(){
  var lock=LockService.getScriptLock();lock.waitLock(30000);try{var db=KingStore.open(),state=KingStore.read(db);if(!db.segments)return {changed:false,format:1};db.clearSegmentSheet=db.segmentSheet;KingStore.writeLegacy(db,state);console.log(JSON.stringify({changed:true,format:1,retainedHistory:true}));return {changed:true,format:1};}finally{lock.releaseLock();}
}
