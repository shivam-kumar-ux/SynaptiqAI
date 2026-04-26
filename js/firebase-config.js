// ============================================================
// STEP 1: GO TO https://firebase.google.com
// STEP 2: Create a project → Add Web App → Copy config below
// STEP 3: Replace ALL values below with YOUR project values
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage }     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ▼▼▼ REPLACE THESE WITH YOUR OWN FIREBASE CREDENTIALS ▼▼▼
const firebaseConfig = {
  apiKey:            "AIzaSyCZEqO_5ShiAo7ffYvMdFeTIT2WrHepAjc",
  authDomain:        "synaptiq-ai.firebaseapp.com",
  projectId:         "synaptiq-ai",
  storageBucket:     "synaptiq-ai.firebasestorage.app",
  messagingSenderId: "275398807790",
  appId:             "1:275398807790:web:ea6df55aba01fbbd4323ff"
};
// ▲▲▲ REPLACE THESE WITH YOUR OWN FIREBASE CREDENTIALS ▲▲▲

const app     = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);
