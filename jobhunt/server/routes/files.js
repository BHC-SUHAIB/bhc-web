// Authenticated document downloads. Mounted behind requireSessionOrIngest so
// files are reachable by the human (browser session) or the daily agent
// verifying its own upload (ingest token) — never anonymously.
//
//   GET /:recId/:kind   kind ∈ resume_docx | resume_pdf | cover_docx | cover_pdf
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { FILES_DIR, getRecommendation } from '../db.js';

const router = express.Router();

const KINDS = {
  resume_pdf: { column: 'resume_pdf', label: 'resume', ext: 'pdf', type: 'application/pdf' },
  resume_docx: { column: 'resume_docx', label: 'resume', ext: 'docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  cover_pdf: { column: 'cover_pdf', label: 'cover-letter', ext: 'pdf', type: 'application/pdf' },
  cover_docx: { column: 'cover_docx', label: 'cover-letter', ext: 'docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
};

function safeName(s) { return String(s || '').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'file'; }

router.get('/:recId/:kind', (req, res) => {
  const meta = KINDS[req.params.kind];
  if (!meta) return res.status(400).json({ error: 'Unknown file kind' });

  const rec = getRecommendation(req.params.recId);
  if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

  const rel = rec[meta.column];
  if (!rel) return res.status(404).json({ error: 'No such file attached' });

  // Resolve within FILES_DIR and guard against path traversal.
  const abs = path.resolve(FILES_DIR, rel);
  if (!abs.startsWith(path.resolve(FILES_DIR) + path.sep) || !fs.existsSync(abs)) {
    return res.status(404).json({ error: 'File missing on disk' });
  }

  const filename = `${safeName(rec.company)}_${safeName(rec.role_title)}_${meta.label}.${meta.ext}`;
  res.setHeader('Content-Type', meta.type);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(abs).pipe(res);
});

export default router;
