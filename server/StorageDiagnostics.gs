// Owner-run, read-only. Can also be added by itself to an older server.
// Never reads account rows or logs spreadsheet IDs, PINs, keys or provider messages.
function diagnoseStockKingStorage() {
  function classify(error) {
    var message=String(error.message||'');
    if(/quota|rate.?limit|too many|429|resource.?exhausted/i.test(message))return 'QUOTA';
    if(/permission|forbidden|unauthorized|access denied|403|not enabled|disabled/i.test(message))return 'PERMISSION_OR_API_DISABLED';
    if(/grid limits|maximum.*cells|cell limit|range.*bounds/i.test(message))return 'GRID_LIMIT';
    if(/timeout|timed out|network|unavailable|internal error|503/i.test(message))return 'TRANSIENT';
    return 'UNKNOWN';
  }
  var result={readOnly:true,sheetsApi:'NOT_CHECKED',lastFailure:null,lastPhase:null,warnings:[]};
  try {
    var properties=PropertiesService.getScriptProperties(),id=properties.getProperty('STOCK_KING_SHEET_ID');
    var code=properties.getProperty('LAST_STORAGE_ERROR_CODE'),phase=properties.getProperty('LAST_STORAGE_ERROR_PHASE');
    if(['SHEETS_SERVICE_MISSING','MEMBERS_SHEET_MISSING','QUOTA','PERMISSION_OR_API_DISABLED','GRID_LIMIT','TRANSIENT','UNKNOWN'].indexOf(code)>=0)result.lastFailure=code;
    if(['PREPARE','COMMIT'].indexOf(phase)>=0)result.lastPhase=phase;
    result.configured=!!id;
    if(!id){result.openStatus='FAILED';result.openIssue='SERVER_NOT_CONFIGURED';}
    else {
      var book=SpreadsheetApp.openById(id),ledger=book.getSheetByName('서버원장'),members=book.getSheetByName('회원정보');
      result.openStatus='OK';result.ledgerPresent=!!ledger;result.membersPresent=!!members;
      result.ledgerColumns=ledger?ledger.getMaxColumns():0;result.membersColumns=members?members.getMaxColumns():0;
      if(!ledger)result.warnings.push('LEDGER_SHEET_MISSING');
      if(!members)result.warnings.push('MEMBERS_SHEET_MISSING');
      if(ledger&&result.ledgerColumns<4||members&&result.membersColumns<11)result.warnings.push('COLUMN_GRID_TOO_SMALL');
      if(ledger){
        if(ledger.getRange(1,1).getValue()==='스키마 2'){
          result.format=2;var segments=book.getSheetByName('서버구획');result.segmentsPresent=!!segments;
          if(!segments)result.warnings.push('SEGMENTS_SHEET_MISSING');
          if(result.ledgerColumns<6)result.warnings.push('COLUMN_GRID_TOO_SMALL');
          else {var index=JSON.parse(ledger.getRange(1,5).getValue());result.coreChunks=index.core&&index.core.count;result.historySegments=Object.keys(index.histories||{}).length;if(index.version!==2||!index.core||!result.historySegments)result.warnings.push('LEDGER_METADATA_INVALID');}
        }else {
          result.format=1;var chunks=result.ledgerColumns>=2?Number(ledger.getRange(1,2).getValue()):0;
          result.ledgerChunks=Number.isSafeInteger(chunks)?chunks:null;
          if(!Number.isSafeInteger(chunks)||chunks<1||chunks>100000)result.warnings.push('LEDGER_METADATA_INVALID');
        }
      }
      if(typeof Sheets==='undefined'||!Sheets.Spreadsheets||typeof Sheets.Spreadsheets.get!=='function'||typeof Sheets.Spreadsheets.batchUpdate!=='function')result.sheetsApi='SHEETS_SERVICE_MISSING';
      else {try{Sheets.Spreadsheets.get(id,{fields:'sheets(properties(gridProperties))'});result.sheetsApi='OK';}catch(error){result.sheetsApi=classify(error);}}
    }
  }catch(error){result.openStatus='FAILED';result.openIssue=classify(error);}
  console.log(JSON.stringify(result));return result;
}
