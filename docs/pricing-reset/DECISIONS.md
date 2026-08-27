# Pricing reset: approved decisions (2026-08-26)

Suhaib approved/answered each item below before Phase 1 began. These bind the
implementation; deviations need a new sign-off.

## Fixes for discovery findings (all approved)

- **R1** Delete `toContactAnchor()` and `relabelDiscount()` (src/lib/redesign.ts).
  Build real `?tier=` handling: `lib/tiers.ts` map + contact form pre-select via
  `useSearchParams`. Keep the `#contact-form` anchor by writing it into tier map hrefs.
- **R2** onInit globals become create-if-missing with a `FORCE_GLOBALS_UPSERT` env gate
  (same contract as pages). onInit seed content updated to new nav/CTA for fresh DBs.
- **R3** Delete `src/seed/seed.ts` and the `seed` npm script.
- **R4** foundingClient retired in two steps: Phase 2 strips it from home + all LP
  content and deletes `ExpressLanding.tsx`; Phase 4 deletes component + schema after
  verifying zero references.
- **R5** Delete `foundingSpotsTotal`/`foundingSpotsRemaining` from SiteSettings
  (stop-point approval given; values preserved in the committed backup).
- **R6** Block reuse: `processSteps` serves as the prompt's `steps`; `bundleOffer` is
  extended with `monthly`, `note`, `checkoutHref` to serve as `bundles`. New blocks:
  `outcomeCards`, `phoneDemo`, `guarantees`, `demoRequestForm`. `guaranteeStrip` stays.
- **R7** Delete `LP_PHONE_DISPLAY`/`LP_PHONE_HREF`; LPs fall back to
  `SiteSettings.contactPhone` (866).
- **R8** Rewrite pricing sections in `src/lib/pdfs/content.ts` (/downloads PDFs) to the
  new facts table.
- **R9** Delete `dev-convert-express-lp`; fix founding strings in
  `dev-seed-local-pages` (Heights FAQ) and `dev-email-preview`.
- **R10** Sitemap filters `seo.noIndex` pages; home route reads `page.seo` from CMS.

## Offer/business decisions

- **Demo line**: the AI Front Desk answers the real (866) 434-9777 line (dogfood = demo).
- **Front Desk reality check**: nothing is built yet (current stack: Quo + Sora AI; no
  Retell/Twilio). Pages and SKUs ship as specced, BUT the phone-demo claim must not go
  live on prod until Suhaib's own agent answers 866. After all phases, Claude guides a
  step-by-step setup (Retell agent, script/KB, forwarding from current phone setup,
  calendar booking, missed-call text-back). This is a hard checklist dependency in
  Phase 5.
- **Free demo site delivery**: reuse the existing password-gated `/p/` prospect-preview
  system. Flow: form submission -> Suhaib builds mockup with Claude Code within 48h ->
  publish via /p/ (bhc-publish-preview skill) -> email link + password. No automation
  builds anything.
- **Purchase conversion tracking (approved addition)**: `/thanks?sku=` page pushes a
  `purchase` dataLayer event with the SKU's dollar value (SKU->value map from
  lib/tiers.ts), alongside the prompt's `checkout_click`. Extend the `EventName` union;
  GTM/Ads-side mapping is a checklist item for Suhaib.
- **Audit tool CTA (approved addition)**: the free-audit results view gets a
  "See your site first" CTA linking to `/free-demo-site`.
- **Ads repoint (approved as recommendation only)**: ADS_PAGES.md will include concrete
  campaign recommendations - point traffic at `/free-demo-site`, test $399-led ad copy.
  Claude never touches the live Ads campaign; Suhaib applies changes in the console.

## Standing notes (no approval needed, for later phases)

- Subscribe terms: `/terms` is protected by ground rule 8; the 12-month subscription
  terms language is a manual edit for Suhaib later (checklist item).
- Demo mockups that do not convert can be fictionalized into `concept` portfolio
  entries to fill the new Concepts section on /portfolio.
- Demo-request leads deserve a fast first reply (initially manual; later this becomes
  the first Automation Sprint case study - dogfooding lead follow-up).
- apply.ts runs with the Node-24 interop shim (or Node 22) and `SEED_ON_BOOT=false`;
  re-export + re-grep prod content before it ever runs against prod.
