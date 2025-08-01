const CACHE_NAME = 'shaban-cache-v3';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/offline.html',
        'https://cdn.tailwindcss.com',
        'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap',
        'https://esm.sh/react@^19.1.0',
        'https://esm.sh/react-dom@^19.1.0',
        'https://esm.sh/lucide-react@^0.525.0',
        'https://esm.sh/react-router-dom@^6.24.0'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // لو مفيش نت نجيب من الكاش أو نرجع index.html أو offline.html
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/index.html') || caches.match(OFFLINE_URL);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      )
    )
  );
});
