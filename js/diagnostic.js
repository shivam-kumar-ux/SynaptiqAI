// js/diagnostic.js — "Why Am I Weak?" AI Learning Diagnostic for SYNAPTIQAI

import { callAI, safeParseJSON } from "./ai.js";

export const WEAKNESS_CATEGORIES = {
  conceptual: "Conceptual Misunderstanding",
  application: "Application & Problem-Solving Gap",
  memory: "Memory & Fact Recall Issue",
  calculation: "Calculation / Procedural Mistake",
  careless: "Careless Reading Error",
  interpretation: "Problem Statement Misinterpretation",
  time_management: "Time Pressure / Speed Deficit",
  repeated_misconception: "Repeated Misconception Pattern"
};

export async function diagnoseWeakness(topicName, mistakeList, quizResults = []) {
  if (!mistakeList || mistakeList.length === 0) {
    return {
      category: "conceptual",
      label: WEAKNESS_CATEGORIES.conceptual,
      analysis: `Initial diagnostic for ${topicName}: Review foundational concepts and definitions.`,
      recommendation: "Re-read core chapter summary and practice 3 basic MCQs."
    };
  }

  const prompt = `You are SYNAPTIQ's AI Learning Diagnostic Engine.

Analyze student mistakes for topic: "${topicName}".
Mistakes log:
${JSON.stringify(mistakeList)}

Classify the primary weakness into EXACTLY ONE of these 8 categories:
- "conceptual"
- "application"
- "memory"
- "calculation"
- "careless"
- "interpretation"
- "time_management"
- "repeated_misconception"

Return valid JSON only:
{
  "category": "conceptual",
  "category_label": "Human readable label",
  "root_cause": "Specific empirical analysis of why the student failed",
  "actionable_recommendation": "Step-by-step fix",
  "suggested_video_type": "concept" | "application" | "revision" | "exam_prep"
}`;

  try {
    const raw = await callAI(prompt, {
      temperature: 0.2,
      maxOutputTokens: 500,
      cacheKey: `diag_${topicName}_${mistakeList.length}`
    });

    const parsed = safeParseJSON(raw);
    return {
      category: parsed.category || "conceptual",
      label: WEAKNESS_CATEGORIES[parsed.category] || "Conceptual Weakness",
      analysis: parsed.root_cause || `Analysis of ${topicName} shows conceptual gaps.`,
      recommendation: parsed.actionable_recommendation || "Focus on foundational practice.",
      suggestedVideoType: parsed.suggested_video_type || "concept"
    };
  } catch (e) {
    return {
      category: "conceptual",
      label: WEAKNESS_CATEGORIES.conceptual,
      analysis: `Empirical analysis for ${topicName}: Student struggled on ${mistakeList.length} recent question(s).`,
      recommendation: "Review key concepts and retake quiz after 24 hours.",
      suggestedVideoType: "concept"
    };
  }
}
