// sw.js — Progressive Web App Service Worker for SYNAPTIQAI

const CACHE_NAME = "synaptiq_pwa_cache_v1";
const ASSETS = [
  "/",
  "/index.html",
  "/setup-guide.html",
  "/manifest.json",
  "/img/synaptiq_logo_removebg.png",
  "/js/db.js",
  "/js/auth.js",
  "/js/storage.js",
  "/js/ai.js",
  "/js/ai-providers.js",
  "/js/gdrive.js",
  "/js/knowledge-graph.js",
  "/js/adaptive-planner.js",
  "/js/diagnostic.js",
  "/js/notes.js",
  "/js/youtube.js",
  "/js/capsule.js",
  "/js/focus.js",
  "/js/risk.js",
  "/js/readiness.js",
  "/js/retention.js",
  "/js/mistakes.js",
  "/js/pyq.js",
  "/js/viva.js",
  "/js/multilingual.js",
  "/js/simulator.js",
  "/js/coach.js",
  "/js/privacy.js",
  "/pages/dashboard.html",
  "/pages/login.html",
  "/pages/signup.html",
  "/pages/settings.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network first, fallback to cache for local assets
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/index.html");
        });
      })
  );
});
