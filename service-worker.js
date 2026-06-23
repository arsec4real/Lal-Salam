const CACHE = 'lalsalam-v2';
const SHELL = ['./', './index.html', './login.html', './css/style.css', './data/config.js',
  './js/auth-store.js','./js/app.js','./js/chat.js','./js/animations.js','./js/notify.js','./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => { caches.open(CACHE).then(c2=>c2.put(e.request,r.clone())); return r; }).catch(()=>c)));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { caches.open(CACHE).then(c=>c.put(e.request,r.clone())); return r; }).catch(()=>caches.match(e.request)));
});
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIF') e.waitUntil(showN(e.data.payload));
});
function showN(d) {
  return self.registration.showNotification(d.title||'Lal Salam', {
    body:d.body||'', icon:d.icon||'./assets/icon/icon.png',
    badge:d.badge||'./assets/icon/icon.png',
    tag:d.tag||'ls-'+Date.now(), vibrate:d.vibrate||[200,100,200],
    renotify:true, requireInteraction:d.requireInteraction||false,
    actions:d.actions||[], data:{url:d.url||'./'},
  });
}
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    for (const c of list) { if (c.url.includes(self.registration.scope) && 'focus' in c) { c.focus(); return; } }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});