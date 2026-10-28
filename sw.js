// Offline cache for the static app. Bump VERSION after changing files.
const VERSION = "shmira-v1.0.0";
const SHELL = [
  "./", "index.html", "css/app.css", "js/app.js", "manifest.json",
  "assets/fonts/frank-ruhl-900.woff2", "assets/fonts/secular-one.woff2", "assets/fonts/heebo-var.woff2",
  "assets/img/hero-portrait.webp", "assets/img/hero-1280.webp", "assets/img/hero-1920.webp",
  "assets/img/stone-tile.webp", "assets/img/marble.webp", "assets/img/marble-frame.webp",
  "assets/img/bamboo-frame.webp", "assets/img/divider.webp",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-180.png", "assets/icons/icon-maskable-512.png",
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match("index.html"))));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./#ch-8")));
});
