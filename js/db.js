// js/db.js — Local-First IndexedDB Layer for SYNAPTIQAI

const DB_NAME = "SynaptiqDB";
const DB_VERSION = 1;

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. users store
      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", { keyPath: "id" });
        userStore.createIndex("email", "email", { unique: true });
      }

      // 2. settings store
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }

      // 3. subjects store
      if (!db.objectStoreNames.contains("subjects")) {
        const subStore = db.createObjectStore("subjects", { keyPath: "id" });
        subStore.createIndex("userId", "userId", { unique: false });
      }

      // 4. syllabus store
      if (!db.objectStoreNames.contains("syllabus")) {
        const sylStore = db.createObjectStore("syllabus", { keyPath: "id" });
        sylStore.createIndex("userId", "userId", { unique: false });
      }

      // 5. topics store
      if (!db.objectStoreNames.contains("topics")) {
        const topStore = db.createObjectStore("topics", { keyPath: "id" });
        topStore.createIndex("planId", "planId", { unique: false });
        topStore.createIndex("userId", "userId", { unique: false });
      }

      // 6. plans store
      if (!db.objectStoreNames.contains("plans")) {
        const planStore = db.createObjectStore("plans", { keyPath: "id" });
        planStore.createIndex("userId", "userId", { unique: false });
        planStore.createIndex("status", "status", { unique: false });
      }

      // 7. sessions store
      if (!db.objectStoreNames.contains("sessions")) {
        const sessStore = db.createObjectStore("sessions", { keyPath: "id" });
        sessStore.createIndex("planId", "planId", { unique: false });
        sessStore.createIndex("userId", "userId", { unique: false });
      }

      // 8. quizzes store
      if (!db.objectStoreNames.contains("quizzes")) {
        const quizStore = db.createObjectStore("quizzes", { keyPath: "id" });
        quizStore.createIndex("userId", "userId", { unique: false });
        quizStore.createIndex("topic", "topic", { unique: false });
      }

      // 9. assessments store
      if (!db.objectStoreNames.contains("assessments")) {
        const assStore = db.createObjectStore("assessments", { keyPath: "id" });
        assStore.createIndex("userId", "userId", { unique: false });
        assStore.createIndex("planId", "planId", { unique: false });
      }

      // 10. reports store
      if (!db.objectStoreNames.contains("reports")) {
        const repStore = db.createObjectStore("reports", { keyPath: "id" });
        repStore.createIndex("userId", "userId", { unique: false });
      }

      // 11. knowledgeGraph store
      if (!db.objectStoreNames.contains("knowledgeGraph")) {
        const kgStore = db.createObjectStore("knowledgeGraph", { keyPath: "id" });
        kgStore.createIndex("userId", "userId", { unique: false });
      }

      // 12. mistakes store
      if (!db.objectStoreNames.contains("mistakes")) {
        const mStore = db.createObjectStore("mistakes", { keyPath: "id" });
        mStore.createIndex("userId", "userId", { unique: false });
        mStore.createIndex("topic", "topic", { unique: false });
        mStore.createIndex("category", "category", { unique: false });
      }

      // 13. retention store
      if (!db.objectStoreNames.contains("retention")) {
        const retStore = db.createObjectStore("retention", { keyPath: "id" });
        retStore.createIndex("userId", "userId", { unique: false });
        retStore.createIndex("topic", "topic", { unique: false });
        retStore.createIndex("nextReviewDate", "nextReviewDate", { unique: false });
      }

      // 14. notes store
      if (!db.objectStoreNames.contains("notes")) {
        const notesStore = db.createObjectStore("notes", { keyPath: "id" });
        notesStore.createIndex("userId", "userId", { unique: false });
        notesStore.createIndex("topic", "topic", { unique: false });
      }

      // 15. pyqPapers store
      if (!db.objectStoreNames.contains("pyqPapers")) {
        const pyqStore = db.createObjectStore("pyqPapers", { keyPath: "id" });
        pyqStore.createIndex("userId", "userId", { unique: false });
        pyqStore.createIndex("subject", "subject", { unique: false });
      }

      // 16. pyqQuestions store
      if (!db.objectStoreNames.contains("pyqQuestions")) {
        const pyqQStore = db.createObjectStore("pyqQuestions", { keyPath: "id" });
        pyqQStore.createIndex("paperId", "paperId", { unique: false });
        pyqQStore.createIndex("topic", "topic", { unique: false });
      }

      // 17. focusSessions store
      if (!db.objectStoreNames.contains("focusSessions")) {
        const focStore = db.createObjectStore("focusSessions", { keyPath: "id" });
        focStore.createIndex("userId", "userId", { unique: false });
      }

      // 18. riskAssessments store
      if (!db.objectStoreNames.contains("riskAssessments")) {
        const rStore = db.createObjectStore("riskAssessments", { keyPath: "id" });
        rStore.createIndex("userId", "userId", { unique: false });
      }

      // 19. interventions store
      if (!db.objectStoreNames.contains("interventions")) {
        const iStore = db.createObjectStore("interventions", { keyPath: "id" });
        iStore.createIndex("userId", "userId", { unique: false });
      }

      // 20. vivaSessions store
      if (!db.objectStoreNames.contains("vivaSessions")) {
        const vStore = db.createObjectStore("vivaSessions", { keyPath: "id" });
        vStore.createIndex("userId", "userId", { unique: false });
      }

      // 21. aiProviders store
      if (!db.objectStoreNames.contains("aiProviders")) {
        const aiStore = db.createObjectStore("aiProviders", { keyPath: "id" });
        aiStore.createIndex("userId", "userId", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

export async function dbPut(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function dbClear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function dbExportAll() {
  const db = await openDB();
  const exportData = {};
  const storeNames = Array.from(db.objectStoreNames);
  for (const name of storeNames) {
    if (name === "aiProviders") continue; // Never export API keys
    exportData[name] = await dbGetAll(name);
  }
  return exportData;
}

export async function dbImportAll(data) {
  const db = await openDB();
  for (const [storeName, records] of Object.entries(data)) {
    if (!db.objectStoreNames.contains(storeName)) continue;
    if (storeName === "aiProviders") continue;
    for (const record of records) {
      await dbPut(storeName, record);
    }
  }
}
