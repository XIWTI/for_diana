const CACHE_NAME = "love-arcade-v4";
const ASSETS = [
  ".",
  "index.html",
  "styles.css?v=4",
  "app.js?v=4",
  "manifest.json",
  "icons/love-icon.svg",
  "music/Mrs Magic - Strawberry Guy.mp3",
  "music/LUV3MEMORE_надеюсь,_что_тебе_также_хорошо.mp3",
  "music/Lucy Rose - Pale Blue Eyes.mp3",
  "music/i don t like mirrors - i miss your warm hands.mp3",
  "music/Flxweroff - Killswitch.mp3",
  "music/02 A Normal Life.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS.map((asset) => new URL(asset, self.registration.scope)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
