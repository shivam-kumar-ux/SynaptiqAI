// js/risk.js — Academic Risk Engine for SYNAPTIQAI

import { dbPut, dbGetByIndex } from "./db.js";

export async function calculateAcademicRisk(userId, plan, knowledgeGraph, quizHistory = []) {
  if (!plan) {
    return {
      level: "LOW",
      score: 20,
      explanation: "No active exam plan detected. Create a plan to enable risk analytics.",
      interventions: ["Create your first study plan in New Plan."]
    };
  }

  const daysRemaining = plan.daysRemaining || 30;
  const overallMastery = knowledgeGraph?.overallMastery || 50;
  const weakTopicsCount = knowledgeGraph?.weakNodesCount || 0;

  let riskPoints = 0;

  // 1. Mastery deficit
  if (overallMastery < 40) riskPoints += 40;
  else if (overallMastery < 60) riskPoints += 25;
  else if (overallMastery < 75) riskPoints += 10;

  // 2. Exam proximity vs unmastered topics
  if (daysRemaining <= 7 && weakTopicsCount > 3) riskPoints += 35;
  else if (daysRemaining <= 14 && weakTopicsCount > 5) riskPoints += 20;

  // 3. Quiz average
  if (quizHistory.length > 0) {
    const avgScore = Math.round(
      quizHistory.reduce((acc, q) => acc + (q.score_percent || q.percentage || 50), 0) / quizHistory.length
    );
    if (avgScore < 50) riskPoints += 25;
    else if (avgScore < 70) riskPoints += 10;
  }

  let level = "LOW";
  let explanation = "Your current preparation pattern indicates low academic risk. Keep up your study consistency!";
  const interventions = [];

  if (riskPoints >= 50) {
    level = "HIGH";
    explanation = "Your current preparation pattern indicates elevated academic risk. Key weak topics require immediate targeted revision before the exam.";
    interventions.push("Increase daily study quota by 30 minutes.");
    interventions.push("Focus exclusively on weak topics identified in your Knowledge Graph.");
    interventions.push("Complete 2 diagnostic quizzes this week.");
  } else if (riskPoints >= 25) {
    level = "MODERATE";
    explanation = "Your preparation pattern indicates moderate academic risk. Consistent daily practice will bring your readiness score to high confidence.";
    interventions.push("Schedule a 45-minute revision block for weak topics.");
    interventions.push("Review personalized notes for flagged concepts.");
  } else {
    interventions.push("Maintain current study pace.");
    interventions.push("Take a full assessment 5 days before exam.");
  }

  const result = {
    id: "risk_" + Date.now(),
    userId,
    level,
    score: Math.min(100, riskPoints),
    explanation,
    interventions,
    createdAt: new Date().toISOString()
  };

  await dbPut("riskAssessments", result);
  return result;
}
