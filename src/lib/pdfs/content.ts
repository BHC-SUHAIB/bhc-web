import type { PdfDoc } from './builder'

// Lead-magnet checklist + 4 service one-pagers — all sized to fit on a SINGLE
// US-Letter page at the densities defined in builder.ts. When editing, keep
// the section count + total bullet count roughly the same per file or the
// content will spill over.

export const CHECKLIST: PdfDoc = {
  filename: 'bhc-website-checklist.pdf',
  eyebrow: 'Lead-magnet · 1-page checklist',
  title: 'The small-business website checklist',
  subtitle:
    'What to ask, what to demand in writing, and what to walk away from. Bring it to any pitch — yours or a competitor’s.',
  sections: [
    { type: 'subheading', text: '1.  Scope + deliverables' },
    {
      type: 'bullets',
      items: [
        'How many pages, exactly? Get the count in writing.',
        'Show me a mobile screenshot of recent work — not desktop scaled down.',
        'What CMS do you use, and can my team edit every section without you?',
        'What’s the delivery date — calendar days, not "sprints"?',
      ],
    },

    { type: 'subheading', text: '2.  Performance promises (in writing)' },
    {
      type: 'bullets',
      items: [
        'Target Largest Contentful Paint (LCP) under 2.5 seconds on mobile.',
        'JavaScript budget under 200KB on the first paint for a 5-page site.',
        'Lighthouse Performance 90+ on mobile at launch.',
        'Image delivery via CDN with WebP/AVIF — not raw JPEGs from WordPress.',
      ],
    },

    { type: 'subheading', text: '3.  SEO + Local SEO (the filter questions)' },
    {
      type: 'bullets',
      items: [
        'LocalBusiness schema markup on the site? (Required for the local pack.)',
        'Are you setting up or auditing my Google Business Profile?',
        'Will my contact form fire a GA4 conversion event?',
        'Title tags + meta descriptions written per page, not auto-generated.',
      ],
    },

    { type: 'subheading', text: '4.  Hosting, ownership, and exit terms' },
    {
      type: 'bullets',
      items: [
        'Code lives in a GitHub repo I own — handed over at launch.',
        'I can move my hosting any time without losing the site.',
        'I own the design files (Figma).',
        'Off-boarding is one paragraph in the contract — not "case-by-case."',
      ],
    },

    {
      type: 'callout',
      title: 'Walk-away red flags',
      body:
        '"Contact us for pricing" everywhere · "SEO guaranteed first-page rankings" · No fixed delivery date · Hosting bundled with no exit clause · Their own site fails Lighthouse · They can\'t name a single past client by name.',
    },

    { type: 'subheading', text: 'Want a free 30-min audit?' },
    {
      type: 'paragraph',
      text:
        'Bring this checklist to a discovery call with Black Hart Consulting. We\'ll score your current site against every item live and tell you the 3 highest-impact fixes — even if you don\'t hire us. Book at blackhartconsulting.com or call (866) 434-9777.',
    },
  ],
}

const CTA_BLOCK: PdfDoc['sections'] = [
  { type: 'subheading', text: 'How to start' },
  {
    type: 'paragraph',
    text:
      'Book a 30-minute discovery call at blackhartconsulting.com or email hello@blackhartconsulting.com. We\'ll scope your project, ballpark a price, and tell you whether we\'re a fit — no hard sell.',
  },
]

