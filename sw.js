/* =========================================================
   sw.js – service worker: aplicația merge și offline.
   Fișierele aplicației: network-first, cu copie în cache pentru offline.
   Fonturile Google: salvate în cache la prima folosire.
   Crește VERSION când modifici fișierele aplicației.
   ========================================================= */
const VERSION = 'pq-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js', 'js/util.js', 'js/db.js', 'js/store.js', 'js/pixel.js', 'js/icons.js', 'js/heroes.js', 'js/audio.js',
  'js/router.js', 'js/ui.js', 'js/game.js', 'js/charts.js', 'js/photos.js', 'js/backup.js',
  'js/data/exercises.js', 'js/data/habits-default.js',
  'js/screens/heroselect.js', 'js/screens/map.js', 'js/screens/dashboard.js', 'js/screens/trackers.js',
  'js/screens/books.js', 'js/screens/tasks.js', 'js/screens/habits.js', 'js/screens/gym.js',
  'js/screens/calendar.js', 'js/screens/stats.js', 'js/screens/gallery.js', 'js/screens/profile.js',
];
const FONT_CACHE = 'pq-fonts';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Fonturi: stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Fișierele aplicației: întâi rețeaua (ca să primești mereu ultima versiune),
  // iar fără internet, copia din cache.
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(async () => (await caches.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});

// Atingerea unei notificări deschide aplicația
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => (list[0] ? list[0].focus() : self.clients.openWindow('./#/obiceiuri'))));
});
