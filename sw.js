// ─── VERSION ────────────────────────────────────────────────────────────────
// akkous-shell-v3 : bump de version pour forcer l'invalidation du cache
// existant chez tous les visiteurs (ancienne v2 contenait recipes.json en
// cache shell → les nouvelles recettes n'apparaissaient pas).
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_NAME = "akkous-shell-v4";
const RUNTIME_CACHE = "akkous-runtime-v4";

// FIX : recipes.json retiré des SHELL_ASSETS.
// Raison : s'il est mis en cache au moment de l'install, le SW sert
// indéfiniment l'ancienne version même après un push GitHub.
// Il est désormais géré séparément en networkFirst (voir fetch handler).
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./recipe.html",
  "./offline.html",
  "./style.css",
  "./main.js",
  "./manifest.webmanifest",
  "./assets/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, "./offline.html"));
    return;
  }

  // FIX : recipes.json en networkFirst au lieu de staleWhileRevalidate.
  // staleWhileRevalidate servait l'ancienne version en cache immédiatement,
  // ce qui masquait les nouvelles recettes jusqu'à la visite suivante.
  // networkFirst essaie toujours le réseau en premier ; le cache n'est utilisé
  // qu'en cas d'échec réseau (mode hors-ligne).
  if (url.pathname.endsWith("/recipes.json")) {
    event.respondWith(networkFirst(req, "./offline.html"));
    return;
  }

  if (req.destination === "image") {
    event.respondWith(cacheFirst(req));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res.ok) return res;
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

async function networkFirst(request, fallbackPath) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const copy = fresh.clone();
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, copy);
    }
    return fresh;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match(fallbackPath);
    if (fallback) return fallback;
    return caches.match("./index.html");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || caches.match("./offline.html");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}
