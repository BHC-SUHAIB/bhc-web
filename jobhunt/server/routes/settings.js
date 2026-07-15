// Human settings API. Currently just the weekly application target, but the
// key/value settings table is generic so new tunables are cheap to add.
import express from 'express';
import { getWeeklyTarget, setSetting } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ weekly_target: getWeeklyTarget() });
});

router.put('/', (req, res) => {
  const body = req.body || {};
  if (body.weekly_target != null) {
    const n = Math.max(0, Math.round(Number(body.weekly_target) || 0));
    setSetting('weekly_target', String(n));
  }
  res.json({ weekly_target: getWeeklyTarget() });
});

export default router;
