// js/auth.js — Local-First Authentication System for SYNAPTIQAI

import { dbGet, dbPut, dbGetByIndex, dbDelete, dbClear } from "./db.js";

// Helper: Hash password using Web Crypto API SHA-256 with salt
async function hashPassword(password, salt = "synaptiq_local_salt_v1") {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password + salt),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", derivedKey);
  const hashArray = Array.from(new Uint8Array(exported));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Sign Up with Email ───────────────────────────────────────
export async function signUpWithEmail(name, email, phone, password) {
  try {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: "Email and password are required." };
    }

    const existingUsers = await dbGetByIndex("users", "email", cleanEmail);
    if (existingUsers.length > 0) {
      return { success: false, error: "An account with this email already exists locally." };
    }

    const userId = "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const passwordHash = await hashPassword(password, cleanEmail);

    const newUser = {
      id: userId,
      name: name || "Student",
      email: cleanEmail,
      phone: phone || "",
      passwordHash,
      createdAt: new Date().toISOString(),
      profileComplete: false
    };

    await dbPut("users", newUser);
    saveSessionUser(newUser);

    return { success: true, userId, isNewUser: true };
  } catch (e) {
    return { success: false, error: e.message || "Failed to create local account." };
  }
}

// ── Save Full Profile ────────────────────────────────────────
export async function saveFullProfile(userId, profileData) {
  try {
    const user = await dbGet("users", userId);
    if (!user) return { success: false, error: "User not found." };

    const updatedUser = {
      ...user,
      ...profileData,
      profileComplete: true,
      updatedAt: new Date().toISOString()
    };

    await dbPut("users", updatedUser);
    saveSessionUser(updatedUser);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Login with Email ─────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const key = "failedAttempts_" + cleanEmail;
  const lockKey = "lockUntil_" + cleanEmail;
  const lockUntil = localStorage.getItem(lockKey);

  if (lockUntil && Date.now() < parseInt(lockUntil)) {
    const mins = Math.ceil((parseInt(lockUntil) - Date.now()) / 60000);
    return { success: false, error: `Too many attempts. Try again in ${mins} minute(s).`, locked: true };
  }

  try {
    const matchingUsers = await dbGetByIndex("users", "email", cleanEmail);
    if (matchingUsers.length === 0) {
      recordFailedAttempt(key, lockKey);
      return { success: false, error: "No account found with this email on this device." };
    }

    const user = matchingUsers[0];
    const passwordHash = await hashPassword(password, cleanEmail);

    if (user.passwordHash !== passwordHash) {
      const attempts = recordFailedAttempt(key, lockKey);
      if (attempts >= 5) {
        return { success: false, error: "Account locked for 15 minutes due to failed attempts.", locked: true };
      }
      return { success: false, error: "Incorrect password. Please try again." };
    }

    localStorage.removeItem(key);
    localStorage.removeItem(lockKey);

    saveSessionUser(user);
    return { success: true, userId: user.id };
  } catch (e) {
    return { success: false, error: e.message || "Login failed." };
  }
}

function recordFailedAttempt(key, lockKey) {
  const attempts = parseInt(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, attempts);
  if (attempts >= 5) {
    localStorage.setItem(lockKey, Date.now() + 15 * 60 * 1000);
    localStorage.removeItem(key);
  }
  return attempts;
}

// ── Google Connect / Auth Placeholder ─────────────────────────
export async function loginWithGoogle() {
  // Google login locally acts as a quick profile bootstrap or links with Google Drive OAuth
  return {
    success: false,
    error: "Local account system is active. Use local login or enable Google Drive Backup in Settings."
  };
}

// ── Verify Password ─────────────────────────────────────────
export async function verifyPasswordBeforeLogout(password) {
  try {
    const session = getCurrentSessionUser();
    if (!session || !session.uid) return { success: false, error: "No user logged in." };
    const user = await dbGet("users", session.uid);
    if (!user) return { success: false, error: "User not found." };
    const hash = await hashPassword(password, user.email);
    if (hash === user.passwordHash) return { success: true };
    return { success: false, error: "Incorrect password." };
  } catch (e) {
    return { success: false, error: "Password verification failed." };
  }
}

// ── Logout ───────────────────────────────────────────────────
export async function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("timerState");
  localStorage.removeItem("currentSession");
  localStorage.removeItem("cachedPlan");
  localStorage.removeItem("activePlanMeta");
  window.location.href = "../index.html";
}

// ── Auth State Listener ───────────────────────────────────────
export function checkAuthState(onLoggedIn, onLoggedOut) {
  const user = getCurrentSessionUser();
  if (user && user.uid) {
    dbGet("users", user.uid).then(dbUser => {
      if (dbUser) {
        onLoggedIn(dbUser);
      } else {
        localStorage.removeItem("currentUser");
        if (onLoggedOut) onLoggedOut();
      }
    }).catch(() => {
      if (onLoggedOut) onLoggedOut();
    });
  } else {
    if (onLoggedOut) onLoggedOut();
  }
}

export function getCurrentSessionUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSessionUser(user) {
  try {
    localStorage.setItem("currentUser", JSON.stringify({
      uid: user.id,
      email: user.email || "",
      name: user.name || "Student"
    }));
  } catch {}
}

export async function deleteLocalAccount(userId) {
  if (!userId) return { success: false, error: "User ID required." };
  try {
    await dbDelete("users", userId);
    localStorage.removeItem("currentUser");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
