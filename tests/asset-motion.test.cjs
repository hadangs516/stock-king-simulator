const {test}=require('node:test'),assert=require('node:assert/strict'),{harness,signup}=require('./helpers.cjs');
test('asset money spans include wallet, holdings and expandable details, while buttons retain their actions',async()=>{
 const h=harness(),u=signup(h),a=h.s.accounts[u.snapshot.account.id];a.holdings['005930']={quantity:2,cost:10000,since:h.now};const s=h.call('sync',{token:u.token}).snapshot,{assets}=await import('../js/views.js'),html=assets(s);
 for(const key of ['sum-1-price','wallet-cash','wallet-dividends','holding-005930-price','holding-005930-average','holding-005930-value','asset-profit','asset-realized','asset-available','portfolio-total','portfolio-profit'])assert.ok(html.includes('data-money-key="'+key+'"'),key);
 assert.ok(html.includes('data-action="detail"'));assert.ok(html.includes('data-action="total"'));
});
