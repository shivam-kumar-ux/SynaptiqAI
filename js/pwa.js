// js/pwa.js — Service Worker Registration & PWA Lifecycle Manager for SYNAPTIQAI

const SW_PATH = "/sw.js";

let deferredInstallPrompt = null;
let swRegistration = null;

/**
 * Register the Service Worker and wire up install/update lifecycle events.
 * Call this from every page's module script.
 */
export async function registerPWA() {
  if (!("serviceWorker" in navigator)) {
    console.log("[PWA] Service Workers are not supported in this browser.");
    return;
  }

  try {
    swRegistration = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    console.log("[PWA] Service Worker registered:", swRegistration.scope);

    // Listen for a new SW version becoming available
    swRegistration.addEventListener("updatefound", () => {
      const newWorker = swRegistration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // A new version is waiting — notify the user
          notifyUpdateAvailable();
        }
      });
    });

  } catch (err) {
    console.error("[PWA] Service Worker registration failed:", err);
  }

  // Listen for messages from the SW
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "RELOAD") {
      window.location.reload();
    }
  });
}

/**
 * Capture the beforeinstallprompt event so we can show a custom install button.
 * Call this once, early in app startup (from index.html or auth-gated pages).
 */
export function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    // Dispatch a custom event so any page can react
    window.dispatchEvent(new CustomEvent("synaptiq-pwa-installable"));
    console.log("[PWA] Install prompt captured and ready.");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    console.log("[PWA] App installed successfully.");
    window.dispatchEvent(new CustomEvent("synaptiq-pwa-installed"));
  });
}

/**
 * Show the native browser install prompt.
 * @returns {boolean} true if the user accepted, false otherwise.
 */
export async function showInstallPrompt() {
  if (!deferredInstallPrompt) {
    console.warn("[PWA] No install prompt available. Either already installed or not eligible.");
    return false;
  }

  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  console.log("[PWA] Install prompt outcome:", outcome);

  deferredInstallPrompt = null;
  return outcome === "accepted";
}

/**
 * Check if the app is currently running in standalone (installed PWA) mode.
 */
export function isInstalledPWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/**
 * Tell the waiting service worker to skip waiting and take control immediately.
 * Use when the user clicks "Update Now" on the update banner.
 */
export function applyUpdate() {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    // After the new SW takes over, reload
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
}

/**
 * Show an in-app toast/banner when a new app version is available.
 */
function notifyUpdateAvailable() {
  // Create a persistent update banner
  const existing = document.getElementById("synaptiq-update-banner");
  if (existing) return;

  const banner = document.createElement("div");
  banner.id = "synaptiq-update-banner";
  banner.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: var(--bg-elevated, #1e293b);
    border: 1px solid var(--accent-primary, #0ea5e9);
    border-radius: 12px; padding: 12px 20px;
    display: flex; align-items: center; gap: 14px;
    z-index: 99999; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    font-family: var(--font-body, system-ui); font-size: 0.875rem;
    color: var(--text-primary, #f8fafc);
    animation: slideUpFade 0.3s ease;
    min-width: 280px;
  `;
  banner.innerHTML = `
    <span>🚀 A new version of SYNAPTIQAI is ready!</span>
    <button
      id="synaptiq-update-btn"
      style="
        background: var(--accent-primary, #0ea5e9); color: #fff;
        border: none; border-radius: 8px; padding: 6px 14px;
        cursor: pointer; font-weight: 600; font-size: 0.8rem;
        white-space: nowrap;
      "
    >Update Now</button>
    <button
      id="synaptiq-dismiss-update"
      style="background: none; border: none; color: var(--text-muted, #94a3b8); cursor: pointer; font-size: 1rem;"
    >✕</button>
  `;

  // Add keyframe animation if not present
  if (!document.getElementById("synaptiq-pwa-styles")) {
    const style = document.createElement("style");
    style.id = "synaptiq-pwa-styles";
    style.textContent = `
      @keyframes slideUpFade {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  document.getElementById("synaptiq-update-btn")?.addEventListener("click", () => {
    applyUpdate();
    banner.remove();
  });
  document.getElementById("synaptiq-dismiss-update")?.addEventListener("click", () => {
    banner.remove();
  });
}

/**
 * Render an "Install App" button into a given container element.
 * The button auto-hides if the app is already installed.
 */
export function renderInstallButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Hide if already running as PWA
  if (isInstalledPWA()) return;

  const showBtn = () => {
    container.innerHTML = `
      <button id="synaptiq-install-btn" style="
        display: flex; align-items: center; gap: 8px;
        background: var(--accent-primary, #0ea5e9); color: #fff;
        border: none; border-radius: 10px; padding: 10px 20px;
        font-weight: 600; cursor: pointer; font-size: 0.875rem;
      ">
        📲 Install App
      </button>
    `;
    document.getElementById("synaptiq-install-btn")?.addEventListener("click", async () => {
      const accepted = await showInstallPrompt();
      if (accepted) container.innerHTML = "✅ Installed!";
    });
  };

  if (deferredInstallPrompt) {
    showBtn();
  } else {
    window.addEventListener("synaptiq-pwa-installable", showBtn, { once: true });
  }
}
