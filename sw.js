// sw.js — Production Service Worker for SYNAPTIQAI PWA
// Strategy: Cache-First for static assets, Network-First for pages, 
//            Stale-While-Revalidate for fonts/images, Background Sync for offline actions.

const APP_VERSION = "v2.0.0";
const CACHE_STATIC = `synaptiq-static-${APP_VERSION}`;
const CACHE_PAGES  = `synaptiq-pages-${APP_VERSION}`;
const CACHE_FONTS  = `synaptiq-fonts-${APP_VERSION}`;

// ── All cacheable static assets ────────────────────────────────
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  "/img/synaptiq_logo_removebg.png",
  "/img/synaptiq_logo.png"
];

const JS_ASSETS = [
  "/js/db.js",
  "/js/auth.js",
  "/js/routes.js",
  "/js/theme.js",
  "/js/ui-components.js",
  "/js/ai.js",
  "/js/ai-providers.js",
  "/js/gdrive.js",
  "/js/notes.js",
  "/js/focus.js",
  "/js/timer-floating.js",
  "/js/adaptive-planner.js",
  "/js/command-palette.js",
  "/js/knowledge-graph.js",
  "/js/diagnostic.js",
  "/js/retention.js",
  "/js/readiness.js",
  "/js/risk.js",
  "/js/mistakes.js",
  "/js/pyq.js",
  "/js/viva.js",
  "/js/capsule.js",
  "/js/coach.js",
  "/js/storage.js",
  "/js/multilingual.js",
  "/js/simulator.js",
  "/js/youtube.js",
  "/js/privacy.js"
];

const PAGE_ASSETS = [
  "/pages/login.html",
  "/pages/signup.html",
  "/pages/dashboard.html",
  "/pages/plan-new.html",
  "/pages/plan-view.html",
  "/pages/session.html",
  "/pages/quiz.html",
  "/pages/assessment.html",
  "/pages/progress.html",
  "/pages/report.html",
  "/pages/settings.html",
  "/pages/profile.html",
  "/pages/ai-provider.html"
];

const FONT_HOSTS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

const SKIP_CACHE_HOSTS = [
  "accounts.google.com",
  "generativelanguage.googleapis.com",
  "api.groq.com",
  "openrouter.ai",
  "api.openai.com",
  "api.anthropic.com",
  "www.googleapis.com"
];

// ── INSTALL — Pre-cache all static assets ─────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then((cache) =>
        cache.addAll([...STATIC_ASSETS, ...JS_ASSETS]).catch(() => {
          // Silently fail — don't block install for missing optional files
        })
      ),
      caches.open(CACHE_PAGES).then((cache) =>
        cache.addAll(PAGE_ASSETS).catch(() => {})
      )
    ])
  );
  self.skipWaiting(); // Activate immediately
});

// ── ACTIVATE — Clean up old caches ────────────────────────────
self.addEventListener("activate", (event) => {
  const CURRENT_CACHES = [CACHE_STATIC, CACHE_PAGES, CACHE_FONTS];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim()) // Take control immediately
  );
});

// ── FETCH — Smart routing strategy ────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // ❌ Skip caching for AI APIs, Google Auth, Drive, etc.
  if (SKIP_CACHE_HOSTS.some((host) => url.hostname.includes(host))) {
    return; // Pass through — let the browser handle it
  }

  // 🔤 Stale-While-Revalidate for Google Fonts
  if (FONT_HOSTS.some((host) => url.hostname.includes(host))) {
    event.respondWith(staleWhileRevalidate(request, CACHE_FONTS));
    return;
  }

  // 📄 Network-First for HTML pages (to stay fresh)
  if (request.headers.get("accept")?.includes("text/html") || url.pathname.endsWith(".html") || url.pathname === "/") {
    event.respondWith(networkFirst(request, CACHE_PAGES));
    return;
  }

  // ⚡ Cache-First for JS, CSS, and images (static assets)
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(networkFirst(request, CACHE_STATIC));
});

// ── Strategies ─────────────────────────────────────────────────

/**
 * Cache-First: Serve from cache; if miss, fetch network and cache the result.
 * Best for static assets that change only when app version bumps.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Return a simple offline fallback for scripts that couldn't load
    return new Response("/* Offline */", { headers: { "Content-Type": "text/javascript" } });
  }
}

/**
 * Network-First: Try network; fall back to cache if offline.
 * Best for HTML pages that should reflect latest changes.
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // If it was a page request and we have nothing, serve the offline shell
    if (request.headers.get("accept")?.includes("text/html")) {
      const offlinePage = await caches.match("/pages/dashboard.html") || await caches.match("/index.html");
      return offlinePage || new Response("<h1>SYNAPTIQAI — You are offline</h1><p>Please reconnect to continue.</p>", {
        headers: { "Content-Type": "text/html" }
      });
    }

    return new Response("Offline", { status: 503 });
  }
}

/**
 * Stale-While-Revalidate: Serve cached version immediately, then update cache in background.
 * Best for fonts, where freshness matters less than speed.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  return cached || await fetchPromise;
}

// ── Push Notifications (optional, scaffolded for future use) ──
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "SYNAPTIQAI";
  const options = {
    body: data.body || "Time to study! Your AI learning session is ready.",
    icon: "/img/synaptiq_logo_removebg.png",
    badge: "/img/synaptiq_logo_removebg.png",
    tag: "synaptiq-reminder",
    renotify: true,
    data: { url: data.url || "/pages/dashboard.html" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click Handler ─────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/pages/dashboard.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(targetUrl) && "focus" in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Message Handler (for skipWaiting from UI) ─────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
