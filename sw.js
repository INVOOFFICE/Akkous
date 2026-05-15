const CACHE_VERSION = "v5";
const CACHE_NAME = `akkous-${CACHE_VERSION}`;
const CACHE_STATIC = `${CACHE_NAME}-static`;
const CACHE_DATA = `${CACHE_NAME}-data`;
const CACHE_PAGES = `${CACHE_NAME}-pages`;

const DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 3000;

const PRECACHE_URLS = [
  "/offline.html",
  "/style.css",
  "/main.js",
  "/assets/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.includes(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  if (url.pathname === "/recipes.json") {
    event.respondWith(staleWhileRevalidateData(request));
    return;
  }

  if (isHtmlRequest(request, url)) {
    event.respondWith(networkFirstPage(request));
  }
});

function isStaticAsset(url) {
  return (
    url.pathname === "/style.css" ||
    url.pathname === "/main.js" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/assets/")
  );
}

function isHtmlRequest(request, url) {
  return (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidateData(request) {
  const cache = await caches.open(CACHE_DATA);
  const cached = await cache.match(request);
  const cachedIsFresh = cached && cachedAge(cached) < DATA_MAX_AGE_MS;

  const refresh = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, withCachedAt(response));
      }
      return response;
    })
    .catch(() => null);

  if (cachedIsFresh) return cached;

  const fresh = await refresh;
  if (fresh) return fresh;
  if (cached) return cached;
  return caches.match("/offline.html");
}

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_PAGES);
  try {
    const response = await fetchWithTimeout(request, PAGE_TIMEOUT_MS);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match("/offline.html");
  }
}

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), timeoutMs);
    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function cachedAge(response) {
  const cachedAt = Number(response.headers.get("X-Akkous-Cached-At") || 0);
  return cachedAt ? Date.now() - cachedAt : Infinity;
}

function withCachedAt(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Akkous-Cached-At", String(Date.now()));
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
