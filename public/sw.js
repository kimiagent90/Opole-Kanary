// Service worker: sieć najpierw, cache jako zapas offline. API, SSE i panel admina nigdy nie są cache'owane.
const V = 'kanary-v4';
const ASSETS = ['/', '/styles.css', '/app.js', '/i18n.js', '/map-engine.js', '/guide.js', '/manifest.webmanifest', '/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(ASSETS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/admin')) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then((m) => m || caches.match('/'))));
});

// ---- Web Push: powiadomienie bez ładunku, treść pobieramy z serwera ----
const TXT = {
  pl: { t: 'Kanary Opole — kontrolerzy!', near: (m) => `Kontrolerzy ok. ${m} m od Ciebie`, line: (l) => `Kontrolerzy na linii ${l}`, any: 'Nowe zgłoszenie kontrolerów' },
  uk: { t: 'Kanary Opole — контролери!', near: (m) => `Контролери приблизно за ${m} м від вас`, line: (l) => `Контролери на лінії ${l}`, any: 'Нове повідомлення про контролерів' },
  ru: { t: 'Kanary Opole — контролёры!', near: (m) => `Контролёры примерно в ${m} м от вас`, line: (l) => `Контролёры на линии ${l}`, any: 'Новое сообщение о контролёрах' },
  en: { t: 'Kanary Opole — inspectors!', near: (m) => `Inspectors about ${m} m from you`, line: (l) => `Inspectors on line ${l}`, any: 'New inspector report' },
};
self.addEventListener('push', (e) => e.waitUntil((async () => {
  let d = {};
  try { const sub = await self.registration.pushManager.getSubscription();
    if (sub) d = await (await fetch('/api/push/peek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })).json(); } catch {}
  const L = TXT[(self.navigator.language || 'pl').slice(0, 2)] || TXT.pl;
  let body = d.near != null ? L.near(d.near) : d.route ? L.line(d.route) : L.any;
  if (d.comment) body += ' — ' + d.comment;
  await self.registration.showNotification(L.t, { body, icon: '/icon-192.png', badge: '/icon-64.png', tag: 'kanary', renotify: true, vibrate: [120, 60, 120], data: { lat: d.lat, lon: d.lon } });
})()));
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const { lat, lon } = e.notification.data || {}, has = lat && lon;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs[0];
    if (c) { c.focus(); if (has) c.postMessage({ go: [lat, lon] }); return; }
    return self.clients.openWindow(has ? `/?r=${lat},${lon}` : '/');
  }));
});
