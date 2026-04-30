/**
 * sw.js — Notes Editor Service Worker
 *
 * Strategy:
 *   - App shell and static assets → Cache First / stale-while-revalidate
 *   - Document navigations → Network First with cached root fallback
 *   - Images and runtime requests → stale-while-revalidate
 *
 * The app stores all user data in localStorage, so offline = full functionality.
 */

const CACHE_NAME = 'notes-v3';
const RUNTIME_CACHE = 'notes-runtime-v3';
const FONT_CACHE = 'notes-fonts-v3';

// Resources to pre-cache on install (app shell)
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon.svg',
];

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache what we can — Next.js chunks will be cached on first fetch
      try {
        await cache.addAll(APP_SHELL);
      } catch (e) {
        console.warn('[SW] Pre-cache failed for some resources:', e);
      }
      // Take over immediately without waiting for old SW to die
      await self.skipWaiting();
    })()
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== FONT_CACHE)
          .map((name) => caches.delete(name))
      );
      // Claim all open clients
      await self.clients.claim();
    })()
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') return;

  // Ignore chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) return;

  const isSameOrigin = url.origin === self.location.origin;
  const isNavigationRequest = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');

  // ── Fonts (Google Fonts CDN) ── cache-first, long TTL
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // ── Next.js build assets and other same-origin static files
  // These need to be cached explicitly so the app shell can boot offline.
  if (
    isSameOrigin &&
    (
      url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/_next/image') ||
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'font' ||
      request.destination === 'image' ||
      url.pathname === '/manifest.json' ||
      url.pathname === '/icon.svg'
    )
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // ── App navigation (HTML pages) ── network first with cached root fallback
  if (isNavigationRequest) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // ── Everything else ── stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

// ─── Cache Strategies ─────────────────────────────────────────────────────────

/**
 * Cache First: serve from cache; on miss, fetch from network and cache the result.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — resource not cached', { status: 503 });
  }
}

/**
 * Network First: try network; on failure, serve from cache.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback for navigation — serve the cached root
    if (request.headers.get('accept')?.includes('text/html')) {
      const rootCached = await cache.match('/');
      if (rootCached) return rootCached;
    }
    return new Response('You are offline and this resource is not cached.', { status: 503 });
  }
}

/**
 * Stale While Revalidate: serve cached immediately; update cache in background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (isCacheableResponse(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}

function isCacheableResponse(response) {
  return Boolean(response && (response.ok || response.type === 'opaque'));
}

// ─── Background Sync (optional future) ───────────────────────────────────────
// The app is fully localStorage-based, so no sync is needed.
// This stub is here for future cloud backup features.

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    // Future: sync notes to a backend
    console.log('[SW] Background sync triggered (no-op for now)');
  }
});