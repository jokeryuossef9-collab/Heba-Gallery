/* ═══════════════════════════════════════════════════════════════
   Heba Ahmed Gallery — Service Worker (PWA)
   ═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'heba-gallery-v3';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMG_CACHE     = `${CACHE_VERSION}-img`;
const API_CACHE     = `${CACHE_VERSION}-api`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './admin.html'
];

/* ─────────── INSTALL ─────────── */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
});

/* ─────────── ACTIVATE ─────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─────────── FETCH ─────────── */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Supabase Auth — دايماً شبكة (مفيش كاش)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/auth/')) {
    return;
  }

  // Supabase REST API — Network First + Cache Fallback
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/')) {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(API_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // الصور — Cache First
  if (
    req.destination === 'image' ||
    url.hostname === 'i.postimg.cc' ||
    url.pathname.includes('/storage/v1/object/public/')
  ) {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(req).then(cached => {
          if (cached) return cached;
          return fetch(req).then(res => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // صفحات التنقل — Network First + Cache Fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match('./index.html'))
      )
    );
    return;
  }

  // باقي الملفات (CSS / JS / Fonts) — Stale While Revalidate
  event.respondWith(
    caches.open(STATIC_CACHE).then(cache =>
      cache.match(req).then(cached => {
        const network = fetch(req).then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});

/* ─────────── MESSAGES ─────────── */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});