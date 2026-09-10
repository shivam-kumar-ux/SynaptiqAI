// js/ui-components.js — Shared Reusable UI Component Renderer for SYNAPTIQAI

import { globalCommandPalette } from "./command-palette.js";

export function renderAppShell(activePage = "dashboard", breadcrumbTitle = "Dashboard") {
  const sidebarNavItems = [
    { id: "dashboard", href: "/pages/dashboard.html", icon: "📊", label: "Dashboard" },
    { id: "plan-new", href: "/pages/plan-new.html", icon: "➕", label: "New Plan" },
    { id: "session", href: "/pages/session.html", icon: "🧠", label: "Study Mode" },
    { id: "progress", href: "/pages/progress.html", icon: "📈", label: "Progress & Map" },
    { id: "quiz", href: "/pages/quiz.html", icon: "🧪", label: "Quizzes" },
    { id: "assessment", href: "/pages/assessment.html", icon: "📝", label: "Assessment" },
    { id: "report", href: "/pages/report.html", icon: "📄", label: "Readiness Report" },
    { id: "settings", href: "/pages/settings.html", icon: "⚙️", label: "Settings" }
  ];

  // 1. Render Sidebar
  const sidebarEl = document.querySelector(".app-sidebar");
  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <div class="sidebar-brand">
        <img src="/img/synaptiq_logo_removebg.png" alt="SYNAPTIQ Logo">
        <span>SYNAPTIQ</span>
      </div>
      <nav class="sidebar-nav">
        ${sidebarNavItems.map(item => `
          <a href="${item.href}" class="nav-link ${item.id === activePage ? 'active' : ''}">
            <span style="font-size:1.1rem">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      <div style="padding: 16px 20px; border-top: 1px solid var(--border);">
        <div style="font-size: 0.85rem; font-weight: 600;" id="shellUserName">Student</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Local-First Session</div>
      </div>
    `;
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

        <a href="/pages/settings.html" class="btn btn-ghost btn-sm" title="Settings">⚙️</a>
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
    <a href="/pages/dashboard.html" class="mobile-nav-item ${activePage === 'dashboard' ? 'active' : ''}">
      <span style="font-size:1.2rem">📊</span>
      <span>Home</span>
    </a>
    <a href="/pages/session.html" class="mobile-nav-item ${activePage === 'session' ? 'active' : ''}">
      <span style="font-size:1.2rem">🧠</span>
      <span>Learn</span>
    </a>
    <a href="/pages/plan-new.html" class="mobile-nav-item ${activePage === 'plan-new' ? 'active' : ''}">
      <span style="font-size:1.2rem">➕</span>
      <span>Plan</span>
    </a>
    <a href="/pages/progress.html" class="mobile-nav-item ${activePage === 'progress' ? 'active' : ''}">
      <span style="font-size:1.2rem">📈</span>
      <span>Progress</span>
    </a>
    <a href="/pages/settings.html" class="mobile-nav-item ${activePage === 'settings' ? 'active' : ''}">
      <span style="font-size:1.2rem">⚙️</span>
      <span>More</span>
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

export function renderEmptyState(containerId, title, description, buttonText = null, buttonAction = null) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div style="text-align: center; padding: 48px 20px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg);">
      <div style="font-size: 3rem; margin-bottom: 12px;">📁</div>
      <h3 style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--text-primary); margin-bottom: 8px;">${title}</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); max-width: 400px; margin: 0 auto 20px; line-height: 1.5;">${description}</p>
      ${buttonText ? `<button class="btn btn-primary" id="emptyStateBtn">${buttonText}</button>` : ''}
    </div>
  `;

  if (buttonText && buttonAction) {
    document.getElementById("emptyStateBtn")?.addEventListener("click", buttonAction);
  }
}
