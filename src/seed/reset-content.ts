/* eslint-disable @typescript-eslint/no-explicit-any */
/* Canonical content for the 2026-08 pricing reset. Single source of truth for
 * the nine-SKU catalog pages: consumed by BOTH src/seed/onInit.ts (fresh-DB
 * bootstrap) and scripts/pricing-reset/apply.mts (content migration). Every
 * price and term matches the facts table in PRICING_RESET_PROMPT.md exactly.
 * Copy rules: no em or en dashes, no emoji, no exclamation marks.
 */

export const PHONE_DISPLAY = '(866) 434-9777'
export const PHONE_TEL = 'tel:+18664349777'

// ── Minimal Lexical builders (match onInit's node shape) ────────────────────

export const rt = (text: string) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1,
    children: [
      { type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text, format: 0, version: 1 }] },
    ],
    direction: 'ltr',
  },
})

type RTBlock = ['p' | 'h2' | 'h3', string] | ['ul', string[]]

export const rtDoc = (blocks: RTBlock[]) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
    children: blocks.map(([kind, content]) => {
      if (kind === 'ul') {
        return {
          type: 'list', listType: 'bullet', start: 1, tag: 'ul', format: '', indent: 0, version: 1,
          children: (content as string[]).map((t) => ({
            type: 'listitem', value: 1, format: '', indent: 0, version: 1,
            children: [{ type: 'text', text: t, format: 0, version: 1 }],
          })),
        }
      }
      if (kind === 'h2' || kind === 'h3') {
        return { type: 'heading', tag: kind, format: '', indent: 0, version: 1, children: [{ type: 'text', text: content as string, format: 0, version: 1 }] }
      }
      return { type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text: content as string, format: 0, version: 1 }] }
    }),
  },
})

// ── Tier fragments (facts table, exact) ─────────────────────────────────────

const f = (labels: string[]) => labels.map((label) => ({ label, included: true }))
const ask = (slug: string, label = 'Start this project') => ({ label, href: `/contact?tier=${slug}` })

export const TIER_BLOCKS = {
  launchPage: {
    name: 'Launch Page', price: '$399', priceNote: '3-day build',
    features: f(['One conversion-focused page', 'Mobile-first, under 150KB JS', 'Contact form + GA4', 'First month of hosting free', '1 round of revisions']),
    cta: ask('launch-page'),
  },
  starterSite: {
    name: 'Starter Site', price: '$699', priceNote: '7-day build',
    subscribePrice: '$119/mo', subscribeNote: '12 months, then it is yours',
    badge: 'Most popular', highlighted: true,
    features: f(['Up to 5 pages', 'Block-based CMS you can edit', 'Technical SEO + LocalBusiness schema', 'Google Business Profile setup', 'First month of hosting free', '1 round of revisions', '7-day delivery, in writing']),
    cta: ask('starter-site'),
  },
  proSite: {
    name: 'Pro Site', price: '$1,795', priceNote: '14-day build',
    subscribePrice: '$249/mo', subscribeNote: '12 months, then it is yours',
    features: f(['Up to 12 pages', 'Full CMS + blog', 'Case study templates', 'Schema, GBP, technical SEO', '30 days of SEO content', '2 rounds of revisions']),
    cta: ask('pro-site'),
  },
  customBuild: {
    name: 'Custom Build', price: 'from $5,000', priceNote: 'scoped, fixed proposal in 48 hours',
    enterpriseBadge: true,
    features: f(['Written scope first', 'Unlimited pages, custom integrations', 'Multi-location, multi-language', 'Web app or marketing site', 'Weekly written check-ins']),
    cta: ask('custom-build', 'Request a proposal'),
  },
  host: {
    name: 'Host', price: '$59/mo',
    features: f(['Managed hosting, SSL, CDN', 'Nightly backups', 'Uptime monitoring', '30 minutes of edits a month', 'Email support']),
    cta: ask('host', 'Get started'),
  },
  care: {
    name: 'Care', price: '$129/mo', highlighted: true,
    features: f(['Everything in Host', '2 hours of edits a month', 'Monthly traffic and calls report', 'Same-week turnaround']),
    cta: ask('care', 'Get started'),
  },
  growth: {
    name: 'Growth', price: '$395/mo',
    features: f(['Everything in Care', '6 hours of development or SEO a month', 'Monthly plan by email', 'Slack or SMS channel']),
    cta: ask('growth', 'Get started'),
  },
  seoSprint: {
    name: 'Local SEO + AI Search Sprint', price: '$449', priceNote: '10-day delivery, one-time', highlighted: true,
    features: f(['Local SEO and AI-answer audit (PDF)', 'Google Business Profile complete setup', '10 citation submissions', 'LocalBusiness + Service + FAQ schema', 'FAQ page and llms.txt', '1 service or location page']),
    cta: ask('seo-sprint', 'Start the Sprint'),
  },
  seoMonthly: {
    name: 'Local SEO + AI Search Monthly', price: '$295/mo',
    features: f(['Weekly Google Business Profile post', '5 citations a month', '1 article a month', 'Monthly ranking and AI-mention report', 'Quarterly plan']),
    cta: ask('seo-monthly', 'Get started'),
  },
  frontDeskSetup: {
    name: 'AI Front Desk Setup', price: '$299', priceNote: 'live in 5 days, one-time',
    features: f(['Script and knowledge base written for your business', 'Voice and greeting you approve', 'Booking connected to your calendar', 'Missed-call text-back', 'Web chat with the same brain', 'Five test scenarios with you']),
    cta: ask('front-desk-setup', 'Start setup'),
  },
  frontDeskBasic: {
    name: 'Front Desk Basic', price: '$149/mo',
    footnote: 'Overage $0.35 per minute. Premium voice add-on $49 per month.',
    features: f(['300 minutes a month', '24/7 answering and booking', 'Text confirmations to callers', 'Call summaries to you', 'Monthly transcript review']),
    cta: ask('front-desk-basic', 'Get started'),
  },
  frontDeskPlus: {
    name: 'Front Desk Plus', price: '$249/mo', highlighted: true,
    footnote: 'Overage $0.35 per minute. Premium voice add-on $49 per month.',
    features: f(['750 minutes a month', 'Everything in Basic', 'Calendar and CRM sync', 'Two lines or locations']),
    cta: ask('front-desk-plus', 'Get started'),
  },
  frontDeskPro: {
    name: 'Front Desk Pro', price: '$399/mo',
    footnote: 'Overage $0.35 per minute. Premium voice add-on $49 per month.',
    features: f(['1,500 minutes a month', 'Everything in Plus', 'Multi-line', 'Call summaries to Slack or SMS', 'Priority changes']),
    cta: ask('front-desk-pro', 'Get started'),
  },
  automationSprint: {
    name: 'Automation Sprint', price: '$799', priceNote: '7-day delivery, one workflow', highlighted: true,
    features: f(['One-page spec you approve', 'Built and tested in days', '48 hours in shadow mode', 'Written handover']),
    cta: ask('automation-sprint', 'Start a Sprint'),
  },
  automationRun: {
    name: 'Automation Run', price: '$79/mo', priceNote: 'per client, all your workflows',
    features: f(['Hosting and monitoring', 'Credential refreshes', 'Small fixes included', 'Failure alerts to us first']),
    cta: ask('automation-run', 'Get started'),
  },
  internalTool: {
    name: 'Internal Tool', price: 'from $2,500', priceNote: '2 to 3 weeks', footnote: '+ $99 a month hosting',
    features: f(['Written scope and fixed price', 'Logins, roles, and your data imported', 'Dashboards and CSV import', 'Two training videos and a handbook', 'Hosting, backups, and 1 hour of changes a month for $99']),
    cta: ask('internal-tool', 'Request a scope'),
  },
  siteHealthSprint: {
    name: 'Site Health Sprint', price: '$249', priceNote: '5 days, pick 3 fixes',
    features: f(['Free audit first', '3 fixes from the menu', 'Tested on mobile and desktop', 'Before-and-after Lighthouse report', '30-day guarantee']),
    cta: ask('site-health-sprint', 'Start this fix'),
  },
  gbpSetup: {
    name: 'Google Business Profile Setup', price: '$195', priceNote: '3 days',
    features: f(['Profile audit and complete setup', 'NAP check across 30+ directories', 'Photos and categories', 'Review request template']),
    cta: ask('gbp-setup', 'Start this fix'),
  },
  schemaPack: {
    name: 'Schema Markup Pack', price: '$195', priceNote: '3 days',
    features: f(['LocalBusiness, Service, FAQPage, Article, BreadcrumbList', 'Validated', 'Re-index requested']),
    cta: ask('schema-pack', 'Start this fix'),
  },
  ga4Setup: {
    name: 'GA4 + Conversion Tracking', price: '$195', priceNote: '3 days',
    features: f(['GA4 property', 'GTM container and events', 'Google Ads conversion link', 'Proof of firing']),
    cta: ask('ga4-setup', 'Start this fix'),
  },
  speedSprint: {
    name: 'Site Speed Sprint', price: '$395', priceNote: '5 days',
    features: f(['Core Web Vitals audit', 'Image optimization (AVIF, WebP)', 'JS and CSS cleanup', 'Before-and-after report']),
    cta: ask('speed-sprint', 'Start this fix'),
  },
  mobileFix: {
    name: 'Mobile Audit + Fix', price: '$395', priceNote: '5 days',
    features: f(['Real iOS and Android testing', 'Touch targets, fonts, viewport', 'Mobile Core Web Vitals', 'Before-and-after mobile report']),
    cta: ask('mobile-fix', 'Start this fix'),
  },
  seoRefresh: {
    name: '5-Page SEO Refresh', price: '$395', priceNote: '7 days',
    features: f(['Titles and metas rewritten', 'Schema on each page', 'Internal links and content gaps', 'Before-and-after SEO score']),
    cta: ask('seo-refresh', 'Start this fix'),
  },
}

