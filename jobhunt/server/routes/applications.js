// Human CRUD for applications. All routes require a valid session (mounted
// behind requireSession in index.js). On any status change we auto-append to
// status_history, mirroring the original tracker's changeStatus() logic.
import express from 'express';
import {
  listApplications, getApplication, insertApplication,
  updateApplication, deleteApplication,
} from '../db.js';
import { makeId } from '../shared.js';

const router = express.Router();

const VALID_STATUSES = [
  'Saved', 'Applied', 'Recruiter Screen', 'Interview',
  'Final Round', 'Offer', 'Rejected', 'Withdrawn',
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

// Build a full application record from arbitrary input fields.
function buildNew(fields) {
  const status = VALID_STATUSES.includes(fields.status) ? fields.status : 'Saved';
  const dateApplied = fields.date_applied || (status !== 'Saved' ? todayStr() : '');
  const app = {
    id: fields.id || '',
    company: fields.company || '',
    role_title: fields.role_title || '',
    track: fields.track || '',
    engagement_type: fields.engagement_type || '',
    platform: fields.platform || '',
    location_type: fields.location_type || '',
    comp: fields.comp || '',
    source_url: fields.source_url || '',
    date_applied: dateApplied,
    status,
    status_history: (Array.isArray(fields.status_history) && fields.status_history.length)
      ? fields.status_history
      : [{ status, date: dateApplied || todayStr() }],
    resume_version_used: fields.resume_version_used || '',
    contact: fields.contact || '',
    next_action: fields.next_action || '',
    next_action_due: fields.next_action_due || '',
    notes: fields.notes || '',
  };
  if (!app.id) app.id = makeId(app, todayStr());
  return app;
}

// Given an existing record and an incoming patch, append to status_history when
// the status actually changes.
function applyStatusHistory(existing, patch) {
  const history = Array.isArray(existing.status_history) ? existing.status_history.slice() : [];
  const nextStatus = patch.status;
  if (nextStatus && nextStatus !== existing.status) {
    const date = patch.status_date || todayStr();
    const last = history[history.length - 1];
    if (!last || last.status !== nextStatus) history.push({ status: nextStatus, date });
    // First move off "Saved" stamps date_applied if not already set.
    if (nextStatus !== 'Saved' && !existing.date_applied && !patch.date_applied) {
      patch.date_applied = date;
    }
  }
  return history;
}

router.get('/', (req, res) => {
  res.json(listApplications());
});

router.get('/:id', (req, res) => {
  const app = getApplication(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  res.json(app);
});

router.post('/', (req, res) => {
  const app = buildNew(req.body || {});
  if (getApplication(app.id)) {
    return res.status(409).json({ error: 'An application with this id already exists', id: app.id });
  }
  if (patch_invalidStatus(app.status)) return res.status(400).json({ error: 'Invalid status' });
  res.status(201).json(insertApplication(app));
});

router.put('/:id', (req, res) => {
  const existing = getApplication(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const patch = { ...(req.body || {}) };
  delete patch.id;
  if (patch.status && patch_invalidStatus(patch.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const status_history = applyStatusHistory(existing, patch);
  const updated = updateApplication(req.params.id, { ...patch, status_history });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const ok = deleteApplication(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

function patch_invalidStatus(s) { return s && !VALID_STATUSES.includes(s); }

export default router;
