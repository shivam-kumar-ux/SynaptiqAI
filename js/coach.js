// js/coach.js — Persistent AI Study Coach for SYNAPTIQAI

import { callAI } from "./ai.js";

export async function askStudyCoach(userId, questionText, contextData = {}) {
  const { plan, knowledgeGraph, mistakes, readiness } = contextData;

  const prompt = `You are SYNAPTIQ's AI Study Coach. You give direct, highly personalized advice to the student using their actual local study statistics. Do NOT give generic fluff.

STUDENT STATS & CONTEXT:
Exam: ${plan?.examType || "Upcoming Exam"}
Days Remaining: ${plan?.daysRemaining || 14}
Overall Mastery: ${knowledgeGraph?.overallMastery || 55}%
Weak Topics Count: ${knowledgeGraph?.weakNodesCount || 2}
Readiness Score: ${readiness?.overallScore || 60}% (${readiness?.readinessLabel || "Moderate"})
Recent Mistakes Count: ${(mistakes || []).length}

STUDENT QUESTION: "${questionText}"

Answer concisely (2-3 short bullet points or short paragraphs). Tell them exactly what topic to open next and why.`;

  try {
    const text = await callAI(prompt, { temperature: 0.3, maxOutputTokens: 400 });
    return text;
  } catch (e) {
    // Local data-driven fallback answer
    if (questionText.toLowerCase().includes("weak")) {
      return `Based on your Knowledge Graph, your weakest focus area is currently in topics with mastery below 60%. Open your Knowledge Graph to review them.`;
    }
    return `Today's recommendation: Focus 45 minutes on your highest-priority uncompleted topic in your study plan, followed by a 10-question daily quiz.`;
  }
}
