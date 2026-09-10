// js/adaptive-planner.js — Self-Adaptive Study Plan Engine for SYNAPTIQAI

import { dbGet, dbPut, dbGetByIndex } from "./db.js";

export async function adaptStudyPlan(userId, planId, performanceData) {
  const plan = await dbGet("plans", planId);
  if (!plan) return { adapted: false, reason: "Plan not found." };

  const weakTopic = performanceData.weakTopic;
  const scorePercent = performanceData.scorePercent || 0;
  const changes = [];

  if (scorePercent < 60 && weakTopic) {
    // Increase practice and schedule targeted revision for weak topic
    let foundTopic = false;
    for (const day of plan.days || []) {
      for (const t of day.topics || []) {
        if (t.topic_name.toLowerCase() === weakTopic.toLowerCase()) {
          t.minutes = Math.min(90, (t.minutes || 45) + 20);
          t.priority = "high";
          t.notes = `Extra practice added because recent quiz score was ${scorePercent}%.`;
          foundTopic = true;
        }
      }
    }

    // Add extra revision session on next day if not found
    if (!foundTopic && plan.days && plan.days.length > 0) {
      const nextDay = plan.days[0];
      nextDay.topics.unshift({
        topic_name: weakTopic,
        chapter_number: 1,
        minutes: 30,
        type: "revision",
        priority: "high",
        notes: `Targeted revision for ${weakTopic} added due to low accuracy.`
      });
    }

    const explanation = `Your study plan adapted automatically because your recent performance in ${weakTopic} (${scorePercent}%) requires additional practice and targeted revision.`;
    plan.lastAdaptedAt = new Date().toISOString();
    plan.adaptationReason = explanation;

    await dbPut("plans", plan);
    return {
      adapted: true,
      explanation,
      weakTopic,
      scorePercent
    };
  }

  return { adapted: false, reason: "Performance is on track." };
}
