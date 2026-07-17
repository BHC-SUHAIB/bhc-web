// Machine-to-machine ingest API for the daily agent. Every route here is
// mounted behind requireIngestToken (see index.js) — the human session does
// NOT grant access, and this token does NOT grant access to human routes.
//
//   POST /                → create OR update a recommendation (idempotent on
//                           source_url, else company+role_title)
//   POST /:id/files       → attach resume/cover docx+pdf (multipart)
//
// Nothing here can submit a job application anywhere. It only stores data.
import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  FILES_DIR, insertRecommendation, updateRecommendation, getRecommendation,
  findRecommendationByUrl, findRecommendationByCompanyRole,
  findApplicationByUrl, findApplicationByCompanyRole,
} from '../db.js';

const router = express.Router();

function shortId() {
  return 'rec-' + crypto.randomBytes(6).toString('hex');
}
function toArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  return String(v).split('\n').map((s) => s.trim()).filter(Boolean);
}

// ---- POST / : create or upsert a recommendation --------------------------
router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.company && !b.role_title && !b.source_url) {
    return res.status(400).json({ error: 'Provide at least company, role_title, or source_url' });
  }

  const payload = {
    date_surfaced: b.date_surfaced || new Date().toISOString().slice(0, 10),
    company: b.company || '',
    role_title: b.role_title || '',
    source: b.source || b.platform || '',
    source_url: b.source_url || '',
    location_type: b.location_type || '',
    comp: b.comp || '',
    engagement_type: b.engagement_type || '',
    chosen_track: b.chosen_track || b.track || '',
    fit_score: b.fit_score,
    rationale: b.rationale || '',
    green_flags: toArray(b.green_flags),
    red_flags: toArray(b.red_flags),
    // Optional deep-dive company brief (markdown/plain text). Rendered as an
    // expandable section on the dashboard card and carried into the
    // application's notes on "Mark applied".
    brief: b.brief || '',
    status: b.status || 'New',
  };

  // Idempotency: if an APPLICATION already exists for this posting, do not
  // recreate a recommendation for something already in the pipeline.
  const appDupe = findApplicationByUrl(payload.source_url)
    || (payload.company && payload.role_title && findApplicationByCompanyRole(payload.company, payload.role_title));
  if (appDupe) {
    return res.status(200).json({ deduped: 'application', application_id: appDupe.id });
  }

  // Idempotency: update an existing recommendation in place.
  const existing = findRecommendationByUrl(payload.source_url)
    || (payload.company && payload.role_title && findRecommendationByCompanyRole(payload.company, payload.role_title));
  if (existing) {
    const updated = updateRecommendation(existing.id, payload);
    return res.status(200).json({ id: updated.id, updated: true, recommendation: updated });
  }

  const created = insertRecommendation({ id: shortId(), ...payload });
  res.status(201).json({ id: created.id, created: true, recommendation: created });
});

// ---- POST /:id/files : attach documents ----------------------------------
const FIELD_TO_COLUMN = {
  resume_docx: { column: 'resume_docx', ext: '.docx' },
  resume_pdf: { column: 'resume_pdf', ext: '.pdf' },
  cover_docx: { column: 'cover_docx', ext: '.docx' },
  cover_pdf: { column: 'cover_pdf', ext: '.pdf' },
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(FILES_DIR, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const meta = FIELD_TO_COLUMN[file.fieldname];
    cb(null, meta ? file.fieldname + meta.ext : file.fieldname);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 4 },
  fileFilter(req, file, cb) {
    cb(null, Object.prototype.hasOwnProperty.call(FIELD_TO_COLUMN, file.fieldname));
  },
});

router.post('/:id/files',
  (req, res, next) => {
    if (!getRecommendation(req.params.id)) return res.status(404).json({ error: 'Recommendation not found' });
    next();
  },
  upload.fields(Object.keys(FIELD_TO_COLUMN).map((name) => ({ name, maxCount: 1 }))),
  (req, res) => {
    const patch = {};
    const saved = [];
    for (const field of Object.keys(FIELD_TO_COLUMN)) {
      const f = req.files?.[field]?.[0];
      if (f) {
        // Store a path relative to FILES_DIR so the DB stays portable.
        patch[FIELD_TO_COLUMN[field].column] = path.relative(FILES_DIR, f.path);
        saved.push(field);
      }
    }
    if (!saved.length) return res.status(400).json({ error: 'No recognized files uploaded' });
    const updated = updateRecommendation(req.params.id, patch);
    res.json({ id: updated.id, attached: saved, recommendation: updated });
  }
);

export default router;
