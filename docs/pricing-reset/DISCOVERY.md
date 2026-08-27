# Pricing reset: Phase 0 discovery

Date: 2026-08-26. Branch: `pricing-reset`. All read-only; content backup exported to
`backups/pricing-reset/2026-08-26T22-46-30-970Z/` (pages, landingPages, projects,
testimonials, faqs, header, footer, siteSettings) via `scripts/pricing-reset/export-backup.mts`.

Caveat that applies to the whole document: the backup and every CMS-content claim below
were taken from the **local sqlite** database (`payload.db`). Production runs postgres with
its own content (the Express LP was CMS-converted on prod, and prod content has drifted
from the local seed). Before running `apply.ts` against anything but local, re-export and
re-grep the production content.

---

## 1. Package manager, Node, run scripts

- **npm** (only `package-lock.json` exists). Installs need `--legacy-peer-deps`
  (`Dockerfile:13`).
- **Node**: no `engines`, no `.nvmrc`. The only pin is `node:22-alpine` in `Dockerfile:4,16,39`.
  Local machine runs Node 24, which works but hits an ESM-interop bug in standalone
  scripts (see §12.1).
- Scripts (`package.json:5-15`): `dev` = `next dev`, `build` = `next build`,
  `start`, `generate:types` = `payload generate:types`, `generate:importmap`,
  `seed` = `tsx src/seed/seed.ts` (stale, see §2), `stripe:setup` = `tsx scripts/stripe-setup.ts`,
  `dev:tunnel`, `payload` (CLI entry for `migrate:*` if ever needed).
- Deploy: push to `main` auto-deploys via `.github/workflows/deploy.yml:37-40` →
  `scripts/deploy.sh` on the droplet (docker compose build/up). **No seed or migrate step
  in deploy**; seeding happens at container boot via Payload `onInit`.

## 2. Payload, DB adapter, migrations, seeding

- **Payload `^3.83.0`**, Next `16.2.4`, React `19.2.4`.
- **Adapter switches on URI shape**, not NODE_ENV (`src/payload.config.ts:34-35,179-187`):
  `DATABASE_URI` starting `postgres://` → `postgresAdapter({ push: true })`, else
  `sqliteAdapter`. Local = sqlite `file:./payload.db`; prod = postgres 16 via
  `docker-compose.yml:38`.
- **No migrations folder; push mode everywhere.** Because Payload skips push when
  `NODE_ENV=production`, `src/seed/onInit.ts:90-101` explicitly calls
  `pushDevSchema(payload.db)` on prod boot. So **Phase 1 schema changes need no
  hand-written migration**: new fields/blocks are pushed automatically on boot (sqlite
  locally on `next dev` start, postgres on prod container boot). `src/app/dev-schema-fix/route.ts`
  exists as a manual repair hatch.
- **How content gets in today** (three paths):
  1. `src/seed/onInit.ts` (1,864 lines) wired as `onInit` (`payload.config.ts:161`) — the
     live path. Runs on **every server boot** (gate: `SEED_ON_BOOT !== 'false'`).
     Contract (`onInit.ts:73-80`): create-if-missing by slug; full-replace update only when
     a `FORCE_*_UPSERT=true` env var is set. **Globals (header/footer/siteSettings) are
     unconditionally upserted every boot** (`:119-176`) — admin edits to globals get
     clobbered on restart, so the header nav/CTA changes in Phase 1e must land in
     `onInit.ts`, not just the database.
  2. `src/seed/seed.ts` (`npm run seed`) — standalone full-replace seed. **Stale** (last
     touched 2026-05-26 vs onInit 2026-07-18; still seeds founding-client content and a
     `(346) 555-0142` footer phone). Do not model new work on it.
  3. `/dev-*` one-shot HTTP routes guarded by `denyIfProductionLocked()`
     (`src/lib/dev-route-guard.ts:30-40`; prod unlock = `ALLOW_DEV_SEED=one-time-yes` +
     `docker compose up -d --force-recreate web`). Best template:
     `src/app/dev-seed-local-pages/route.ts` (idempotent upsert-by-slug + revalidate).
