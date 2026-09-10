// js/gdrive.js — Optional Encrypted Google Drive Sync & Backup

import { dbExportAll, dbImportAll } from "./db.js";

const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const BACKUP_FILENAME = "synaptiq_backup.json.enc";
const GDRIVE_TOKEN_KEY = "synaptiq_gdrive_token";
const GDRIVE_META_KEY = "synaptiq_gdrive_meta";

let tokenClient = null;
let accessToken = null;

// ── Web Crypto AES-GCM 256-bit Encryption Helpers ───────────
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(dataObject, passphrase = "synaptiq_default_key") {
  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(dataObject);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(jsonStr)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode.apply(null, combined));
}

export async function decryptData(base64Str, passphrase = "synaptiq_default_key") {
  const binary = atob(base64Str);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}

// ── Google OAuth Initialization ──────────────────────────────
export function initGoogleOAuth(clientId, callback) {
  if (typeof google === "undefined" || !google.accounts?.oauth2) {
    console.warn("Google Identity Services SDK not loaded.");
    return false;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response) => {
      if (response.access_token) {
        accessToken = response.access_token;
        localStorage.setItem(GDRIVE_TOKEN_KEY, accessToken);
        if (callback) callback({ success: true, token: accessToken });
      } else {
        if (callback) callback({ success: false, error: response.error });
      }
    }
  });

  return true;
}

export function requestGoogleDriveAuth() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    // If GIS script not present or client ID not set, mock connection for local-first mode
    const mockToken = "mock_gdrive_token_" + Date.now();
    accessToken = mockToken;
    localStorage.setItem(GDRIVE_TOKEN_KEY, mockToken);
    updateBackupMeta({ connected: true, lastConnected: new Date().toISOString() });
    return true;
  }
}

export function isDriveConnected() {
  const token = localStorage.getItem(GDRIVE_TOKEN_KEY);
  return !!token;
}

export function disconnectGoogleDrive() {
  localStorage.removeItem(GDRIVE_TOKEN_KEY);
  localStorage.removeItem(GDRIVE_META_KEY);
  accessToken = null;
}

export function getBackupMeta() {
  try {
    const raw = localStorage.getItem(GDRIVE_META_KEY);
    return raw ? JSON.parse(raw) : { connected: false };
  } catch {
    return { connected: false };
  }
}

function updateBackupMeta(updates) {
  const current = getBackupMeta();
  const updated = { ...current, ...updates };
  localStorage.setItem(GDRIVE_META_KEY, JSON.stringify(updated));
  return updated;
}

// ── Backup to Google Drive ───────────────────────────────────
export async function backupToDrive(passphrase = "synaptiq_default_key") {
  const token = localStorage.getItem(GDRIVE_TOKEN_KEY);
  if (!token) return { success: false, error: "Google Drive is not connected." };

  try {
    const rawData = await dbExportAll();
    const payload = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      deviceId: getDeviceId(),
      data: rawData
    };

    const encryptedBase64 = await encryptData(payload, passphrase);

    // If using real Google Drive API
    if (!token.startsWith("mock_")) {
      await uploadToGDriveAppData(token, BACKUP_FILENAME, encryptedBase64);
    } else {
      // Local fallback for offline/mock drive storage
      localStorage.setItem("mock_gdrive_appdata", encryptedBase64);
    }

    const meta = updateBackupMeta({
      connected: true,
      lastBackup: new Date().toISOString(),
      backupVersion: "1.0",
      recordCount: Object.values(rawData).reduce((acc, arr) => acc + (arr.length || 0), 0)
    });

    return { success: true, meta };
  } catch (e) {
    return { success: false, error: e.message || "Backup failed." };
  }
}

// ── Restore from Google Drive ────────────────────────────────
export async function restoreFromDrive(passphrase = "synaptiq_default_key") {
  const token = localStorage.getItem(GDRIVE_TOKEN_KEY);
  if (!token) return { success: false, error: "Google Drive is not connected." };

  try {
    let encryptedBase64 = "";

    if (!token.startsWith("mock_")) {
      encryptedBase64 = await downloadFromGDriveAppData(token, BACKUP_FILENAME);
    } else {
      encryptedBase64 = localStorage.getItem("mock_gdrive_appdata") || "";
    }

    if (!encryptedBase64) {
      return { success: false, error: "No backup file found in Google Drive." };
    }

    const decrypted = await decryptData(encryptedBase64, passphrase);
    if (!decrypted || !decrypted.data) {
      return { success: false, error: "Decryption failed. Check passphrase." };
    }

    await dbImportAll(decrypted.data);

    updateBackupMeta({
      lastRestore: new Date().toISOString()
    });

    return { success: true, timestamp: decrypted.timestamp };
  } catch (e) {
    return { success: false, error: "Failed to restore backup: " + e.message };
  }
}

// ── Sync & Conflict Detection ─────────────────────────────────
export async function checkSyncConflict(passphrase = "synaptiq_default_key") {
  const token = localStorage.getItem(GDRIVE_TOKEN_KEY);
  if (!token) return { hasConflict: false };

  try {
    let cloudContent = "";
    if (!token.startsWith("mock_")) {
      cloudContent = await downloadFromGDriveAppData(token, BACKUP_FILENAME);
    } else {
      cloudContent = localStorage.getItem("mock_gdrive_appdata") || "";
    }

    if (!cloudContent) return { hasConflict: false };

    const decrypted = await decryptData(cloudContent, passphrase);
    const cloudTime = new Date(decrypted.timestamp || 0).getTime();

    const meta = getBackupMeta();
    const localTime = new Date(meta.lastBackup || 0).getTime();

    if (cloudTime > localTime && (cloudTime - localTime > 60000)) {
      return {
        hasConflict: true,
        cloudTime: new Date(cloudTime).toLocaleString(),
        localTime: new Date(localTime).toLocaleString(),
        cloudData: decrypted.data
      };
    }

    return { hasConflict: false };
  } catch {
    return { hasConflict: false };
  }
}

// ── Helper: Upload to Google Drive AppData Folder ─────────────
async function uploadToGDriveAppData(token, filename, contentStr) {
  // 1. Search for existing file in appDataFolder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  const existingFile = searchData.files?.[0];

  const metadata = {
    name: filename,
    parents: ["appDataFolder"]
  };

  const multipartBody =
    `--foo_bar_baz\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--foo_bar_baz\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n` +
    contentStr +
    `\r\n--foo_bar_baz--`;

  const url = existingFile
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

  const method = existingFile ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/related; boundary=foo_bar_baz"
    },
    body: multipartBody
  });

  if (!res.ok) {
    throw new Error(`Drive upload failed (${res.status})`);
  }
}

// ── Helper: Download from Google Drive AppData Folder ──────────
async function downloadFromGDriveAppData(token, filename) {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  const existingFile = searchData.files?.[0];

  if (!existingFile) return "";

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`Drive download failed (${res.status})`);
  return await res.text();
}

function getDeviceId() {
  let id = localStorage.getItem("synaptiq_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("synaptiq_device_id", id);
  }
  return id;
}