export const SERVICE_WEBSITE: PdfDoc = {
  filename: 'bhc-service-website.pdf',
  eyebrow: 'Service one-pager · 1 of 4',
  title: 'Website design & build',
  subtitle:
    'Marketing sites and web apps, mobile-first, on a CMS your team actually uses. Fixed-price, fixed-timeline.',
  sections: [
    { type: 'subheading', text: 'What you get' },
    {
      type: 'bullets',
      items: [
        'Custom design — not a template. Every section reviewed before code starts.',
        'Block-based CMS (Payload). Your team edits every section without paying us.',
        'Performance budget enforced: <200KB first-paint JS, Lighthouse 90+ on mobile.',
        'GA4 + conversion tracking + LocalBusiness schema pre-wired.',
        'Code repo handover at launch. No hosting hostage situations.',
      ],
    },

    { type: 'subheading', text: 'How it works' },
    {
      type: 'numbered',
      items: [
        'Discovery call (30 min) — fixed-price quote, no proposal fees.',
        'Design phase (3–5 days) — Figma mockups, you approve before any code.',
        'Build phase (10–14 days) — code, CMS, SEO, performance.',
        'Launch (day 14) — live, GA4 verified, GBP updated, team trained.',
      ],
    },

    { type: 'subheading', text: 'Pricing' },
    {
      type: 'bullets',
      items: [
        'Single Page — $795. One long-form page, 5-day delivery.',
        'Starter Site — $1,495 founding (was $1,950). 5 pages, 14-day delivery.',
        'Pro Site — $3,500 founding (was $4,500). 12 pages, 21-day delivery, +30 days SEO content.',
        'Custom Build — from $9,500. Web apps, multi-language, custom integrations.',
      ],
    },

    {
      type: 'callout',
      title: 'Why fixed-price beats hourly',
      body:
        'Hourly billing rewards the developer for being slow. Fixed-price rewards them for being fast and clean. You know what you\'re paying before you start; we know when we ship.',
    },

    ...CTA_BLOCK,
  ],
}

export const SERVICE_SEO: PdfDoc = {
  filename: 'bhc-service-seo.pdf',
  eyebrow: 'Service one-pager · 2 of 4',
  title: 'Local + national SEO',
  subtitle:
    'Google Business Profile, schema, citations, and content. Always with measurable conversion events.',
  sections: [
    { type: 'subheading', text: 'What you get' },
    {
      type: 'bullets',
      items: [
        'Google Business Profile setup or audit + repair (photos, services, hours, reviews).',
        'LocalBusiness or Organization schema — direct effect on the local pack and AI overviews.',
        'NAP consistency audit + 10 high-trust directory citations.',
        'Cornerstone service or location pages — long-form, search-intent-mapped, internally linked.',
        'Title + meta rewrites for every existing page — quick-win clicks before content work.',
        'GA4 + Search Console integration with monthly performance report.',
      ],
    },

    { type: 'subheading', text: 'How it works' },
    {
      type: 'numbered',
      items: [
        'Discovery + audit (week 1) — technical SEO + GBP + competitor pull. Top 3 fixes reported.',
        'Pick a Sprint or retainer — Sprint is one-time; retainers are monthly.',
        'Monthly cadence on retainers — 1–2 cornerstone pages, GBP work, citations, technical fixes, monthly report.',
      ],
    },

    { type: 'subheading', text: 'Pricing' },
    {
      type: 'bullets',
      items: [
        'Local SEO Sprint — $1,195 founding (was $1,495). One-time, 2-week delivery.',
        'Local SEO Monthly — $695/mo. Single-location service businesses.',
        'SEO Growth — $1,495/mo. Multi-location or content-heavy businesses.',
      ],
    },

    {
      type: 'callout',
      title: 'What we won\'t do',
      body:
        'No keyword stuffing. No PBNs. No "guaranteed first page" promises. No bulk citation spam. SEO that only works while no one\'s looking is SEO that gets penalized later.',
    },

    ...CTA_BLOCK,
  ],
}

