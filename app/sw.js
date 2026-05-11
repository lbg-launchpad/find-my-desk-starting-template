// Minimal offline-first service worker. Caches the app shell so that
// after first visit the app can be re-opened offline (esp. on phones).

const CACHE = "spaces-lbg-v1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/app.js",
  "./js/router.js",
  "./js/data.js",
  "./js/store.js",
  "./js/email.js",
  "./js/components/ui.js",
  "./js/components/floorplan.js",
  "./js/components/qrcode.js",
  "./js/views/home.js",
  "./js/views/book.js",
  "./js/views/bookings.js",
  "./js/views/team.js",
  "./js/views/wayfinder.js",
  "./js/views/profile.js",
  "../data/users.json",
  "../floorplans/ground.png",
  "../floorplans/first.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok && new URL(req.url).origin === location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone));
      }
      return res;
    }).catch(() => cached)),
  );
});