// ── Shared block fragments (copy pack) ──────────────────────────────────────

export const websitesPricingBlock = (opts?: { eyebrow?: string; headline?: string; description?: string }) => ({
  blockType: 'pricing',
  eyebrow: opts?.eyebrow ?? 'Websites',
  headline: opts?.headline ?? 'Three ways to get a site.',
  description: opts?.description ?? 'Buy it outright, or subscribe and own it in a year. Every tier includes hosting for the first month.',
  layoutVariant: 'grid',
  anchorId: 'websites',
  tiers: [TIER_BLOCKS.launchPage, TIER_BLOCKS.starterSite, TIER_BLOCKS.proSite, TIER_BLOCKS.customBuild],
})

// Copy pack A
export const outcomeCardsBlock = {
  blockType: 'outcomeCards',
  eyebrow: 'What we do',
  headline: 'Three outcomes. One studio.',
  cards: [
    {
      title: 'Get found',
      blurb: 'A fast website and the search structure that gets you mentioned when someone asks Google or ChatGPT.',
      priceLine: 'Sites from $399. Local SEO + AI Search from $295 a month.',
      href: '/services#websites', ctaLabel: 'See website pricing',
      demoHref: '/portfolio/prometheus-minds', demoLabel: 'See a live client site',
    },
    {
      title: 'Never miss a call',
      blurb: 'A front desk that answers every call, books the job, and texts the caller back.',
      priceLine: '$299 setup, then from $149 a month.',
      href: '/ai-front-desk', ctaLabel: 'See how it works',
      demoHref: PHONE_TEL, demoLabel: `Call it now: ${PHONE_DISPLAY}`,
    },
    {
      title: 'Stop doing it by hand',
      blurb: 'One process at a time, wired to run on its own. Quotes, follow-ups, reviews, reports.',
      priceLine: '$799 per workflow, $79 a month to run it.',
      href: '/automation', ctaLabel: 'See the workflows',
      demoHref: '/automation#demo', demoLabel: 'Watch a 60-second demo',
    },
  ],
}

// Copy pack B (verbatim)
export const whyPricesLowBlock = {
  blockType: 'richText',
  eyebrow: 'Straight answer',
  maxWidth: 'prose',
  variant: 'card',
  content: rtDoc([
    ['h2', 'Why our prices are low'],
    ['p', "Most studios charge $2,000 to $5,000 for a five-page site because a person types every line by hand. We build with AI coding tools and a senior developer reviews every line before it ships. Scope is fixed, so nothing is padded. There is no account manager, no junior handoff, no hourly clock. The result is a site that scores 90 or better on Google's mobile test, delivered in seven days, for $699. The savings are real and they are yours. The review is real too: nothing goes live until a human has clicked every link on a phone."],
  ]),
}

