const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function service(){
 let failedAfterCommit=false,clock=Date.parse('2026-09-26T10:00:00Z');
 const properties=new Map([['STOCK_KING_SHEET_ID','test-book'],['SIGNING_KEY','fixture-signing-key']]),cache=new Map(),tables=new Map();let serial=0;
 function sheet(id){const rows=[];const obj={getSheetId:()=>id,getMaxRows:()=>1000,getMaxColumns:()=>26,getLastRow:()=>rows.length,getRange:(r,c,n=1,w=1)=>({getValue:()=>rows[r-1]?.[c-1],getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>rows[r-1+i]?.[c-1+j]??''))}),rows};tables.set(id,obj);return obj;}
 const ledger=sheet(1),members=sheet(2),book={getId:()=> 'test-book',getSheetByName:n=>n==='서버원장'?ledger:members};
 const lock={tryLock:()=>true,hasLock:()=>true,releaseLock:()=>{}};
 const context=vm.createContext({console,Date:class extends Date{static now(){return clock;}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})},SpreadsheetApp:{openById:()=>book},LockService:{getScriptLock:()=>lock},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},Utilities:{getUuid:()=>`fixture-${++serial}-uuid`,DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],computeHmacSha256Signature:(s,key)=>[...crypto.createHmac('sha256',key).update(s).digest()]},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>text})},Sheets:{Spreadsheets:{batchUpdate:({requests})=>{const staged=new Map([...tables].map(([k,s])=>[k,structuredClone(s.rows)]));for(const r of requests){if(!r.updateCells)continue;const {range,rows}=r.updateCells,target=staged.get(range.sheetId);for(let i=range.startRowIndex;i<range.endRowIndex;i++){target[i]=[];const source=rows[i-range.startRowIndex];if(source)source.values.forEach((cell,j)=>target[i][j]=cell.userEnteredValue.stringValue??cell.userEnteredValue.numberValue);}}for(const [id,rows]of staged){const target=tables.get(id).rows;target.splice(0,target.length,...rows);}if(failedAfterCommit){failedAfterCommit=false;throw new Error('Network response lost');}}}}});
 for(const f of fs.readdirSync('server').filter(f=>f.endsWith('.gs')))vm.runInContext(fs.readFileSync('server/'+f,'utf8'),context,{filename:f});
 context.KingStore.write({book,sheet:ledger},context.King.initial(clock));
 return {ctx:context,ledger,members,book,properties,loseCommit:()=>failedAfterCommit=true,post:r=>JSON.parse(context.doPost({postData:{contents:JSON.stringify({version:1,...r})}})),get state(){return context.KingStore.read({book,sheet:ledger});}};
}
test('committed trade with lost save response is recovered without a second debit',()=>{const h=service(),a=h.post({action:'signup',name:'저장검증',pin:'0012',consent:true});h.post({action:'attendance',token:a.token,runId:a.snapshot.account.runId,requestId:'storage-initial-grant'});const q=h.post({action:'quote',token:a.token,symbol:'005930',side:'buy',quantity:10});const req={action:'trade',token:a.token,runId:a.snapshot.account.runId,quoteId:q.quote.id,requestId:'storage-trade-0001'};h.loseCommit();assert.equal(h.post(req).error,'COMMIT_UNKNOWN');const r=h.post(req);assert.equal(r.snapshot.account.cash,299650);assert.equal(Object.keys(h.state.receipts).length,1);assert.equal(h.members.rows[1][2],'0012');});
test('public status cannot expose spreadsheet accounts or authentication',()=>{const h=service();h.post({action:'signup',name:'저장검증',pin:'0012',consent:true});const publicState=JSON.parse(h.ctx.doGet());assert.deepEqual(Object.keys(publicState).sort(),['maintenance','serverTime','service','version']);assert.equal(publicState.service,'stock-king');});
test('JSON checkpoint roundtrip preserves Korean text and surrogate pairs across chunks',()=>{const h=service(),state={data:'가'.repeat(29988)+'♔👑'.repeat(20000)};const chunks=h.ctx.KingStore.encode(state);assert.deepEqual(JSON.parse(chunks.join('')),state);assert.ok(chunks.every(s=>s.length<=30000));assert.ok(chunks.every(s=>!/[\uD800-\uDBFF]$/.test(s)));});


