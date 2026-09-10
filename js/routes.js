// js/routes.js — Dynamic Relative Navigation Engine for SYNAPTIQAI

const PAGE_FILES = {
  home: "index.html",
  login: "pages/login.html",
  signup: "pages/signup.html",
  dashboard: "pages/dashboard.html",
  planNew: "pages/plan-new.html",
  planView: "pages/plan-view.html",
  assessment: "pages/assessment.html",
  quiz: "pages/quiz.html",
  session: "pages/session.html",
  progress: "pages/progress.html",
  report: "pages/report.html",
  settings: "pages/settings.html",
  profile: "pages/profile.html",
  aiProvider: "pages/ai-provider.html",
  setupGuide: "setup-guide.html"
};

/**
 * Returns the exact relative path for any target page based on current page location
 */
export function getRoute(routeName) {
  const fullTarget = PAGE_FILES[routeName] || PAGE_FILES.dashboard;
  const isSubDir = window.location.pathname.includes("/pages/");

  if (isSubDir) {
    if (fullTarget.startsWith("pages/")) {
      return fullTarget.replace("pages/", ""); // e.g. "plan-new.html"
    } else {
      return "../" + fullTarget; // e.g. "../index.html"
    }
  } else {
    return fullTarget; // e.g. "pages/dashboard.html" or "index.html"
  }
}

/**
 * Global ROUTES object populated dynamically
 */
export const ROUTES = new Proxy({}, {
  get(target, prop) {
    return getRoute(prop);
  }
});

/**
 * Perform safe relative navigation without 404s
 */
export function navigateTo(routeName, params = {}) {
  let path = getRoute(routeName);
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
  window.location.href = getRoute("login");
}
