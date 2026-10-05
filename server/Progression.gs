var King = typeof King === 'undefined' ? {} : King;
King.ensureProgression = function(a) {
  if(!a.attendance){var date=King.date(a.started);a.attendance={firstGranted:true,lastDate:date,streak:1,history:[{date,day:1,amount:a.startingCash||10000000,legacy:true}]};}
  if(!Number.isSafeInteger(a.xp))a.xp=0;
  if(!Number.isSafeInteger(a.tutorialStep))a.tutorialStep=a.tutorial?8:0;
  if(!Number.isSafeInteger(a.contributedCash))a.contributedCash=a.startingCash||10000000;
};
King.attendanceAmount = function(day,first) {return first?1000000:day===30?3000000:day%7===0?500000:100000;};
King.attendanceView = function(a,t) {
  var v=a.attendance,today=King.date(t),gap=v.lastDate?(Date.parse(today)-Date.parse(v.lastDate))/King.DAY:null;
  var claimed=gap===0,next=claimed?v.streak:gap===1?v.streak+1:1;
  return {firstGranted:v.firstGranted,claimed,visible:v.firstGranted&&!(v.history.length===1&&claimed),streak:claimed?v.streak:gap===1?v.streak:0,nextDay:next,amount:King.attendanceAmount(next,!v.firstGranted),history:v.history.slice(-35)};
};
King.attend = function(s,a,t,env,auth) {
  if(auth.proxy)King.fail('출석 보상은 본인 계정에서 받아 주세요.');
  var view=King.attendanceView(a,t);if(view.claimed)return {amount:0,alreadyClaimed:true};
  var amount=view.amount;a.cash=King.int(a.cash+amount,0,900000000000000);a.contributedCash+=amount;
  a.attendance.firstGranted=true;a.attendance.lastDate=King.date(t);a.attendance.streak=view.nextDay;
  a.attendance.history.push({date:King.date(t),day:view.nextDay,amount});a.attendance.history=a.attendance.history.slice(-90);
  King.awardXp(a,'attendance',t);King.log(s,a,'출석 보상',{day:view.nextDay,amount},t,env);
  var point={at:t,date:King.date(t),total:King.snapshot(s,a,t).total},last=a.assetHistory[a.assetHistory.length-1];
  if(last&&last.at===t)a.assetHistory[a.assetHistory.length-1]=point;else a.assetHistory.push(point);
  return {amount,attendanceDay:view.nextDay};
};
King.levelInfo = function(xp) {var level=Math.floor((1+Math.sqrt(1+xp*.08))/2),start=50*level*(level-1),next=50*level*(level+1);return {xp,level,progress:xp-start,required:next-start,next};};
King.awardXp = function(a,kind,t) {
  var rules={attendance:[20,1],news:[5,5],explore:[5,3],trade:[10,3],time:[10,3],achievement:[10,5]},rule=rules[kind];if(!rule)return;
  if(!a.xpDaily||a.xpDaily.date!==King.date(t))a.xpDaily={date:King.date(t),total:0,counts:{}};
  var daily=a.xpDaily,count=daily.counts[kind]||0;if(count>=rule[1]||daily.total>=100)return;
  var amount=Math.min(rule[0],100-daily.total);daily.counts[kind]=count+1;daily.total+=amount;a.xp=(a.xp||0)+amount;
};
