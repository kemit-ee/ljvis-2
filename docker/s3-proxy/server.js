'use strict';

const express = require('express');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('node:crypto');

// ── Required env vars ─────────────────────────────────────────────────────────
const REQUIRED_ENV = ['S3_ENDPOINT', 'S3_BUCKET_NAME', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[s3-proxy] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── Env number validation ─────────────────────────────────────────────────────
function readPositiveNumber(name, defaultValue, maxValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > maxValue) {
    throw new Error(`${name} must be a positive number not greater than ${maxValue}, got: ${raw}`);
  }
  return value;
}

// ── Config from env (all validation limits are env-driven) ────────────────────
const BUCKET          = process.env.S3_BUCKET_NAME;
const KEY_PREFIX      = (process.env.S3_KEY_PREFIX || 'protocols').replace(/\/+$/, '');
const MAX_BYTES       = readPositiveNumber('S3_MAX_SIZE_MB', 20, 100) * 1024 * 1024;
const MAX_NAME_LEN    = readPositiveNumber('S3_MAX_FILENAME_LENGTH', 200, 500);
const PORT            = readPositiveNumber('PORT', 3010, 65535);

const DEFAULT_ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.etsi.asic-e+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_MIMES = new Set(
  (process.env.S3_ALLOWED_MIME_TYPES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean).length > 0
    ? (process.env.S3_ALLOWED_MIME_TYPES || '').split(',').map(s => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_MIMES
);

// ── S3 client ─────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

// ── Magic bytes → MIME map ────────────────────────────────────────────────────
// Each entry: { mime, offset, magic } where magic is a Buffer to match at offset.
const MAGIC_SIGNATURES = [
  { mime: 'application/pdf',      offset: 0, magic: Buffer.from([0x25, 0x50, 0x44, 0x46]) },               // %PDF
  { mime: 'image/jpeg',           offset: 0, magic: Buffer.from([0xFF, 0xD8, 0xFF]) },                      // JPEG SOI
  { mime: 'image/png',            offset: 0, magic: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]) },   // PNG
  { mime: 'application/zip',      offset: 0, magic: Buffer.from([0x50, 0x4B, 0x03, 0x04]) },               // ZIP (covers docx, asice)
  { mime: 'application/zip',      offset: 0, magic: Buffer.from([0x50, 0x4B, 0x05, 0x06]) },               // ZIP (empty)
  { mime: 'application/msword',   offset: 0, magic: Buffer.from([0xD0, 0xCF, 0x11, 0xE0]) },               // OLE2 (doc)
];

// ZIP-based formats (docx, asice) share the ZIP magic — we disambiguate by extension.
const ZIP_MIME_BY_EXT = {
  '.docx':  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.asice': 'application/vnd.etsi.asic-e+zip',
  '.zip':   'application/zip',
};

/**
 * Strictly validate and decode a base64 string.
 * Returns a Buffer on success, null on failure.
 */
function decodeBase64(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s/g, '');
  if (
    normalized.length === 0 ||
    normalized.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    return null;
  }
  const buffer = Buffer.from(normalized, 'base64');
  if (buffer.length === 0) return null;
  const reEncoded = buffer.toString('base64').replace(/=+$/, '');
  const original  = normalized.replace(/=+$/, '');
  return original === reEncoded ? buffer : null;
}

/**
 * Normalise a declared MIME type: strip parameters, lowercase, trim.
 * e.g. "application/pdf; charset=binary" -> "application/pdf"
 */
function normalizeMime(value) {
  if (typeof value !== 'string') return '';
  return value.split(';', 1)[0].trim().toLowerCase();
}

/**
 * Detect MIME type from first bytes of buffer. Returns null if unknown.
 */
function detectMime(buf, filename) {
  for (const sig of MAGIC_SIGNATURES) {
    if (buf.length < sig.offset + sig.magic.length) continue;
    if (buf.slice(sig.offset, sig.offset + sig.magic.length).equals(sig.magic)) {
      if (sig.mime === 'application/zip') {
        const ext = filename.match(/(\.[^.]+)$/i)?.[1]?.toLowerCase();
        return ZIP_MIME_BY_EXT[ext] ?? 'application/zip';
      }
      return sig.mime;
    }
  }
  return null;
}

/**
 * Sanitize a file name:
 * - Strip path traversal sequences
 * - Normalize unicode (NFC)
 * - Remove control characters and characters unsafe in S3 keys
 * - Collapse multiple dots/spaces
 * - Enforce max length (before extension)
 * Returns null if the result is empty or has no valid extension.
 */
