const CACHE_NAME = "endroid-calculate-v2.1";

const urlsToCache = [
  "/", // Root (usually serves index.html)
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  // Google Fonts stylesheets (cached for offline use)
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..200&display=swap",
  "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap"
];

// Install event – cache essential files, tolerate external failures
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use allSettled so a failing external font doesn't break installation
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
          )
        );
      })
      .then(() => self.skipWaiting()) // Activate worker immediately
  );
});

// Fetch event – smart strategy
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // For same-origin resources (our app files) – Cache First, then update in background
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache, but also fetch and update cache in background (stale-while-revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => { /* ignore network errors, keep using cache */ });
          return cachedResponse;
        }
        // Not in cache – fetch from network and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => {
          // Optional: return a fallback offline page
          return caches.match('/offline.html');
        });
      })
    );
  } 
  // For cross-origin resources (Google Fonts, etc.) – Cache with network fallback
  else {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // If network fails, return cached (if any)
        
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Activate event – clean up old caches and take control immediately
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim()) // Take control of all pages immediately
  );
});
