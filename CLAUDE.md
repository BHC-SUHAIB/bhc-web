@AGENTS.md

# Prospect mockup previews — publishing to blackhartconsulting.com/p/<slug>/<tier>

This repo hosts password-gated concept mockups for sales prospects at
`https://blackhartconsulting.com/p/<slug>/<tier>`. Each prospect gets its own
slug, password, and one-or-more tier mockups behind a branded gate.

**Trigger:** the user asks to "upload / publish / put up a mockup for a
prospect", "add a new client preview", "host these mockups behind a password",
or similar. The mockup HTML usually lives in a *sibling* project folder
(e.g. `~/Desktop/Web Development/<prospect>/`), and the user gives a slug +
password.

**Authoritative recipe:** `docs/prospect-previews.md`. Read it before acting.
The five-step summary:

1. **Slug** — lowercase, hyphenated, `[a-z0-9-]`, matches the prospect folder.
2. **Manifest** — append to `data/prospects.json`:
   ```json
   "<slug>": { "password": "<user-given>", "label": "<Display Name>",
               "tiers": ["<tier>", ...], "defaultTier": "<tier>",
               "created": "<YYYY-MM-DD>" }
   ```
   Password is plaintext (private repo). Don't reuse passwords across prospects.
3. **Mockups** — drop RAW html (no JS auth gate; the proxy handles auth) into
   `public/p/<slug>/<tier>.html`. Inject `<meta name="robots" content="noindex, nofollow">`
   into each `<head>`. One file per tier; filename = tier name.
4. **Commit to `main`** — the prod droplet tracks `main`. Whatever is on `main`
   is what deploys. If the user's working branch (often `dev`) is ahead and not
   shippable, branch off `main`, commit there, fast-forward `main`, push `main`.
5. **Deploy** — `ssh deploy@104.131.82.31`, `cd /opt/bhc-web && bash scripts/deploy.sh`.
   The manifest is bundled at build time, so a redeploy is REQUIRED for a new
   prospect to go live (no hot-reload).

**Prerequisites already handled (do NOT redo):**
- `DEV_AUTH_SECRET` is set permanently on the prod droplet's `/opt/bhc-web/.env`
  and is shared by all prospects + the dev-auth gate. Only generate a new one
  (`openssl rand -hex 32`, on the droplet) if a fresh droplet/env is provisioned.
  **Never print the secret value** to logs, chat, files, or commits.
- `robots.txt` already disallows `/p/`; the proxy + cookie plumbing is wired.

**Architecture (1 paragraph):** `src/proxy.ts` gates every `/p/<slug>/<rest>`
request on an HMAC-signed cookie `bhc_p_<slug>` (key = `DEV_AUTH_SECRET`, payload
carries `scope:'prospect'` + slug so cookies can't cross prospects). Miss → 307
to the gate page `src/app/(prospect)/p/[slug]/page.tsx`, which posts to
`src/app/api/prospects/[slug]/login/route.ts` (validates against the manifest,
signs cookie, 303s to the tier). Clean URLs come from a rewrite in
`next.config.ts` (`/p/:slug/:tier` → `/p/:slug/:tier.html`).

**Verify after deploy:** hit `https://blackhartconsulting.com/p/<slug>/<defaultTier>`
(expect 307 → gate), submit the password (expect mockup loads + `bhc_p_<slug>`
cookie set `httpOnly secure`), and confirm `/` still returns 200.
