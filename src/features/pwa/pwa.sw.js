/**
 * Noorish's service worker: installable, and readable offline. Built by
 * `pwa.plugin.ts`, which fills in VERSION and PRECACHE for each build.
 *
 * - App files (hashed JS/CSS and the fonts in use): cached at install,
 *   served from the cache. Hashed names never change content, so they
 *   can't go stale.
 * - Pages: a page saved by this version is served at once and refreshed
 *   in the background, so a launch paints from the phone's storage instead
 *   of waiting on the network (iOS shows a white screen until the first
 *   paint). Safe because saved pages are per version: one always names files
 *   this version has cached. A page not saved yet goes to the network,
 *   falling back after NETWORK_TIMEOUT_MS or offline to the home shell
 *   (every page renders on the client from the same shell). New versions
 *   still arrive through the update prompt.
 * - Quran data (`/quran/*`): from the cache, refreshed in the background,
 *   kept across app versions. Opening a surah, or the idle prefetch,
 *   saves it.
 * - Hadith books (from the hadith-api CDN): like Quran data, so a book read
 *   once opens offline.
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
const HADITH_CACHE = 'noorish-hadith';
const HADITH_CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/';
const SHELL = '/';
/**
 * A page not saved yet, on a weak connection, falls back to the home shell
 * after this long instead of a blank screen.
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
      const keep = new Set([APP_CACHE, PAGE_CACHE, DATA_CACHE, HADITH_CACHE]);
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
  if (url.href.startsWith(HADITH_CDN)) return event.respondWith(staleWhileRevalidate(request, HADITH_CACHE, event));
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_serverFn')) return;

  if (request.mode === 'navigate') event.respondWith(page(request, event));
  else if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(request, APP_CACHE));
  else if (url.pathname.startsWith('/quran/')) event.respondWith(staleWhileRevalidate(request, DATA_CACHE, event));
  else event.respondWith(staleWhileRevalidate(request, APP_CACHE, event));
});

async function page(request, event) {
  const cache = await caches.open(PAGE_CACHE);
  const network = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });
  event.waitUntil(network.catch(() => {}));

  const saved = await cache.match(request, { ignoreSearch: true });
  if (saved) return saved;

  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  const first = await Promise.race([network.catch(() => null), timeout.then(() => null)]);
  if (first) return first;
  return (await cache.match(SHELL)) ?? (await network.catch(() => Response.error()));
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
