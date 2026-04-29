self.addEventListener('install', (e) => {
    e.waitUntil(
      caches.open('kodaos-store').then((cache) => cache.addAll([
        'index.html',
        'manifest.json'
        // Добавь сюда пути к твоим основным JS и CSS файлам
      ]))
    );
  });
  
  self.addEventListener('fetch', (e) => {
    e.respondWith(
      caches.match(e.request).then((response) => response || fetch(e.request))
    );
  });