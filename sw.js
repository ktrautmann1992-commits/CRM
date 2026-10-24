/* Dienst im Hintergrund: legt die Programmdateien ab, damit das Portal
   auch ohne Netzverbindung startet. Daten liegen ohnehin im Gerät. */
const CACHE = "egc-portal-v1";
const DATEIEN = ["/", "/index.html", "/assets/app.js", "/assets/styles.css", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Netz zuerst, damit neue Versionen sofort ankommen. Ohne Netz aus dem Speicher. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((antwort) => {
        const kopie = antwort.clone();
        caches.open(CACHE).then((c) => c.put(e.request, kopie));
        return antwort;
      })
      .catch(() => caches.match(e.request).then((t) => t || caches.match("/index.html")))
  );
});
