// js/notes.js — "Explain It My Way" Personalized Notes Generator for SYNAPTIQAI

import { callAI, safeParseJSON } from "./ai.js";
import { dbPut, dbGetByIndex } from "./db.js";

export const EXPLANATION_LEVELS = [
  "Beginner",
  "Basic",
  "Intermediate",
  "Advanced",
  "Exam Ready"
];

export async function generatePersonalizedNote(userId, topicName, level = "Intermediate", subject = "General") {
  const prompt = `You are SYNAPTIQ's Personalized Learning Assistant ("Explain It My Way").

Generate a complete, high-yield study note for topic: "${topicName}" (${subject}).
Explanations must match level: "${level}".

Return valid JSON only in this exact shape:
{
  "topic": "${topicName}",
  "level": "${level}",
  "what_i_understand": "What student likely already knows",
  "what_i_confuse": "Common point of confusion",
  "key_concept": "Core definition",
  "simple_explanation": "Simple real-world analogy or breakdown suitable for ${level}",
  "exam_definition": "Formal textbook / exam definition to write in tests",
  "example": "Clear step-by-step example",
  "common_mistake": "Classic trap to avoid",
  "memory_trick": "Mnemonic or memory trick",
  "practice_questions": [
    "Q1: Short practice question",
    "Q2: Short practice question"
  ]
}`;

  try {
    const raw = await callAI(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1200,
      cacheKey: `note_${topicName}_${level}`
    });

    const parsed = safeParseJSON(raw);
    const noteRecord = {
      id: "note_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      userId,
      topic: topicName,
      subject,
      level,
      content: parsed,
      createdAt: new Date().toISOString()
    };

    await dbPut("notes", noteRecord);
    return noteRecord;
  } catch (e) {
    // Local offline fallback note template
    const fallbackNote = {
      id: "note_" + Date.now(),
      userId,
      topic: topicName,
      subject,
      level,
      content: {
        topic: topicName,
        level,
        what_i_understand: "Foundational aspects of " + topicName,
        what_i_confuse: "Distinguishing key formulas and edge cases",
        key_concept: "Core principles of " + topicName,
        simple_explanation: `${topicName} breaks down complex steps into manageable units.`,
        exam_definition: `${topicName} is defined as a fundamental unit of ${subject}.`,
        example: "Example: Step 1 -> Identify inputs. Step 2 -> Execute transformation.",
        common_mistake: "Confusing terminology or skipping verification steps.",
        memory_trick: "Remember key steps using first letters of main terms.",
        practice_questions: ["Q1: Define " + topicName, "Q2: State one key application."]
      },
      createdAt: new Date().toISOString()
    };
    await dbPut("notes", fallbackNote);
    return fallbackNote;
  }
}

export async function getUserNotesForTopic(userId, topicName) {
  try {
    const notes = await dbGetByIndex("notes", "userId", userId);
    return notes.filter(n => n.topic.toLowerCase() === topicName.toLowerCase());
  } catch {
    return [];
  }
}

import { getCurrentUser } from "./auth.js";

export async function generateStudyNotes(topicName, level = "Intermediate") {
  const session = getCurrentUser();
  if (!session) return null;
  const noteObj = await generatePersonalizedNote(session.id, topicName, level);
  if (noteObj && noteObj.content) {
    return {
      summary: noteObj.content.simple_explanation || noteObj.content.key_concept,
      examDefinition: noteObj.content.exam_definition,
      example: noteObj.content.example,
      commonMistake: noteObj.content.common_mistake,
      practiceQuestions: noteObj.content.practice_questions
    };
  }
  return null;
}

