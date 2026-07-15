// Job-Hunt Cockpit — Express server.
// Serves the built React app + JSON API from a single origin
// (jobhunt.blackhartconsulting.com). Listens only inside the Docker network;
// Caddy terminates TLS and reverse-proxies to it.
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  seedIfEmpty, listApplications, getWeeklyTarget,
} from './db.js';
import {
  checkPassword, issueSessionToken, hasValidSession,
  requireSession, requireIngestToken, requireSessionOrIngest,
  SESSION_COOKIE, sessionCookieOptions,
} from './auth.js';
import applicationsRouter from './routes/applications.js';
import settingsRouter from './routes/settings.js';
import recommendationsRouter from './routes/recommendations.js';
import ingestRouter from './routes/ingest.js';
import filesRouter from './routes/files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 8080;

const app = express();
app.set('trust proxy', 1); // behind Caddy

// Helmet, but relaxed CSP: the built bundle is same-origin JS/CSS with a few
// inline styles from Vite. Keep default protections, drop CSP to avoid
// blocking the app's own inline styles (all assets are first-party anyway).
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Health check (unauthenticated, for container/monitoring) ----
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- Auth: login / logout / me ----
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

app.post('/api/login', loginLimiter, (req, res) => {
  const password = (req.body && req.body.password) || '';
  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  res.cookie(SESSION_COOKIE, issueSessionToken(), sessionCookieOptions());
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ authenticated: hasValidSession(req) });
});

// ---- Machine ingest API (Bearer INGEST_TOKEN only) ----
app.use('/api/ingest/recommendations', requireIngestToken, ingestRouter);

// ---- File downloads (session OR ingest token) ----
app.use('/api/files', requireSessionOrIngest, filesRouter);

// ---- Human API (session required) ----
app.use('/api/applications', requireSession, applicationsRouter);
app.use('/api/settings', requireSession, settingsRouter);
app.use('/api/recommendations', requireSession, recommendationsRouter);

// Full JSON export for backups.
app.get('/api/export', requireSession, (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="jobhunt-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    exported_at: new Date().toISOString(),
    weekly_target: getWeeklyTarget(),
    applications: listApplications(),
  });
});

// ---- Static app shell + SPA fallback ----
// The whole app is behind the login screen (the client shows the gate until
// /api/me reports authenticated), so the shell itself can be served publicly;
// no data leaks because every data route above requires a session.
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  console.warn('[server] no built client at', DIST, '(run `npm run build`)');
}

// JSON 404 for unmatched API routes.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Seed once, then listen.
const seedResult = seedIfEmpty();
console.log('[server] seed:', seedResult);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] job-hunt cockpit listening on :${PORT}`);
});
