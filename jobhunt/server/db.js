// SQLite persistence for the job-hunt cockpit. Uses better-sqlite3 (synchronous,
// zero-config). The DB file and uploaded documents live under DATA_DIR, which is
// a bind-mounted volume on the droplet so data survives container rebuilds.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = process.env.DATA_DIR || '/data';
export const FILES_DIR = process.env.FILES_DIR || path.join(DATA_DIR, 'files');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'jobhunt.db');
const SEED_PATH = path.join(__dirname, '..', 'data', 'applications.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(FILES_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id                  TEXT PRIMARY KEY,
    company             TEXT NOT NULL DEFAULT '',
    role_title          TEXT NOT NULL DEFAULT '',
    track               TEXT NOT NULL DEFAULT '',
    engagement_type     TEXT NOT NULL DEFAULT '',
    platform            TEXT NOT NULL DEFAULT '',
    location_type       TEXT NOT NULL DEFAULT '',
    comp                TEXT NOT NULL DEFAULT '',
    source_url          TEXT NOT NULL DEFAULT '',
    date_applied        TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'Saved',
    status_history      TEXT NOT NULL DEFAULT '[]',
    resume_version_used TEXT NOT NULL DEFAULT '',
    contact             TEXT NOT NULL DEFAULT '',
    next_action         TEXT NOT NULL DEFAULT '',
    next_action_due     TEXT NOT NULL DEFAULT '',
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recommendations (
    id              TEXT PRIMARY KEY,
    date_surfaced   TEXT NOT NULL DEFAULT '',
    company         TEXT NOT NULL DEFAULT '',
    role_title      TEXT NOT NULL DEFAULT '',
    source          TEXT NOT NULL DEFAULT '',
    source_url      TEXT NOT NULL DEFAULT '',
    location_type   TEXT NOT NULL DEFAULT '',
    comp            TEXT NOT NULL DEFAULT '',
    engagement_type TEXT NOT NULL DEFAULT '',
    chosen_track    TEXT NOT NULL DEFAULT '',
    fit_score       INTEGER NOT NULL DEFAULT 0,
    rationale       TEXT NOT NULL DEFAULT '',
    green_flags     TEXT NOT NULL DEFAULT '[]',
    red_flags       TEXT NOT NULL DEFAULT '[]',
    resume_docx     TEXT,
    resume_pdf      TEXT,
    cover_docx      TEXT,
    cover_pdf       TEXT,
    status          TEXT NOT NULL DEFAULT 'New',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ---- JSON (de)serialization helpers for array/object columns ----
const JSON_COLS_APP = ['status_history'];
const JSON_COLS_REC = ['green_flags', 'red_flags'];

function hydrate(row, jsonCols) {
  if (!row) return row;
  const out = { ...row };
  for (const c of jsonCols) {
    try { out[c] = JSON.parse(out[c] ?? '[]'); } catch { out[c] = []; }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const _getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
const _setSetting = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);
export function getSetting(key, fallback = null) {
  const row = _getSetting.get(key);
  return row ? row.value : fallback;
}
export function setSetting(key, value) {
  _setSetting.run(key, String(value));
  return getSetting(key);
}
export function getWeeklyTarget() {
  return Number(getSetting('weekly_target', '35')) || 0;
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
const APP_COLS = [
  'id', 'company', 'role_title', 'track', 'engagement_type', 'platform',
  'location_type', 'comp', 'source_url', 'date_applied', 'status',
  'status_history', 'resume_version_used', 'contact', 'next_action',
  'next_action_due', 'notes'
];

export function listApplications() {
  const rows = db.prepare('SELECT * FROM applications ORDER BY date_applied DESC, company ASC').all();
  return rows.map((r) => hydrate(r, JSON_COLS_APP));
}
export function getApplication(id) {
  return hydrate(db.prepare('SELECT * FROM applications WHERE id = ?').get(id), JSON_COLS_APP);
}
export function findApplicationByUrl(url) {
  if (!url) return null;
  return hydrate(db.prepare('SELECT * FROM applications WHERE source_url = ? LIMIT 1').get(url), JSON_COLS_APP);
}
export function findApplicationByCompanyRole(company, role) {
  return hydrate(
    db.prepare('SELECT * FROM applications WHERE lower(company) = lower(?) AND lower(role_title) = lower(?) LIMIT 1').get(company || '', role || ''),
    JSON_COLS_APP
  );
}

const _insertApp = db.prepare(`
  INSERT INTO applications
    (${APP_COLS.join(', ')})
  VALUES
    (${APP_COLS.map((c) => '@' + c).join(', ')})
`);
export function insertApplication(app) {
  const row = normalizeAppForDb(app);
  _insertApp.run(row);
  return getApplication(row.id);
}

export function upsertApplication(app) {
  const existing = getApplication(app.id);
  if (existing) return updateApplication(app.id, app);
  return insertApplication(app);
}

export function updateApplication(id, patch) {
  const existing = getApplication(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch, id };
  const row = normalizeAppForDb(merged);
  const assignments = APP_COLS.filter((c) => c !== 'id').map((c) => `${c} = @${c}`).join(', ');
  db.prepare(`UPDATE applications SET ${assignments}, updated_at = datetime('now') WHERE id = @id`).run(row);
  return getApplication(id);
}

export function deleteApplication(id) {
  return db.prepare('DELETE FROM applications WHERE id = ?').run(id).changes > 0;
}

function normalizeAppForDb(app) {
  const row = {};
  for (const c of APP_COLS) {
    if (c === 'status_history') {
      row[c] = JSON.stringify(Array.isArray(app.status_history) ? app.status_history : []);
    } else if (c === 'id') {
      row[c] = app.id;
    } else {
      row[c] = app[c] == null ? '' : String(app[c]);
    }
  }
  return row;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------
const REC_COLS = [
  'id', 'date_surfaced', 'company', 'role_title', 'source', 'source_url',
  'location_type', 'comp', 'engagement_type', 'chosen_track', 'fit_score',
  'rationale', 'green_flags', 'red_flags', 'resume_docx', 'resume_pdf',
  'cover_docx', 'cover_pdf', 'status'
];

export function listRecommendations() {
  const rows = db.prepare(`
    SELECT * FROM recommendations
    ORDER BY (status = 'New') DESC, fit_score DESC, date_surfaced DESC
  `).all();
  return rows.map((r) => hydrate(r, JSON_COLS_REC));
}
export function getRecommendation(id) {
  return hydrate(db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id), JSON_COLS_REC);
}
export function findRecommendationByUrl(url) {
  if (!url) return null;
  return hydrate(db.prepare('SELECT * FROM recommendations WHERE source_url = ? LIMIT 1').get(url), JSON_COLS_REC);
}
export function findRecommendationByCompanyRole(company, role) {
  return hydrate(
    db.prepare('SELECT * FROM recommendations WHERE lower(company) = lower(?) AND lower(role_title) = lower(?) LIMIT 1').get(company || '', role || ''),
    JSON_COLS_REC
  );
}

function normalizeRecForDb(rec) {
  const row = {};
  for (const c of REC_COLS) {
    if (c === 'green_flags' || c === 'red_flags') {
      row[c] = JSON.stringify(Array.isArray(rec[c]) ? rec[c] : []);
    } else if (c === 'fit_score') {
      let n = Math.round(Number(rec.fit_score) || 0);
      row[c] = Math.max(0, Math.min(100, n));
    } else if (['resume_docx', 'resume_pdf', 'cover_docx', 'cover_pdf'].includes(c)) {
      row[c] = rec[c] == null ? null : String(rec[c]);
    } else if (c === 'id') {
      row[c] = rec.id;
    } else if (c === 'status') {
      row[c] = rec.status || 'New';
    } else {
      row[c] = rec[c] == null ? '' : String(rec[c]);
    }
  }
  return row;
}

const _insertRec = db.prepare(`
  INSERT INTO recommendations
    (${REC_COLS.join(', ')})
  VALUES
    (${REC_COLS.map((c) => '@' + c).join(', ')})
`);
export function insertRecommendation(rec) {
  const row = normalizeRecForDb(rec);
  _insertRec.run(row);
  return getRecommendation(row.id);
}
export function updateRecommendation(id, patch) {
  const existing = getRecommendation(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch, id };
  const row = normalizeRecForDb(merged);
  const assignments = REC_COLS.filter((c) => c !== 'id').map((c) => `${c} = @${c}`).join(', ');
  db.prepare(`UPDATE recommendations SET ${assignments}, updated_at = datetime('now') WHERE id = @id`).run(row);
  return getRecommendation(id);
}
export function deleteRecommendation(id) {
  return db.prepare('DELETE FROM recommendations WHERE id = ?').run(id).changes > 0;
}

// ---------------------------------------------------------------------------
// Idempotent seed: load applications.json exactly once.
// ---------------------------------------------------------------------------
export function seedIfEmpty() {
  const already = getSetting('seeded_at');
  const count = db.prepare('SELECT COUNT(*) AS n FROM applications').get().n;
  if (already || count > 0) return { seeded: false, count };

  let seed = [];
  try {
    seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  } catch (e) {
    console.warn('[db] no seed file at', SEED_PATH, e.message);
  }
  const insertMany = db.transaction((rows) => {
    for (const a of rows) insertApplication(a);
  });
  insertMany(Array.isArray(seed) ? seed : []);
  setSetting('seeded_at', new Date().toISOString());
  if (!getSetting('weekly_target')) setSetting('weekly_target', '35');
  return { seeded: true, count: Array.isArray(seed) ? seed.length : 0 };
}

export default db;
