// js/privacy.js — Privacy & Data Management Center for SYNAPTIQAI

import { dbExportAll, dbClear, dbDelete } from "./db.js";
import { disconnectGoogleDrive } from "./gdrive.js";

export async function exportUserDataJSON() {
  const data = await dbExportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `synaptiq_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function clearAllLocalData() {
  const stores = [
    "users", "settings", "subjects", "syllabus", "topics", "plans",
    "sessions", "quizzes", "assessments", "reports", "knowledgeGraph",
    "mistakes", "retention", "notes", "pyqPapers", "pyqQuestions",
    "focusSessions", "riskAssessments", "interventions", "vivaSessions", "aiProviders"
  ];
  for (const store of stores) {
    await dbClear(store);
  }
  localStorage.clear();
  sessionStorage.clear();
}

export async function deleteUserAccountCompletely(userId) {
  if (userId) {
    await dbDelete("users", userId);
  }
  await clearAllLocalData();
  disconnectGoogleDrive();
}
