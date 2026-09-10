// js/ui-components.js — Shared App Shell, Header, Mobile Nav, and Toasts for SYNAPTIQAI

import { globalCommandPalette } from "./command-palette.js";
import { ROUTES, navigateTo, logoutUser } from "./routes.js";

export function renderAppShell(activePage = "dashboard", breadcrumbTitle = "Dashboard") {
  const sidebarNavItems = [
    { id: "dashboard", route: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "plan-new", route: "planNew", icon: "➕", label: "New Plan" },
    { id: "session", route: "session", icon: "🧠", label: "Study Mode" },
    { id: "progress", route: "progress", icon: "📈", label: "Progress & Map" },
    { id: "quiz", route: "quiz", icon: "🧪", label: "Quizzes" },
    { id: "assessment", route: "assessment", icon: "📝", label: "Assessment" },
    { id: "report", route: "report", icon: "📄", label: "Readiness Report" },
    { id: "ai-provider", route: "aiProvider", icon: "🤖", label: "AI Providers" },
    { id: "profile", route: "profile", icon: "👤", label: "Scholar Profile" },
    { id: "settings", route: "settings", icon: "⚙️", label: "Settings" }
  ];

  // 1. Render Sidebar
  const sidebarEl = document.querySelector(".app-sidebar");
  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <div class="sidebar-brand" style="cursor:pointer" id="brandLogoHome">
        <img src="../img/synaptiq_logo_removebg.png" alt="SYNAPTIQ Logo" onerror="this.src='/img/synaptiq_logo_removebg.png'">
        <span>SYNAPTIQ</span>
      </div>
      <nav class="sidebar-nav">
        ${sidebarNavItems.map(item => `
          <a href="${ROUTES[item.route]}" class="nav-link ${item.id === activePage ? 'active' : ''}">
            <span style="font-size:1.1rem">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      <div style="padding: 16px 20px; border-top: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size: 0.85rem; font-weight: 600;" id="shellUserName">Scholar</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Local-First Session</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="sidebarLogoutBtn" title="Logout" style="color:var(--danger)">🚪</button>
      </div>
    `;

    document.getElementById("brandLogoHome")?.addEventListener("click", () => navigateTo("dashboard"));
    document.getElementById("sidebarLogoutBtn")?.addEventListener("click", logoutUser);
  }

  // 2. Render Topbar Header
  const topbarEl = document.querySelector(".app-topbar");
  if (topbarEl) {
    topbarEl.innerHTML = `
      <div class="breadcrumb-path">
        <span>SynaptiqAI</span>
        <span>/</span>
        <span class="current">${breadcrumbTitle}</span>
      </div>

      <div class="topbar-actions">
        <button class="cmd-k-btn" id="topbarCmdKBtn">
          <span>🔍</span>
          <span>Search...</span>
          <span class="kbd-badge">Ctrl K</span>
        </button>

        <a href="${ROUTES.aiProvider}" class="btn btn-ghost btn-sm" title="AI Provider Setup">🤖</a>
        <a href="${ROUTES.profile}" class="btn btn-ghost btn-sm" title="Profile">👤</a>
        <a href="${ROUTES.settings}" class="btn btn-ghost btn-sm" title="Settings">⚙️</a>
      </div>
    `;

    document.getElementById("topbarCmdKBtn")?.addEventListener("click", () => {
      globalCommandPalette.open();
    });
  }

  // 3. Render Mobile Bottom Navigation
  let mobileNav = document.querySelector(".mobile-bottom-nav");
  if (!mobileNav) {
    mobileNav = document.createElement("div");
    mobileNav.className = "mobile-bottom-nav";
    document.body.appendChild(mobileNav);
  }

  mobileNav.innerHTML = `
    <a href="${ROUTES.dashboard}" class="mobile-nav-item ${activePage === 'dashboard' ? 'active' : ''}">
      <span style="font-size:1.2rem">📊</span>
      <span>Home</span>
    </a>
    <a href="${ROUTES.session}" class="mobile-nav-item ${activePage === 'session' ? 'active' : ''}">
      <span style="font-size:1.2rem">🧠</span>
      <span>Learn</span>
    </a>
    <a href="${ROUTES.planNew}" class="mobile-nav-item ${activePage === 'plan-new' ? 'active' : ''}">
      <span style="font-size:1.2rem">➕</span>
      <span>Plan</span>
    </a>
    <a href="${ROUTES.progress}" class="mobile-nav-item ${activePage === 'progress' ? 'active' : ''}">
      <span style="font-size:1.2rem">📈</span>
      <span>Progress</span>
    </a>
    <a href="${ROUTES.profile}" class="mobile-nav-item ${activePage === 'profile' ? 'active' : ''}">
      <span style="font-size:1.2rem">👤</span>
      <span>Profile</span>
    </a>
  `;
}

export function showToast(message, type = "info") {
  let toastContainer = document.getElementById("synaptiq-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "synaptiq-toast-container";
    toastContainer.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 10000;
      display: flex; flex-direction: column; gap: 10px; pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-accent, rgba(0, 245, 255, 0.4));
    border-radius: var(--radius-md, 10px);
    padding: 12px 20px; color: var(--text-primary, #F1F5F9);
    font-size: 0.875rem; font-weight: 500;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    display: flex; align-items: center; gap: 10px;
    animation: toastIn 0.3s ease; pointer-events: auto;
  `;

  const icons = { info: "ℹ️", success: "✅", warning: "⚠️", danger: "🚨" };
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
