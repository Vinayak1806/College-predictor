/**
 * Storage abstraction for admin PDF imports.
 *
 * Two backends:
 * - **Local**: writes to ADMIN_IMPORTS_ROOT on disk (development default).
 * - **Supabase**: uploads to Supabase Storage via REST API (production on Render).
 *
 * The active backend is chosen automatically:
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY present → Supabase
 *   Otherwise → Local filesystem
 */

import fs from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "admin-imports";

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

// ---------------------------------------------------------------------------
// Supabase Storage helpers (REST API — no SDK dependency)
// ---------------------------------------------------------------------------

async function supabaseRequest(method, bucketPath, body, contentType) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${bucketPath}`;
  const headers = {
    Authorization: `Bearer ${SUPABASE_KEY}`,
    apikey: SUPABASE_KEY
  };
  if (contentType) headers["Content-Type"] = contentType;

  const response = await fetch(url, { method, headers, body: body || undefined });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase Storage ${method} ${bucketPath} failed (${response.status}): ${text}`);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a file to storage.
 * @param {string} filePath  Relative path inside the bucket (e.g. "<uuid>/source.pdf")
 * @param {Buffer} buffer    File contents
 * @param {string} [contentType="application/pdf"]
 * @param {string} [bucket]  Override the default bucket
 */
export async function uploadFile(filePath, buffer, contentType = "application/pdf", bucket = DEFAULT_BUCKET) {
  if (isSupabaseConfigured()) {
    await supabaseRequest("POST", `${bucket}/${filePath}`, buffer, contentType);
    return { backend: "supabase", path: filePath };
  }

  // Local fallback — resolve relative to adminImportsRoot
  const { adminImportsRoot } = await import("./adminImportRuntime.js");
  const absolutePath = path.join(adminImportsRoot, filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return { backend: "local", path: absolutePath };
}

/**
 * Download a file from storage and return its contents as a Buffer.
 * @param {string} filePath  Relative path inside the bucket
 * @param {string} [bucket]  Override the default bucket
 * @returns {Promise<Buffer>}
 */
export async function downloadFile(filePath, bucket = DEFAULT_BUCKET) {
  if (isSupabaseConfigured()) {
    const response = await supabaseRequest("GET", `${bucket}/${filePath}`);
    return Buffer.from(await response.arrayBuffer());
  }

  const { adminImportsRoot } = await import("./adminImportRuntime.js");
  const absolutePath = path.join(adminImportsRoot, filePath);
  return fs.readFile(absolutePath);
}

/**
 * Delete a file from storage.
 * @param {string} filePath  Relative path inside the bucket
 * @param {string} [bucket]  Override the default bucket
 */
export async function deleteFile(filePath, bucket = DEFAULT_BUCKET) {
  if (isSupabaseConfigured()) {
    // Supabase delete uses a different endpoint shape
    const url = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${bucket}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prefixes: [filePath] })
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Supabase Storage DELETE failed (${response.status}): ${text}`);
    }
    return;
  }

  const { adminImportsRoot } = await import("./adminImportRuntime.js");
  const absolutePath = path.join(adminImportsRoot, filePath);
  await fs.rm(absolutePath, { recursive: true, force: true });
}

/**
 * Download a file to a local temporary path (for the Python extractor).
 * Returns the absolute path of the temp file. Caller must clean up.
 * @param {string} filePath  Relative path inside the bucket
 * @param {string} [bucket]  Override the default bucket
 * @returns {Promise<string>} Absolute path to the local temp file
 */
export async function downloadToTempFile(filePath, bucket = DEFAULT_BUCKET) {
  const os = await import("node:os");
  const buffer = await downloadFile(filePath, bucket);
  const tempDir = await fs.mkdtemp(path.join(os.default.tmpdir(), "admin-import-"));
  const tempPath = path.join(tempDir, path.basename(filePath));
  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

/**
 * Returns which storage backend is active.
 * @returns {"supabase" | "local"}
 */
export function getStorageType() {
  return isSupabaseConfigured() ? "supabase" : "local";
}
