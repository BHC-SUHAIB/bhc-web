# Black Hart Consulting — Web

The marketing site + admin CMS for **Black Hart Consulting LLC**, built on Next.js 16, Payload CMS 3, and SQLite/Postgres. Deploys to DigitalOcean App Platform or any Node host.

Companion to the brand kit at `~/Desktop/Web Development/brand-kit/`.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) (CSS-first `@theme`) |
| CMS | [Payload 3](https://payloadcms.com) (admin at `/admin`) |
| Database | SQLite (dev) / Postgres (prod) |
| Fonts | Manrope + Fraunces + JetBrains Mono via `next/font/google` |
| Icons | [Lucide](https://lucide.dev) |

---

## Quick start

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Open:
- **Public site:** http://localhost:3000
- **Admin CMS:** http://localhost:3000/admin

On first boot, a default admin is seeded:
- Email: `admin@blackhartconsulting.com`
- Password: `changeme123!` — **change immediately after logging in.**

---

## Editing content

1. Log in at `/admin`.
2. Edit any **Page** (e.g. "Home"):
   - Click **Layout** to see all sections as blocks
   - **Drag to reorder** sections
   - **Click + Add Block** to insert a new section
   - **Click the trash icon** on a block to remove it
   - Save → publish
3. Edit **Projects** the same way. Set `featured` to show on the home "Recent work" block.
4. Edit **Header / Footer / Site Settings** under "Globals".
5. Upload media under **Media** (add alt text — required).

---

## Project structure

```
blackhartconsulting/
├── public/brand/             # Logo SVGs (from ~/Desktop/Web Development/brand-kit/logos/final)
├── src/
│   ├── app/
│   │   ├── (frontend)/       # Public routes + site shell
│   │   └── (payload)/        # Admin UI + REST/GraphQL API
│   ├── blocks/
│   │   ├── schema/           # Payload block definitions
│   │   └── render/           # Frontend React components
│   ├── collections/          # Pages, Projects, Media, Users
│   ├── globals/              # Header, Footer, SiteSettings
│   ├── components/           # UI primitives
│   ├── lib/                  # fonts, utils, payload client
│   ├── seed/                 # onInit content seeding
│   └── payload.config.ts
└── .do/app.yaml              # DigitalOcean deploy spec
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server on :3000 |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run generate:types` | Regenerate TypeScript types from Payload schema |

---

## Deployment

See [`docs/deploy-digitalocean.md`](./docs/deploy-digitalocean.md).

TL;DR for App Platform:
1. Push to GitHub (private).
2. Connect the repo in DigitalOcean (auto-detects `.do/app.yaml`).
3. Set `PAYLOAD_SECRET` in App env vars (generate with `openssl rand -hex 32`).
4. Deploy. Database provisions automatically.

---

## Switching SQLite → Postgres

For production, swap the adapter in `src/payload.config.ts`:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'

db: postgresAdapter({
  pool: { connectionString: process.env.DATABASE_URI },
}),
```

`npm install --legacy-peer-deps @payloadcms/db-postgres pg`

`DATABASE_URI` = your Postgres connection string.

---

## Local dev against live data (SSH tunnel)

The default `DATABASE_URI=file:./payload.db` runs against a local SQLite file that drifts from prod the moment anyone edits content via the live admin. To keep your local dev server in sync with the latest production content (max 15min stale), point `npm run dev` at the **dev droplet's Postgres** over an SSH tunnel.

The dev droplet (`bhc-dev`, 68.183.144.201) gets a fresh prod snapshot every 15 minutes via `scripts/sync-from-prod.sh` on a cron. So pointing local at the dev droplet's Postgres effectively gives you "prod, lagged by ≤15min" without ever touching real prod.

### One-time setup (macOS)

```bash
# 1. Install the LaunchAgent that keeps the SSH tunnel alive in the
#    background (auto-starts on login, auto-reconnects on drop):
./scripts/install-dev-tunnel-agent.sh

# 2. Grab the dev droplet's Postgres credentials and put them in .env.local:
ssh deploy@68.183.144.201 'grep ^POSTGRES_ /opt/bhc-web/.env'
# Then in .env.local:
#   DATABASE_URI=postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>

# 3. Start the dev server. It now reads/writes the dev droplet's DB:
npm run dev
```

After the LaunchAgent is installed, opening your laptop is enough — the tunnel comes back up automatically. Logs land in `/tmp/bhc-dev-tunnel.log` and `/tmp/bhc-dev-tunnel.err`.

### Verifying

```bash
# Tunnel is listening locally:
lsof -i :5432

# Same content shows on both:
open http://localhost:3000/admin
open https://dev.blackhartconsulting.com/admin
```

### Reverting to local SQLite

```bash
./scripts/uninstall-dev-tunnel-agent.sh
# Then edit .env.local:
#   DATABASE_URI=file:./payload.db
```

### Tradeoffs to know

- **Local edits hit the dev droplet's DB**, not a private copy. If you edit a testimonial via the local Payload admin, that edit lives on the shared dev droplet (and gets wiped on the next prod→dev sync). Fine for reading + experimenting with code against real data; not for destructive data exploration.
- **Tunnel needs network on first wake.** After travel/airplane mode, give the agent a few seconds to reconnect before `npm run dev`.
- **One-off manual tunnel:** if you just want a single-session tunnel without installing the agent, run `npm run dev:tunnel` in a separate terminal (foreground, ctrl-c to close).

---

## Brand tokens

Colors in `src/app/globals.css` under `@theme`. The **Heritage** palette:

| Token | Hex | Role |
|---|---|---|
| `--color-ink` | `#1A1713` | Dark |
| `--color-forest` | `#2F4A35` | Primary brand |
| `--color-lichen` | `#8A9A7B` | Secondary surface |
| `--color-parchment` | `#D6D0C2` | Muted text / border |
| `--color-ivory` | `#EFE9D9` | Light |
| `--color-brass` | `#B08D57` | Accent / CTA hover |

Full rules in `~/Desktop/Web Development/brand-kit/guidelines/brand-guidelines.md`.

---

## Gotchas

- **`--legacy-peer-deps` required** because Payload's peer deps haven't caught up with React 19 yet.
- **Variable fonts:** Manrope and Fraunces are variable fonts — don't pass `weight: [...]`.
- **Ephemeral containers:** App Platform wipes `/app/media` on redeploy. Use external object storage (Spaces / S3 / Supabase) for production uploads — see deploy doc.
- **Fresh-start reseed:** delete `payload.db` to wipe the database; content reseeds on next boot.

---

## License

Proprietary — Black Hart Consulting LLC.
