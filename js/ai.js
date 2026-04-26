// Secure Gemini-only AI client for SYNAPTIQ.

const GEMINI_ENDPOINT = "/api/gemini";

async function postGemini(payload) {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Gemini request failed (${res.status})`);
  }

  if (typeof data.text !== "string" || !data.text.trim()) {
    throw new Error("Gemini returned an empty response.");
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
  return postGemini({
    prompt,
    temperature: options.temperature ?? 0.35
  });
}

export async function testGeminiConnection() {
  const raw = await callGemini('Reply with exactly: OK', { temperature: 0 });
  return raw.trim();
}

export async function parseSyllabus(syllabusText, subject, classGrade, examType) {
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
${syllabusText}`;

  const raw = await callGemini(prompt);
  return safeParseJSON(raw);
}

export async function generateStudyPlan(profile, parsedSyllabus) {
  const syllabusStr = JSON.stringify(parsedSyllabus);
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
- Keep notes actionable and short.`;

  const raw = await callGemini(prompt);
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
- Difficulty split: 3 easy, 5 medium, 2 hard.`;

  const raw = await callGemini(prompt);
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
- Set ai_source to "gemini" for every question.`;

  const raw = await callGemini(prompt);
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

  const raw = await callGemini(prompt);
  return safeParseJSON(raw);
}
