// js/readiness.js — Exam Readiness Score Engine for SYNAPTIQAI

export function calculateExamReadiness(plan, knowledgeGraph, quizHistory = [], sessions = []) {
  if (!plan || (!quizHistory.length && !sessions.length && !knowledgeGraph?.nodes?.length)) {
    return {
      hasData: false,
      overallScore: 0,
      readinessLabel: "Not enough data yet",
      breakdown: {
        knowledge: 0,
        retention: 0,
        practice: 0,
        consistency: 0,
        coverage: 0
      },
      topStrengths: [],
      topWeaknesses: ["No active study history recorded"],
      recommendedActions: ["Create a study plan, complete focus sessions, and take daily quizzes to calculate your readiness score."]
    };
  }

  // 1. Knowledge (from graph or 0 if unassessed)
  const knowledge = knowledgeGraph?.overallMastery ?? 0;

  // 2. Retention (from retention items or calculated based on graph nodes)
  const weakCount = knowledgeGraph?.weakNodesCount || 0;
  const nodeCount = knowledgeGraph?.nodes?.length || 0;
  const retention = nodeCount > 0 ? Math.max(0, 100 - (weakCount * 15)) : 0;

  // 3. Practice (quiz scores average)
  let practice = 0;
  if (quizHistory.length > 0) {
    practice = Math.round(
      quizHistory.reduce((acc, q) => acc + (q.score_percent || q.percentage || 0), 0) / quizHistory.length
    );
  }

  // 4. Consistency (session frequency)
  const consistency = sessions.length > 0 ? Math.min(100, sessions.length * 20) : 0;

  // 5. Coverage (% topics completed)
  const totalTopics = plan.summary?.total_topics || (plan.days || []).flatMap(d => d.topics || []).length || 1;
  const completedTopics = (plan.days || []).flatMap(d => d.topics || []).filter(t => t.status === "completed").length;
  const coverage = totalTopics > 0 ? Math.min(100, Math.round((completedTopics / totalTopics) * 100)) : 0;

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
  else readinessLabel = "Building Knowledge";

  const topStrengths = [];
  const topWeaknesses = [];

  if (knowledge >= 70) topStrengths.push(`High conceptual mastery (${knowledge}%)`);
  else if (knowledge > 0) topWeaknesses.push(`Conceptual mastery needs improvement (${knowledge}%)`);

  if (practice >= 75) topStrengths.push(`Strong quiz performance (${practice}%)`);
  else if (quizHistory.length > 0) topWeaknesses.push(`Quiz practice accuracy below target (${practice}%)`);

  if (coverage >= 70) topStrengths.push(`Good syllabus coverage (${coverage}%)`);
  else if (plan) topWeaknesses.push(`Syllabus coverage in progress (${coverage}%)`);

  const recommendedActions = [];
  if (topWeaknesses.length > 0) {
    recommendedActions.push(`Focus on: ${topWeaknesses[0]}`);
  }
  recommendedActions.push("Complete scheduled daily revision sessions.");
  recommendedActions.push("Take a full assessment to validate readiness.");

  return {
    hasData: true,
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
