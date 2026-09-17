// js/config.js — Centralized Configuration for SYNAPTIQAI
// Google OAuth Client ID is a PUBLIC identifier — safe to include in source code.
// Security is enforced by "Authorized JavaScript Origins" in Google Cloud Console,
// NOT by keeping this value secret.

const CONFIG_KEY = 'synaptiq_google_client_id';

// Default built-in Client ID for shivam-kumar-ux.github.io/SynaptiqAI
// Users can override this in Settings > Account if deploying their own instance.
const DEFAULT_CLIENT_ID = '232143776749-beq4aommtcrj2f2pet0m17b4dd48bhf6.apps.googleusercontent.com';

/**
 * Get the active Google OAuth Client ID.
 * Priority: localStorage override → built-in default
 */
export function getGoogleClientId() {
  return localStorage.getItem(CONFIG_KEY) || DEFAULT_CLIENT_ID;
}

/**
 * Override the Google OAuth Client ID (for self-hosted instances).
 * @param {string} id - Must end with .apps.googleusercontent.com
 */
export function setGoogleClientId(id) {
  const trimmed = (id || '').trim();
  if (trimmed && trimmed.includes('.apps.googleusercontent.com')) {
    localStorage.setItem(CONFIG_KEY, trimmed);
    return true;
  }
  return false;
}

/**
 * Check if Google Sign-In is properly configured.
 */
export function isGoogleConfigured() {
  const id = getGoogleClientId();
  return !!id && id.includes('.apps.googleusercontent.com');
}

/**
 * Reset to the built-in default Client ID.
 */
export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}
