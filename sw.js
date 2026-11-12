// Offline support for the Home page only. The page is fetched network-first so updates show up straight
// away, with the cached copy as a fallback when there's no signal. This folder's icons are cache-first.
// Supabase requests and anything that isn't a GET are never touched, and neither is any page outside this
// folder: the Dock links to ../todo/, ../calories/ and ../planner/, which belong to other apps.
const CACHE = 'home-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/home-icon-192.png', './icons/home-icon-512.png', './icons/home-apple-touch-icon.png', './icons/home-favicon-32.png',
  './icons/todo.png', './icons/calories.png', './icons/planner.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  if (url.origin !== location.origin || !req.url.startsWith(self.registration.scope)) return;   // other origins and other apps' folders

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  if (url.pathname.startsWith(new URL('./icons/', self.registration.scope).pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
