# Phase 4 verification (2026-08-26, local sqlite content, production build)

## Build / typecheck
- `npm run build`: clean (after accepting the sqlite schema-push that drops the
  retired foundingClient version tables; on prod postgres the same push happens
  on boot per src/seed/onInit.ts).
- `npx tsc --noEmit`: no NEW errors. Pre-existing errors (unchanged files, per
  project memory these predate this branch): api/checkout/start,
  api/clients/[id]/related, api/projects/[id]/create-invoice,
  api/stripe/webhook, render/HeroCta (onClick typing), collections/Invoices,
  dev-create-filler-testimonial, dev-truncate-testimonials, portfolio/[slug].
- No lint script exists in this repo.

## Ground rule 7 grep (forbidden strings + retired phone + dashes)
- CMS content (all pages, landingPages, faqs, globals): CLEAN (apply.mts sweep).
- Code: CLEAN, with these documented exceptions:
  - scripts/pricing-reset/* (the migration/verification tooling that detects
    and removes the strings)
  - src/seed/reset-content.ts FAQ_COLLECTION_REWRITES `match` keys (needed to
    find the old FAQ docs on prod; prune after the prod run)
  - PRICING_RESET_PROMPT.md, docs/pricing-reset/*, backups/pricing-reset/*
    (the task spec, its documentation, and the pre-change content backup)
  - public/app-content/certo/*.json ("confounding variable", "company
    founding": Certo exam questions, unrelated words)
  - scripts/seed-mergebird.ts (untracked local file, comment mention only)
- Retired phone 346-560-5430: zero occurrences in any format in code, CMS,
  env files, schema, or public/. No call-tracking scripts exist.
- Em/en dashes: none in any string written for this reset.

## Page checks (scripts/pricing-reset/verify-pages.mts)
All 13 URLs return 200, every internal href resolves 200, tel:/mailto: are
well-formed, every visible price is in the facts-table allowlist, sitemap
includes the new pages and excludes /thanks. Full output:
see verify-pages-output.txt (ALL CHECKS PASSED).

## Lighthouse mobile (headless Chrome, next start, local)
| Page | Perf | A11y | Best practices | SEO |
|---|---|---|---|---|
| /services | 90 | 94 | 100 | 100 |
| /ai-front-desk | 90 | 98 | 100 | 100 |
| / | 86-88 (2 runs) | 95 | 96 | 100 |

Home perf note: ~600ms of the LCP is a same-URL request restart from the
Critical-CH / Sec-CH-Prefers-Color-Scheme client-hint header that Next itself
emits (theme detection), plus the Fraunces font-swap repaint of the large
serif h1. Both patterns predate this branch (prod mobile baseline was 85-95
per project notes); TBT is 40ms and CLS is 0. Open item in CHECKLIST.md with
suggested fixes. No JS budget check exists in the repo.

## Console errors
Zero console errors on /, /services, /fix-it, /ai-front-desk, /automation,
/free-demo-site, /thanks, /about, /contact, /contact?tier=..., /portfolio,
/web-design-houston-heights, /local-seo-houston, /lp/express-website
(fresh tab against the production build).

## Screenshots
docs/pricing-reset/screens/: all 13 pages at 390px and 1280px (26 files).

## Functional checks (browser)
- ?tier=starter-site pre-selects Website + shows "You picked Starter Site..."
- /thanks?sku=starter-site pushes {event:'purchase', sku, value:699, USD}
- demo request form renders; noCallNeeded line on /contact
- /portfolio groups: Client sites (PM, WAYGFT) then Products; Concepts hidden
- home featuredProjects order: Prometheus Minds, WAYGFT (pinned manual)
