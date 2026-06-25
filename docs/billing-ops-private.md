# Billing subsystem: private, token-gated client ops (not a public storefront)

Decision (2026-06-25): the Stripe billing/invoicing/portal/care-plan subsystem
is **kept** and **formally walled off** as a private, token-gated operations
tool for existing clients. It is never linked from the public marketing site.
This satisfies the "no checkout / no SKU on the public site" guardrail because
the public funnel never touches it.

## Why keep it
It is a live production system (client invoicing since 2026-05-05). Removing it
would destroy working revenue tooling. The guardrail is about the *public* site
becoming a storefront, which it has not: every public pricing/bundle/tier CTA
routes to `/contact`, and no block, seed, header, or footer links to checkout.

## What enforces the wall
- **Token gating.** `/invoice/[id]`, `/portal/[customer]`, `/care-plan/setup`
  all require a signed token (`verifyInvoiceToken`) and `notFound()` without it.
  Links reach clients only via emailed token URLs or the `/admin` panel.
- **No index.** Each route emits `robots: { index: false, follow: false }`.
- **Out of the sitemap.** `src/app/sitemap.ts` only emits CMS pages, projects,
  articles, and legal routes.
- **robots.txt.** `/invoice/`, `/portal/`, `/care-plan/` (plus `/admin`,
  `/api/`, `/p/`, `/misbah/`) are disallowed in `src/app/robots.ts`.
- **No public coupling.** Nothing under `src/blocks` or `src/seed` imports the
  Stripe libs, so the lead-gen site does not depend on billing code.

## Rule for future work
Do not add a public link to any billing route, and do not surface a self-serve
checkout or productized SKU on the marketing site. The shipped apps appear only
as portfolio proof. If billing routes change, keep them token-gated, noindexed,
out of the sitemap, and listed in robots.txt.
