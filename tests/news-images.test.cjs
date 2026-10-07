const {test}=require('node:test'),assert=require('node:assert/strict');const {harness,signup}=require('./helpers.cjs');
test('authored news selects stable scene-specific NEWS ids and legacy articles stay readable',()=>{
 const h=harness(),r=signup(h);for(const n of r.snapshot.news){assert.match(n.image,/^NEWS-\d{3}$/);assert.equal(h.K.newsImageFor(n),n.image);}
 assert.equal(h.K.newsImageFor({id:'rate',title:'기준금리 결정',sector:'경제'}),'NEWS-072');
 assert.equal(h.K.newsImageFor({id:'supply',title:'부품 공급 지연',sector:'자동차'}),'NEWS-093');
 assert.equal(h.K.newsImageFor({id:'dividend',title:'배당 공시',sector:'반도체'}),'NEWS-085');
 assert.notEqual(h.K.newsImageFor({id:'game',title:'서비스 안정화',sector:'디지털'},'game-patch'),'NEWS-043');
});
test('client accepts only the supplied 100 ids and separates thumbnails from article images',async()=>{
 const {newsImageUrl}=await import('../js/news-content.js');
 assert.equal(newsImageUrl({image:'NEWS-100'}),'./assets/news/NEWS-100.webp');
 assert.equal(newsImageUrl({image:'NEWS-001'},true),'./assets/news/NEWS-001-thumb.webp');
 for(const image of ['NEWS-000','NEWS-101','../private','NEWS-001/../../x'])assert.equal(newsImageUrl({image}),'./assets/news/economy.png');
});
