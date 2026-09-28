const CACHE='stock-king-v0.1.3';
const ASSETS=['./','./index.html','./styles.css','./js/config.js','./js/api.js','./js/format.js','./js/views.js','./js/app.js','./js/admin-ui.js','./js/platform.js','./js/friends-ui.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('stock-king-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const scope=new URL(self.registration.scope);if(!ASSETS.some(path=>new URL(path,scope).pathname===url.pathname))return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(value=>value||Response.error())));
});
