/**
 * Noorish's service worker: installable, and readable offline. Built by
 * `pwa.plugin.ts`, which fills in VERSION and PRECACHE for each build.
 *
 * - App files (hashed JS/CSS and the fonts in use): cached at install,
 *   served from the cache. Hashed names never change content, so they
 *   can't go stale.
 * - Pages: network first, falling back after NETWORK_TIMEOUT_MS or when
 *   offline to the saved copy (or the home shell, since every page renders
 *   on the client from the same shell).
 * - Quran data (`/quran/*`): from the cache, refreshed in the background,
 *   kept across app versions. Opening a surah, or the idle prefetch,
 *   saves it.
 * - Never touched: auth, server functions, other origins (the recitation
 *   CDN, the city geocoder). They need the network and must not be cached.
 */

const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;

const APP_CACHE = `noorish-app-${VERSION}`;
// Per version: a page saved by an older version names files that version's
// cleanup deleted, so it must never be served after an update.
const PAGE_CACHE = `noorish-pages-${VERSION}`;
const DATA_CACHE = 'noorish-quran';
const SHELL = '/';
/**
 * A launch on a weak connection shows the saved page after this long
 * instead of a blank screen; the network response still refreshes the cache.
 */
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(async (cache) => {
      await cache.addAll(PRECACHE);
      const pages = await caches.open(PAGE_CACHE);
      await pages.add(SHELL);
    }),
  );
  // The first install takes over at once; updates wait for the reader to
  // accept them (see SKIP_WAITING), so a page never mixes two versions.
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([APP_CACHE, PAGE_CACHE, DATA_CACHE]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_serverFn')) return;

  if (request.mode === 'navigate') event.respondWith(networkFirstPage(request, event));
  else if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(request, APP_CACHE));
  else if (url.pathname.startsWith('/quran/')) event.respondWith(staleWhileRevalidate(request, DATA_CACHE, event));
  else event.respondWith(staleWhileRevalidate(request, APP_CACHE, event));
});

async function networkFirstPage(request, event) {
  const cache = await caches.open(PAGE_CACHE);
  const saved = async () => (await cache.match(request, { ignoreSearch: true })) ?? (await cache.match(SHELL));
  const network = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });
  event.waitUntil(network.catch(() => {}));

  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  const first = await Promise.race([network.catch(() => null), timeout.then(() => null)]);
  if (first) return first;
  return (await saved()) ?? (await network.catch(() => Response.error()));
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) return cache.put(request, response.clone()).then(() => response);
      return response;
    })
    .catch(() => cached ?? Response.error());
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return refresh;
}