export const SERVICE_CARE: PdfDoc = {
  filename: 'bhc-service-care.pdf',
  eyebrow: 'Service one-pager · 3 of 4',
  title: 'Care plans',
  subtitle:
    'Hosting, monitoring, backups, and ongoing edits. Your site stays fast, secure, and online without your input.',
  sections: [
    { type: 'subheading', text: 'What you get' },
    {
      type: 'bullets',
      items: [
        'Managed hosting on a tuned VPS with image CDN — typical TTFB under 200ms.',
        'Automated daily off-site backups, 30-day retention, restore on request.',
        'Uptime monitoring with SMS alerts to us — we catch outages before you do.',
        'Security patches and dependency upgrades — no "your CMS is out of date" surprises.',
        'Monthly performance + uptime report on the 1st of every month.',
        'Included edit hours per month — copy, images, new pages, prices. Same-week turnaround.',
      ],
    },

    { type: 'subheading', text: 'Three tiers' },
    {
      type: 'bullets',
      items: [
        'Care — $149/mo. Hosting + maintenance + 1 hour of edits/mo.',
        'Growth — $495/mo. Care + 5 hours of dev or SEO work/mo.',
        'Scale — $1,295/mo. Growth + 10 hrs/mo, monthly strategy call, priority on-call.',
      ],
    },

    { type: 'subheading', text: 'How it works' },
    {
      type: 'numbered',
      items: [
        'Sign up — month-to-month, no annual contract, cancel anytime.',
        'We migrate your site to managed hosting (free, 1 business day).',
        'Edits via email or Slack. We confirm scope, ship, and report back same-week.',
        'Monthly report — uptime, page speed, edits shipped, anything we noticed proactively.',
      ],
    },

    {
      type: 'callout',
      title: 'Why Care matters',
      body:
        'Most agencies launch a site and disappear. Six months later, your site is slow and the contact form silently broke. Care plans exist so we\'re still on the hook for the work.',
    },

    ...CTA_BLOCK,
  ],
}

export const SERVICE_ADDONS: PdfDoc = {
  filename: 'bhc-service-addons.pdf',
  eyebrow: 'Service one-pager · 4 of 4',
  title: 'Quick-win add-ons',
  subtitle:
    'Fixed-price, productized fixes for specific pain. Shipped in 3–7 days. Buy one, see results in two weeks, decide if more makes sense.',
  sections: [
    { type: 'subheading', text: 'The catalog' },
    {
      type: 'bullets',
      items: [
        'Google Business Profile Setup — $295. Photos, services, hours, schema, review templates. 3-day delivery.',
        'Site Speed Sprint — $495. Image optimization, JS audit, render-blocking removal, CDN setup. Targets Lighthouse 85+ mobile. 5-day delivery.',
        'Schema Markup Pack — $295. LocalBusiness, Service, FAQPage, Article, BreadcrumbList. 3-day delivery.',
        'GA4 + Conversion Tracking — $395. GA4, GTM, Google Ads conversions, dataLayer events. 3-day delivery.',
        '5-Page SEO Refresh — $695. Targeted SEO updates to 5 priority pages. 7-day delivery.',
        'Mobile Audit + Fix — $495. Full mobile audit with on-the-spot fixes. 5-day delivery.',
      ],
    },

    {
      type: 'callout',
      title: 'Bundle and save',
      body:
        'Buy 3 add-ons together → 15% off the bundle. Buy 4+ → 25% off. Most clients start with GBP Setup + Schema Pack + GA4 Tracking — the "local SEO foundation" bundle, $885 instead of $985.',
    },

    // Tick suppressed here only — sits directly under the callout and the
    // double divider feels noisy. Other PDFs keep the tick on "How it works".
    { type: 'subheading', text: 'How it works', noTick: true },
    {
      type: 'numbered',
      items: [
        'Email hello@blackhartconsulting.com with the add-on(s) you want.',
        'We send a 1-page scope confirmation + invoice link within 4 business hours.',
        'You pay, we ship within the timeline above. You get a 1-page report showing what was done.',
      ],
    },

    ...CTA_BLOCK,
  ],
}

export const PDFS: Record<string, PdfDoc> = {
  'website-checklist': CHECKLIST,
  'service-website': SERVICE_WEBSITE,
  'service-seo': SERVICE_SEO,
  'service-care': SERVICE_CARE,
  'service-addons': SERVICE_ADDONS,
}
