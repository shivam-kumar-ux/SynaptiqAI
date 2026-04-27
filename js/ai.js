// Secure Gemini-only AI client for SYNAPTIQ.

const GEMINI_ENDPOINT = "/api/gemini";
const AI_CACHE_PREFIX = "synaptiq_ai_cache_";
const MAX_SYLLABUS_CHARS = 8000;
const MAX_SYLLABUS_JSON_CHARS = 10000;

function hashString(input) {
  const text = String(input || "");
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getCachedValue(cacheKey, cacheMinutes = 30) {
  if (!cacheKey) return null;
  try {
    const raw = localStorage.getItem(AI_CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.value || !parsed?.ts) return null;
    const ttlMs = Math.max(1, cacheMinutes) * 60 * 1000;
    if (Date.now() - parsed.ts > ttlMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function setCachedValue(cacheKey, value) {
  if (!cacheKey) return;
  try {
    localStorage.setItem(
      AI_CACHE_PREFIX + cacheKey,
      JSON.stringify({ value, ts: Date.now() })
    );
  } catch {
    // ignore cache write errors (quota/private mode)
  }
}

function buildGeminiError(message, status) {
  const raw = String(message || "").trim();
  const lower = raw.toLowerCase();
  const isQuota =
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("resource exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests");

  const isConfig =
    lower.includes("api key") ||
    lower.includes("server configuration is incomplete") ||
    lower.includes("no compatible gemini model/version found");

  let userMessage = raw || "Gemini service is currently unavailable.";
  if (isQuota) {
    userMessage =
      "Gemini quota limit reached. Please retry later or upgrade API billing. SYNAPTIQ will use fallback generation when possible.";
  } else if (isConfig) {
    userMessage =
      "Gemini backend is not configured correctly. Verify GEMINI_API_KEY and model settings in deployment.";
  }

  const error = new Error(userMessage);
  error.rawMessage = raw;
  error.statusCode = status || 0;
  error.isQuotaError = isQuota;
  error.isGeminiConfigError = isConfig;
  return error;
}

async function postGemini(payload) {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw buildGeminiError(data.error || `Gemini request failed (${res.status})`, res.status);
  }

  if (typeof data.text !== "string" || !data.text.trim()) {
    throw buildGeminiError("Gemini returned an empty response.", res.status);
  }

  return data.text;
}

export function safeParseJSON(text) {
  let cleaned = String(text || "").trim();
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const arrayStart = cleaned.indexOf("[");
  const objectStart = cleaned.indexOf("{");
  const start =
    arrayStart === -1
      ? objectStart
      : objectStart === -1
        ? arrayStart
        : Math.min(arrayStart, objectStart);

  if (start > 0) cleaned = cleaned.slice(start);
  return JSON.parse(cleaned);
}

export async function callGemini(prompt, options = {}) {
  const payload = {
    prompt,
    temperature: options.temperature ?? 0.35,
    maxOutputTokens: options.maxOutputTokens ?? 900
  };

  const cached = getCachedValue(options.cacheKey, options.cacheMinutes ?? 30);
  if (cached) return cached;

  const value = await postGemini(payload);
  setCachedValue(options.cacheKey, value);
  return value;
}

export async function testGeminiConnection() {
  const raw = await callGemini("Reply with exactly: OK", {
    temperature: 0,
    maxOutputTokens: 16,
    cacheKey: "test_connection_ok",
    cacheMinutes: 2
  });
  return raw.trim();
}

export async function parseSyllabus(syllabusText, subject, classGrade, examType) {
  const trimmedSyllabus = String(syllabusText || "").slice(0, MAX_SYLLABUS_CHARS);
  const prompt = `You are an academic syllabus parser.
Subject: ${subject}
Student level: ${classGrade}
Exam type: ${examType}

Convert the syllabus into a JSON array only. No markdown. No explanation.
Each item must match this shape:
{
  "chapter_number": 1,
  "chapter_name": "Chapter name",
  "topics": ["Topic 1", "Topic 2"],
  "estimated_study_hours": 3.5,
  "difficulty": "easy" | "medium" | "hard",
  "priority": "high" | "medium" | "low"
}

Rules:
- Infer chapter groupings if the text is messy.
- Keep topic names concise.
- Use realistic study-hour estimates.
- Base difficulty and priority on typical ${examType} expectations.

SYLLABUS:
${trimmedSyllabus}`;

  const cacheKey = `parse_${hashString([subject, classGrade, examType, trimmedSyllabus].join("|"))}`;
  const raw = await callGemini(prompt, {
    maxOutputTokens: 1400,
    cacheKey,
    cacheMinutes: 180
  });
  return safeParseJSON(raw);
}

export async function generateStudyPlan(profile, parsedSyllabus) {
  const syllabusStr = JSON.stringify(parsedSyllabus).slice(0, MAX_SYLLABUS_JSON_CHARS);
  const prompt = `You are SYNAPTIQ, an expert academic planning system.

Build one high-quality personalized study plan as valid JSON only. No markdown. No explanation.

STUDENT PROFILE
Name: ${profile.name}
Class: ${profile.classGrade}
Exam: ${profile.examType}
Exam date: ${profile.examDate}
Days remaining: ${profile.daysRemaining}
Daily minutes: ${profile.dailyMinutes}
Weak subjects: ${profile.weakSubjects}
Notes: ${profile.notes || "None"}

SYLLABUS
${syllabusStr}

Return exactly this shape:
{
  "plan_name": "SYNAPTIQ Smart Plan",
  "strategy_summary": "short summary",
  "risk_note": "short risk note",
  "total_days": 0,
  "revision_days": [7, 14],
  "buffer_days_before_exam": 3,
  "days": [
    {
      "day_number": 1,
      "topics": [
        {
          "topic_name": "Topic",
          "chapter_number": 1,
          "minutes": 45,
          "type": "new_learning" | "revision" | "practice" | "buffer",
          "priority": "high" | "medium" | "low",
          "notes": "short note"
        }
      ],
      "total_minutes": 90,
      "day_type": "study" | "revision" | "buffer"
    }
  ],
  "summary": {
    "total_study_hours": 0,
    "total_topics": 0,
    "coverage_confidence": "high" | "medium" | "low"
  }
}

Rules:
- Stay within ${profile.dailyMinutes} minutes per day.
- Front-load high-priority and weak-area work.
- Insert regular revision.
- Leave realistic buffer time before the exam.
- Keep notes actionable and short.
- Keep total output concise and efficient.`;

  const planCacheKey = `plan_${hashString(JSON.stringify({
    name: profile.name,
    classGrade: profile.classGrade,
    examType: profile.examType,
    examDate: profile.examDate,
    daysRemaining: profile.daysRemaining,
    dailyMinutes: profile.dailyMinutes,
    weakSubjects: profile.weakSubjects,
    notes: profile.notes,
    syllabus: syllabusStr
  }))}`;
  const raw = await callGemini(prompt, {
    maxOutputTokens: 1800,
    cacheKey: planCacheKey,
    cacheMinutes: 240
  });
  return safeParseJSON(raw);
}

export async function generateDailyQuiz(topicsStudied, classGrade, examType) {
  const prompt = `You are an expert quiz generator.
Student level: ${classGrade}
Exam type: ${examType}
Topics studied today: ${topicsStudied.join(", ")}

Generate exactly 10 questions as valid JSON array only.
No markdown. No explanation.

Shape:
[
  {
    "question_number": 1,
    "type": "mcq" | "true_false" | "fill_blank",
    "question": "Question text",
    "options": {"A":"...", "B":"...", "C":"...", "D":"..."},
    "correct_answer": "A",
    "answer": "word for fill blank only",
    "topic": "Topic name",
    "difficulty": "easy" | "medium" | "hard",
    "explanation": "Short explanation"
  }
]

Rules:
- 7 mcq, 2 true_false, 1 fill_blank.
- For true_false use options {"A":"True","B":"False"}.
- For fill_blank omit unused options and include "answer".
- Use only the supplied topics.
- Difficulty split: 3 easy, 5 medium, 2 hard.
- Keep explanations very short (one line).`;

  const raw = await callGemini(prompt, {
    maxOutputTokens: 1500,
    cacheKey: `quiz_${hashString([classGrade, examType, topicsStudied.join("|")].join("|"))}`,
    cacheMinutes: 120
  });
  return safeParseJSON(raw);
}

export async function generateAssessment(allTopics, classGrade, examType, subject) {
  const prompt = `You are an assessment generator for SYNAPTIQ.
Subject: ${subject}
Student level: ${classGrade}
Exam type: ${examType}
Topics: ${allTopics.join(", ")}

Generate exactly 50 questions as valid JSON array only. No markdown. No explanation.

Section rules:
- 15 conceptual questions
- 20 application questions
- 15 analytical questions

Shape:
[
  {
    "question_number": 1,
    "section": "conceptual" | "application" | "analytical",
    "ai_source": "gemini",
    "type": "mcq" | "true_false" | "fill_blank",
    "question": "Question text",
    "options": {"A":"...", "B":"...", "C":"...", "D":"..."},
    "correct_answer": "A",
    "answer": "word for fill blank only",
    "topic": "Topic name",
    "difficulty": "easy" | "medium" | "hard",
    "marks": 1 | 2 | 3,
    "explanation": "Short explanation"
  }
]

Rules:
- Keep section counts exact.
- Application and analytical questions should be harder than conceptual ones.
- Use believable distractors.
- Mix question styles naturally, but most can be mcq.
- Set ai_source to "gemini" for every question.
- Keep explanations short.`;

  const raw = await callGemini(prompt, {
    maxOutputTokens: 2000,
    cacheKey: `assessment_${hashString([subject, classGrade, examType, allTopics.join("|")].join("|"))}`,
    cacheMinutes: 120
  });
  return safeParseJSON(raw).map((question, index) => ({
    ...question,
    question_number: index + 1,
    ai_source: "gemini"
  }));
}

export async function generateDiagnosticReport(answerSheet, questions, studentProfile, studyHistory) {
  const prompt = `You are an expert academic analyst for SYNAPTIQ.

STUDENT
Name: ${studentProfile.name}
Class: ${studentProfile.classGrade}
Exam: ${studentProfile.examType}
Subject: ${studentProfile.subject}

STUDY HISTORY
Total study hours: ${studyHistory.totalHours}
Quiz average: ${studyHistory.quizAverage}
Flagged topics: ${(studyHistory.flaggedTopics || []).join(", ") || "None"}

QUESTIONS
${JSON.stringify(questions)}

ANSWER SHEET
${JSON.stringify(answerSheet)}

Return valid JSON only in this shape:
{
  "overall_score": 40,
  "max_score": 50,
  "percentage": 80,
  "readiness_score": 76,
  "readiness_label": "Well Prepared",
  "grade_prediction": "A",
  "marks_range_prediction": "62-70/80",
  "topic_analysis": [
    {
      "topic": "Topic",
      "questions_attempted": 4,
      "correct": 3,
      "score_percent": 75,
      "status": "strong" | "moderate" | "weak",
      "insight": "Short insight"
    }
  ],
  "strengths": [
    {
      "topic": "Topic",
      "score_percent": 94,
      "praise": "Short praise"
    }
  ],
  "weaknesses": [
    {
      "topic": "Topic",
      "score_percent": 28,
      "common_mistakes": "Short mistake pattern",
      "revision_strategy": "Short strategy",
      "estimated_revision_hours": 3
    }
  ],
  "seven_day_revision_plan": [
    {
      "day": 1,
      "focus_topic": "Topic",
      "activity": "What to do",
      "duration_minutes": 60
    }
  ],
  "motivational_message": "Encouraging message",
  "exam_day_tip": "One practical tip"
}

Be realistic, specific, and concise.`;

  const raw = await callGemini(prompt, {
    maxOutputTokens: 1200,
    cacheKey: `report_${hashString(JSON.stringify({
      answerSheet,
      studentProfile,
      questionsCount: Array.isArray(questions) ? questions.length : 0,
      totalHours: studyHistory?.totalHours
    }))}`,
    cacheMinutes: 60
  });
  return safeParseJSON(raw);
}
