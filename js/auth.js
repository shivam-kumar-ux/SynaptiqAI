// js/auth.js — Authentication System for SYNAPTIQAI

import { dbGet, dbPut, dbGetByIndex, dbDelete } from "./db.js";

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; // User must replace this
const SESSION_KEY = "synaptiq_session";

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  const session = getSession();
  return session || null;
}

export function isAuthenticated() {
  const session = getSession();
  if (!session) return false;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    logout();
    return false;
  }
  return true;
}

export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = window.location.pathname.includes("/pages/") ? "login.html" : "pages/login.html";
  }
}

export function saveSessionUser(user) {
  try {
    const sessionData = {
      id: user.id, // Standardized userId
      googleSub: user.googleSub || "",
      email: user.email || "",
      name: user.name || "Student",
      loginMethod: user.googleSub ? "google" : "email",
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days expiration
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.error("Failed to save session", e);
  }
}

export async function loginWithGoogleResponse(response) {
  try {
    // Decode the JWT token (payload is the second part of the base64url encoded token)
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    
    // Check if user exists in DB
    const googleSub = payload.sub;
    const existingUsers = await dbGetByIndex("users", "email", payload.email);
    let userRecord = null;
    
    if (existingUsers.length > 0) {
      userRecord = existingUsers[0];
      // Update with google info if migrating
      if (!userRecord.googleSub) {
        userRecord.googleSub = googleSub;
        userRecord.photoURL = payload.picture || "";
        userRecord.updatedAt = new Date().toISOString();
        await dbPut("users", userRecord);
      }
    } else {
      userRecord = {
        id: "usr_" + googleSub,
        googleSub: googleSub,
        email: payload.email,
        name: payload.name || "Student",
        photoURL: payload.picture || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboardingCompleted: false
      };
      await dbPut("users", userRecord);
    }

    saveSessionUser(userRecord);
    return { success: true, userId: userRecord.id, onboardingCompleted: userRecord.onboardingCompleted };
  } catch (e) {
    console.error("Google login failed:", e);
    return { success: false, error: e.message || "Google Login processing failed." };
  }
}

export async function saveFullProfile(userId, profileData) {
  try {
    const user = await dbGet("users", userId);
    if (!user) return { success: false, error: "User not found." };

    const updatedUser = {
      ...user,
      ...profileData,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString()
    };

    await dbPut("users", updatedUser);
    saveSessionUser(updatedUser);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function initializeGoogleAuth(buttonId, callback) {
  if (typeof google === "undefined" || !google.accounts) {
    console.error("Google Identity Services library not loaded.");
    return;
  }
  
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response) => {
      const res = await loginWithGoogleResponse(response);
      if (callback) callback(res);
    }
  });

  google.accounts.id.renderButton(
    document.getElementById(buttonId),
    { theme: "outline", size: "large", type: "standard", text: "continue_with" }
  );
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("currentUser"); // clean up legacy
  localStorage.removeItem("timerState");
  localStorage.removeItem("currentSession");
  localStorage.removeItem("cachedPlan");
  localStorage.removeItem("activePlanMeta");
  
  const target = window.location.pathname.includes("/pages/") ? "login.html" : "pages/login.html";
  window.location.href = target;
}