// Copy pack C
export const phoneDemoBlock = {
  blockType: 'phoneDemo',
  eyebrow: 'Hear it before you buy it',
  headline: 'Call our front desk.',
  body: 'This number is answered by the same AI Front Desk we set up for clients. It knows our services and prices, it can book a call, and it will text you a summary afterward.',
  phoneNumber: PHONE_DISPLAY,
  phoneLabel: 'Call now',
  bullets: [
    { label: 'Ask what a five-page site costs' },
    { label: 'Ask it to book a 30-minute call for tomorrow' },
    { label: 'Ask something it should not answer and hear it hand off' },
  ],
  cta: { label: 'Set this up for my business, $299', href: '/ai-front-desk#plans' },
}

// Copy pack D
export const bundlesBlock = {
  blockType: 'bundleOffer',
  eyebrow: 'Bundles',
  headline: 'Everything a new location needs.',
  backgroundImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80',
  bundles: [
    {
      name: 'Open for Business', price: '$999', monthly: '+ $149 a month',
      includes: [
        { label: 'Starter Site, live in 7 days' },
        { label: 'Google Business Profile set up' },
        { label: 'AI Front Desk setup and Basic plan (300 minutes)' },
        { label: 'Hosting included in the monthly' },
      ],
      note: 'Sold separately: $1,193 plus $208 a month.',
      cta: { label: 'Start the bundle', href: '/contact?tier=bundle-open-for-business' },
    },
    {
      name: 'Booked Solid', price: '$1,395', monthly: '+ $149 a month',
      includes: [
        { label: 'Everything in Open for Business' },
        { label: 'Local SEO + AI Search Sprint' },
        { label: 'One Automation Sprint: review requests or lead follow-up' },
      ],
      note: 'Sold separately: $2,441 plus $287 a month.',
      cta: { label: 'Start the bundle', href: '/contact?tier=bundle-booked-solid' },
      highlighted: true,
    },
  ],
}

// Copy pack E
export const guaranteesBlock = {
  blockType: 'guarantees',
  eyebrow: 'Three promises in writing',
  headline: 'If we miss, it costs us, not you.',
  items: [
    { title: 'See it before you pay', body: 'Ask for a free demo site and click through a working mockup before a dollar changes hands.' },
    { title: '90 or better on mobile', body: "Every site we launch scores 90 or better on Google's mobile Lighthouse test, or the fix is free." },
    { title: 'Late means free', body: 'If a launch runs past the promised day because of us, hosting is free until it is live.' },
  ],
}

// Copy pack G
export const automationWorkflowCards = {
  blockType: 'outcomeCards',
  eyebrow: 'Five workflows we build most',
  headline: 'Pick one. Seven days.',
  cards: [
    { title: 'Lead follow-up in 60 seconds', blurb: 'Every web form, missed call, and Google lead gets a text and an email within a minute, then two follow-ups if they go quiet.' },
    { title: 'Quote to invoice', blurb: 'A signed quote becomes an invoice in QuickBooks with the deposit link sent automatically.' },
    { title: 'Review requests after every job', blurb: 'When a job closes, the customer gets a text with your Google review link, and a reminder three days later.' },
    { title: 'Calendar and CRM sync', blurb: 'Bookings, contacts, and job status stay in step across your calendar, your CRM, and your spreadsheet.' },
    { title: 'Weekly numbers report', blurb: 'Every Monday: leads, booked jobs, revenue, reviews, and unanswered calls, in one email.' },
  ].map((c) => ({ ...c, priceLine: '$799 to build, $79 a month to run', href: '/contact?tier=automation-sprint', ctaLabel: 'Start this one' })),
}

// Blocks carried over from the existing site (kept, with the Sprint repriced)
export const auditBlock = {
  blockType: 'contactForm', // 'PageSpeed audit' eyebrow renders the SiteAuditTool
  eyebrow: 'PageSpeed audit',
  headline: 'How fast is your site, actually?',
  description: 'Paste your URL. We run the same Lighthouse audit Google uses, then show you all four scores in about 30 seconds. No email required. If something is broken, the $249 Site Health Sprint covers three specific fixes shipped in five days.',
  showCompanyField: false, showProjectTypeField: false, showBudgetField: false,
}

export const leadMagnetBlock = {
  blockType: 'leadMagnet',
  eyebrow: 'Free resource',
  headline: 'Take this checklist into any web-design conversation.',
  description: 'A 1-pager with the questions to ask, the contract gotchas to avoid, and the performance promises to demand in writing, even if you never hire us.',
  downloadHref: '/downloads/website-checklist',
  downloadLabel: 'Download the free checklist',
  fineprint: 'PDF · 2 pages · no email required',
}

export const calendlyBlock = (headline: string, eyebrow = 'Book a call') => ({
  blockType: 'calendlyBooking',
  eyebrow,
  headline,
  description: 'Pick any open time. We walk through what you need, ballpark a price, and figure out whether we are a fit. No hard sell.',
  calendlyUrl: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call',
  displayMode: 'popup',
  popupButtonLabel: 'Book a 30-min call',
})

export const demoCtaBlock = {
  blockType: 'cta',
  headline: 'Still here? Get a free demo site.',
  description: 'Send your business name and Google listing. A mockup of your new site is in your inbox within 48 hours. No call, no obligation.',
  variant: 'emphasized',
  backgroundImageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1920&q=80',
  primaryCta: { label: 'See your site first', href: '/free-demo-site' },
  secondaryCta: { label: 'Book a 30-min call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call' },
}

// ── FAQ sets (copy pack F) ──────────────────────────────────────────────────

const faqItems = (qas: Array<[string, string]>) => qas.map(([question, answer]) => ({ question, answer }))

