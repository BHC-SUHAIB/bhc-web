# Job-Hunt Cockpit

A password-protected, database-backed job-search dashboard served at
**https://jobhunt.blackhartconsulting.com**. It stores, displays, and serves —
it never searches for jobs, generates documents, or submits applications. A
separate daily agent POSTs recommendations and uploads tailored resume/cover
files through a token-authenticated ingest API.

Runs as an isolated Docker service (`bhc-jobhunt`) inside the existing
blackhartconsulting stack, on its own subdomain, sharing nothing with the main
Next.js/Payload site (no Postgres, no shared secrets, no `/p/` collision).

---

## Architecture

| Layer | Choice |
|---|---|
| Frontend | React (Vite build), Black Hart "Warm Mono" theme, light + dark |
| Backend | Node + Express, single origin (SPA + API) |
| Database | SQLite via better-sqlite3 at `/data/jobhunt.db` |
| Files | Uploaded docs under `/data/files/<rec-id>/` |
| Auth (human) | Shared password → stateless HMAC session cookie |
| Auth (machine) | `Authorization: Bearer <INGEST_TOKEN>` on ingest routes only |
| Serving | Caddy vhost `jobhunt.blackhartconsulting.com` → `jobhunt:8080` |
| Data on disk | Bind mount `./jobhunt-data` on the droplet → container `/data` |

The container listens only on the internal Docker network (never on a host
port). Caddy terminates TLS (auto Let's Encrypt cert for the subdomain).

---

## Secrets

Set in `/opt/bhc-web/.env` (never committed), namespaced `JOBHUNT_`:

```sh
JOBHUNT_APP_PASSWORD='Sooby$11'          # SINGLE-QUOTE — the $ must be literal
JOBHUNT_SESSION_SECRET=<openssl rand -hex 32>
JOBHUNT_INGEST_TOKEN=<openssl rand -hex 32>
```

> The single quotes matter: unquoted, the shell reads `$11` as a variable and
> stores the wrong password. Verify with:
> `grep JOBHUNT_APP_PASSWORD /opt/bhc-web/.env`

### Change the password
1. Edit `JOBHUNT_APP_PASSWORD='...'` in `/opt/bhc-web/.env` (keep single quotes).
2. `cd /opt/bhc-web && docker compose up -d jobhunt` (recreates just this service).
   Existing sessions stay valid until they expire (14 days) or you also rotate
   `JOBHUNT_SESSION_SECRET`.

### Rotate the ingest token
1. `openssl rand -hex 32` → new value.
2. Update `JOBHUNT_INGEST_TOKEN=...` in `/opt/bhc-web/.env`.
3. `docker compose up -d jobhunt`.
4. Update the token in the daily agent's config. Old token stops working
   immediately.

---

## Data & backups

- **Database:** `/opt/bhc-web/jobhunt-data/jobhunt.db`
- **Uploaded files:** `/opt/bhc-web/jobhunt-data/files/<rec-id>/`
- **Backups:** `scripts/backup-jobhunt.sh` writes a nightly `.tar.gz`
  (DB snapshot + files) to `/opt/bhc-web/backups/jobhunt/`, keeping 14 days.

Install the nightly cron on the droplet:
```sh
crontab -e
# 3:15am daily:
15 3 * * * /opt/bhc-web/scripts/backup-jobhunt.sh >> /var/log/jobhunt-backup.log 2>&1
```

Restore: extract an archive, drop `jobhunt.db` and `files/` back into
`/opt/bhc-web/jobhunt-data/`, then `docker compose up -d jobhunt`.

Manual JSON export of all applications is available in-app (**Export JSON**) or
at `GET /api/export` with a valid session.

---

## Redeploy

Standard stack flow — the jobhunt image builds alongside `web`:
```sh
ssh deploy@104.131.82.31
cd /opt/bhc-web
bash scripts/deploy.sh      # git pull, build web + jobhunt, up -d, restart caddy
```

To rebuild only this service after a code change:
```sh
docker compose build jobhunt && docker compose up -d jobhunt
```

Logs: `docker compose logs -f jobhunt`

---

## Roll back the infra change

Everything added is additive. To fully remove the cockpit without touching the
main site:

1. **Caddy** — delete the `jobhunt.blackhartconsulting.com { … }` block in
   `Caddyfile`.
2. **Compose** — delete the `jobhunt:` service block in `docker-compose.yml`
   and remove `- jobhunt` from `caddy.depends_on`.
3. **Deploy script** — remove the `docker compose build jobhunt` line.
4. Apply: `docker compose up -d --remove-orphans && docker compose restart caddy`.
5. Optionally `docker rmi` the jobhunt image and archive `jobhunt-data/`.

The apex site, its cert, Postgres, Payload, and all `/p/<slug>` prospect
previews are unaffected at every step.

---

## API reference (for the daily agent)

Base: `https://jobhunt.blackhartconsulting.com`

### Ingest (Bearer token, machine-only)
- `POST /api/ingest/recommendations` — create/upsert a recommendation.
  Idempotent on a **stable id derived from company+role_title**, so a daily
  re-push with a rotating tracking URL updates in place and never orphans
  attached files. A new rec is `New`; a re-push **preserves the existing status**
  (a human Skip is permanent — a dismissed job is not resurrected by re-pushes;
  recover it via the Dismissed panel). The ingest never sets `Dismissed` itself.
  If an **application** already exists for the posting, the push
  returns `{"skipped":"already_application","application_id":...}` and is logged
  (set `INGEST_RESURFACE_APPLIED=true` in `.env` to surface it as a rec anyway).
  Body fields: `date_surfaced, company, role_title, source, source_url,
  location_type, comp, engagement_type, chosen_track, fit_score (0–100),
  rationale, green_flags[], red_flags[], brief` (optional markdown/plain-text
  company deep-dive; renders as an expandable section on the card and is
  carried into the application's notes on "Mark applied").
- `POST /api/ingest/recommendations/:id/files` — `multipart/form-data` with any
  of `resume_pdf, resume_docx, cover_pdf, cover_docx` (≤ 8MB each).

See [`sample/ingest-example.sh`](sample/ingest-example.sh) for a working call.

### Human (session cookie, browser-only)
- `POST /api/login` `{password}` · `POST /api/logout` · `GET /api/me`
- `GET/POST/PUT/DELETE /api/applications`
- `GET/PUT /api/settings` (weekly target)
- `GET /api/recommendations` (active queue; `?all=1` includes dismissed) ·
  `POST /api/recommendations/:id/apply` · `.../dismiss` · `.../restore`
- `GET /api/export` · `GET /api/files/:recId/:kind` (also accepts the ingest
  token, so the agent can verify its own uploads)

**Nothing in any route submits an application anywhere.** "Mark applied" only
records that *you* applied and moves the item into your pipeline.

---

## Local development

```sh
cp .env.example .env        # dev secrets
npm install
npm run dev:server          # API on :8080 (seeds SQLite from data/applications.json)
npm run dev:client          # Vite on :5180, proxies /api to :8080
```

Or build + serve like production: `npm run build && npm start`.

## Data model (applications)

`id, company, role_title, track, engagement_type, platform, location_type,
comp, source_url, date_applied, status, status_history[{status,date}],
resume_version_used, contact, next_action, next_action_due, notes`.

`status ∈ {Saved, Applied, Recruiter Screen, Interview, Final Round, Offer,
Rejected, Withdrawn}`. Status changes auto-append to `status_history`. Seeded
once from `data/applications.json` (33 records), idempotently.