- **Reusable helpers for the Phase 2 script** (all in `onInit.ts`): `rt(text)` single-para
  Lexical (`:11-23`); `rtDoc(blocks)` rich builder with p/h2/h3/quote/ul (`:27-71`);
  `ensureMedia(alt, relPath)` upsert-by-alt media (`:181-194`); the find→create/update
  by-slug pattern repeated inline (e.g. `:381-391`). There is no generic `upsertBySlug`
  helper today; `apply.ts` should add one.
- Gotcha: **any script that calls `getPayload({ config })` runs the boot seed** (observed
  during the backup export: `[seed] complete`). Harmless with no FORCE vars set, but
  `apply.ts` should run with `SEED_ON_BOOT=false` to keep runs pure.
- Uncommitted local change: `src/seed/onInit.ts:852-857` removes waygft's `liveUrl`
  (site powered off). Pre-existing working-tree change, left untouched on this branch.

## 3. Pages collection and routing

- Collection: `src/collections/Pages.ts`. Page fields: `title` (req), `slug` (req,
  unique; home page slug is literally `home`), `seo` group (`metaTitle`,
  `metaDescription`, `ogImage`, **`noIndex` checkbox**), `layout` blocks (req),
  `publishedAt`. Drafts enabled. `afterChange`/`afterDelete` hooks revalidate tag
  `pages` + paths (`home` → `/`).
- **Block registry**: `src/blocks/schema/index.ts`, `allBlocks` at `:677-700` — 22 blocks:
  `hero`, `heroPhoto`, `foundingClient`, `bundleOffer`, `bundleConfigurator`,
  `calendlyBooking`, `services`, `pricing`, `featuredProjects`, `testimonials`, `stats`,
  `animatedStats`, `guaranteeStrip`, `processSteps`, `siteAuditTool`, `mobileCta`, `cta`,
  `leadMagnet`, `richText`, `mediaBlock`, `faq`, `contactForm`. That is 9 more than the
  prompt's list; the extras matter for Phase 1b reuse (see §12.3).
- Field definitions per block: see `src/blocks/schema/index.ts` (hero `:5-58`,
  foundingClient `:60-102`, bundleOffer `:104-139`, services `:141-177`, leadMagnet
  `:186-198`, pricing `:200-249`, featuredProjects `:251-280`, testimonials `:282-296`,
  stats `:298-316`, cta `:318-343`, richText `:345-373`, mediaBlock `:375-384`,
  contactForm `:386-400`, faq `:402-460`, calendlyBooking `:462-522`, heroPhoto
  `:531-565`, guaranteeStrip `:567-581`, siteAuditTool `:583-593`, processSteps
  `:595-611`, animatedStats `:613-634`, mobileCta `:636-645`, bundleConfigurator
  `:647-675`).
- **Routing**: not a catch-all. Home = `src/app/(frontend)/page.tsx` (`force-dynamic`,
  fetches slug `home`, **ignores `page.seo`** — home meta is hardcoded). Everything else =
  `src/app/(frontend)/[slug]/page.tsx` (single segment, `force-dynamic`, maps `seo.noIndex`
  → robots noindex, renders breadcrumb JSON-LD). Landing pages are a separate collection
  + route: `src/app/(lp)/lp/[slug]/page.tsx` (no header/footer, noindex by default).
- Fetching via `unstable_cache` wrappers in `src/lib/payload-cache.ts`
  (`getCachedPageBySlug:61-73`, tag `pages`, 3600s), invalidated by
  `src/lib/cms-revalidate.ts` (`revalidateTag(tag, { expire: 0 })`).
- Renderer: `src/blocks/render/RenderBlocks.tsx`, `switch (blockType)` `:83-182`.
  Page-aware quirks that will bite Phase 2 (see §12.4): home filters out any `cta` block
  whose headline matches `/full pricing menu/i` (`:62-66`); home reorders `leadMagnet`
  after `services` (`:68-80`); a contactForm with eyebrow exactly `PageSpeed audit`
  renders the SiteAuditTool instead (`:119-148`); home wraps blocks in alternating
  `tone-a`/`tone-b` by index (`:190-197`); unknown blockTypes render `null` silently.