export const FAQ_HOME = faqItems([
  ['What is the free demo site and what does it cost?', 'Nothing. Send your business name and your Google listing, and within 48 hours you get a link to a working mockup built from your real services, hours, and reviews. If you like it, $399 to $699 puts it live this week. If not, you owe nothing and it disappears within 30 days.'],
  ['What is in the free audit?', 'Paste your URL and we run the same Lighthouse audit Google uses: performance, accessibility, best practices, and SEO scores, plus Core Web Vitals. It takes about 30 seconds and does not ask for your email. You can also have a prioritized fix list emailed to you.'],
  ['What is the difference between Launch Page, Starter, and Pro?', 'Launch Page is one conversion-focused page for $399, live in 3 days. Starter Site is up to 5 pages on a CMS you can edit for $699, live in 7 days. Pro Site is up to 12 pages with a full blog, case study templates, and 30 days of SEO content for $1,795, live in 14 days.'],
  ['How does subscribing work, and do I own the site?', 'Subscribe for $119 a month (Starter) or $249 a month (Pro) on a 12-month term with a card on file. At month 12 the site is yours, and hosting continues at $59 a month. Buying outright means you own the code at launch.'],
  ['What happens after launch?', 'Every site sits on a plan. Host is $59 a month for managed hosting, backups, monitoring, and 30 minutes of edits. Care is $129 a month with 2 hours of edits and a monthly report, and Growth is $395 a month with 6 hours of development or SEO.'],
  ['What is the AI Front Desk and does it sound like a robot?', `It is a phone receptionist that answers every call, quotes only what you approved, books into your calendar, and texts the caller a confirmation. The voices are the same natural voices large call centers use; most callers do not ask. Call ${PHONE_DISPLAY} and judge for yourself.`],
  ['What does an Automation Sprint include?', 'One workflow, specced on a single page you approve, built and tested in 7 days, for $799. It runs in shadow mode for 48 hours before it goes live. Keeping it running, monitored, and fixed is $79 a month.'],
  ['How do I pay?', 'Pay in full through the Buy button (Stripe), or subscribe on the two site tiers. A 50 percent deposit with the balance at launch is available on request for Pro Site, Custom Build, and Internal Tool, handled by Stripe invoice.'],
  ['Do I own the code?', 'Yes. Buy outright and you own it at launch. On the subscribe path you own it at month 12, and the repo transfers to you either way.'],
  ['Where are you based and do you take remote clients?', 'Houston Heights, TX. Most work happens over email and short calls, so remote clients are welcome. Being local just makes in-person kickoffs easy when you want one.'],
  ['What if I do not like the design?', 'You see a mockup before we write code, and we iterate until it is right. The free demo site is exactly this promise: click through the design before a dollar changes hands. Revision rounds are written into every tier.'],
  ['What are the three guarantees?', "See it before you pay: a free demo site before a dollar changes hands. 90 or better on Google's mobile Lighthouse test, or the fix is free. And if a launch runs past the promised day because of us, hosting is free until it is live."],
])

export const FAQ_FIXIT = faqItems([
  ['Which sites can you work on?', 'Sites we can get into: your repo, your host, or WordPress. We do not work on Wix or Squarespace because they do not allow the access these fixes need. If we cannot get access, we tell you in the first reply and suggest a Launch Page instead.'],
  ['How fast?', 'Three to seven days depending on the fix; each menu item lists its timeline. The clock starts when we have access. Most single fixes ship in under a week.'],
  ['What is in the before-and-after report?', 'Screenshots and scores from before the work and after it: Lighthouse numbers, Core Web Vitals, and exactly what changed. You can hand it to anyone and show what you paid for.'],
  ['What is the 30-day guarantee?', 'If the thing we fixed breaks again within 30 days, we fix it again for free. No forms, just reply to the delivery email.'],
  ['Can I buy more than one fix?', 'Yes, fixes combine. Three fixes together is the $249 Site Health Sprint, which is cheaper than buying them separately.'],
])

export const FAQ_FRONT_DESK = faqItems([
  ['Does it sound like a robot?', `The voices are the same natural voices used by large call centers, and most callers do not notice. You pick the voice and greeting during setup and approve them before it goes live. Call ${PHONE_DISPLAY} and hear it yourself.`],
  ['What happens when it cannot answer?', 'It says so, takes a message, and texts you the question immediately. It never guesses at prices or promises you did not approve. Emergencies transfer straight to your phone.'],
  ['Do I need a new phone number?', 'No. You keep your number and forward it: always, after hours, or only when you do not pick up. Nothing to port, nothing to install.'],
  ['Can it text?', 'Yes. Callers get a text confirmation when they book, and missed calls get a text back within 60 seconds. Summaries of every call come to you by text or email.'],
  ['Can it book into my calendar?', 'It books directly into Google Calendar, Cal.com, Jobber, or Housecall Pro. If you use something else, it texts you the request instead so nothing is lost.'],
  ['What counts as a minute and what happens if I go over?', 'Talk time on answered calls counts; ring time does not. Overage is $0.35 per minute, billed monthly. Plans include 300, 750, or 1,500 minutes.'],
  ['Can I cancel?', 'Yes, month to month after the first 30 days. The $299 setup is one-time and the script and knowledge base are yours regardless.'],
  ['What is the premium voice add-on?', 'A $49 per month upgrade to the most natural voice tier available. The standard voices are good; premium is for businesses where the phone is the brand.'],
  ['Do you record calls?', 'Yes, for quality, and so you can read a transcript of every call. You can turn recording off any time.'],
])

export const FAQ_AUTOMATION = faqItems([
  ['What can you automate?', 'Anything that follows rules you can write down: lead follow-up, quote to invoice, review requests, calendar and CRM sync, weekly reports. If you do it by hand every week and it does not need judgment, it is a candidate.'],
  ['Which tools do you connect?', 'Gmail, Outlook, QuickBooks, Jobber, Housecall Pro, HubSpot, Google Sheets, Stripe, Calendly, and most tools with an API. If your tool has an export or an inbox, we can usually work with it.'],
  ['What does $79 a month cover?', 'Hosting, around-the-clock monitoring, credential refreshes when a connected tool logs you out, and small fixes. It covers all your workflows, not each one. Failure alerts come to us first, and we usually fix things before you notice.'],
  ['What if I want to change the workflow?', 'Small fixes and tweaks are included in the monthly. If the spec itself changes, that is a new Sprint: a new one-page spec, a fixed price, seven days.'],
  ['Who owns it?', 'You do. The spec, the credentials, and the workflow are yours, and if you leave we hand everything over with a written runbook.'],
  ['What is an Internal Tool and how is it priced?', 'A small web app for your team: logins, roles, dashboards, your data imported. Written scope first, fixed price from $2,500, delivered in 2 to 3 weeks. Hosting, backups, and an hour of changes a month run $99.'],
])

