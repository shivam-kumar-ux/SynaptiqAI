// js/capsule.js — Central Learning Unit (Study Capsule) for SYNAPTIQAI

import { generatePersonalizedNote } from "./notes.js";
import { fetchTopicVideos } from "./youtube.js";
import { diagnoseWeakness } from "./diagnostic.js";

export async function createStudyCapsule(userId, topicName, subject, level = "Intermediate") {
  const noteRecord = await generatePersonalizedNote(userId, topicName, level, subject);
  const diagnostic = await diagnoseWeakness(topicName, []);
  const videos = await fetchTopicVideos(topicName, subject, diagnostic.suggestedVideoType);

  return {
    id: "capsule_" + Date.now(),
    userId,
    topic: topicName,
    subject,
    level,
    masteryScore: 65,
    nextRevisionDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    note: noteRecord.content,
    diagnostic,
    videos,
    quickRecall: [
      "Key Term 1: Fundamental unit",
      "Formula/Rule: Must satisfy structural constraints",
      "Exam Trap: Watch out for boundary conditions"
    ]
  };
}
