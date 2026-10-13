var King = typeof King === 'undefined' ? {} : King;
// Keep immutable stored history outside the frequently copied live state.
King.attachHistory = function(stock,load,preview,bars,copyOnLoad) {
  var meta={loaded:false,preview:preview,bars:bars,origin:load},points;
  Object.defineProperty(stock,'_kingHistory',{value:meta,configurable:true});
  Object.defineProperty(stock,'history',{enumerable:true,configurable:true,get:function(){
    if(!meta.loaded){points=load();if(copyOnLoad)points=King.clone(points);meta.loaded=true;meta.preview=null;meta.bars=null;}
    return points;
  },set:function(value){points=value;meta.loaded=true;meta.preview=null;meta.bars=null;}});
};
King.historyPreview = function(stock) {
  var meta=stock._kingHistory;
  return meta&&!meta.loaded&&meta.preview?meta.preview:stock.history.slice(-240);
};
King.historyBars = function(stock) {
  var meta=stock._kingHistory;
  return meta&&!meta.loaded&&meta.bars?meta.bars:{hour:King.chartBars(stock.history,3600000),day:King.chartBars(stock.history,King.DAY)};
};
King.coreCopy = function(state) {
  var core={},market={};
  Object.keys(state).forEach(function(k){if(k!=='market')core[k]=King.clone(state[k]);});
  Object.keys(state.market).forEach(function(k){if(k!=='stocks')market[k]=King.clone(state.market[k]);});
  market.stocks={};Object.keys(state.market.stocks).forEach(function(id){
    var source=state.market.stocks[id],stock={};
    Object.keys(source).forEach(function(k){if(k!=='history')stock[k]=King.clone(source[k]);});
    market.stocks[id]=stock;
  });core.market=market;return core;
};
King.forkState = function(state) {
  var copy=King.coreCopy(state);
  Object.keys(state.market.stocks).forEach(function(id){
    var source=state.market.stocks[id],meta=source._kingHistory,descriptor=Object.getOwnPropertyDescriptor(source,'history');
    var preview=meta&&!meta.loaded?meta.preview:descriptor&&descriptor.value?descriptor.value.slice(-240):null;
    var bars=meta&&!meta.loaded?meta.bars:null;
    var origin=meta&&!meta.loaded?meta.origin:function(){return source.history;};
    King.attachHistory(copy.market.stocks[id],origin,preview,bars,true);
  });return copy;
};
King.publicStock = function(stock) {
  var value={};Object.keys(stock).forEach(function(k){if(k!=='history'&&['fundamental','trend','pressure','tradeEpoch'].indexOf(k)<0)value[k]=King.clone(stock[k]);});
  value.history=King.clone(King.historyPreview(stock));value.chartBars=King.clone(King.historyBars(stock));return value;
};