## 4. The pricing block

- Schema `src/blocks/schema/index.ts:200-249`: block fields `eyebrow`, `headline` (req),
  `description`, `layoutVariant` (`grid` default | `centered-single`), `anchorId`,
  `tiers[]` (1 to 8): `name` (req), `price` (req), `originalPrice`, `priceNote`,
  `description`, `features[] {label, included}`, `cta {label, href}`, `highlighted`,
  `enterpriseBadge`.
- Component `src/blocks/render/Pricing.tsx` (190 lines, `'use client'`):
  - Anchor: explicit `anchorId`, else derived from eyebrow (kebab, strips trailing
    `-plans`/`-retainers`).
  - `layoutVariant: 'centered-single'` only applies when `tiers.length === 1`, silently
    falls back to grid otherwise. Grid: 2 tiers → 2 cols, 4 or ≥7 → 4 cols, else 3.
  - **`originalPrice` renders a strikethrough plus a client-side Discounted/Retail
    toggle** (`:33-34,61-72,126-141`) whenever any tier has both prices. Phase 1a's "stop
    rendering originalPrice" means deleting this whole toggle path.
  - `highlighted`: brass border/tint + hardcoded **"Most popular"** pill (`:119-121`) +
    filled-brass CTA. `enterpriseBadge`: takes precedence, `border-2` brass + hardcoded
    "Enterprise" pill top-right + section-wide 5% brass wash.
  - **`cta.href` is taken verbatim from CMS — no `?tier=` logic in code.** The tier CTA
    renders only when both `cta.label` and `cta.href` are set (`:161-171`), via
    `PricingCta.tsx` which fires `pushEvent('pricing_cta_click', ...)`.
  - **Trap: `toContactAnchor()` (`src/lib/redesign.ts:14-17`) rewrites any
    `/contact...` href to `/contact#contact-form`, discarding `?tier=` entirely** — in
    `PricingCta`, `SiteHeader`, and `FoundingClient`. Phase 1d's tier plumbing must remove
    or rework this.
  - **Trap: `relabelDiscount()` (`redesign.ts:21-28`) rewrites "Founding"→"Discounted"
    at render time** on pricing/foundingClient/header strings. Remove it in Phase 2 along
    with founding content (ground rule 7 also bans "discounted client" language).
  - Hardcoded strings: "Enterprise" (`:113`), "Most popular" (`:120`),
    "Discounted"/"Retail"/"limited" toggle labels (`:65-68`), "See all packages & pricing"
    fallback (`:182`).

## 5. foundingClient, services, stats, featuredProjects, contactForm

- **foundingClient** (`schema :60-102`, `src/blocks/render/FoundingClient.tsx`):
  CMS-driven eyebrow/headline/description/spotsTotal/spotsRemaining/offers
  (name, priceFounding, priceRetail, savings)/cta. Hardcoded "Founding spots remaining"
  label (`:68`, rewritten to "Discounted..." by relabelDiscount). Note: `SiteSettings`
  has `foundingSpotsTotal/Remaining` fields that this component **does not read** (dead
  fields; candidates for retirement note in changelog). Phase 2 removes this block from
  home and deletes the component if unused; also check `ExpressLanding.tsx:96-107` which
  hardcodes "Save $951" and "Heights Founding Client Pricing".
- **services** (`schema :141-177`, `render/Services.tsx`): fully CMS-driven items with a
  9-icon hardcoded lucide registry; per-item bullets and download link.
- **stats** (`schema :298-316`, `render/Stats.tsx`): CMS value/label/description (max 6)
  plus optional background image. Straightforward for the three-promises row.
- **featuredProjects** (`schema :251-280`, `render/FeaturedProjects.tsx`): `mode: latest`
  (default; `featured: true` sorted `-publishedAt`, limit) or `mode: manual`
  (relationship hasMany, editor order preserved). Hardcoded `PROJECT_TYPE_LABELS` chip
  map. Home currently seeds `latest/3`; Phase 2's "PM, WAYGFT, then first concept" wants
  `manual` mode or `group`-aware logic.
