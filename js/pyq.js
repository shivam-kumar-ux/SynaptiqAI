// js/pyq.js — Previous-Year Paper Analyzer for SYNAPTIQAI

import { callAI, safeParseJSON } from "./ai.js";
import { dbPut, dbGetByIndex } from "./db.js";

export async function analyzePYQPaper(userId, paperTitle, subject, pyqContentText) {
  const prompt = `You are SYNAPTIQ's Previous-Year Question (PYQ) Paper Analyzer.

Subject: ${subject}
Paper Title: ${paperTitle}
Raw Text Content:
${pyqContentText.slice(0, 7000)}

Analyze this paper and extract:
1. List of questions with identified topics, difficulty, and mark weights.
2. Frequently tested topics ranking.
3. Exam trend insights.

Return valid JSON only in this exact shape:
{
  "paper_title": "${paperTitle}",
  "subject": "${subject}",
  "total_questions_extracted": 5,
  "top_frequent_topics": [
    { "topic": "Topic A", "frequency_count": 3, "historical_priority": "high" },
    { "topic": "Topic B", "frequency_count": 2, "historical_priority": "medium" }
  ],
  "difficulty_trend": "balanced" | "hard" | "easy",
  "questions": [
    {
      "question_number": 1,
      "question_text": "Extracted question text",
      "topic": "Topic A",
      "difficulty": "medium",
      "weightage_marks": 5,
      "repeated_concept_flag": true
    }
  ],
  "disclaimer": "Historical trends reflect past papers and do not guarantee future exam contents."
}`;

  try {
    const raw = await callAI(prompt, {
      temperature: 0.2,
      maxOutputTokens: 1400,
      cacheKey: `pyq_${paperTitle}_${subject}`
    });

    const parsed = safeParseJSON(raw);
    const paperRecord = {
      id: "pyq_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      userId,
      paperTitle,
      subject,
      analysis: parsed,
      createdAt: new Date().toISOString()
    };

    await dbPut("pyqPapers", paperRecord);
    return paperRecord;
  } catch (e) {
    // Offline fallback paper structure
    const fallbackRecord = {
      id: "pyq_" + Date.now(),
      userId,
      paperTitle,
      subject,
      analysis: {
        paper_title: paperTitle,
        subject,
        total_questions_extracted: 3,
        top_frequent_topics: [
          { topic: subject + " Fundamentals", frequency_count: 2, historical_priority: "high" }
        ],
        difficulty_trend: "medium",
        questions: [
          { question_number: 1, question_text: "Sample extracted PYQ question for " + subject, topic: subject + " Fundamentals", difficulty: "medium", weightage_marks: 5, repeated_concept_flag: true }
        ],
        disclaimer: "Historical trends reflect past papers and do not guarantee future exam contents."
      },
      createdAt: new Date().toISOString()
    };
    await dbPut("pyqPapers", fallbackRecord);
    return fallbackRecord;
  }
}

export async function getUserPYQPapers(userId) {
  try {
    return await dbGetByIndex("pyqPapers", "userId", userId);
  } catch {
    return [];
  }
}
