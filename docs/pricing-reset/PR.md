# PR: Pricing and services reset (nine-SKU catalog, subscribe option, three new service lines)

## What this is

Moves blackhartconsulting.com from the 17-SKU strike-through catalog to nine
outcome-led SKUs at lower entry prices, adds a subscribe path (own the site at
month 12), three new service lines (AI Front Desk, Automation, Internal
Tools), four new pages (/fix-it, /ai-front-desk, /automation,
/free-demo-site, plus /thanks), Stripe-checkout-ready pricing cards, real
`?tier=` plumbing, purchase-value analytics, and a grouped portfolio. All
founding-client and strike-through pricing is gone from code and content, and
the retired 346-560-5430 number is fully replaced by (866) 434-9777.

## Highlights

- Pricing tiers now carry Buy now (Stripe Payment Link), Subscribe, and an
  always-present "Ask a question" -> /contact?tier=... which pre-fills the
  contact form and shows a one-line summary (map in src/lib/tiers.ts).
- New blocks: outcomeCards, phoneDemo, guarantees, demoRequestForm; extended:
  bundleOffer (monthly/note/checkoutHref), pricing (subscribe/badge/footnote);
  reused: processSteps for the "how it works" sections.
- Free-demo-site funnel: request form feeding the existing
  contact-submissions pipeline (formType demo-request), audit-tool CTA,
  header CTA "See your site first" site-wide.
- checkout_click + valued purchase dataLayer events; /thanks?sku= redirect
  target for Payment Links.
- Content migration is one idempotent script (scripts/pricing-reset/apply.mts)
  sharing canonical layouts with the boot seed (src/seed/reset-content.ts);
  rollback via restore.mts from the committed content backup.
- Deleted: foundingClient block end to end, render-time copy rewrites
  (redesign.ts), the stale standalone seed, the LP phone override, the
  ExpressLanding code fallback, dev-convert-express-lp.

## Verification

docs/pricing-reset/VERIFICATION.md: build clean, no new type errors, 13
pages verified (200s, link resolution, facts-table price diff ALL PASSED),
Lighthouse mobile 90/90/86-88 (home miss analyzed and flagged, pre-existing
cause), zero console errors, 26 screenshots at 390/1280.

## Not in this PR / gated

- Stripe catalog + payment links (Phase 5b: needs `stripe login`; script
  ready, test mode first, before/after diffs of pre-existing objects must be
  empty).
- Retell agent on (866) 434-9777: must be live before this deploys to prod
  (the site claims the number is AI-answered).
- Production content run: apply.mts must run against prod after a prod
  content export (local DB was migrated and verified; prod has drifted).
- Phase 6 (42 local vertical pages + two articles): separate follow-up.

## Rollout

Merge -> prod deploy pushes schema on boot (accepting the foundingClient
version-table drop) -> run apply.mts against prod (backup first, see
CHECKLIST.md section 6) -> spot-check the six URLs -> wire Stripe links when
5b completes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