export const FAQ_DEMO = faqItems([
  ['Is it really free?', 'Yes. No card, no call, no obligation. We build it because showing beats pitching, and enough people say yes to make it worth doing.'],
  ['What do you build it from?', 'Your public listing: services, hours, photos, reviews, and anything your current site already says. You do not fill in a questionnaire. If we need one detail, we ask by email.'],
  ['How long does it take?', 'Your link arrives within 48 hours, usually sooner. It is a working mockup you can click through on your phone.'],
  ['What if I want changes?', 'One revision round is included when you buy. Bigger changes are quoted before we start, in writing.'],
  ['What happens to the demo if I say no?', 'Nothing happens and nobody follows up more than once. The demo is deleted within 30 days.'],
])

const manualFaq = (items: Array<{ question: string; answer: string }>, headline = 'Everything you wanted to ask.') => ({
  blockType: 'faq', eyebrow: 'Common questions', headline, mode: 'manual', items,
})

// ── Page layouts ────────────────────────────────────────────────────────────

export const homePage = () => ({
  title: 'Home',
  slug: 'home',
  _status: 'published',
  seo: {
    metaTitle: 'Websites, AI Front Desk, and Automations for Service Businesses | Black Hart Consulting',
    metaDescription: 'Websites from $399, a front desk that answers every call, and automations for service businesses. Built in days at fixed prices in Houston.',
    noIndex: false,
  },
  layout: [
    {
      blockType: 'hero',
      eyebrow: 'Houston · One-person studio',
      headline: 'Websites, AI phone answering, and automations for service businesses.',
      subheadline: 'Built in days at fixed prices. See your new site before you pay a dollar, or call our front desk right now and hear it book an appointment.',
      align: 'left',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1609445333560-e03ba271b2ce?w=1920&q=80',
      overlayStrength: 'heavy',
      ctas: [
        { label: 'See your site first', href: '/free-demo-site', variant: 'primary' },
        { label: `Call the front desk ${PHONE_DISPLAY}`, href: PHONE_TEL, variant: 'secondary' },
        { label: 'Get my free audit', href: '#audit', variant: 'ghost' },
      ],
    },
    {
      blockType: 'stats',
      eyebrow: 'How we work',
      headline: 'Three things we promise.',
      items: [
        { value: '7 days', label: 'Site live, every time', description: 'Fixed scope, fixed price, fixed launch date.' },
        { value: '90+', label: 'Mobile Lighthouse score', description: 'Or the fix is free.' },
        { value: 'Same-week', label: 'Edits after launch', description: 'Done within five business days, most within one.' },
      ],
    },
    auditBlock,
    outcomeCardsBlock,
    whyPricesLowBlock,
    websitesPricingBlock(),
    bundlesBlock,
    phoneDemoBlock,
    {
      blockType: 'featuredProjects',
      eyebrow: 'Recent work',
      headline: "A few projects we're proud of.",
      mode: 'latest',
      limit: 3,
      viewAllLabel: 'View all projects',
      viewAllHref: '/portfolio',
    },
    { blockType: 'testimonials', eyebrow: 'What clients said', headline: 'Real work, real businesses.', mode: 'latest', limit: 3 },
    guaranteesBlock,
    leadMagnetBlock,
    manualFaq(FAQ_HOME),
    calendlyBlock('Rather talk it through? Book 30 minutes.'),
    demoCtaBlock,
  ],
})

export const servicesPage = () => ({
  title: 'Services',
  slug: 'services',
  _status: 'published',
  seo: {
    metaTitle: 'Services and Pricing | Black Hart Consulting',
    metaDescription: 'Real prices, real timelines, real deliverables. Websites, AI Front Desk, automation, local SEO, and a fix-it menu, from a Houston studio.',
    noIndex: false,
  },
  layout: [
    {
      blockType: 'hero',
      eyebrow: 'Services + pricing',
      headline: 'Everything we do, with real numbers.',
      subheadline: 'No "contact us for pricing." Real prices, real timelines, real deliverables. Buy outright or subscribe and own it in a year.',
      align: 'left',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1920&q=80',
      overlayStrength: 'heavy',
      ctas: [
        { label: 'See your site first', href: '/free-demo-site', variant: 'primary' },
        { label: 'Ask a question', href: '/contact', variant: 'ghost' },
      ],
    },
    {
      ...outcomeCardsBlock,
      cards: outcomeCardsBlock.cards.map((c, i) => (i === 0 ? { ...c, href: '#websites' } : c)),
    },
    websitesPricingBlock({ eyebrow: 'Get found', headline: 'Websites.', description: 'Five-day to fourteen-day builds on a CMS you can edit. Buy or subscribe.' }),
    {
      blockType: 'pricing',
      eyebrow: 'Keep it running',
      headline: 'Hosting and care.',
      description: 'Every site sits on a plan. Host is the default; Care and Growth add hours.',
      layoutVariant: 'grid',
      anchorId: 'hosting',
      tiers: [TIER_BLOCKS.host, TIER_BLOCKS.care, TIER_BLOCKS.growth],
    },
    {
      blockType: 'pricing',
      eyebrow: 'Get found in search and in AI answers',
      headline: 'Local SEO + AI Search.',
      description: 'Google Business Profile, schema, citations, FAQ pages, and the structure that gets a business mentioned when someone asks Google or ChatGPT.',
      layoutVariant: 'grid',
      anchorId: 'seo',
      tiers: [TIER_BLOCKS.seoSprint, TIER_BLOCKS.seoMonthly],
    },
    {
      blockType: 'pricing',
      eyebrow: 'Never miss a call',
      headline: 'AI Front Desk.',
      description: `Answers every call, books the job, texts the caller back, and sends you the summary. Call ${PHONE_DISPLAY} to hear it.`,
      layoutVariant: 'grid',
      anchorId: 'front-desk',
      tiers: [TIER_BLOCKS.frontDeskSetup, TIER_BLOCKS.frontDeskBasic, TIER_BLOCKS.frontDeskPlus, TIER_BLOCKS.frontDeskPro],
    },
    {
      blockType: 'pricing',
      eyebrow: 'Stop doing it by hand',
      headline: 'Automation and internal tools.',
      description: 'One process at a time, fixed price, seven days.',
      layoutVariant: 'grid',
      anchorId: 'automation',
      tiers: [TIER_BLOCKS.automationSprint, TIER_BLOCKS.automationRun, TIER_BLOCKS.internalTool],
    },
    bundlesBlock,
    guaranteesBlock,
    {
      blockType: 'cta',
      headline: 'Need one specific fix?',
      description: 'Speed, mobile, schema, tracking, a Google Business Profile. Fixed prices, three to seven days.',
      variant: 'default',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1605152276897-4f618f831968?w=1920&q=80',
      primaryCta: { label: 'See the fix-it menu', href: '/fix-it' },
    },
    calendlyBlock('Want to scope a project?', 'Book a 30-min discovery call'),
    {
      blockType: 'cta',
      headline: 'Or send us a note instead.',
      description: 'Write what you need and you will have a reply within one business day, usually within an hour.',
      variant: 'emphasized',
      primaryCta: { label: 'Start a conversation', href: '/contact' },
    },
  ],
})

