// service-worker.js for https://endroid.pages.dev/Base64/
const CACHE_NAME = 'static-v1';
const BACKUP_CACHE_NAME = 'backup-static-v1';
const FONTS_CACHE = 'google-fonts-v1';
const MATERIAL_CACHE = 'material-icons-v1';

// List of files to cache (all critical assets)
const STATIC_FILES = [
  '/Base64/',
  '/Base64/index.html',
  '/Base64/manifest.json',
  '/Base64/favicon.svg',
  '/Base64/favicon.ico',
  '/Base64/icons/icon-192x192.png',
  '/Base64/icons/icon-384x384.png',
  '/Base64/icons/icon-512x512.png',
  '/Base64/icons/icon-192x192-maskable.png',
  '/Base64/icons/icon-512x512-maskable.png'
];

// Google Fonts URLs
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&family=Google+Sans+Flex:wdth,wght@75,400;100,500;125,700',
  'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2',
  'https://fonts.gstatic.com/s/googlesansflex/v9/NaPecZIVo6fmpj7i2Hh4TUhYwe9H0R3jO4M.woff2'
  // Add more font file URLs if needed – but Google Fonts CSS will handle actual font file requests
];

// Material Symbols (CSS + font)
const MATERIAL_URLS = [
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
  'https://fonts.gstatic.com/s/materialsymbolsoutlined/v37/kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oDMzByHX9rA6RzaxHMPdY43zj-jCxv3fzvRNU22ZXGJpEpjC_1v-p_4MrImHCIJIZrDCvHOej.woff2'
];

// Install event – cache all static assets, fonts, and icons in two caches
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    Promise.all([
      // Primary cache
      caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)),
      // Backup cache (second copy)
      caches.open(BACKUP_CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)),
      // Fonts cache
      caches.open(FONTS_CACHE).then(cache => cache.addAll(FONT_URLS)),
      // Material icons cache
      caches.open(MATERIAL_CACHE).then(cache => cache.addAll(MATERIAL_URLS))
    ]).then(() => self.skipWaiting())
  );
});

// Activate event – clean up old caches and take control
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME && key !== BACKUP_CACHE_NAME && key !== FONTS_CACHE && key !== MATERIAL_CACHE) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// Fetch event – double‑cache strategy: try primary cache, then backup, then network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle Google Fonts requests (CSS + font files)
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response;
        return fetch(event.request).then(fetchRes => {
          return caches.open(FONTS_CACHE).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        });
      }).catch(() => caches.match('/Base64/index.html')) // fallback to homepage
    );
    return;
  }
  
  // Handle Material Symbols requests
  if (url.href.includes('material-symbols')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response;
        return fetch(event.request).then(fetchRes => {
          return caches.open(MATERIAL_CACHE).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        });
      })
    );
    return;
  }
  
  // For all other static assets (HTML, JS, icons, manifest)
  event.respondWith(
    caches.match(event.request).then(response => {
      // Found in primary cache
      if (response) return response;
      
      // Try backup cache
      return caches.open(BACKUP_CACHE_NAME).then(backupCache => {
        return backupCache.match(event.request).then(backupResponse => {
          if (backupResponse) return backupResponse;
          
          // Not in any cache – fetch from network and store in BOTH caches
          return fetch(event.request).then(fetchRes => {
            if (!fetchRes || fetchRes.status !== 200) return fetchRes;
            const cloned = fetchRes.clone();
            // Store in primary cache
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
            // Also store in backup cache (second copy)
            caches.open(BACKUP_CACHE_NAME).then(cache => cache.put(event.request, fetchRes.clone()));
            return fetchRes;
          });
        });
      });
    }).catch(() => {
      // Offline fallback – serve index.html for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/Base64/index.html');
      }
      return new Response('Offline – content not cached', { status: 404 });
    })
  );
});
