/* Dedicated spreadsheet; never attach to or overwrite an existing user sheet. */
var KingStore = {};
KingStore.encode = function(state) {
  var json=JSON.stringify(state),parts=[];
  for(var start=0;start<json.length;){var end=Math.min(start+30000,json.length);var code=json.charCodeAt(end-1);if(code>=0xD800&&code<=0xDBFF)end--;parts.push(json.slice(start,end));start=end;}
  return parts;
};
KingStore.open = function() {
  var id=PropertiesService.getScriptProperties().getProperty('STOCK_KING_SHEET_ID');if(!id)throw new Error('서버 초기 설정이 필요합니다.');
  var book=SpreadsheetApp.openById(id),sheet=book.getSheetByName('서버원장');if(!sheet)throw new Error('서버원장 시트를 찾을 수 없습니다.');return {book,sheet};
};
KingStore.read = function(db) {
  var schema=db.sheet.getRange(1,1).getValue();
  if(schema==='스키마 2'){var header=db.sheet.getRange(1,1,1,6).getValues()[0];try{return KingStore.segmentReadState(db,header);}catch(error){if(!error.checkpointChanged)throw error;return KingStore.segmentReadState(db,db.sheet.getRange(1,1,1,6).getValues()[0]);}}
  var count=Number(db.sheet.getRange(1,2).getValue());if(!Number.isSafeInteger(count)||count<1||count>100000)throw new Error('서버원장 검증 실패. 운영자 복구가 필요합니다.');
  var state=JSON.parse(db.sheet.getRange(2,1,count,1).getValues().map(function(row){return row[0];}).join(''));db.originalMemberRows=KingStore.memberRows(state);return state;
};
KingStore.publicStatus=function(db){var schema=db.sheet.getRange(1,1).getValue();return {maintenance:schema==='스키마 2'?JSON.parse(db.sheet.getRange(1,6).getValue()):KingStore.read(db).maintenance,serverTime:Date.now()};};
KingStore.cell = function(v) {return {userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:String(v===undefined?'':v)}};};
KingStore.problem = function(code,message) {var error=new Error(message);error.storageCode=code;return error;};
KingStore.failureCode = function(error) {
  if(['SHEETS_SERVICE_MISSING','MEMBERS_SHEET_MISSING'].indexOf(error.storageCode)>=0)return error.storageCode;
  var message=String(error.message||'');
  if(/quota|rate.?limit|too many|429|resource.?exhausted/i.test(message))return 'QUOTA';
  if(/permission|forbidden|unauthorized|access denied|403|not enabled|disabled/i.test(message))return 'PERMISSION_OR_API_DISABLED';
  if(/grid limits|maximum.*cells|cell limit|range.*bounds/i.test(message))return 'GRID_LIMIT';
  if(/timeout|timed out|network|unavailable|internal error|503/i.test(message))return 'TRANSIENT';
  return 'UNKNOWN';
};
KingStore.failureMessage = function(code) {
  if(code==='SHEETS_SERVICE_MISSING')return '서버에 Google Sheets API 저장 서비스가 연결되지 않았습니다. 운영자가 서비스 설정을 확인해야 합니다.';
  if(code==='MEMBERS_SHEET_MISSING')return '서버의 회원정보 시트를 찾을 수 없습니다. 운영자가 기존 데이터 시트를 확인해야 합니다.';
  return '저장을 시작하지 못했습니다. 운영자가 서버 저장 설정을 확인해야 합니다.';
};
KingStore.write = function(db,state,beforeCommit) {return db.segments?KingStore.segmentWrite(db,state,beforeCommit):KingStore.writeLegacy(db,state,beforeCommit);};
KingStore.writeLegacy = function(db,state,beforeCommit) {
  if(typeof Sheets==='undefined'||!Sheets.Spreadsheets||typeof Sheets.Spreadsheets.batchUpdate!=='function')throw KingStore.problem('SHEETS_SERVICE_MISSING',KingStore.failureMessage('SHEETS_SERVICE_MISSING'));
  var members=db.book.getSheetByName('회원정보');if(!members)throw KingStore.problem('MEMBERS_SHEET_MISSING',KingStore.failureMessage('MEMBERS_SHEET_MISSING'));
  var parts=KingStore.encode(state),requests=[],count=parts.length+1;
  if(count>db.sheet.getMaxRows())requests.push({appendDimension:{sheetId:db.sheet.getSheetId(),dimension:'ROWS',length:count-db.sheet.getMaxRows()}});
  if(db.sheet.getMaxColumns()<4)requests.push({appendDimension:{sheetId:db.sheet.getSheetId(),dimension:'COLUMNS',length:4-db.sheet.getMaxColumns()}});
  var data=[{values:['스키마 1',parts.length,state.revision,King.stamp(Date.now())].map(KingStore.cell)}].concat(parts.map(function(p){return {values:[KingStore.cell(p)]};}));
  requests.push({updateCells:{range:{sheetId:db.sheet.getSheetId(),startRowIndex:0,endRowIndex:Math.max(count,db.sheet.getLastRow()),startColumnIndex:0,endColumnIndex:4},rows:data,fields:'userEnteredValue'}});
  var users=Object.values(state.accounts),rows=[['계정번호','한글아이디','PIN 원문','가입일시','마지막 로그인','로그인 횟수','평생 플레이 초','회차 플레이 초','회차','현금','이용 제한']].concat(users.map(function(a){return [a.id,a.name,a.pin,King.stamp(a.joined),King.stamp(a.lastLogin),a.logins,a.lifetimeSeconds,a.playSeconds,a.runId,a.cash,a.restricted?a.restricted.reason:'없음'];}));
  if(rows.length>members.getMaxRows())requests.push({appendDimension:{sheetId:members.getSheetId(),dimension:'ROWS',length:rows.length-members.getMaxRows()}});
  if(members.getMaxColumns()<11)requests.push({appendDimension:{sheetId:members.getSheetId(),dimension:'COLUMNS',length:11-members.getMaxColumns()}});
  requests.push({updateCells:{range:{sheetId:members.getSheetId(),startRowIndex:0,endRowIndex:Math.max(rows.length,members.getLastRow()),startColumnIndex:0,endColumnIndex:11},rows:rows.map(function(row){return {values:row.map(KingStore.cell)};}),fields:'userEnteredValue'}});
  if(db.clearSegmentSheet)requests.push({updateCells:{range:{sheetId:db.clearSegmentSheet.getSheetId(),startRowIndex:0,endRowIndex:db.clearSegmentSheet.getLastRow(),startColumnIndex:0,endColumnIndex:1},rows:[],fields:'userEnteredValue'}});
  if(db.clearSegmentSheet)requests.push({updateCells:{range:{sheetId:db.sheet.getSheetId(),startRowIndex:0,endRowIndex:1,startColumnIndex:4,endColumnIndex:6},rows:[],fields:'userEnteredValue'}});
  // One atomic Google Sheets batch: account mirror and authoritative state commit together.
  var bookId=db.book.getId();
  if(beforeCommit)beforeCommit();
  Sheets.Spreadsheets.batchUpdate({requests},bookId);
};