export const fixItPage = () => ({
  title: 'Fix-it menu',
  slug: 'fix-it',
  _status: 'published',
  seo: {
    metaTitle: 'Fix-it Menu: One Problem, One Price | Black Hart Consulting',
    metaDescription: 'Speed, mobile, schema, tracking, and Google Business Profile fixes at fixed prices, delivered in three to seven days.',
    noIndex: false,
  },
  layout: [
    {
      blockType: 'hero',
      eyebrow: 'Fix-it menu',
      headline: 'One problem, one price, done this week.',
      subheadline: 'For sites we can get into (your repo, your host, or WordPress). If we cannot get access, we will tell you in the first reply and suggest a Launch Page instead.',
      align: 'left',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1920&q=80',
      overlayStrength: 'heavy',
      ctas: [
        { label: 'Get my free audit first', href: '/#audit', variant: 'primary' },
        { label: 'Ask which fix I need', href: '/contact?tier=fix-it', variant: 'ghost' },
      ],
    },
    {
      blockType: 'pricing',
      eyebrow: 'The menu',
      headline: 'Seven fixes, fixed prices.',
      description: 'Every fix ships with a before-and-after report and a 30-day guarantee.',
      layoutVariant: 'grid',
      anchorId: 'fixes',
      tiers: [
        TIER_BLOCKS.siteHealthSprint, TIER_BLOCKS.gbpSetup, TIER_BLOCKS.schemaPack, TIER_BLOCKS.ga4Setup,
        TIER_BLOCKS.speedSprint, TIER_BLOCKS.mobileFix, TIER_BLOCKS.seoRefresh,
      ],
    },
    guaranteesBlock,
    manualFaq(FAQ_FIXIT, 'Fix-it, answered.'),
    {
      blockType: 'cta',
      headline: 'Not sure which fix you need?',
      description: 'Tell us what is wrong in a sentence and we will point at the right one, no call needed.',
      variant: 'emphasized',
      primaryCta: { label: 'Ask about a fix', href: '/contact?tier=fix-it' },
    },
  ],
})

export const aiFrontDeskPage = () => ({
  title: 'AI Front Desk',
  slug: 'ai-front-desk',
  _status: 'published',
  seo: {
    metaTitle: 'AI Front Desk: 24/7 Phone Answering for Service Businesses | Black Hart Consulting',
    metaDescription: 'A receptionist that answers on the first ring, books into your calendar, and texts callers back. $299 setup, live in five days.',
    noIndex: false,
  },
  layout: [
    {
      blockType: 'hero',
      eyebrow: 'AI Front Desk',
      headline: 'Every call answered. Every job booked.',
      subheadline: 'A receptionist that picks up on the first ring, 24 hours a day, quotes only what you told it to quote, books into your calendar, texts the caller a confirmation, and sends you the summary. Forward your number and it is live in five days.',
      align: 'left',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1520923642038-b4259acecbd7?w=1920&q=80',
      overlayStrength: 'heavy',
      ctas: [
        { label: `Call the demo ${PHONE_DISPLAY}`, href: PHONE_TEL, variant: 'primary' },
        { label: 'Start setup, $299', href: '/contact?tier=front-desk-setup', variant: 'secondary' },
      ],
    },
    phoneDemoBlock,
    {
      blockType: 'processSteps',
      eyebrow: 'How it works',
      headline: 'Forward your number. That is the hard part.',
      steps: [
        { title: 'Tell us about the business', description: 'A 15-minute form: services and prices you want quoted, hours, service area, how you book, what always goes to a human.' },
        { title: 'We write and train it', description: 'A script, a knowledge base, and guardrails. We test it with five real scenarios and an angry caller before you hear it.' },
        { title: 'Forward your number', description: 'Always, after hours, or on no-answer. Nothing to port, nothing to install.' },
        { title: 'It answers, books, and reports', description: 'Bookings land in your calendar, callers get a text, you get a summary of every call.' },
      ],
    },
    {
      blockType: 'richText',
      eyebrow: 'What it does',
      maxWidth: 'prose',
      content: rtDoc([
        ['h2', 'What it does'],
        ['ul', [
          'Answers and qualifies every call, 24 hours a day',
          'Books appointments straight into your calendar',
          'Takes messages and texts you the ones that matter',
          'Transfers emergencies to you immediately',
          'Texts back missed calls within 60 seconds',
          'Runs the same brain as a chat widget on your site',
          'Asks for a review after the job, when you want it to',
        ]],
      ]),
    },
    {
      blockType: 'pricing',
      eyebrow: 'Plans',
      headline: 'Setup once, then pick a plan.',
      description: 'Month to month after the first 30 days. Annual prepay gets two months free.',
      layoutVariant: 'grid',
      anchorId: 'plans',
      tiers: [
        { ...TIER_BLOCKS.frontDeskSetup, footnote: 'Overage $0.35 per minute. Premium voice add-on $49 per month.' },
        TIER_BLOCKS.frontDeskBasic, TIER_BLOCKS.frontDeskPlus, TIER_BLOCKS.frontDeskPro,
      ],
    },
    manualFaq(FAQ_FRONT_DESK, 'The front desk, answered.'),
    guaranteesBlock,
    {
      blockType: 'cta',
      headline: 'Stop losing the calls you paid to get.',
      description: 'Setup is $299 and it is live in five days. Call the demo first if you want proof.',
      variant: 'emphasized',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1523966211575-eb4a01e7dd51?w=1920&q=80',
      primaryCta: { label: 'Start setup, $299', href: '/contact?tier=front-desk-setup' },
      secondaryCta: { label: `Call the demo ${PHONE_DISPLAY}`, href: PHONE_TEL },
    },
  ],
})

