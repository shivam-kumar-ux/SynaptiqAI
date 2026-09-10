// js/theme.js — Theme Management System for SYNAPTIQAI

const THEME_KEY = "synaptiq_theme_preference";

export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);
  
  // System theme change listener
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (localStorage.getItem(THEME_KEY) === "system") {
      applyTheme("system");
    }
  });
}

export function setTheme(mode) {
  if (!["dark", "light", "system"].includes(mode)) return;
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

export function applyTheme(mode) {
  let effectiveTheme = mode;
  if (mode === "system") {
    effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  
  document.documentElement.setAttribute("data-theme", effectiveTheme);
  
  // Dispatch custom theme change event for dynamic charts or icons
  window.dispatchEvent(new CustomEvent("synaptiq-theme-changed", { detail: { theme: effectiveTheme, mode } }));
}

// Automatically initialize theme on script load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}