- **contactForm** (`schema :386-400`, `render/ContactForm.tsx`, client):
  - CMS: eyebrow/headline/description/successMessage/showCompanyField/
    showProjectTypeField/showBudgetField/submitLabel. No `noCallNeeded`, no `formType`
    field today.
  - **Project-type options hardcoded in JSX** (`ContactForm.tsx:189-198`): website,
    webapp, mobile, seo, hosting, brand, other — duplicated (not shared) in
    `src/collections/ContactSubmissions.ts:143-154` (which has an extra `unsure`).
    Phase 1d must change both.
  - **`?tier=` is not read anywhere** (no useSearchParams); seeded hrefs like
    `/contact?tier=starter` exist but the param is dead on arrival (and stripped by
    `toContactAnchor`, §4). `lib/tiers.ts` does not exist yet.
  - **Budget dropdown hardcoded** (`ContactForm.tsx:204-219`): under-5k, 5-10k, 10-25k,
    25-50k, 50k-plus, unsure; mirrored in `ContactSubmissions.ts:157-167`. The Heights
    page merely sets `showBudgetField: true` via seed (`dev-seed-local-pages/route.ts:47`).
    Phase 1d's new ranges (`Under $500` ... `$5,000+`) change the component + collection
    options, which changes stored values: old submissions keep old option values —
    fine for admin display, but note it.
  - **Submissions**: POST to Payload's auto REST `/api/contact-submissions` → collection
    `contact-submissions` (public create; cross-origin + 5/hr/IP rate limit + honeypot in
    `beforeValidate`). Email notification via **Resend** (`resendAdapter`, keyed on
    `RESEND_API_KEY`, `payload.config.ts:148-159`) to `CONTACT_NOTIFY_EMAIL` fallback
    `hello@blackhartconsulting.com`. SMS opt-in mirrors to `sms-consents`. `generate_lead`
    dataLayer push on success (`ContactForm.tsx:110`). The Phase 1b `demoRequestForm`
    should create docs in this same collection; add a `formType` (or reuse `sourcePage`,
    which already records the path) — schema addition needed either way for
    `formType: 'demo-request'`.
  - Renderer sentinel: eyebrow `PageSpeed audit` → SiteAuditTool swap (§3).
- Contact page override: on `/contact` the renderer forces hardcoded copy +
  `anchorId='contact-form'` + `showBudgetField: false` (`RenderBlocks.tsx:120-139`).

## 6. Portfolio

- Collection **`projects`** (`src/collections/Projects.ts`): title, slug (unique),
  summary, heroImage, client, industry, `projectType` (select: website/webapp/mobile/
  seo/brand/infra/other), year, duration, teamSize, liveUrl, stack[], challenge/approach/
  outcome (richText), metrics[] (max 4), gallery[], testimonial group, appInstall group,
  `featured` checkbox, publishedAt. Drafts on. **No grouping field exists yet** —
  `group` (client/concept/product) is a clean Phase 1c addition.
- Current entries (local DB, 8): prometheus-minds, waygft, misbah, estimatedtax, sidecar,
  scrubbr, sidecar-teachable, certo (all seeded in onInit). Prompt's default mapping:
  prometheus-minds + waygft → `client`, rest → `product`.
- Ordering: `sort: '-publishedAt'` in `getCachedProjectsList` (`payload-cache.ts:113-125`).
- **`/portfolio` page does not group at all today** — flat grid
  (`src/app/(frontend)/portfolio/page.tsx:86-129`) with hardcoded hero (Unsplash bg,
  hardcoded CTAs) and raw `projectType` chips. Phase 1c adds the three grouped sections.
- featuredProjects picks items per §5 (latest+featured or manual relationship).

## 7. Header and footer