export const automationPage = () => ({
  title: 'Automation and internal tools',
  slug: 'automation',
  _status: 'published',
  seo: {
    metaTitle: 'Business Automation and Internal Tools, Fixed Price | Black Hart Consulting',
    metaDescription: 'Pick the thing you do by hand every week. We wire it to run on its own for $799, then keep it running for $79 a month.',
    noIndex: false,
  },
  layout: [
    {
      blockType: 'hero',
      eyebrow: 'Automation and internal tools',
      headline: 'One process, fixed price, seven days.',
      subheadline: 'Pick the thing you do by hand every week. We wire it so it happens on its own, show you it working, and keep it running for $79 a month.',
      align: 'left',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1560264280-88b68371db39?w=1920&q=80',
      overlayStrength: 'heavy',
      ctas: [
        { label: 'Start a Sprint, $799', href: '/contact?tier=automation-sprint', variant: 'primary' },
        { label: 'See the workflows', href: '#workflows', variant: 'ghost' },
      ],
    },
    automationWorkflowCards,
    {
      blockType: 'processSteps',
      eyebrow: 'How it works',
      headline: 'Spec, build, shadow, run.',
      steps: [
        { title: 'Describe it', description: 'A 10-minute form: what happens today, which tools, what should happen instead.' },
        { title: 'Approve the spec', description: 'A one-page spec with the exact messages and rules. That spec is the fixed scope.' },
        { title: 'We build and test', description: 'Built in days, run in shadow mode for 48 hours, then switched on.' },
        { title: 'It runs', description: 'Monitored around the clock. If it fails, we fix it before you notice.' },
      ],
    },
    {
      blockType: 'richText',
      eyebrow: 'Sixty-second demo',
      anchorId: 'demo',
      maxWidth: 'prose',
      variant: 'card',
      content: rtDoc([
        ['h2', 'Watch a workflow run'],
        ['p', 'A 60-second screen recording of the lead follow-up workflow is coming here: a form submission turning into a text, an email, and a CRM entry in under a minute. Until it is up, call us and we will walk you through one live.'],
      ]),
    },
    {
      blockType: 'pricing',
      eyebrow: 'Plans',
      headline: 'Build once, run monthly.',
      description: 'One workflow per Sprint. The monthly covers every workflow you run with us.',
      layoutVariant: 'grid',
      anchorId: 'plans',
      tiers: [TIER_BLOCKS.automationSprint, TIER_BLOCKS.automationRun, TIER_BLOCKS.internalTool],
    },
    manualFaq(FAQ_AUTOMATION, 'Automation, answered.'),
    {
      blockType: 'cta',
      headline: 'Pick your first workflow.',
      description: 'Describe the thing you do by hand and you will have a one-page spec and a fixed price within one business day.',
      variant: 'emphasized',
      primaryCta: { label: 'Start a Sprint, $799', href: '/contact?tier=automation-sprint' },
    },
  ],
})

export const freeDemoSitePage = () => ({
  title: 'Free demo site',
  slug: 'free-demo-site',
  _status: 'published',
  seo: {
    metaTitle: 'Free Demo Site for Your Business | Black Hart Consulting',
    metaDescription: 'Send your business name and Google listing. Within 48 hours you get a working mockup of your new site. Free, no call, no obligation.',
    noIndex: false,
  },
  layout: [
    {
      blockType: 'hero',
      eyebrow: 'Free demo site',
      headline: 'See your new site before you pay a dollar.',
      subheadline: 'Send your business name and your Google listing. Within 48 hours you get a link to a working mockup built from your real services, hours, and reviews. If you like it, $399 to $699 puts it live this week. If you do not, you owe nothing and it disappears.',
      align: 'left',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1920&q=80',
      overlayStrength: 'heavy',
      ctas: [
        { label: 'Request my demo', href: '#demo-request', variant: 'primary' },
      ],
    },
    {
      blockType: 'demoRequestForm',
      eyebrow: 'Two minutes, tops',
      headline: 'Get your free demo site.',
      description: 'Fill in the basics. The mockup is built from your public listing, so there is no questionnaire.',
      submitLabel: 'Send me my demo',
      fineprint: 'No call. No obligation. Reply within one business day.',
      successMessage: 'Request received. Your demo link lands in your inbox within 48 hours.',
    },
    {
      blockType: 'processSteps',
      eyebrow: 'How it works',
      headline: 'Four steps, no meetings.',
      steps: [
        { title: 'You send the basics', description: 'Business name and your Google listing or current site. That is all we need.' },
        { title: 'We build a mockup from your public listing', description: 'Real services, real hours, real reviews. Not a template with your logo pasted on.' },
        { title: 'You click through it on your phone', description: 'A private link, password protected, yours to share with whoever weighs in.' },
        { title: 'Yes means live in seven days. No means nothing happens.', description: 'Say yes and $399 to $699 puts it live this week. Say no and the demo is deleted within 30 days.' },
      ],
    },
    guaranteesBlock,
    manualFaq(FAQ_DEMO, 'The demo, answered.'),
  ],
})

export const thanksPage = () => ({
  title: 'Thank you',
  slug: 'thanks',
  _status: 'published',
  seo: {
    metaTitle: 'Thank You | Black Hart Consulting',
    metaDescription: 'Order received. Here is what happens next.',
    noIndex: true,
  },
  layout: [
    {
      blockType: 'hero',
      eyebrow: 'Order received',
      headline: 'Thank you. Here is what happens next.',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1920&q=80',
      overlayStrength: 'heavy',
      subheadline: `You will get an email within one business day with the intake form for your project. Fill it in whenever you are ready and the clock starts the moment we have it. Questions in the meantime: reply to that email or text ${PHONE_DISPLAY}.`,
      align: 'center',
      ctas: [
        { label: 'Back to the site', href: '/', variant: 'ghost' },
      ],
    },
  ],
})

