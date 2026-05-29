# Prospect previews — password-gated mockups for sales

Lets Suhaib (or a future Claude session) drop a prospect-specific mockup
behind a per-prospect password at `blackhartconsulting.com/p/<slug>/<tier>`.

End-to-end this is roughly:

1. Build the mockup HTML(s) wherever the project lives.
2. Add the prospect to `data/prospects.json`.
3. Drop the raw HTML files into `public/p/<slug>/`.
4. Commit, push, redeploy.

The proxy + gate + cookie handling is already wired. Nothing else changes.

---

## Architecture in one paragraph

`data/prospects.json` is the manifest — slug → `{ password, label, tiers, defaultTier }`. The proxy (`src/proxy.ts`) intercepts every request to `/p/<slug>/<anything-beyond-the-slug>` and verifies an HMAC-signed cookie named `bhc_p_<slug>`. If the cookie is missing or invalid, the visitor gets a 307 to `/p/<slug>` (the gate page at `src/app/(prospect)/p/[slug]/page.tsx`) with a `?next=` query preserving the intended destination. The gate posts to `/api/prospects/<slug>/login`, which checks the password against the manifest, signs the cookie (`scope: prospect`, `slug`, `exp` baked in), and 303-redirects to `next` or the prospect's `defaultTier`. Static HTML mockups live in `public/p/<slug>/<tier>.html` and are served by Next.js's static-public pipeline; a single rewrite in `next.config.ts` lets us drop the `.html` from URLs.

## Adding a new prospect — five-step checklist

Use this as the canonical recipe. A future Claude session given the same task should follow these exact steps.

### 1. Pick a slug

- Lowercase, hyphenated, matches the prospect's project directory name where you can.
- Allowed chars: `[a-z0-9-]` (proxy regex is `^/p/([a-z0-9-]+)/(.+)$`).
- Examples: `spotlesscarspa`, `acme-roofing`, `harbor-coffee`.

### 2. Pick tier names + a default tier

If the prospect gets multiple variants (e.g. essentials / studio / signature), the tier names become URL segments: `/p/<slug>/<tier>`. If they get one mockup, use `["main"]` (or whatever feels right).

`defaultTier` is what the gate redirects to after a successful login when the visitor hasn't been given a deep link.

### 3. Append to `data/prospects.json`

```json
{
  "<slug>": {
    "password": "<password the user set>",
    "label": "<Display Name>",
    "tiers": ["<tier-1>", "<tier-2>", "..."],
    "defaultTier": "<tier>",
    "created": "<YYYY-MM-DD>"
  }
}
```

- **Password storage is plaintext.** The repo is private; if that ever changes, swap to bcrypt in `src/lib/prospects.ts` (`checkProspectPassword`). Nothing else changes.
- **Don't reuse passwords across prospects.** Cookie names are slug-scoped, but password reuse is a footgun.

### 4. Drop the mockup HTML(s) into `public/p/<slug>/`

```
public/p/<slug>/
  <tier-1>.html
  <tier-2>.html
  ...
```

- Files are RAW mockups — **do not** add any JS auth gate. The proxy handles it.
- Add `<meta name="robots" content="noindex, nofollow">` to each (belt + braces — `robots.ts` already blocks `/p/`).
- A sed one-liner that does both copy + meta inject:
  ```bash
  sed 's|<head>|<head>\n<meta name="robots" content="noindex, nofollow">|' \
    /path/to/index-<tier>.html \
    > public/p/<slug>/<tier>.html
  ```

### 5. Commit, push, deploy

```bash
git add data/prospects.json public/p/<slug>
git commit -m "Add <slug> prospect preview"
git push

# On the droplet:
ssh root@<droplet-ip>
cd /opt/bhc-web && bash scripts/deploy.sh
```

URLs go live at:

- `https://blackhartconsulting.com/p/<slug>` — gate
- `https://blackhartconsulting.com/p/<slug>/<tier>` — mockup (gated)

Share the deep-link tier URL (`/p/<slug>/<tier>`) with the prospect; the proxy will bounce them to the gate, then back after they enter the password.

---

## What the proxy actually does

For every request the proxy fires (see `config.matcher` in `proxy.ts`):

1. If path matches `^/p/([a-z0-9-]+)/(.+)$`, extract the slug.
2. Look for cookie `bhc_p_<slug>`. Verify it's an HMAC-signed token with `scope: 'prospect'`, matching `slug`, and `exp > now`.
3. Cookie valid → `NextResponse.next()` (request continues through rewrites, into the static file).
4. Cookie missing or invalid → 307 redirect to `/p/<slug>?next=<original-path>`.

Then the dev-auth gate runs (if `DEV_AUTH_ENABLED=true`), but it's wired to skip anything under `/p/` and `/api/prospects/` so a prospect viewing a gated mockup on the dev droplet only sees the prospect gate, not the dev gate.

## Things to know

- **Cookies are HMAC-signed with `DEV_AUTH_SECRET`.** Same secret as dev-auth. The signed payload carries `scope: 'prospect'` + the slug, so a dev-auth cookie can't pose as a prospect cookie and a cookie issued for prospect A can't authenticate prospect B.
- **TTL is 30 days.** After that, the cookie is rejected even though it's still signed — prospect re-enters password.
- **Cookies are scoped to `/p/<slug>` via the cookie `path`.** They don't ride along with requests to the rest of the site.
- **`secure: true` in prod.** Cookie won't be sent over plain HTTP. Local dev (`NODE_ENV !== 'production'`) drops that flag so localhost still works.
- **Manifest is statically imported at build time** (`import prospectsManifest from '../../data/prospects.json'`). Editing the manifest requires a redeploy — which is the workflow anyway.
- **`robots.txt` blocks `/p/`**, and every mockup carries `<meta name="robots" content="noindex, nofollow">`. Indexing should be impossible.

## Migrating an existing prospect's URLs

The old Spotless `/spotless/*` URLs are 308-redirected to `/p/spotlesscarspa/*` via `next.config.ts redirects()`. If you do another rename later, follow that pattern:

```ts
{ source: '/old-path/:tier', destination: '/p/<new-slug>/:tier', permanent: true }
```

## Files this touches

| File | Role |
|---|---|
| `data/prospects.json` | Source of truth — slug, password, tiers, label |
| `src/lib/prospects.ts` | Edge-safe HMAC + manifest helpers |
| `src/proxy.ts` | Gates `/p/<slug>/<rest>` paths |
| `src/app/(prospect)/layout.tsx` | Standalone layout for gate page |
| `src/app/(prospect)/p/[slug]/page.tsx` | Gate (server component) |
| `src/app/(prospect)/p/[slug]/PreviewLoginForm.tsx` | Form (client component) |
| `src/app/api/prospects/[slug]/login/route.ts` | POST handler — validate password, sign cookie, redirect |
| `next.config.ts` | Rewrite `/p/:slug/:tier` → `/p/:slug/:tier.html` |
| `src/app/robots.ts` | Disallow `/p/` |
| `public/p/<slug>/<tier>.html` | Raw mockup HTMLs |
