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
