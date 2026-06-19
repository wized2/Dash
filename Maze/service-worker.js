// service-worker.js
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `endroid-maze-${CACHE_VERSION}`;

// Assets to cache on install – add every static file your app uses.
const STATIC_ASSETS = [
  '/Maze/',              // main HTML page (the index)
  '/Maze/index.html',    // explicit if needed
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-180x180.png',
  '/manifest.json',
  // If you use any external fonts, add them here, e.g.:
  // 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
  // 'https://fonts.gstatic.com/s/roboto/...'
];

// Install event – cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// Activate event – clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event – serve from cache first, fall back to network
self.addEventListener('fetch', event => {
  const request = event.request;

  // Skip cross-origin requests (e.g., analytics) unless they are fonts we explicitly cache.
  // For fonts, we allow cross-origin.
  const url = new URL(request.url);
  if (url.origin !== location.origin && !request.url.includes('fonts.googleapis.com') && !request.url.includes('fonts.gstatic.com')) {
    // For non-origin assets not in our allowed list, just fetch normally.
    event.respondWith(fetch(request));
    return;
  }

  // For same-origin requests and Google Fonts: try cache first.
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version, but also update cache in background (stale-while-revalidate)
          event.waitUntil(updateCache(request));
          return cachedResponse;
        }
        // Not in cache – fetch from network and cache for next time.
        return fetch(request).then(networkResponse => {
          // Cache the fetched response (clone it because it's a stream)
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        }).catch(() => {
          // Offline fallback: could return a custom offline page
          // For now, return a basic response
          return new Response('Offline – please check your connection.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Helper to update cache in the background
function updateCache(request) {
  return fetch(request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, responseClone);
      });
    }
  }).catch(() => {});
}
