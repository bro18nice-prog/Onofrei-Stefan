/* Service worker al agendei: face agenda instalabilă ca aplicație pe telefon.
   Nu păstrează nimic în cache (datele vin mereu de pe server); fără internet arată un mesaj clar. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(function () {
    return new Response(
      '<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Fără internet</title><body style="font:17px/1.5 system-ui,sans-serif;background:#0f3550;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center">' +
      '<div><h1 style="font-size:1.4rem">Nu există conexiune la internet</h1><p>Agenda are nevoie de internet. Verifică Wi-Fi sau datele mobile și redeschide aplicația.</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }));
});

/* Notificare primită de la server: „Cerere nouă de programare”. */
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Medicenter', {
    body: d.body || 'Ai o cerere nouă în agendă.', icon: 'img/icon-192.png', badge: 'img/icon-192.png',
    tag: 'medicenter-cerere', renotify: true, data: { url: d.url || 'agenda.html#admin' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || 'agenda.html#admin', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if (list[i].url.indexOf('agenda.html') >= 0) { list[i].navigate(url); return list[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
