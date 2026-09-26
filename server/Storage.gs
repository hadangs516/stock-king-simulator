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
  var count=Number(db.sheet.getRange(1,2).getValue());if(!Number.isSafeInteger(count)||count<1||count>100000)throw new Error('서버원장 검증 실패. 운영자 복구가 필요합니다.');
  return JSON.parse(db.sheet.getRange(2,1,count,1).getValues().map(function(row){return row[0];}).join(''));
};
KingStore.cell = function(v) {return {userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:String(v===undefined?'':v)}};};
KingStore.write = function(db,state) {
  var parts=KingStore.encode(state),requests=[],count=parts.length+1;
  if(count>db.sheet.getMaxRows())requests.push({appendDimension:{sheetId:db.sheet.getSheetId(),dimension:'ROWS',length:count-db.sheet.getMaxRows()}});
  var data=[{values:['스키마 1',parts.length,state.revision,King.stamp(Date.now())].map(KingStore.cell)}].concat(parts.map(function(p){return {values:[KingStore.cell(p)]};}));
  requests.push({updateCells:{range:{sheetId:db.sheet.getSheetId(),startRowIndex:0,endRowIndex:Math.max(count,db.sheet.getLastRow()),startColumnIndex:0,endColumnIndex:4},rows:data,fields:'userEnteredValue'}});
  var members=db.book.getSheetByName('회원정보'),users=Object.values(state.accounts),rows=[['계정번호','한글아이디','PIN 원문','가입일시','마지막 로그인','로그인 횟수','평생 플레이 초','회차 플레이 초','회차','현금','이용 제한']].concat(users.map(function(a){return [a.id,a.name,a.pin,King.stamp(a.joined),King.stamp(a.lastLogin),a.logins,a.lifetimeSeconds,a.playSeconds,a.runId,a.cash,a.restricted?a.restricted.reason:'없음'];}));
  if(rows.length>members.getMaxRows())requests.push({appendDimension:{sheetId:members.getSheetId(),dimension:'ROWS',length:rows.length-members.getMaxRows()}});
  requests.push({updateCells:{range:{sheetId:members.getSheetId(),startRowIndex:0,endRowIndex:Math.max(rows.length,members.getLastRow()),startColumnIndex:0,endColumnIndex:11},rows:rows.map(function(row){return {values:row.map(KingStore.cell)};}),fields:'userEnteredValue'}});
  // One atomic Google Sheets batch: account mirror and authoritative state commit together.
  Sheets.Spreadsheets.batchUpdate({requests},db.book.getId());
};
