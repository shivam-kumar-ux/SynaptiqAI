// js/auth.js — All authentication functions

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();

// ── Sign Up with Email ───────────────────────────────────────
export async function signUpWithEmail(name, email, phone, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      name, email, phone,
      createdAt: serverTimestamp(),
      profileComplete: false
    });
    return { success: true, userId: cred.user.uid, isNewUser: true };
  } catch (e) {
    return { success: false, error: friendlyError(e.code) };
  }
}

// ── Complete Profile (Steps 2 & 3 of signup) ─────────────────
export async function saveFullProfile(userId, profileData) {
  try {
    await setDoc(doc(db, "users", userId), {
      ...profileData,
      profileComplete: true,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Login with Email ─────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const key = "failedAttempts_" + email;
  const lockKey = "lockUntil_" + email;
  const lockUntil = localStorage.getItem(lockKey);
  if (lockUntil && Date.now() < parseInt(lockUntil)) {
    const mins = Math.ceil((parseInt(lockUntil) - Date.now()) / 60000);
    return { success: false, error: `Too many attempts. Try again in ${mins} minute(s).`, locked: true };
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    localStorage.removeItem(key);
    localStorage.removeItem(lockKey);
    return { success: true };
  } catch (e) {
    const attempts = parseInt(localStorage.getItem(key) || "0") + 1;
    localStorage.setItem(key, attempts);
    if (attempts >= 5) {
      localStorage.setItem(lockKey, Date.now() + 15 * 60 * 1000);
      localStorage.removeItem(key);
      return { success: false, error: "Account locked for 15 minutes.", locked: true };
    }
    return { success: false, error: friendlyError(e.code), attemptsLeft: 5 - attempts };
  }
}

// ── Google Login / Signup ─────────────────────────────────────
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const snap = await getDoc(doc(db, "users", user.uid));
    const isNewUser = !snap.exists();
    if (isNewUser) {
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        email: user.email,
        phone: "",
        createdAt: serverTimestamp(),
        profileComplete: false
      });
    }
    return { success: true, isNewUser, userId: user.uid };
  } catch (e) {
    return { success: false, error: friendlyError(e.code) };
  }
}

// ── Verify Password (before logout) ──────────────────────────
export async function verifyPasswordBeforeLogout(password) {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "No user logged in." };
    const cred = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, cred);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Incorrect password." };
  }
}

// ── Logout ───────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
  localStorage.removeItem("timerState");
  localStorage.removeItem("currentSession");
  localStorage.removeItem("cachedPlan");
  window.location.href = "../index.html";
}

// ── Auth State Listener ───────────────────────────────────────
export function checkAuthState(onLoggedIn, onLoggedOut) {
  onAuthStateChanged(auth, user => {
    if (user) onLoggedIn(user);
    else { if (onLoggedOut) onLoggedOut(); }
  });
}

// ── Send Password Reset Email ────────────────────────────────
export async function sendReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (e) {
    return { success: false, error: friendlyError(e.code) };
  }
}

// ── Friendly Error Messages ───────────────────────────────────
function friendlyError(code) {
  const map = {
    "auth/wrong-password":       "Incorrect password. Check and try again.",
    "auth/user-not-found":       "No account found with this email.",
    "auth/email-already-in-use": "This email is already registered. Try logging in.",
    "auth/weak-password":        "Password must be at least 6 characters.",
    "auth/too-many-requests":    "Too many attempts. Please wait before trying again.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Check your internet connection."
  };
  return map[code] || "Something went wrong. Please try again.";
}
