// js/knowledge-graph.js — Learner-Specific Knowledge Graph Engine for SYNAPTIQAI

import { dbGet, dbPut, dbGetByIndex, dbGetAll } from "./db.js";

export async function getKnowledgeGraph(userId) {
  try {
    const list = await dbGetByIndex("knowledgeGraph", "userId", userId);
    return list.length > 0 ? list[0] : await initKnowledgeGraph(userId);
  } catch {
    return await initKnowledgeGraph(userId);
  }
}

export async function initKnowledgeGraph(userId) {
  const defaultGraph = {
    id: "kg_" + userId,
    userId,
    updatedAt: new Date().toISOString(),
    nodes: [],
    edges: [],
    overallMastery: 0,
    weakNodesCount: 0
  };
  await dbPut("knowledgeGraph", defaultGraph);
  return defaultGraph;
}

export async function updateTopicInKnowledgeGraph(userId, topicData) {
  const kg = await getKnowledgeGraph(userId);
  const topicName = topicData.topic || topicData.topic_name;
  if (!topicName) return kg;

  let existingNode = kg.nodes.find(n => n.topic.toLowerCase() === topicName.toLowerCase());

  if (!existingNode) {
    existingNode = {
      id: "node_" + Math.random().toString(36).substring(2, 7),
      topic: topicName,
      mastery: 50,
      confidence: 50,
      retention: 50,
      examPriority: topicData.priority || "medium",
      difficulty: topicData.difficulty || "medium",
      quizAccuracy: 0,
      assessmentAccuracy: 0,
      studyTimeMinutes: 0,
      lastStudied: new Date().toISOString(),
      lastTested: null,
      forgettingRisk: 20,
      revisionDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      mistakeCount: 0
    };
    kg.nodes.push(existingNode);
  }

  // Update stats if provided
  if (typeof topicData.scorePercent === "number") {
    const prevMastery = existingNode.mastery;
    existingNode.mastery = Math.round((prevMastery * 0.4) + (topicData.scorePercent * 0.6));
    existingNode.quizAccuracy = topicData.scorePercent;
    existingNode.lastTested = new Date().toISOString();
  }

  if (topicData.studyMinutes) {
    existingNode.studyTimeMinutes += topicData.studyMinutes;
    existingNode.lastStudied = new Date().toISOString();
    // Reduce forgetting risk after study
    existingNode.forgettingRisk = Math.max(5, existingNode.forgettingRisk - 25);
  }

  if (topicData.mistakeAdded) {
    existingNode.mistakeCount += 1;
    existingNode.mastery = Math.max(10, existingNode.mastery - 8);
    existingNode.forgettingRisk = Math.min(95, existingNode.forgettingRisk + 15);
  }

  // Recalculate overall mastery & weak nodes count
  const totalMastery = kg.nodes.reduce((acc, n) => acc + n.mastery, 0);
  kg.overallMastery = kg.nodes.length > 0 ? Math.round(totalMastery / kg.nodes.length) : 0;
  kg.weakNodesCount = kg.nodes.filter(n => n.mastery < 60).length;
  kg.updatedAt = new Date().toISOString();

  await dbPut("knowledgeGraph", kg);
  return kg;
}

export function calculateForgettingRisk(node) {
  if (!node.lastStudied) return 80;
  const daysSinceStudied = (Date.now() - new Date(node.lastStudied).getTime()) / (1000 * 3600 * 24);
  const baseRisk = Math.min(95, Math.round(daysSinceStudied * 12));
  const masteryFactor = (100 - (node.mastery || 50)) * 0.3;
  return Math.min(100, Math.round(baseRisk + masteryFactor));
}
