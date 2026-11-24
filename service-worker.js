const CACHE = 'culinary-academy-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch', event => { const req=event.request; const url=new URL(req.url); if(req.method!=='GET'||url.origin!==self.location.origin||!SHELL.some(p=>new URL(p,self.registration.scope).pathname===url.pathname)) return; event.respondWith(fetch(req).catch(()=>caches.match(req))); });
