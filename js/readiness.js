// js/readiness.js — Exam Readiness Score Engine for SYNAPTIQAI

export function calculateExamReadiness(plan, knowledgeGraph, quizHistory = [], sessions = []) {
  if (!plan) {
    return {
      overallScore: 50,
      readinessLabel: "Moderate Readiness",
      breakdown: {
        knowledge: 50,
        retention: 50,
        practice: 50,
        consistency: 50,
        coverage: 50
      },
      topStrengths: ["Syllabus initialized"],
      topWeaknesses: ["No active quiz data"],
      recommendedActions: ["Start your first focus session and complete daily quiz."]
    };
  }

  // 1. Knowledge (from graph or default)
  const knowledge = knowledgeGraph?.overallMastery || 60;

  // 2. Retention (from retention items or calculated)
  const weakCount = knowledgeGraph?.weakNodesCount || 0;
  const retention = Math.max(20, 100 - (weakCount * 12));

  // 3. Practice (quiz scores average)
  let practice = 60;
  if (quizHistory.length > 0) {
    practice = Math.round(
      quizHistory.reduce((acc, q) => acc + (q.score_percent || q.percentage || 50), 0) / quizHistory.length
    );
  }

  // 4. Consistency (session frequency)
  const consistency = Math.min(100, Math.max(30, sessions.length * 15));

  // 5. Coverage (% topics completed)
  const totalTopics = plan.summary?.total_topics || 10;
  const completedTopics = (plan.days || []).flatMap(d => d.topics || []).filter(t => t.status === "completed").length;
  const coverage = Math.min(100, Math.round((completedTopics / (totalTopics || 1)) * 100)) || 45;

  const overallScore = Math.round(
    (knowledge * 0.25) +
    (retention * 0.20) +
    (practice * 0.25) +
    (consistency * 0.15) +
    (coverage * 0.15)
  );

  let readinessLabel = "Needs Focus";
  if (overallScore >= 80) readinessLabel = "Exam Ready";
  else if (overallScore >= 65) readinessLabel = "Well Prepared";
  else if (overallScore >= 50) readinessLabel = "Moderate Readiness";

  const topStrengths = [];
  const topWeaknesses = [];

  if (knowledge >= 70) topStrengths.push(`High conceptual mastery (${knowledge}%)`);
  else topWeaknesses.push(`Conceptual mastery needs improvement (${knowledge}%)`);

  if (practice >= 75) topStrengths.push(`Strong quiz performance (${practice}%)`);
  else topWeaknesses.push(`Quiz practice accuracy below target (${practice}%)`);

  if (coverage >= 70) topStrengths.push(`Good syllabus coverage (${coverage}%)`);
  else topWeaknesses.push(`Syllabus coverage in progress (${coverage}%)`);

  const recommendedActions = [];
  if (topWeaknesses.length > 0) {
    recommendedActions.push(`Focus on: ${topWeaknesses[0]}`);
  }
  recommendedActions.push("Complete scheduled daily revision sessions.");
  recommendedActions.push("Take a full assessment to validate readiness.");

  return {
    overallScore,
    readinessLabel,
    breakdown: {
      knowledge,
      retention,
      practice,
      consistency,
      coverage
    },
    topStrengths,
    topWeaknesses,
    recommendedActions
  };
}
