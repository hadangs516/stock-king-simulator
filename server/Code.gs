function kingEnv_() {
  var properties=PropertiesService.getScriptProperties(),key=properties.getProperty('SIGNING_KEY');if(!key)throw new Error('서버 초기 설정이 필요합니다.');
  function hex(bytes){return bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
  function hash(value){return hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8));}
  return {now:function(){return Date.now();},id:function(){return Utilities.getUuid();},hash,sign:function(value){return hex(Utilities.computeHmacSha256Signature(value,key));},isAdmin:function(name){return (properties.getProperty('ADMIN_NAMES')||'').split(',').map(function(n){return n.trim();}).indexOf(name)>=0;},adminCheck:function(secret){var stored=properties.getProperty('ADMIN_SECRET_HASH');return !!stored&&typeof secret==='string'&&secret.length>=12&&hash(secret)===stored;}};
}
function json_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){
  try {var db=KingStore.open(),s=KingStore.read(db);return json_({service:'stock-king',version:1,maintenance:s.maintenance,serverTime:Date.now()});}
  catch(e){return json_({service:'stock-king',version:1,error:'SETUP_REQUIRED',message:'게임 서버 설치를 완료해 주세요.'});}
}
function rateLimit_(r,env) {
  if(['login','signup','adminUnlock'].indexOf(r.action)<0)return;
  var cache=CacheService.getScriptCache(),key='auth:'+env.hash((r.name||r.token||'unknown').slice(0,200)),attempts=Number(cache.get(key)||0);
  if(attempts>=8)throw new Error('인증 시도가 많습니다. 15분 후 다시 시도해 주세요.');cache.put(key,String(attempts+1),900);
}
function doPost(e) {
  var lock=LockService.getScriptLock();
  try {
    if(!e||!e.postData||e.postData.contents.length>60000)throw new Error('요청 크기를 확인해 주세요.');
    var r=JSON.parse(e.postData.contents);if(!r||typeof r.action!=='string')throw new Error('요청 형식을 확인해 주세요.');
    if(!lock.tryLock(15000))return json_({error:'BUSY',message:'다른 요청 처리 중입니다. 같은 요청으로 다시 시도해 주세요.'});
    var env=kingEnv_();rateLimit_(r,env);var db=KingStore.open(),state=KingStore.read(db),out=King.execute(state,r,env);
    if(out.state!==state)KingStore.write(db,out.state);
    return json_(Object.assign({service:'stock-king',version:1},out.response));
  }catch(error){
    // Never serialize request bodies, PINs or provider stack traces to the caller.
    var message=String(error.message||'요청 처리 실패');
    if(/quota|Service|Exception|Sheets|Spreadsheet|JSON|TypeError|ReferenceError|property|undefined/i.test(message))message='서버 처리 또는 저장에 실패했습니다. 같은 요청으로 재시도해 주세요.';
    return json_({error:'REQUEST_FAILED',message});
  }finally{if(lock.hasLock())lock.releaseLock();}
}
function setupStockKing() {
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    var p=PropertiesService.getScriptProperties();if(p.getProperty('STOCK_KING_SHEET_ID'))throw new Error('이미 설정되어 있습니다. 기존 데이터를 덮어쓰지 않았습니다.');
    var book=SpreadsheetApp.create('주식왕 시뮬레이션 서버 데이터');book.setSpreadsheetTimeZone('Asia/Seoul');book.getSheets()[0].setName('서버원장');book.insertSheet('회원정보');book.getSheetByName('회원정보').getRange('C:C').setNumberFormat('@');
    var envKey=Utilities.getUuid()+Utilities.getUuid();p.setProperty('SIGNING_KEY',envKey);
    var state=King.initial(Date.now());King.initFunds(state);KingStore.write({book,sheet:book.getSheetByName('서버원장')},state);p.setProperty('STOCK_KING_SHEET_ID',book.getId());
    installMarketTrigger();console.log('설정 완료. 데이터 시트: '+book.getUrl());
  }finally{lock.releaseLock();}
}
function installMarketTrigger() {
  if(!PropertiesService.getScriptProperties().getProperty('STOCK_KING_SHEET_ID'))throw new Error('setupStockKing을 먼저 실행해 주세요.');
  var exists=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='marketTick';});if(!exists)ScriptApp.newTrigger('marketTick').timeBased().everyMinutes(5).create();
}
function marketTick() {
  var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try{var begin=Date.now(),db=KingStore.open(),s=KingStore.read(db),env=kingEnv_();King.advance(s,begin,env);s.revision++;KingStore.write(db,s);PropertiesService.getScriptProperties().setProperties({LAST_TICK_MS:String(Date.now()-begin),LAST_TICK_AT:King.stamp(Date.now())});}
  finally{lock.releaseLock();}
}
function configureAdminSecret() {
  var p=PropertiesService.getScriptProperties(),secret=p.getProperty('ADMIN_SECRET_SETUP');if(!secret||secret.length<16)throw new Error('스크립트 속성 ADMIN_SECRET_SETUP에 16자 이상 무작위 암호를 설정해 주세요.');
  p.setProperty('ADMIN_SECRET_HASH',kingEnv_().hash(secret));p.deleteProperty('ADMIN_SECRET_SETUP');console.log('관리자 강화 인증 설정 완료. 임시 원문 속성을 삭제했습니다.');
}
