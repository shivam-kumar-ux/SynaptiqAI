// js/retention.js — Spaced Repetition Engine for SYNAPTIQAI

import { dbPut, dbGetByIndex } from "./db.js";

const INTERVAL_STAGES = [0, 1, 3, 7, 14, 30];

export async function scheduleSpacedRepetition(userId, topicName, scorePercent) {
  try {
    const list = await dbGetByIndex("retention", "userId", userId);
    let item = list.find(i => i.topic.toLowerCase() === topicName.toLowerCase());

    if (!item) {
      item = {
        id: "ret_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        userId,
        topic: topicName,
        stageIndex: 0,
        reviewCount: 0,
        successfulReviews: 0,
        failedReviews: 0,
        retentionScore: scorePercent,
        nextReviewDate: new Date().toISOString().split('T')[0],
        history: []
      };
    }

    item.reviewCount += 1;
    item.history.push({ date: new Date().toISOString(), scorePercent });

    if (scorePercent >= 75) {
      item.successfulReviews += 1;
      item.stageIndex = Math.min(INTERVAL_STAGES.length - 1, item.stageIndex + 1);
    } else {
      item.failedReviews += 1;
      item.stageIndex = Math.max(0, item.stageIndex - 1);
    }

    const intervalDays = INTERVAL_STAGES[item.stageIndex];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + intervalDays);

    item.nextReviewDate = nextDate.toISOString().split('T')[0];
    item.retentionScore = Math.round((item.retentionScore * 0.4) + (scorePercent * 0.6));
    item.updatedAt = new Date().toISOString();

    await dbPut("retention", item);
    return item;
  } catch (e) {
    return null;
  }
}

export async function getDueRevisions(userId) {
  try {
    const list = await dbGetByIndex("retention", "userId", userId);
    const today = new Date().toISOString().split('T')[0];
    return list.filter(i => i.nextReviewDate <= today);
  } catch {
    return [];
  }
}
