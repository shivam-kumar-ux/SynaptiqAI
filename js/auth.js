// js/auth.js — Authentication System for SYNAPTIQAI

import { dbGet, dbPut, dbGetByIndex } from './db.js';
import { getGoogleClientId } from './config.js';

const SESSION_KEY = 'synaptiq_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  return getSession();
}

export function isAuthenticated() {
  const session = getSession();
  if (!session) return false;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    clearSession();
    return false;
  }
  return true;
}

export function requireAuth() {
  if (!isAuthenticated()) {
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = isInPages ? 'login.html' : 'pages/login.html';
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function saveSessionUser(user) {
  try {
    const sessionData = {
      id: user.id,
      googleSub: user.googleSub || '',
      email: user.email || '',
      name: user.name || 'Student',
      photoURL: user.photoURL || '',
      loginMethod: user.loginMethod || (user.googleSub ? 'google' : 'email'),
      onboardingCompleted: user.onboardingCompleted || false,
      createdAt: user.createdAt || new Date().toISOString(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.error('Failed to save session', e);
  }
}

// ── Google Sign-In (GSI) ─────────────────────────────────────
export async function loginWithGoogleResponse(response) {
  try {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    const payload = JSON.parse(jsonPayload);

    const googleSub = payload.sub;
    const existingByEmail = await dbGetByIndex('users', 'email', payload.email);
    let userRecord = null;

    if (existingByEmail.length > 0) {
      userRecord = existingByEmail[0];
      if (!userRecord.googleSub) {
        userRecord.googleSub = googleSub;
        userRecord.photoURL = payload.picture || '';
        userRecord.loginMethod = 'google';
        userRecord.updatedAt = new Date().toISOString();
        await dbPut('users', userRecord);
      }
    } else {
      userRecord = {
        id: 'usr_' + googleSub,
        googleSub,
        email: payload.email,
        name: payload.name || 'Student',
        photoURL: payload.picture || '',
        loginMethod: 'google',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboardingCompleted: false
      };
      await dbPut('users', userRecord);
    }

    saveSessionUser(userRecord);
    return { success: true, userId: userRecord.id, onboardingCompleted: userRecord.onboardingCompleted };
  } catch (e) {
    console.error('Google login failed:', e);
    return { success: false, error: e.message || 'Google Login processing failed.' };
  }
}

// ── Email/Password Auth ───────────────────────────────────────
async function hashPassword(password) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function signupWithEmail(email, password, name = 'Student') {
  try {
    if (!email || !password) return { success: false, error: 'Email and password are required.' };
    if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };

    const existing = await dbGetByIndex('users', 'email', email.toLowerCase().trim());
    if (existing.length > 0) return { success: false, error: 'An account with this email already exists. Please log in.' };

    const passwordHash = await hashPassword(password);
    const userId = 'usr_email_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    const userRecord = {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name || 'Student',
      passwordHash,
      loginMethod: 'email',
      googleSub: '',
      photoURL: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      onboardingCompleted: false
    };

    await dbPut('users', userRecord);
    saveSessionUser(userRecord);
    return { success: true, userId, onboardingCompleted: false };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function loginWithEmail(email, password) {
  try {
    if (!email || !password) return { success: false, error: 'Email and password are required.' };

    const users = await dbGetByIndex('users', 'email', email.toLowerCase().trim());
    if (users.length === 0) return { success: false, error: 'No account found with this email.' };

    const user = users[0];
    if (!user.passwordHash) return { success: false, error: 'This account uses Google Sign-In. Please use Continue with Google.' };

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) return { success: false, error: 'Incorrect password.' };

    saveSessionUser(user);
    return { success: true, userId: user.id, onboardingCompleted: user.onboardingCompleted };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function sendPasswordReset(email) {
  // Local-first architecture — no email backend. Inform user.
  if (!email) return { success: false, error: 'Please enter your email address.' };
  const users = await dbGetByIndex('users', 'email', email.toLowerCase().trim());
  if (users.length === 0) return { success: false, error: 'No account found with this email.' };
  const user = users[0];
  if (!user.passwordHash) return { success: false, error: 'This account uses Google Sign-In — no password to reset.' };
  // In local-first mode we cannot send an email, so we return a helpful message
  return {
    success: true,
    message: 'SynaptiqAI uses local-first storage. To reset your password, clear your browser data and create a new account, or contact support.'
  };
}

// ── Profile ───────────────────────────────────────────────────
export async function saveFullProfile(userId, profileData) {
  try {
    const user = await dbGet('users', userId);
    if (!user) return { success: false, error: 'User not found.' };
    const updatedUser = { ...user, ...profileData, onboardingCompleted: true, updatedAt: new Date().toISOString() };
    await dbPut('users', updatedUser);
    saveSessionUser(updatedUser);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Google Identity Services Button ───────────────────────────
export function initializeGoogleAuth(buttonId, callback, options = {}) {
  const clientId = getGoogleClientId();
  const container = document.getElementById(buttonId);
  if (!container) return;

  if (!clientId) {
    container.innerHTML = `<div style="padding:10px; border:1px solid var(--border); border-radius:8px; color:var(--text-muted); font-size:0.8rem; text-align:center">Google Sign-In requires a Client ID.<br><a href="settings.html" style="color:var(--accent-primary)">Configure in Settings →</a></div>`;
    return;
  }

  const render = () => {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) return false;

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          const res = await loginWithGoogleResponse(response);
          if (callback) callback(res);
        }
      });

      google.accounts.id.renderButton(
        container,
        {
          theme: options.theme || 'outline',
          size: options.size || 'large',
          type: options.type || 'standard',
          text: options.text || 'continue_with'
        }
      );
      return true;
    } catch (e) {
      console.warn('[GoogleAuth] Failed to initialize button:', e);
      return false;
    }
  };

  if (!render()) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (render() || attempts > 20) {
        clearInterval(interval);
      }
    }, 250);
  }
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('currentUser');
  localStorage.removeItem('timerState');
  localStorage.removeItem('currentSession');
  localStorage.removeItem('cachedPlan');
  localStorage.removeItem('activePlanMeta');
  const isInPages = window.location.pathname.includes('/pages/');
  window.location.href = isInPages ? 'login.html' : 'pages/login.html';
}
