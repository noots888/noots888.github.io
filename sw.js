const CACHE='field-diary-low-risk-checked-v1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.png','./icon-maskable.png','./ribbon-mobile-bg.png','./ribbon-wide.jpg','./ribbon-logo.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const req=e.request;
  const isNav=req.mode==='navigate' || (req.headers.get('accept')||'').includes('text/html');
  e.respondWith(fetch(req,{cache:isNav?'no-store':'default'}).then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
    return r;
  }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus' in c)return c.focus();}if(clients.openWindow)return clients.openWindow('./');}));});
