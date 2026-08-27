# Pricing reset: handoff checklist for Suhaib

Everything below is what remains after Phases 0 to 5 (committed on
`pricing-reset`). Items marked (you) need your accounts or a decision.

## 1. Stripe

- [ ] Phase 5b has not run yet: it needs you signed in to Stripe in Chrome,
      then `stripe login` in the terminal (pairing code flow; no keys pasted).
      The catalog script is written at `scripts/pricing-reset/stripe-catalog.mts`
      and runs test mode first.
- [ ] After the test-mode run passes its checklist and you say go, the live
      run creates the products/prices/payment links and
      `scripts/pricing-reset/wire-stripe-links.mts` writes the URLs into the
      CMS tiers (`checkoutHref`/`subscribeHref`) and the bundles block. Until
      then every tier falls back to the contact form, which works today.
- [ ] SKUs that intentionally have NO payment link: `custom-build` and the
      `internal-tool` build itself (invoiced from a written scope); deposits
      are Stripe invoices on request.
- [ ] Dashboard-only settings (you, after the live run): upload the logo +
      brand color in Branding; confirm statement descriptor `BLACK HART`;
      public business details (support email, terms URL
      https://blackhartconsulting.com/terms, privacy URL); decide Stripe Tax
      with your CPA (Texas treats website creation/maintenance/hosting as
      taxable data processing with a partial exemption; confirm before the
      live run); enable the Customer Portal for subscribers; set dunning
      emails for failed subscription payments.

## 2. Retell / AI Front Desk (hard gate before prod deploy)

- [ ] Nothing is built yet (current stack: Quo + Sora AI). The site claims
      "call (866) 434-9777 and hear it book" in multiple places, so DO NOT
      deploy this branch to production until your own agent answers that
      number (or you accept a short window where the claim is aspirational).
- [ ] Per DECISIONS.md: after Phase 5b, Claude walks you step by step through
      Retell signup, agent script + knowledge base (from the site's facts
      table), voice selection, forwarding the 866 number from your current
      setup, calendar booking, and missed-call text-back. Ask for the
      "front desk setup" session when ready.

## 3. Calendly

- [ ] No change. Still the secondary path on contact/home/services.

## 4. Google Business Profile + citations (you)

- [ ] Update the GBP services list to the new catalog (Websites, AI Front
      Desk, Automation, Local SEO + AI Search, Fix-it menu).
- [ ] Confirm the GBP phone is (866) 434-9777.
- [ ] Search Bizapedia, Yelp, Bing Places, Apple Business Connect, Facebook,
      and your citation sheet for 346-560-5430 and change each to the 866
      number so NAP stays consistent. (The site itself has zero 346
      references left, in any format.)

## 5. Placeholders left in the build

- [ ] Automation page `#demo` block is a placeholder richText ("a 60-second
      screen recording ... is coming here"). Record the lead-follow-up demo
      and replace the block (or embed a video via mediaBlock).
- [ ] Every `checkoutHref`/`subscribeHref` is empty until Phase 5b wires them.
- [ ] `lib/stripe-links.ts` is an empty registry with env override support;
      it becomes useful only if you prefer env-managed links over CMS fields.

## 6. Running apply.mts in production, safely

1. Re-export prod content first (the local backup does NOT cover prod):
   run `scripts/pricing-reset/export-backup.mts` against the prod DB (one-off
   container, same pattern as scripts/seed-mergebird.ts header) and commit the
   backup.
2. Deploying the branch already updates code + onInit; then run
   `scripts/pricing-reset/apply.mts --allow-non-local` with the prod
   DATABASE_URI (one-off container on the compose network). It is idempotent
   and never deletes a page.
3. The script's final sweep must print "sweep clean". If it prints RESIDUAL
   lines, prod content had strings local did not; send Claude the output.
4. Spot-check: /, /services, /ai-front-desk, /free-demo-site, /fix-it,
   /automation, /contact?tier=starter-site.
5. Set `FORCE_GLOBALS_UPSERT` only if the header/footer failed to update
   (globals are otherwise create-if-missing now; apply.mts writes them
   directly, so this should not be needed).
6. After the prod run succeeds, prune the FAQ `match` keys in
   `src/seed/reset-content.ts` (they contain the old founding wording so the
   script could find the docs to rewrite).

## 7. Rollback

- `scripts/pricing-reset/restore.mts backups/pricing-reset/<timestamp>`
  restores pages, landing pages, projects, FAQs, and the three globals from
  the committed JSON backup (upsert by slug; no deletions). Local backup:
  `backups/pricing-reset/2026-08-26T22-46-30-970Z/`. Take a prod backup
  before the prod apply run (step 6.1) so you have a prod restore point.
- Code rollback is `git revert` of the branch merge; the schema is push-mode,
  and the only dropped columns/tables were the approved foundingSpots
  fields and the retired foundingClient block's version tables (contents
  preserved in the committed backup).

## 8. Existing clients: untouched

- Prometheus Minds and WAYGFT sites, hosting, DigitalOcean resources, and all
  existing Stripe customers/subscriptions/products/prices were not modified
  by Phases 0 to 5 (no Stripe API call has been made at all yet). The Phase
  5b script will write `stripe-before/<mode>.json` and `stripe-after.<mode>.json`
  and diff them; the diff of pre-existing objects must be empty and Philip
  Parmar's Prometheus Minds subscription must appear unchanged in both.

## 9. Analytics follow-ups (you, in GTM/GA4/Ads)

- [ ] GTM: create triggers/tags for the new dataLayer events `checkout_click`
      (params: sku, path) and `purchase` (params: sku, value, currency).
      Register `purchase` as a Google Ads conversion with value; keep
      `generate_lead` as the lead conversion.
- [ ] After launch, run one live conversion test (site form + a $0-risk
      checkout via a 100% promo or test link) and confirm both events land.

## 10. Open items / known notes

- [ ] Home Lighthouse mobile perf measured 86-88 locally (services and
      ai-front-desk both 90). ~600ms is a Chrome client-hint restart
      (Sec-CH-Prefers-Color-Scheme, emitted by Next for theming) plus the
      Fraunces font-swap repaint on the large h1; both predate this branch.
      Options if you want the 90: subset/reduce the Fraunces weights, or
      accept system-theme-only detection. Decide separately; not a regression.
- [ ] The old budget-range values (under-5k etc.) remain in the
      ContactSubmissions select as "(legacy)" options so old leads display.
- [ ] `docs/prospect-previews.md` and other historical docs still mention
      retired pricing in prose; they are internal docs, left alone.
- [ ] Subscription terms: /terms is out of scope for this branch (ground rule
      8). Add the 12-month subscribe terms language there manually.
- [ ] Demo-site ops: cap free-demo WIP per week; deliver via the /p/ gate
      (bhc-publish-preview skill); first reply same-hour even if the mockup
      takes 48h.
