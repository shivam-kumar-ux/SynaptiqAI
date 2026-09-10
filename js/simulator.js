// js/simulator.js — What-If Simulator for SYNAPTIQAI

export function runWhatIfSimulation(currentPlan, knowledgeGraph, params) {
  const dailyHours = Number(params.dailyHours) || 3;
  const missedDays = Number(params.missedDays) || 0;
  const focusOnWeak = Boolean(params.focusOnWeak);

  const totalTopics = currentPlan?.summary?.total_topics || 12;
  const daysRemaining = Math.max(1, (currentPlan?.daysRemaining || 20) - missedDays);

  const totalCapacityHours = dailyHours * daysRemaining;
  const currentMastery = knowledgeGraph?.overallMastery || 50;

  let projectedCoverage = Math.min(100, Math.round((totalCapacityHours / (totalTopics * 3)) * 100));
  let projectedReadiness = Math.round((currentMastery * 0.4) + (projectedCoverage * 0.6));

  if (focusOnWeak) {
    projectedReadiness = Math.min(100, projectedReadiness + 12);
  }

  let projectedRisk = "LOW";
  if (projectedReadiness < 50) projectedRisk = "HIGH";
  else if (projectedReadiness < 70) projectedRisk = "MODERATE";

  return {
    dailyHours,
    missedDays,
    focusOnWeak,
    projectedCoverage,
    projectedReadiness,
    projectedRisk,
    disclaimer: "Projections are mathematical estimates based on your parameters and past study patterns."
  };
}
