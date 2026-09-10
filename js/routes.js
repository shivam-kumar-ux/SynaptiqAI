// js/routes.js — Centralized Route Registry & Navigation Engine for SYNAPTIQAI

export const ROUTES = {
  home: "/index.html",
  login: "/pages/login.html",
  signup: "/pages/signup.html",
  dashboard: "/pages/dashboard.html",
  planNew: "/pages/plan-new.html",
  planView: "/pages/plan-view.html",
  assessment: "/pages/assessment.html",
  quiz: "/pages/quiz.html",
  session: "/pages/session.html",
  progress: "/pages/progress.html",
  report: "/pages/report.html",
  settings: "/pages/settings.html",
  profile: "/pages/profile.html",
  aiProvider: "/pages/ai-provider.html",
  setupGuide: "/setup-guide.html"
};

/**
 * Resolves path correctly whether page is in root or /pages/ subdirectory
 */
export function getRelativeRoute(routeName) {
  const target = ROUTES[routeName] || ROUTES.dashboard;
  const isSubdir = window.location.pathname.includes("/pages/");
  if (isSubdir) {
    return target.replace("/pages/", "");
  }
  return target.startsWith("/") ? target.slice(1) : target;
}

/**
 * Perform safe application navigation without 404s
 */
export function navigateTo(routeName, params = {}) {
  let path = ROUTES[routeName] || ROUTES.dashboard;
  const queryString = new URLSearchParams(params).toString();
  if (queryString) {
    path += "?" + queryString;
  }
  window.location.href = path;
}

/**
 * Global Logout handler
 */
export function logoutUser() {
  localStorage.removeItem("synaptiq_active_user");
  localStorage.removeItem("synaptiq_active_timer_session");
  sessionStorage.clear();
  window.location.href = ROUTES.login;
}