// About page: the 'How we build' richText inserted after the three principles
export const howWeBuildBlock = {
  blockType: 'richText',
  eyebrow: 'How we build',
  maxWidth: 'prose',
  variant: 'card',
  content: rtDoc([
    ['h2', 'How we build'],
    ['p', 'We use AI coding tools, including Claude Code, to write most of the code, and a senior developer reviews every line before anything goes live. That is not a shortcut; it is the reason a five-page site costs $699 here and $2,000 elsewhere. The parts that need judgment stay with a person: what the site should say, how it should feel, whether the phone demo handles an angry caller, whether a workflow does the right thing with a messy invoice. The parts that are repetitive go to the machine, and the machine does not get tired at 2 a.m. or miss a deadline. You get the speed of the tool and the accountability of one person whose name is on the work.'],
  ]),
}

// ── FAQ collection rewrites (matched by existing question text) ─────────────

export const FAQ_COLLECTION_REWRITES: Array<{ match: string; question: string; answer: string; category?: string }> = [
  {
    match: 'What does “founding-client pricing” mean?',
    question: 'How do I pay?',
    answer: 'Pay in full through the Buy button (Stripe), or subscribe: $119 a month for a Starter Site or $249 a month for a Pro Site on a 12-month term, and the site is yours at month 12. A 50 percent deposit with the balance at launch is available by invoice on request for Pro Site, Custom Build, and Internal Tool.',
    category: 'pricing',
  },
  {
    match: 'What’s the difference between Starter and Pro?',
    question: 'What is the difference between Launch Page, Starter, and Pro?',
    answer: 'Launch Page is one conversion-focused page for $399 in 3 days. Starter Site is up to 5 pages on a CMS you can edit for $699 in 7 days. Pro Site is up to 12 pages with a full blog, case study templates, and 30 days of SEO content for $1,795 in 14 days.',
    category: 'pricing',
  },
  {
    match: "What's included in the Starter Site at $999?",
    question: "What's included in the Starter Site at $699?",
    answer: 'Up to 5 pages on a block-based CMS you can edit, technical SEO with LocalBusiness schema, Google Business Profile setup, the first month of hosting free, and one round of revisions. Delivered in 7 days, in writing.',
    category: 'pricing',
  },
  {
    match: 'What does the $297 Site Health Sprint cover?',
    question: 'What does the $249 Site Health Sprint cover?',
    answer: 'Three fixes of your choice from the fix-it menu, shipped in five days, tested on mobile and desktop, with a before-and-after Lighthouse report and a 30-day guarantee. It starts with the free audit so the three fixes are the right three.',
    category: 'pricing',
  },
  {
    match: 'What does ongoing care cost?',
    question: 'What does ongoing care cost?',
    answer: 'Host is $59 a month: managed hosting, SSL, backups, monitoring, and 30 minutes of edits. Care is $129 a month and adds 2 hours of edits with a monthly traffic and calls report. Growth is $395 a month with 6 hours of development or SEO.',
    category: 'care',
  },
  {
    match: 'Do you take payment plans?',
    question: 'Do you take payment plans?',
    answer: 'Yes. Starter Site is $119 a month and Pro Site is $249 a month on a 12-month subscription, then the site is yours and hosting continues at $59 a month. Larger builds can split into a 50 percent deposit and the balance at launch, by invoice.',
    category: 'pricing',
  },
  {
    match: 'What if I need more than 12 pages or something custom?',
    question: 'What if I need more than 12 pages or something custom?',
    answer: 'That is a Custom Build: written scope first, a fixed proposal within 48 hours, from $5,000. Unlimited pages, custom integrations, multi-location and multi-language, with weekly written check-ins.',
    category: 'pricing',
  },
  {
    match: 'Do you work with enterprise / mid-market clients?',
    question: 'Do you work with enterprise / mid-market clients?',
    answer: 'Yes, through the Custom Build track: a written scope, a fixed price from $5,000, and weekly written check-ins. Internal tools for teams start at $2,500 with $99 a month hosting.',
    category: 'pricing',
  },
  {
    match: 'What exactly is in the free site audit?',
    question: 'What exactly is in the free site audit?',
    answer: 'Paste your URL and we run the same Lighthouse audit Google uses: performance, accessibility, best practices, and SEO scores, plus Core Web Vitals, in about 30 seconds with no email required. It shows exactly what is costing you calls or bookings. If you want the fixes done, the $249 Site Health Sprint covers three of them in five days.',
    category: 'process',
  },
  {
    match: 'How do I get started?',
    question: 'How do I get started?',
    answer: 'The easiest way is the free demo site: send your business name and Google listing and click through a working mockup within 48 hours. Or use the Buy button on any package, or write to us and you will have a reply within one business day.',
    category: 'care',
  },
]

// ── Heights / Local SEO page patches ────────────────────────────────────────

export const HEIGHTS_FRONT_DESK_SENTENCE = ' And if the phone is your bottleneck, our AI Front Desk answers and books jobs for you around the clock.'
export const LOCAL_SEO_FRONT_DESK_SENTENCE = ' When those searches turn into calls, our AI Front Desk can answer and book every one of them.'

export const HEIGHTS_FAQ_REWRITES: Record<string, string> = {
  'How much does a small business website cost? ':
    'A 5-page Starter Site is $699 flat, live in 7 days, or $119 a month on a 12-month subscription that ends with you owning it. A one-page Launch Page is $399. No hourly billing and no scope-creep surprises.',
  'How long does it take? ':
    'Seven days from kickoff to launch for a Starter Site, in writing. You approve the design direction before any code is written, so the clock only starts once you are happy with the direction.',
}

export const LOCAL_SEO_FAQ_REWRITES: Record<string, string> = {
  'Is local SEO a monthly service? ':
    'Monthly is $295 and covers weekly Google Business Profile posts, citations, an article a month, and a ranking and AI-mention report. If you only need the foundation laid, the one-time $449 Sprint covers the audit, profile setup, citations, and schema.',
}
