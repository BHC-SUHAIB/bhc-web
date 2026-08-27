# Pricing reset changelog (branch `pricing-reset`)

Every schema, content, and component change, by commit. Decisions referenced
as R1-R10 live in DECISIONS.md; discovery context in DISCOVERY.md.

## Commits

1. `42b0422` chore: discovery notes + full local CMS content backup
2. `b20e9b3` docs: approved decision log
3. `a270319` feat: Phase 1 schema + code
4. `5e5ee0b` feat: Phase 2 content script + page layouts
5. `c184140` feat: Phase 3 portfolio groups
6. `42934b5` test: Phase 4 verification artifacts (+ foundingClient deletion)
7. (this commit) docs: checklist, changelog, PR description, rollback script

## Schema changes (push mode; no hand-written migrations in this repo)

- `pricing` block tiers: added `subscribePrice`, `subscribeNote`,
  `checkoutHref`, `subscribeHref`, `badge`, `footnote`. `originalPrice` kept
  for backward compatibility but hidden in admin and never rendered; every
  stored value cleared by the content script.
- `bundleOffer` block bundles: added `monthly`, `note`, `checkoutHref`
  (extended instead of adding a near-duplicate `bundles` block, per R6).
- `steps` block was NOT added: `processSteps` already covers it (R6).
- New blocks: `outcomeCards`, `phoneDemo`, `guarantees`, `demoRequestForm`.
- `richText` block: added optional `anchorId` (used by /automation#demo).
- `contactForm` block: added `noCallNeeded` checkbox.
- `projects` collection: added required `group` select
  (client/concept/product, default product).
- `contact-submissions`: added `formType` (contact/demo-request) and
  `listingUrl`; `projectType` and `budgetRange` option lists replaced with
  the new catalog (legacy values retained, labeled, so old leads display).
- SiteSettings: deleted unused `foundingSpotsTotal`/`foundingSpotsRemaining`
  (approved stop point R5; values preserved in the committed backup).
- DELETED: `foundingClient` block (schema, component, CSS, renderer case,
  version-history tables) after content verification showed zero references
  (R4).

## Component changes

- `Pricing.tsx`: rewritten. Buy now (checkoutHref) / CTA fallback, Subscribe
  secondary button, "or {subscribePrice}" line, always-on "Ask a question"
  link to /contact?tier={slug} (slug from the CTA's tier param, else
  kebab-cased name), CMS `badge` pill, `footnote`, `checkout_click`
  dataLayer events. Removed: Discounted/Retail toggle, strikethrough
  originalPrice, hardcoded "Most popular", render-time copy rewrites.
- Deleted `src/lib/redesign.ts` (`toContactAnchor` stripped ?tier= from every
  contact link; `relabelDiscount` rewrote Founding->Discounted at render).
  Consumers (PricingCta, HeroCta, CTA, HeroPhoto, SiteHeader) now render CMS
  values verbatim (R1).
- New render components: `OutcomeCards`, `PhoneDemo`, `Guarantees`,
  `DemoRequestForm` (posts to the same contact-submissions pipeline with
  `formType: 'demo-request'`), `BundleBuyButton`, `ThanksTracker` (pushes
  `purchase` with the SKU's dollar value on /thanks?sku=).
- `BundleOffer.tsx`: renders `monthly`, `note`, and a Buy now path.
- `BundleConfigurator.tsx`: fallback options repriced to the new catalog;
  "you save" strings removed (ground rule 7).
- `ContactForm.tsx`: new project types, new budget ranges (Under $500 ...
  $5,000+), ?tier= read from location.search with pre-selected project type,
  "You picked {label}. {summary}" line (map: `src/lib/tiers.ts`),
  noCallNeeded line, tier carried into the submitted message.
- `SiteAuditTool.tsx`: results upsell repriced ($297 -> $249) and gained the
  approved "See your site first" CTA to /free-demo-site.
- `/portfolio`: three grouped sections (Client sites / Concepts / Products we
  built), empty groups hidden; hero + closing CTAs repointed to
  /free-demo-site. `FeaturedProjects`: latest mode overfetches and sorts
  client group first; home block pinned manual (PM, WAYGFT).
- Deleted `ExpressLanding.tsx` (obsolete code-composed fallback) and the
  `dev-convert-express-lp` one-shot route (R9).
- Retired `LP_PHONE_DISPLAY`/`LP_PHONE_HREF`; LP layout + blocks fall back to
  SiteSettings.contactPhone = (866) 434-9777 (R7). Zero 346-number
  references remain in any format.
- `sitemap.ts` skips `seo.noIndex` pages; home route reads CMS seo (R10).
- `/downloads` PDF library (`src/lib/pdfs/content.ts`) repriced to the new
  catalog (R8). `dev-seed-local-pages` Heights FAQ + `dev-email-preview`
  line item cleaned.
- `analytics.ts`: `checkout_click` and `purchase` added to the EventName
  union; `TrackedLink` accepts `cta_click`.
- Header global defaults + seeds: nav = Services / AI Front Desk / Work /
  Articles / About / Contact; CTA "See your site first" -> /free-demo-site.
- `onInit.ts`: globals now create-if-missing with FORCE_GLOBALS_UPSERT (R2);
  home/services/contact/about seeds source from `src/seed/reset-content.ts`;
  five new pages seeded create-if-missing; stale pre-Warm-Mono catalog
  removed. Standalone `src/seed/seed.ts` + `npm run seed` deleted (R3;
  rerunning it would have regressed LPs to $1,495/$1,950 founding pricing).

## Content changes (applied to the LOCAL database; prod needs the same run)

Script: `scripts/pricing-reset/apply.mts` (idempotent, upsert-by-slug, never
deletes; refuses postgres without --allow-non-local). Canonical content:
`src/seed/reset-content.ts` (shared with onInit).

- Full-replace pages: home, services, and new fix-it, ai-front-desk,
  automation, free-demo-site, thanks (layouts per the Phase 2 spec, facts
  table exact, copy pack verbatim where given).
- Patched pages: about (+ "How we build" after the three principles), contact
  (noCallNeeded, audit description $249), web-design-houston-heights and
  local-seo-houston (new primary CTAs, AI Front Desk hero sentence + ghost
  CTA since hero subheadlines cannot carry links, FAQ answers repriced).
- FAQ collection: 10 documents rewritten to the new catalog (including the
  founding-pricing FAQ, now "How do I pay?").
- Landing pages (all six, still noindex, none deleted): foundingClient blocks
  replaced by the "Why our prices are low" richText, pricing blocks replaced
  with the new website tiers (midmarket: Pro Site + Custom Build; express:
  single Starter), hero CTAs -> "See your site first", stats/animatedStats
  7-day + honesty fixes, express bundle configurator repriced (Starter $699,
  Host $59/mo, SEO Sprint $449, Front Desk setup $299), closing CTAs -> free
  demo, seo titles/descriptions rewritten.
- Globals: header nav + CTA per 1e; footer links now include /ai-front-desk,
  /automation, /fix-it, /free-demo-site.
- Portfolio groups: prometheus-minds + waygft = client, all others product
  (case-study copy untouched).

## Verification

See VERIFICATION.md: build clean, no new type errors, all 13 pages 200 with
resolving links and facts-table-only prices (script output committed),
Lighthouse mobile 90/90 on services + ai-front-desk (home 86-88 with a
pre-existing client-hint restart + font-swap LCP, flagged), zero console
errors, 26 screenshots, forbidden-string greps clean with documented
exceptions (migration tooling, spec/docs/backups, Certo exam JSON words
"confounding"/"company founding", and the FAQ match keys to be pruned after
the prod run).

## Explicitly untouched

/sms, /sms-terms, /privacy, /terms, the articles collection, Misbah support
routes, prospect previews under /p/ (verified free of the retired number),
all Stripe objects (no Stripe API call made), Prometheus Minds + WAYGFT
sites/hosting/case-study copy.
