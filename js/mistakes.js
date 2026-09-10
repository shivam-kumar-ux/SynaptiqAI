// js/mistakes.js — Mistake Intelligence Store for SYNAPTIQAI

import { dbPut, dbGetByIndex } from "./db.js";

export async function logMistake(userId, topicName, questionObj, userAnswer, category = "conceptual") {
  const mistakeRecord = {
    id: "mis_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    userId,
    topic: topicName,
    question: questionObj.question || questionObj.text || "",
    options: questionObj.options || null,
    correctAnswer: questionObj.correct_answer || questionObj.answer || "",
    userAnswer,
    category,
    explanation: questionObj.explanation || "",
    createdAt: new Date().toISOString()
  };

  await dbPut("mistakes", mistakeRecord);
  return mistakeRecord;
}

export async function getMistakesForUser(userId, limit = 50) {
  try {
    const list = await dbGetByIndex("mistakes", "userId", userId);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getMistakesForTopic(userId, topicName) {
  try {
    const list = await dbGetByIndex("mistakes", "userId", userId);
    return list.filter(m => m.topic.toLowerCase() === topicName.toLowerCase());
  } catch {
    return [];
  }
}
