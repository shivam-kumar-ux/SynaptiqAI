// js/storage.js — Local IndexedDB Database Operations for SYNAPTIQAI

import {
  dbGet, dbPut, dbGetAll, dbGetByIndex, dbDelete
} from "./db.js";

// ════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════
export async function getUserProfile(userId) {
  try {
    const user = await dbGet("users", userId);
    if (user) {
      return { success: true, data: user };
    }
    return { success: false, error: "User profile not found." };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    const user = (await dbGet("users", userId)) || { id: userId };
    const updated = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await dbPut("users", updated);
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════
export async function savePlan(planData) {
  try {
    const planId = planData.id || "plan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const record = {
      ...planData,
      id: planId,
      createdAt: planData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: planData.status || "active"
    };
    await dbPut("plans", record);
    return { success: true, planId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function getPlan(planId) {
  try {
    const plan = await dbGet("plans", planId);
    if (plan) return { success: true, data: plan };
    return { success: false, error: "Plan not found." };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function getUserPlans(userId) {
  try {
    const plans = await dbGetByIndex("plans", "userId", userId);
    plans.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return { success: true, data: plans };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function updatePlanStatus(planId, status) {
  try {
    const plan = await dbGet("plans", planId);
    if (!plan) return { success: false, error: "Plan not found." };
    plan.status = status;
    plan.updatedAt = new Date().toISOString();
    await dbPut("plans", plan);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════
// TOPICS
// ════════════════════════════════════════════════════════════
export async function saveTopics(planId, topicsArray) {
  try {
    for (const topic of topicsArray) {
      const topicId = topic.id || "top_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const record = {
        ...topic,
        id: topicId,
        planId,
        status: topic.status || "not_started",
        completionPercent: topic.completionPercent || 0,
        createdAt: topic.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await dbPut("topics", record);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function getTopicsForPlan(planId) {
  try {
    const topics = await dbGetByIndex("topics", "planId", planId);
    topics.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    return { success: true, data: topics };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function updateTopicStatus(topicId, status, completionPercent) {
  try {
    const topic = await dbGet("topics", topicId);
    if (!topic) return { success: false, error: "Topic not found." };
    topic.status = status;
    if (typeof completionPercent === "number") {
      topic.completionPercent = completionPercent;
    }
    topic.updatedAt = new Date().toISOString();
    await dbPut("topics", topic);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════
// SESSIONS
// ════════════════════════════════════════════════════════════
export async function saveSession(sessionData) {
  try {
    const sessionId = sessionData.id || "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const record = {
      ...sessionData,
      id: sessionId,
      createdAt: sessionData.createdAt || new Date().toISOString()
    };
    await dbPut("sessions", record);
    return { success: true, sessionId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function getSessionsForPlan(planId) {
  try {
    const sessions = await dbGetByIndex("sessions", "planId", planId);
    sessions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return { success: true, data: sessions };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════
// QUIZZES
// ════════════════════════════════════════════════════════════
export async function saveQuizResult(quizData) {
  try {
    const quizId = quizData.id || "quiz_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const record = {
      ...quizData,
      id: quizId,
      createdAt: quizData.createdAt || new Date().toISOString()
    };
    await dbPut("quizzes", record);
    return { success: true, quizId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function getQuizHistory(userId, limitCount = 30) {
  try {
    const quizzes = await dbGetByIndex("quizzes", "userId", userId);
    quizzes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return { success: true, data: quizzes.slice(0, limitCount) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════
// ASSESSMENTS
// ════════════════════════════════════════════════════════════
export async function saveAssessment(assessmentData) {
  try {
    const assessmentId = assessmentData.id || "ass_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const record = {
      ...assessmentData,
      id: assessmentId,
      createdAt: assessmentData.createdAt || new Date().toISOString()
    };
    await dbPut("assessments", record);
    return { success: true, assessmentId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function getLatestAssessment(userId, planId) {
  try {
    const list = await dbGetByIndex("assessments", "planId", planId);
    const filtered = list.filter(a => a.userId === userId);
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (filtered.length === 0) return { success: false, error: "No assessment found." };
    return { success: true, data: filtered[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════
// LOCALSTORAGE HELPERS
// ════════════════════════════════════════════════════════════
export function cacheAIResponse(key, data) {
  localStorage.setItem("ai_cache_" + key, JSON.stringify({ data, ts: Date.now() }));
}

export function getCachedAIResponse(key, maxMins = 60) {
  try {
    const raw = localStorage.getItem("ai_cache_" + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > maxMins * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveTimerState(state) {
  localStorage.setItem("timerState", JSON.stringify(state));
}

export function getTimerState() {
  try {
    return JSON.parse(localStorage.getItem("timerState"));
  } catch {
    return null;
  }
}

export function clearTimerState() {
  localStorage.removeItem("timerState");
}

export function saveCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    return null;
  }
}
