const CACHE_NAME = 'sakhalin-3d-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/styles/main.css',
  './src/core/state.js',
  './src/data/coastline.js',
  './src/data/facilities.js',
  './src/data/partner-logos-data.js',
  './src/terrain/utils.js',
  './src/terrain/ocean-and-island.js',
  './src/sakhalin2/models.js',
  './src/sakhalin2/environment.js',
  './src/sakhalin2/pipelines.js',
  './src/sakhalin2/scene.js',
  './src/sakhalin1/far-east-terrain.js',
  './src/sakhalin1/models-and-pipelines.js',
  './src/sakhalin1/clouds-and-neighbors.js',
  './src/sakhalin1/project-switch.js',
  './src/ui/controls.js',
  './src/engine/main-loop.js',
  './src/intro/sakhgu-emblem-data.js',
  './src/intro/globe.js',
  './src/polish/device-and-effects.js',
  './src/sakhalin1/alive-world.js',
  './src/sakhalin1/alive-ice-and-infra.js',
  './src/audio/sound.js',
  './src/sakhalin2/runtime.js',
  './src/i18n/i18n.js',
  './src/engine/bootstrap.js'
];

const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedCdn = CDN_HOSTS.includes(url.hostname);

  if (isSameOrigin) {
    // Network-first: обновления на GitHub Pages подтягиваются сразу,
    // а при отсутствии интернета отдаётся сохранённая копия из кэша.
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (isAllowedCdn) {
    // Cache-first с догрузкой для библиотек Three.js / Tailwind / шрифтов (для офлайн-PWA).
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && (response.ok || response.type === 'opaque')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
  }
});