test('missing advanced Sheets service rejects before commit without ambiguous retry or stored account',()=>{
 const h=service();delete h.ctx.Sheets;const before=JSON.stringify(h.state);
 const r=h.post({action:'signup',name:'설정점검',pin:'0012',consent:true});
 assert.equal(r.error,'REQUEST_FAILED');assert.equal(r.storageCode,'SHEETS_SERVICE_MISSING');assert.match(r.message,/Sheets API/);assert.doesNotMatch(r.message,/같은 요청/);
 assert.equal(JSON.stringify(h.state),before);assert.equal(h.properties.get('LAST_STORAGE_ERROR_CODE'),'SHEETS_SERVICE_MISSING');
});
test('missing account mirror rejects before commit and leaves authoritative records unchanged',()=>{
 const h=service(),auth=h.post({action:'signup',name:'시트점검',pin:'0012',consent:true});const before=JSON.stringify(h.state);h.book.getSheetByName=n=>n==='서버원장'?h.ledger:null;
 const r=h.post({action:'save',token:auth.token,runId:auth.snapshot.account.runId,requestId:'missing-mirror-test'});
 assert.equal(r.error,'REQUEST_FAILED');assert.equal(r.storageCode,'MEMBERS_SHEET_MISSING');assert.equal(JSON.stringify(h.state),before);
});
test('atomic storage expands insufficient column grids before writing state and members',()=>{
 const h=service(),raw=h.ctx.Sheets.Spreadsheets.batchUpdate,columns=new Map([[1,2],[2,4]]);h.ledger.getMaxColumns=()=>columns.get(1);h.members.getMaxColumns=()=>columns.get(2);
 h.ctx.Sheets.Spreadsheets.batchUpdate=body=>{for(const request of body.requests){if(request.appendDimension?.dimension==='COLUMNS')columns.set(request.appendDimension.sheetId,columns.get(request.appendDimension.sheetId)+request.appendDimension.length);if(request.updateCells&&request.updateCells.range.endColumnIndex>columns.get(request.updateCells.range.sheetId))throw Error('Range exceeds grid limits');}return raw(body);};
 const r=h.post({action:'signup',name:'열크기점검',pin:'0012',consent:true});assert.equal(r.error,undefined);assert.equal(columns.get(1),4);assert.equal(columns.get(2),11);assert.equal(Object.keys(h.state.accounts).length,1);
});
test('read-only storage diagnosis reports setup without changing ledger or exposing credentials',()=>{
 const h=service();h.post({action:'signup',name:'개인자료점검',pin:'0012',consent:true});const before=JSON.stringify(h.state);let writes=0;const raw=h.ctx.Sheets.Spreadsheets.batchUpdate;h.ctx.Sheets.Spreadsheets.batchUpdate=x=>{writes++;return raw(x);};
 h.ctx.Sheets.Spreadsheets.get=()=>({sheets:[]});
 const r=h.ctx.diagnoseStockKingStorage();assert.equal(r.readOnly,true);assert.equal(r.sheetsApi,'OK');assert.equal(r.membersPresent,true);assert.equal(writes,0);assert.equal(JSON.stringify(h.state),before);assert.doesNotMatch(JSON.stringify(r),/개인자료점검|0012|fixture-signing-key|test-book/);
});
test('standalone diagnosis works with an older server and sanitizes provider errors and saved codes',()=>{
 const h=service();h.properties.set('LAST_STORAGE_ERROR_CODE','private-code-must-not-appear');h.properties.set('LAST_STORAGE_ERROR_PHASE','private-phase-must-not-appear');
 const logs=[],ctx=vm.createContext({console:{log:s=>logs.push(s)},PropertiesService:h.ctx.PropertiesService,SpreadsheetApp:h.ctx.SpreadsheetApp,Sheets:{Spreadsheets:{get:()=>{throw Error('403 permission denied for private-email and private-book');},batchUpdate:()=>{throw Error('must never write');}}}});
 vm.runInContext(fs.readFileSync('server/StorageDiagnostics.gs','utf8'),ctx);const r=ctx.diagnoseStockKingStorage();
 assert.equal(r.readOnly,true);assert.equal(r.sheetsApi,'PERMISSION_OR_API_DISABLED');assert.equal(r.lastFailure,null);assert.equal(r.lastPhase,null);assert.doesNotMatch(logs.join(''),/private-|test-book|fixture-signing-key/);
});