function sanitizeFilename(raw, maxLen) {
  // Normalize unicode, strip path separators and traversal
  let name = raw.normalize('NFC')
    .replace(/[/\\]/g, '')          // no path separators
    .replace(/\.\./g, '')           // no traversal
    .replace(/[\x00-\x1F\x7F]/g, '') // no control chars
    .replace(/[^\p{L}\p{N}\s.\-()[\]]/gu, '_') // keep Unicode letters/numbers, rest → _
    .replace(/\s+/g, '_')           // spaces → underscore
    .replace(/_+/g, '_')            // collapse underscores
    .replace(/^[._-]+/, '')         // no leading dots/dashes
    .trim();

  if (!name) return null;

  // Split stem + extension, truncate stem to maxLen
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx <= 0) return null; // require an extension
  const stem = name.slice(0, dotIdx).slice(0, maxLen);
  const ext  = name.slice(dotIdx).toLowerCase();
  if (!stem) return null;

  return stem + ext;
}

// ── Express app ───────────────────────────────────────────────────────────────
const jsonLimit = `${Math.ceil(MAX_BYTES / (1024 * 1024) * 1.4 + 2)}mb`; // base64 overhead ~1.37x + headroom
const app = express();
app.use(express.json({ limit: jsonLimit }));

/**
 * POST /upload
 * Body: {
 *   key_folder: "vr-2026-12345",      — subfolder under KEY_PREFIX (e.g. form_number)
 *   file_name:  "document.pdf",       — original filename (will be sanitized)
 *   content_base64: "...",            — base64-encoded file bytes
 *   content_type:   "application/pdf" — declared MIME (verified against magic bytes)
 * }
 * Returns 200 { key, size_bytes } on success.
 * This endpoint is NOT exposed outside the Docker network.
 */
app.post('/upload', async (req, res) => {
  const { key_folder, file_name, content_base64, content_type } = req.body ?? {};
  console.log(`[s3-proxy] [upload] REQUEST key_folder=${key_folder} file_name=${file_name} content_type=${content_type} base64_len=${content_base64?.length ?? 0}`);

  // ── 1. Presence check ──────────────────────────────────────────────────────
  if (!key_folder || !file_name || !content_base64 || !content_type) {
    console.warn(`[s3-proxy] [upload] REJECT missing fields: key_folder=${!!key_folder} file_name=${!!file_name} base64=${!!content_base64} content_type=${!!content_type}`);
    return res.status(400).json({ error: 'key_folder, file_name, content_base64, and content_type are required' });
  }

  // ── 2. Decode base64 ──────────────────────────────────────────────────────
  const fileBuffer = decodeBase64(content_base64);
  if (!fileBuffer) {
    console.warn(`[s3-proxy] [upload] REJECT invalid base64`);
    return res.status(400).json({ error: 'Invalid or empty base64 content' });
  }
  console.log(`[s3-proxy] [upload] decoded ${fileBuffer.length} bytes`);

  // ── 3. File size check ────────────────────────────────────────────────────
  if (fileBuffer.length > MAX_BYTES) {
    console.warn(`[s3-proxy] [upload] REJECT size ${(fileBuffer.length/1024/1024).toFixed(2)}MB > limit ${MAX_BYTES/1024/1024}MB`);
    return res.status(413).json({
      error: `File size ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB exceeds limit of ${MAX_BYTES / 1024 / 1024} MB`,
    });
  }

  // ── 4. Sanitize filename ──────────────────────────────────────────────────
  const safeName = sanitizeFilename(file_name, MAX_NAME_LEN);
  if (!safeName) {
    console.warn(`[s3-proxy] [upload] REJECT unsanitizable filename: "${file_name}"`);
    return res.status(400).json({ error: `Invalid or unsanitizable file name: "${file_name}"` });
  }
  console.log(`[s3-proxy] [upload] sanitized filename: "${file_name}" -> "${safeName}"`);

  // ── 5. Magic bytes MIME detection ─────────────────────────────────────────
  const detectedMime = detectMime(fileBuffer, safeName);
  console.log(`[s3-proxy] [upload] magic-bytes detected MIME: ${detectedMime} (declared: ${content_type})`);
  if (!detectedMime) {
    console.warn(`[s3-proxy] [upload] REJECT unrecognized magic bytes (first 8: ${fileBuffer.slice(0,8).toString('hex')})`);
    return res.status(400).json({ error: `File content does not match any recognized format` });
  }

  // ── 6. Declared vs detected MIME check ────────────────────────────────────
  // Normalise declared MIME (strip parameters like "; charset=binary")
  const declaredMime = normalizeMime(content_type);
  if (detectedMime !== declaredMime) {
    console.warn(`[s3-proxy] [upload] REJECT MIME mismatch: declared=${declaredMime} detected=${detectedMime}`);
    return res.status(415).json({
      error: `Declared content_type "${declaredMime}" does not match detected type "${detectedMime}"`,
    });
  }

  // ── 7. Allowed MIME list check ────────────────────────────────────────────
  if (!ALLOWED_MIMES.has(detectedMime)) {
    console.warn(`[s3-proxy] [upload] REJECT MIME not in allowlist: ${detectedMime}`);
    return res.status(415).json({ error: `File type "${detectedMime}" is not allowed` });
  }

  // ── 8. Sanitize key_folder (supports "form_type/form_number" structure) ──
  const sanitizeSegment = (s) => s
    .replace(/\.\./g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[^\p{L}\p{N}\s.\-()[\]]/gu, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .trim();
  const safeFolder = key_folder
    .split('/')
    .map(sanitizeSegment)
    .filter(Boolean)
    .join('/');
  if (!safeFolder) {
    console.warn(`[s3-proxy] [upload] REJECT invalid key_folder: "${key_folder}"`);
    return res.status(400).json({ error: 'Invalid key_folder value' });
  }
  console.log(`[s3-proxy] [upload] key_folder sanitized: "${key_folder}" -> "${safeFolder}"`);

  // ── 9. Build final S3 key (timestamp + UUID suffix prevents overwrites) ────
  const now = new Date();
  const ts = now.getUTCFullYear().toString()
    + String(now.getUTCMonth() + 1).padStart(2, '0')
    + String(now.getUTCDate()).padStart(2, '0')
    + '_' + String(now.getUTCHours()).padStart(2, '0')
    + String(now.getUTCMinutes()).padStart(2, '0')
    + String(now.getUTCSeconds()).padStart(2, '0');
  const uniqueSuffix = `${ts}_${randomUUID()}`;
  const dotIdx2 = safeName.lastIndexOf('.');
  const timedName = dotIdx2 > 0
    ? safeName.slice(0, dotIdx2) + '_' + uniqueSuffix + safeName.slice(dotIdx2)
    : safeName + '_' + uniqueSuffix;
  const s3Key = `${KEY_PREFIX}/${safeFolder}/${timedName}`;
  console.log(`[s3-proxy] [upload] final s3Key: "${s3Key}"`);

  // ── 10. Upload ────────────────────────────────────────────────────────────
  console.log(`[s3-proxy] [upload] uploading to s3://${BUCKET}/${s3Key} (${fileBuffer.length} bytes, ${detectedMime})`);
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: detectedMime,
      ContentLength: fileBuffer.length,
    }));
    console.log(`[s3-proxy] [upload] OK s3://${BUCKET}/${s3Key}`);
    return res.status(201).json({ key: s3Key, size_bytes: fileBuffer.length });
  } catch (err) {
    console.error(`[s3-proxy] [upload] ERROR S3 PutObject failed: ${err.name}: ${err.message}`);
    return res.status(502).json({ error: 'S3 upload failed' });
  }
});

