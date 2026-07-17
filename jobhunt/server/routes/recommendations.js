// Human-facing recommendations API (requires session).
//
//   GET    /                 → active queue (not dismissed), date_surfaced desc.
//                              ?all=1 also returns dismissed rows (restore panel).
//   POST   /:id/apply        → promote a rec into an Applied application, then
//                              remove it from the queue
//   POST   /:id/dismiss      → mark the rec Dismissed (leaves the active queue)
//   POST   /:id/restore      → undo a dismiss (back into the active queue)
//
// The token-authenticated ingest routes (create + file upload) live in
// ingest.js, mounted separately so the human session can never write via them.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  listRecommendations, getRecommendation, updateRecommendation, deleteRecommendation,
  getApplication, insertApplication, updateApplication, FILES_DIR,
} from '../db.js';
import { makeId } from '../shared.js';

const router = express.Router();

function todayStr() { return new Date().toISOString().slice(0, 10); }

// Remove a recommendation's uploaded-files directory (best-effort). Guarded to
// stay strictly inside FILES_DIR so a malformed id can't escape the tree.
function removeRecFiles(recId) {
  const dir = path.resolve(FILES_DIR, recId);
  if (!dir.startsWith(path.resolve(FILES_DIR) + path.sep)) return;
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

// Default: the active queue (not dismissed). ?all=1 also returns dismissed
// recs so the client can offer a Restore panel for accidental skips.
router.get('/', (req, res) => {
  res.json(listRecommendations({ includeDismissed: req.query.all === '1' }));
});

// Promote a recommendation into the applications pipeline as "Applied".
// Nothing here submits anything externally — it only records that the human
// chose to apply. Carries over company/role/url/comp/location/engagement and
// sets resume_version_used to the chosen track.
router.post('/:id/apply', (req, res) => {
  const rec = getRecommendation(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });

  const date = todayStr();
  const app = {
    id: '',
    company: rec.company,
    role_title: rec.role_title,
    track: rec.chosen_track || '',
    engagement_type: rec.engagement_type || '',
    platform: rec.source || '',
    location_type: rec.location_type || '',
    comp: rec.comp || '',
    source_url: rec.source_url || '',
    date_applied: date,
    status: 'Applied',
    status_history: [
      { status: 'Saved', date: rec.date_surfaced || date },
      { status: 'Applied', date },
    ],
    resume_version_used: rec.chosen_track || '',
    contact: '',
    next_action: 'Await recruiter reply; follow up if no response in ~10 days',
    next_action_due: '',
    notes: rec.rationale ? `From daily rec. ${rec.rationale}` : 'Applied from daily recommendation.',
  };
  // Preserve the deep-dive company brief through the promotion so it's still
  // on hand at interview-prep time.
  if (rec.brief) app.notes += `\n\n--- Company brief ---\n${rec.brief}`;
  app.id = makeId(app, date);

  // If an application with this id already exists, don't duplicate. Promote it
  // to Applied if it's still only Saved (the human just clicked "Mark applied");
  // otherwise leave its later status untouched.
  const existing = getApplication(app.id);
  let result;
  if (existing) {
    if (existing.status === 'Saved') {
      const history = Array.isArray(existing.status_history) ? existing.status_history.slice() : [];
      const last = history[history.length - 1];
      if (!last || last.status !== 'Applied') history.push({ status: 'Applied', date });
      result = updateApplication(existing.id, {
        status: 'Applied',
        date_applied: existing.date_applied || date,
        status_history: history,
      });
    } else {
      result = existing;
    }
  } else {
    result = insertApplication(app);
  }
  deleteRecommendation(rec.id);
  removeRecFiles(rec.id);
  res.status(201).json({ application: result, removed_recommendation: rec.id });
});

router.post('/:id/dismiss', (req, res) => {
  const rec = getRecommendation(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });
  const updated = updateRecommendation(rec.id, { status: 'Dismissed' });
  res.json(updated);
});

// Undo a dismiss — bring a card back into the active queue. This is the safety
// net that makes dismissal reversible, so an accidental (or rapid) Skip is
// never permanent data loss.
router.post('/:id/restore', (req, res) => {
  const rec = getRecommendation(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });
  const updated = updateRecommendation(rec.id, { status: 'New' });
  res.json(updated);
});

// Optional hard-delete for tidying the queue.
router.delete('/:id', (req, res) => {
  const ok = deleteRecommendation(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  removeRecFiles(req.params.id);
  res.json({ ok: true });
});

export default router;
