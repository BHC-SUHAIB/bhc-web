// Machine-to-machine ingest API for the daily agent. Every route here is
// mounted behind requireIngestToken (see index.js) — the human session does
// NOT grant access, and this token does NOT grant access to human routes.
//
//   POST /                → create OR update a recommendation. Idempotent on a
//                           STABLE id derived from company+role_title, so a
//                           daily re-push (even with a rotating tracking URL)
//                           updates in place and never orphans attached files.
//   POST /:id/files       → attach resume/cover docx+pdf (multipart)
//
// Nothing here can submit a job application anywhere. It only stores data.
// A new rec is created 'New'. A re-ingest PRESERVES the existing status, so a
// human's Skip is permanent (a dismissed job is not resurrected by re-pushes;
// recover it from the Dismissed panel). The ingest never sets 'Dismissed'.
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

// Deterministic id from the job's natural key (company + role_title). The same
// posting always maps to the same id, so re-pushes are true upserts regardless
// of the source_url, which for Indeed/LinkedIn email links is a rotating
// tracking blob. This is what keeps attached files from being orphaned.
function stableRecId(company, role) {
  const key = `${String(company || '').trim().toLowerCase()}|${String(role || '').trim().toLowerCase()}`;
  return 'rec-' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 12);
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
  };
  // status is intentionally NOT taken from the request body — it's owned by the
  // human's apply/dismiss/restore actions and by creation (below).

  // If this posting is ALREADY an application in the pipeline, skip by default
  // rather than re-queueing it. Explicit + logged so a push is never silently
  // lost. Set INGEST_RESURFACE_APPLIED=true to surface it as a rec anyway.
  const resurfaceApplied = process.env.INGEST_RESURFACE_APPLIED === 'true';
  const appDupe = findApplicationByUrl(payload.source_url)
    || (payload.company && payload.role_title && findApplicationByCompanyRole(payload.company, payload.role_title));
  if (appDupe && !resurfaceApplied) {
    console.log(`[ingest] skipped (already an application): "${payload.company} — ${payload.role_title}" → ${appDupe.id}`);
    return res.status(200).json({ skipped: 'already_application', application_id: appDupe.id });
  }

  // Locate an existing rec by stable id first, then fall back to url / company+role
  // (covers legacy records created before stable ids, and preserves their id).
  const stableId = stableRecId(payload.company, payload.role_title);
  const existing = getRecommendation(stableId)
    || findRecommendationByUrl(payload.source_url)
    || (payload.company && payload.role_title && findRecommendationByCompanyRole(payload.company, payload.role_title));

  if (existing) {
    // Update content but PRESERVE the human's status decision — a skip is
    // permanent. Re-ingesting a dismissed job leaves it dismissed (recover it
    // from the Dismissed panel if that was a mistake); a still-active job stays
    // New. The ingest never sets 'Dismissed' itself.
    const updated = updateRecommendation(existing.id, { ...payload, status: existing.status });
    return res.status(200).json({ id: updated.id, updated: true, status: updated.status, recommendation: updated });
  }

  const created = insertRecommendation({ id: stableId, ...payload, status: 'New' });
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