- `header` global (`src/globals/Header.ts`): `nav[]` (label/href/openInNewTab, max 8) +
  `cta` group (`show`/`label`/`href`, defaults "Start a project" → `/contact`). **The
  header CTA is already CMS-driven** — Phase 1e is a content change plus schema defaults,
  not a component change. But: `SiteHeader.tsx:88-89,130-131` passes label through
  `relabelDiscount` and href through `toContactAnchor` (would rewrite a `/contact?...`
  CTA; `/free-demo-site` is unaffected).
- **Globals are re-upserted on every boot by onInit** (§2) — nav/CTA/footer changes must
  be made in `onInit.ts` (and mirrored by `apply.ts`) or they revert at next deploy.
- Footer: `footer` global (tagline, columns[] max 4, social[], copyright) rendered by
  `src/components/SiteFooter.tsx`. Email + phone come from **SiteSettings**
  (`contactEmail`, `contactPhone` default `(866) 434-9777`), not the footer global.
  `social[]` is seeded but never rendered (dead data).
- SiteSettings global also carries `localSeo` group (address, geo, hours) consumed by
  `src/lib/schema.ts` for JSON-LD.
- The LP route group has its **own hardcoded footer** (`src/app/(lp)/layout.tsx:30-36,154-157`)
  using `LP_PHONE_DISPLAY` — see §11.

## 8. Sitemap and robots

- Both file-based metadata routes; sitemap is collection-driven. `src/app/sitemap.ts`
  (revalidate 600): all published `pages` docs (home → `/`), `/portfolio` + each project,
  `/articles` + each article, plus hardcoded `/sms`, `/sms-terms`, `/privacy`, `/terms`.
  **`seo.noIndex` is NOT consulted** — a noindexed page still lands in the sitemap
  (matters for `thanks` and `free-demo-site` in Phase 2; fix sitemap to filter
  `seo.noIndex` or exclude `thanks` explicitly).
- Excluded by omission: all `landingPages` (`/lp/*`), `/p/*` prospect previews, billing
  routes, drafts.
- `src/app/robots.ts`: allow `/`, disallow `/admin`, `/api/`, `/p/`, `/app-content/`,
  Misbah routes, `/invoice/`, `/portal/`, `/care-plan/`. No static robots.txt/sitemap.xml
  in `public/`.

## 9. Analytics

- GTM + Clarity loaded via inline `next/script` in both layouts
  (`src/app/(frontend)/layout.tsx:58-130`, `src/app/(lp)/layout.tsx:28-81`), env-gated on
  `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_CLARITY_PROJECT_ID` (**build args** in
  docker-compose, not just runtime). `page_type` pushed pre-GTM (`main_site` /
  `landing_page`). GA4 lives inside the GTM container; no gtag.js. `bhc_skip_analytics`
  localStorage opt-out.
- **dataLayer helper exists**: `src/lib/analytics.ts` — `pushEvent(event, params)` and
  `pushEventThenNavigate(...)`. `EventName` is a **closed union** of 12 events
  (`generate_lead`, `phone_click`, `email_click`, `pricing_cta_click`, `hero_cta_click`,
  `booking_click`, `booking_completed`, `pdf_download`, `pagespeed_audit_started`,
  `pagespeed_audit_completed`, `cta_click`, `exit_intent_shown`). No checkout/purchase
  events anywhere. Phase 1a's `checkout_click` = extend the union + push in the tier CTA.

## 10. Pages not in the sitemap (paused Ads landing pages and friends)

Two families, plus the prospect previews. All phone display on LPs comes from **code**
(`LP_PHONE_DISPLAY`), not CMS content (verified against the local content export:
zero phone strings in `landingPages`/`pages` JSON).

### a. `landingPages` collection → `/lp/<slug>` (CMS-driven, all `noindex: true`, published; excluded from sitemap)

