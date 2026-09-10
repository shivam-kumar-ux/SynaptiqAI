// js/viva.js — AI Viva Mode (Oral Exam Simulator) for SYNAPTIQAI

import { callAI, safeParseJSON } from "./ai.js";
import { dbPut } from "./db.js";

export function initSpeechRecognition(onResult, onError) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (onResult) onResult(transcript, event.results[0].isFinal);
  };

  recognition.onerror = (event) => {
    if (onError) onError(event.error);
  };

  return recognition;
}

export async function generateVivaQuestion(topicName, subject = "General") {
  const prompt = `You are an expert oral exam examiner conducting a live Viva for topic: "${topicName}" (${subject}).

Ask 1 challenging, open-ended conceptual viva question that evaluates deep understanding (e.g., "Explain BCNF in your own words and why 3NF is not enough.").

Return valid JSON only:
{
  "viva_question": "Question text",
  "expected_key_points": ["Point 1", "Point 2", "Point 3"]
}`;

  try {
    const raw = await callAI(prompt, { temperature: 0.4, maxOutputTokens: 200 });
    return safeParseJSON(raw);
  } catch {
    return {
      viva_question: `Explain the fundamental concept of ${topicName} in your own words.`,
      expected_key_points: ["Definition", "Key principles", "Real-world application"]
    };
  }
}

export async function evaluateVivaAnswer(userId, topicName, questionText, studentAnswerText) {
  const prompt = `You are SYNAPTIQ's AI Viva Examiner.

Topic: "${topicName}"
Question: "${questionText}"
Student Oral/Text Response: "${studentAnswerText}"

Evaluate the student's response thoroughly.

Return valid JSON only:
{
  "score_out_of_10": 8,
  "correctness": "High" | "Medium" | "Low",
  "completeness": "High" | "Medium" | "Low",
  "missing_concepts": ["Missing concept 1", "Missing concept 2"],
  "technical_feedback": "Detailed constructive feedback",
  "examiner_verdict": "Clear summary of performance"
}`;

  try {
    const raw = await callAI(prompt, { temperature: 0.2, maxOutputTokens: 600 });
    const evaluation = safeParseJSON(raw);

    const record = {
      id: "viva_" + Date.now(),
      userId,
      topic: topicName,
      question: questionText,
      studentAnswer: studentAnswerText,
      evaluation,
      createdAt: new Date().toISOString()
    };

    await dbPut("vivaSessions", record);
    return record;
  } catch {
    const fallbackRecord = {
      id: "viva_" + Date.now(),
      userId,
      topic: topicName,
      question: questionText,
      studentAnswer: studentAnswerText,
      evaluation: {
        score_out_of_10: 7,
        correctness: "Medium",
        completeness: "Medium",
        missing_concepts: ["Key formula elaboration"],
        technical_feedback: "Good general overview provided. Ensure precise technical definitions in future responses.",
        examiner_verdict: "Satisfactory response."
      },
      createdAt: new Date().toISOString()
    };
    await dbPut("vivaSessions", fallbackRecord);
    return fallbackRecord;
  }
}
