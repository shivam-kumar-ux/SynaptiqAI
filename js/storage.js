// js/storage.js — All Firestore database operations

import { db } from "./firebase-config.js";
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════
export async function getUserProfile(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? { success: true, data: { id: snap.id, ...snap.data() } } : { success: false, error: "User not found." };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function updateUserProfile(userId, updates) {
  try {
    // Use merge upsert so profile updates never fail for missing docs.
    await setDoc(
      doc(db, "users", userId),
      { ...updates, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════
export async function savePlan(planData) {
  try {
    const ref = await addDoc(collection(db, "plans"), { ...planData, createdAt: serverTimestamp(), status: "active" });
    return { success: true, planId: ref.id };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getPlan(planId) {
  try {
    const snap = await getDoc(doc(db, "plans", planId));
    return snap.exists() ? { success: true, data: { id: snap.id, ...snap.data() } } : { success: false, error: "Plan not found." };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getUserPlans(userId) {
  try {
    const q = query(collection(db, "plans"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snaps = await getDocs(q);
    return { success: true, data: snaps.docs.map(d => ({ id: d.id, ...d.data() })) };
  } catch (e) {
    try {
      // Fallback when orderBy/index constraints fail in some deployments.
      const fallback = query(collection(db, "plans"), where("userId", "==", userId));
      const snaps = await getDocs(fallback);
      const data = snaps.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const at = a?.createdAt?.toMillis?.() || 0;
          const bt = b?.createdAt?.toMillis?.() || 0;
          return bt - at;
        });
      return { success: true, data };
    } catch (inner) {
      return { success: false, error: inner.message || e.message };
    }
  }
}

export async function updatePlanStatus(planId, status) {
  try {
    await updateDoc(doc(db, "plans", planId), { status, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ════════════════════════════════════════════════════════════
// TOPICS
// ════════════════════════════════════════════════════════════
export async function saveTopics(planId, topicsArray) {
  try {
    const batch = writeBatch(db);
    topicsArray.forEach(topic => {
      const ref = doc(collection(db, "topics"));
      batch.set(ref, { ...topic, planId, status: "not_started", completionPercent: 0, createdAt: serverTimestamp() });
    });
    await batch.commit();
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getTopicsForPlan(planId) {
  try {
    const q = query(collection(db, "topics"), where("planId", "==", planId), orderBy("priority_score", "desc"));
    const snaps = await getDocs(q);
    return { success: true, data: snaps.docs.map(d => ({ id: d.id, ...d.data() })) };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function updateTopicStatus(topicId, status, completionPercent) {
  try {
    await updateDoc(doc(db, "topics", topicId), { status, completionPercent, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ════════════════════════════════════════════════════════════
// SESSIONS
// ════════════════════════════════════════════════════════════
export async function saveSession(sessionData) {
  try {
    const ref = await addDoc(collection(db, "sessions"), { ...sessionData, createdAt: serverTimestamp() });
    return { success: true, sessionId: ref.id };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getSessionsForPlan(planId) {
  try {
    const q = query(collection(db, "sessions"), where("planId", "==", planId), orderBy("createdAt", "desc"));
    const snaps = await getDocs(q);
    return { success: true, data: snaps.docs.map(d => ({ id: d.id, ...d.data() })) };
  } catch (e) {
    try {
      const fallback = query(collection(db, "sessions"), where("planId", "==", planId));
      const snaps = await getDocs(fallback);
      const data = snaps.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const at = a?.createdAt?.toMillis?.() || 0;
          const bt = b?.createdAt?.toMillis?.() || 0;
          return bt - at;
        });
      return { success: true, data };
    } catch (inner) {
      return { success: false, error: inner.message || e.message };
    }
  }
}

// ════════════════════════════════════════════════════════════
// QUIZZES
// ════════════════════════════════════════════════════════════
export async function saveQuizResult(quizData) {
  try {
    const ref = await addDoc(collection(db, "quizzes"), { ...quizData, createdAt: serverTimestamp() });
    return { success: true, quizId: ref.id };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getQuizHistory(userId, limitCount) {
  try {
    const q = query(collection(db, "quizzes"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(limitCount || 30));
    const snaps = await getDocs(q);
    return { success: true, data: snaps.docs.map(d => ({ id: d.id, ...d.data() })) };
  } catch (e) {
    try {
      const fallback = query(collection(db, "quizzes"), where("userId", "==", userId));
      const snaps = await getDocs(fallback);
      const data = snaps.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const at = a?.createdAt?.toMillis?.() || 0;
          const bt = b?.createdAt?.toMillis?.() || 0;
          return bt - at;
        })
        .slice(0, limitCount || 30);
      return { success: true, data };
    } catch (inner) {
      return { success: false, error: inner.message || e.message };
    }
  }
}

// ════════════════════════════════════════════════════════════
// ASSESSMENTS
// ════════════════════════════════════════════════════════════
export async function saveAssessment(assessmentData) {
  try {
    const ref = await addDoc(collection(db, "assessments"), { ...assessmentData, createdAt: serverTimestamp() });
    return { success: true, assessmentId: ref.id };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getLatestAssessment(userId, planId) {
  try {
    const q = query(collection(db, "assessments"), where("userId", "==", userId), where("planId", "==", planId), orderBy("createdAt", "desc"), limit(1));
    const snaps = await getDocs(q);
    if (snaps.empty) return { success: false, error: "No assessment found." };
    const d = snaps.docs[0];
    return { success: true, data: { id: d.id, ...d.data() } };
  } catch (e) { return { success: false, error: e.message }; }
}

// ════════════════════════════════════════════════════════════
// LOCALSTORAGE HELPERS
// ════════════════════════════════════════════════════════════
export function cacheAIResponse(key, data) {
  localStorage.setItem("ai_cache_" + key, JSON.stringify({ data, ts: Date.now() }));
}
export function getCachedAIResponse(key, maxMins) {
  try {
    const raw = localStorage.getItem("ai_cache_" + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > (maxMins || 60) * 60 * 1000) return null;
    return parsed.data;
  } catch { return null; }
}
export function saveTimerState(state) { localStorage.setItem("timerState", JSON.stringify(state)); }
export function getTimerState() {
  try { return JSON.parse(localStorage.getItem("timerState")); } catch { return null; }
}
export function clearTimerState() { localStorage.removeItem("timerState"); }
export function saveCurrentUser(user) { localStorage.setItem("currentUser", JSON.stringify(user)); }
export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser")); } catch { return null; }
}