| Slug | Headline | Prices in content | Phone | Kind |
|---|---|---|---|---|
| `express-website` | A custom small business website. In 14 days. From $999. | $999, $1,950, $1,000, $951, $99, $900, $300 | `(346) 560-5430` from LP layout/`LP_PHONE_DISPLAY` | CMS (LandingPages) |
| `heights-dental` | A new-patient website for your practice. In 14 days. | $999, $1,950, $951, $2,495, $4,500, $499, $1,495, $996, $149, $297, $2,005 | same | CMS |
| `heights-med-spa` | A med spa website that fills your appointment book. | same set | same | CMS |
| `heights-restaurant` | A restaurant website hungry diners actually use. | same set | same | CMS |
| `heights-real-estate` | A real estate site that wins listings + buyers. | same set | same | CMS |
| `houston-midmarket` | Senior engineering for mid-market. Without the agency overhead. | $2,495, $297, $999, $1,950, $951, $4,500, $499, $1,495, $996, $149, $2,005 | same | CMS |

All six carry the founding-client price ladder that ground rule 7 retires. Details:

- Five are seeded by `src/seed/seed.ts` (`makeNicheLandingPage:141`, which hardcodes
  `noIndex: true` at `:151`); `express-website` was later rewritten in the DB by
  `src/app/dev-convert-express-lp/route.ts` (which itself writes `$999` / `originalPrice
  '$1,950'` / `Save $951` founding blocks - it needs the same cleanup).
- **`houston-midmarket` exists ONLY as a DB record** (created in the admin; zero grep
  hits in code or seeds). Its Pro Site tier is `$2,495` with `originalPrice $4,500`.
  `apply.ts` must handle it purely by slug against the DB.
- **Re-running `npm run seed` would regress every LP** to the even-older `$1,495`/`$1,950`
  ladder still in `seed.ts` - another reason to retire that script (§12.10).
- Coded companion route: `src/app/(lp)/lp/express-website/booked/` (booking tracker,
  noindex, uses `LP_PHONE_DISPLAY`). `src/blocks/render/ExpressLanding.tsx` is a
  code-composed fallback for `express-website` with founding prices hardcoded
  (`:68-69` `$999`/`$1,950`, `:96/:107` `Save $951`).

### b. CMS `pages` that ARE in the sitemap but are Ads-adjacent (for completeness)

- `web-design-houston-heights` — "Web design for Houston Heights businesses.",
  `noIndex: false` (`dev-seed-local-pages/route.ts:60`), no $ amounts in local content,
  budget dropdown via `showBudgetField: true`. CMS page. **Its FAQ answer mentions
  "founding-client pricing"** (`dev-seed-local-pages/route.ts:104`) - in seed and DB.
- `local-seo-houston` — "Local SEO that puts Houston businesses on the map.",
  `noIndex: false` (`:121`), no $ amounts in local content. CMS page.
- Both get sitewide `ProfessionalService` JSON-LD with `telephone` from
  `SiteSettings.contactPhone` = `(866) 434-9777` (`src/lib/schema.ts:93,106`) - already
  the right number.

### c. `/p/<slug>/<tier>` prospect previews (static HTML in `public/p/`, robots-disallowed, password-gated)

Prospect mockups behind `src/app/(prospect)/p/[slug]/page.tsx` (layout sets noindex);
manifest `data/prospects.json` (6 prospects). **None contain the retired 346 number.**
Client-facing prices/phones in them belong to the prospects, not BHC, with one BHC
exception: `public/p/inasthreadingbeauty/index.html` shows BHC tier pricing `$999` /
`$1,299` / `$1,499` / `$149/mo` and a markup-split "Save $500 on any tier" (`:135`) - a
naive `Save \$` grep misses it. Not Ads pages; out of scope beyond the ground-rule-7
sweep decision (flag in ADS_PAGES.md as "keep, prospect preview").

### d. Other never-indexed coded routes (completeness)

`/booked`, `/care-plan/*`, `/invoice/*`, `/portal/*`, `/misbah/*`, `/app-cta-preview`,
`/downloads/[slug]` (PDF library - see §12.11: `src/lib/pdfs/content.ts` contains
founding prices), `/admin`, and the `/dev-*` routes. All set explicit noindex.

## 11. Every occurrence of 346-560-5430

**CMS content (local DB): zero occurrences** in any format (checked `346-560-5430`,
`(346) 560-5430`, `346.560.5430`, `3465605430`, `560-5430`, `560 5430` across the full
JSON export, and a binary-safe grep of `payload.db`). The number reaches pages
exclusively through code. The complete literal + consumer list:

- **Only literals in the codebase**: `src/lib/contact.ts:5`
  (`LP_PHONE_DISPLAY = '(346) 560-5430'`) and `:6` (`LP_PHONE_HREF = 'tel:+13465605430'`).
- Consumers: `src/app/(lp)/layout.tsx:8,:33` (LP footer NAP + tel link);
  `src/app/(lp)/lp/[slug]/page.tsx:7,:72,:77` (passes `phoneOverride` into blocks);
  `src/app/(lp)/lp/express-website/booked/page.tsx:8,:24`;
  `src/blocks/render/ExpressLanding.tsx:6,:188,:268`.
- `PRICING_RESET_PROMPT.md` itself mentions it (expected).
- Env files: **none** (`.env.local`, `.env.example`, `.env.production.example` clean; no
  `LP_PHONE*` env var exists - the constant is hardcoded).
- Not present in: `payload.db`, JSON-LD (`src/lib/schema.ts:93` uses
  `SiteSettings.contactPhone` = 866), `Caddyfile`, `docker-compose.yml`,
  `next.config.ts`, `data/prospects.json`, `public/` (including all `/p/` mockups),
  `scripts/`, `docs/`, `.github/`.
- Stale `.next/` build artifacts only (regenerate on build; no action).

The Phase 2 fix is therefore small and centralized: change `LP_PHONE_DISPLAY`/`LP_PHONE_HREF`
to the 866 number (or delete the override so LPs fall back to `SiteSettings.contactPhone`),
and re-check prod CMS content before `apply.ts` runs there. No call-tracking script
(CallRail / Google forwarding swap) exists anywhere.

## 12. Friction the phases will hit (proposed adjustments)

1. **Standalone tsx scripts break on this machine** (Node 24): `payload`'s
   `loadEnv` does `import nextEnvImport from '@next/env'` and tsx's CJS interop leaves
   `default` undefined ("Cannot destructure property 'loadEnvConfig'"). Workaround used
   for the backup (and recommended for `apply.ts`): a `--require` shim that sets
   `m.default = m` on both `@next/env` copies (root and `node_modules/payload/node_modules`),
   plus loading env inside the script via `@next/env`'s `loadEnvConfig`. Alternative:
   run scripts under Node 22 (matches prod).
2. **`src/payload-types.ts` is missing on disk** but imported by ~30 files. Run
   `npm run generate:types` before any typecheck/build, and regenerate after Phase 1
   schema changes. (Known memory note: local `tsc` shows false errors.)
3. **Block reuse for Phase 1b** — the repo already has blocks the prompt doesn't know
   about: `guaranteeStrip` (value/label strip) vs the richer `guarantees`
   (title/body columns) — new block still needed or extend `guaranteeStrip`;
   **`processSteps` already covers `steps`** (number/title/description) — reuse it, no
   new block; `bundleOffer` exists (name/tagline/price/savings/includes/cta/highlighted)
   and is close to `bundles` — extend it with `monthly`, `note`, `checkoutHref` instead
   of adding a near-duplicate; `services` items (title/description/bullets) can't carry
   priceLine/demoHref, so `outcomeCards` is genuinely new (or extend `services` with a
   variant). Decide per-block in Phase 1 and record in the changelog.
4. **Renderer landmines for Phase 2 content**: the `/full pricing menu/i` cta filter on
   home, the `PageSpeed audit` eyebrow sentinel, the leadMagnet reorder on home, and
   alternating tone wrappers keyed to block index (reordering home blocks flips section
   tones). The `toContactAnchor` rewrite kills `?tier=` everywhere until removed.
5. **Globals clobbered on boot** (§2/§7): header/footer/siteSettings edits must land in
   `onInit.ts` or they revert on next deploy. Same for any page whose FORCE var gets set.
   Conversely `apply.ts` writing pages is safe from onInit (create-if-missing only).
6. **Sitemap ignores `seo.noIndex`** (§8): `thanks` would enter the sitemap. Small fix in
   `sitemap.ts` (filter noIndex or exclude `thanks`).