const PRESIGN_TTL_SECONDS = parseInt(process.env.S3_PRESIGN_TTL_SECONDS, 10) || 300;

/**
 * GET /presign?key=<s3key>
 * Returns a short-lived presigned URL (default 5 min) for direct browser download.
 * The key must start with KEY_PREFIX to prevent path traversal.
 * This endpoint is NOT exposed outside the Docker network.
 */
app.get('/presign', async (req, res) => {
  const key = req.query.key;
  console.log(`[s3-proxy] [presign] REQUEST key=${key}`);

  if (!key || typeof key !== 'string') {
    console.warn(`[s3-proxy] [presign] REJECT missing key param`);
    return res.status(400).json({ error: 'Query parameter "key" is required' });
  }

  // Security: reject suspicious keys outright instead of normalising them
  if (
    key.includes('..') ||
    key.includes('\\') ||
    key.includes('\0') ||
    !key.startsWith(`${KEY_PREFIX}/`)
  ) {
    console.warn(`[s3-proxy] [presign] REJECT invalid key: "${key}"`);
    return res.status(403).json({ error: 'Access denied: invalid key' });
  }
  const normalised = key;

  try {
    console.log(`[s3-proxy] [presign] generating signed URL for s3://${BUCKET}/${normalised} TTL=${PRESIGN_TTL_SECONDS}s`);
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: normalised });
    const url = await getSignedUrl(s3, command, { expiresIn: PRESIGN_TTL_SECONDS });
    const filename = normalised.split('/').pop() || 'download';
    console.log(`[s3-proxy] [presign] OK filename=${filename}`);
    return res.status(200).json({ url, filename, expires_in: PRESIGN_TTL_SECONDS });
  } catch (err) {
    console.error(`[s3-proxy] [presign] ERROR ${err.name}: ${err.message}`);
    return res.status(502).json({ error: 'Presign failed' });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[s3-proxy] listening on :${PORT} | bucket=${BUCKET} prefix=${KEY_PREFIX} maxSize=${MAX_BYTES / 1024 / 1024}MB`);
  console.log(`[s3-proxy] allowed MIME types: ${[...ALLOWED_MIMES].join(', ')}`);
});

function shutdown(signal) {
  console.log(`[s3-proxy] received ${signal}, shutting down gracefully`);
  server.close((err) => {
    if (err) {
      console.error('[s3-proxy] error during shutdown:', err.message);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