7. **Home page ignores `page.seo`** (§3): the Phase 2 home SEO title/description need a
   change in `src/app/(frontend)/page.tsx` metadata, not just CMS content.
8. **`checkout_click` event**: `EventName` union is closed; extend it in
   `src/lib/analytics.ts` (also register the event in GTM later - checklist item).
9. **Local vs prod content drift** (top caveat): the Express LP was CMS-converted on
   prod; prod may hold content the local DB does not. Re-run the export + forbidden-string
   grep against prod (via a guarded dev route or a one-off container) before and after
   `apply.ts` runs there.
10. **`seed.ts` is stale and contradicts onInit** (founding CTA, wrong phone). Either
    update it in Phase 2's cleanup or mark it deprecated in the changelog so nobody runs
    `npm run seed` and resurrects founding content locally.
11. **Forbidden strings live in many non-CMS places** ground rule 7's grep will hit.
    The full inventory (from the sweep):
    - `src/lib/redesign.ts` (`relabelDiscount` "Founding"→"Discounted", `toContactAnchor`)
    - `src/blocks/render/FoundingClient.tsx` ("Founding spots remaining" `:68`,
      `priceRetail` strikethrough `:40`) + block schema `index.ts:60-102`
      (`priceFounding`/`priceRetail`/`savings`, examples "$1,950", "Save $455")
    - `src/blocks/render/ExpressLanding.tsx` (`$999`/`$1,950` `:68-69`, "Save $951"
      `:96,:107`, "First 5 small businesses save up to $1,000." `:103`)
    - `src/blocks/render/Pricing.tsx` toggle ("Discounted"/"Retail"/"limited"
      `:30-34,:65-68`) + `originalPrice` rendering `:31,:33,:94-95`
    - `src/seed/seed.ts` (FOUNDING_BANNER `:44-59` with `$1,495`/`$1,950`/`$4,500`/
      `Save $...`; dozens more through `:896`)
    - `src/seed/onInit.ts` (`:242` `$1,495`, `:256` `$4,500`, `:317` `$1,495`,
      `:336-337` "Founding Client pricing ... 5 spots remaining")
    - `src/app/dev-convert-express-lp/route.ts` (`:54,:67,:74,:89` - founding blocks,
      `originalPrice: '$1,950'`)
    - `src/app/dev-seed-local-pages/route.ts:104` ("founding-client pricing" FAQ)
    - `src/app/dev-email-preview/route.ts:48` ("Founding-client discount applied")
    - **`src/lib/pdfs/content.ts:119-120,:170`** - the `/downloads/[slug]` PDF library
      still quotes "$999 founding (was $1,950)", "$2,495 founding (was $4,500)",
      "$499 founding (was $1,495)" - user-facing, easy to miss
    - `src/globals/SiteSettings.ts:36-51` unused `foundingSpots*` fields (live DB values
      3 of 5); `src/app/components.css:105` comment; `src/collections/Clients.ts:235`
      tag example "founding-client"; `src/app/dev-schema-fix/route.ts:85`
    - Live DB: home foundingClient headline "First 5 clients save up to $2,005.", five
      niche LPs same, express-website "Heights Discounted Pricing"
    - `public/p/inasthreadingbeauty/index.html:135` markup-split "Save $500 on any tier"
    Budget for a wide sweep, not a spot fix.
12. **contactForm collection option lists are duplicated** (component JSX + collection
    config, §5) — Phase 1d must change both or validation drops the new values.

---

### Local CMS content grep snapshot (backup of 2026-08-26)

Forbidden-string hits in the local export: `founding`/`Founding` in `pages.json` (19),
`landingPages.json` (70), `faqs.json` (4), `siteSettings.json` (2 - the unused
`foundingSpots*` field names); `$1,950`, `$4,500`, `$1,495`, `Save $`, `originalPrice`,
`retail` in `pages.json` + `landingPages.json` (+ `faqs.json` for $1,950/$4,500);
retired phone: zero hits. Full JSON in `backups/pricing-reset/2026-08-26T22-46-30-970Z/`.
