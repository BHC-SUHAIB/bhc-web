/**
 * One-shot content migration: convert the existing `express-website` landing
 * page record to the editable block set that powers the Express LP.
 *
 * The Express LP used to be composed entirely in code (ExpressLanding.tsx). It
 * is now assembled from real, editable Payload blocks so Suhaib can edit every
 * section in the admin. This endpoint rewrites the record's `layout` to that
 * block set (with the current, correct copy + $999 pricing). The route falls
 * back to the code-composed page until a `heroPhoto` block is present, so this
 * is what "flips" the LP over to the CMS-driven version.
 *
 *   curl -X POST http://localhost:3000/dev-convert-express-lp        (local)
 *   curl -X POST https://dev.blackhartconsulting.com/dev-convert-express-lp
 *
 * Idempotent: re-running just rewrites the same layout. Returns 403 in
 * production unless ALLOW_DEV_SEED=one-time-yes is set on the container.
 * Run ONCE per environment after the code deploys (it overwrites the record's
 * blocks, so don't re-run after Suhaib starts editing in the admin).
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

export const dynamic = 'force-dynamic'

const SLUG = 'express-website'

// The editable block layout for the Express LP. Mirrors the sections of the
// approved mockup, now CMS-driven with current copy ($999 discounted pricing).
const EXPRESS_LAYOUT = [
  {
    blockType: 'heroPhoto',
    eyebrow: 'Houston Heights · 14-Day Delivery',
    headline: 'A custom small business website. In 14 days. From $999.',
    subheadline:
      'Built by hand, hosted by us, kept fast forever. Discounted pricing for the first 5 Heights small businesses — a lower price in exchange for a review and a case study.',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80',
    ctas: [
      { label: 'Run my free site audit', href: '#audit', style: 'brass' },
      { label: 'See the deliverables', href: '#offer', style: 'onphoto' },
    ],
    trustItems: [
      { icon: 'shield', label: 'Fixed price, in writing' },
      { icon: 'check', label: 'You own the code' },
      { icon: 'zap', label: 'Under 1-second loads' },
    ],
  },
  {
    blockType: 'guaranteeStrip',
    items: [
      { value: '14 days', label: 'Kickoff to launch, guaranteed' },
      { value: '$999', label: 'Discounted price · was $1,950' },
      { value: '<200KB', label: 'First-paint JavaScript' },
      { value: '1 dev', label: 'One person, one bill, no agency layers' },
    ],
  },
  {
    blockType: 'siteAuditTool',
    eyebrow: 'Free · no email required',
    headline: "See exactly what's holding your current site back.",
    description:
      'Paste your URL. We run the same Google Lighthouse audit we use on every project and show you the four scores that matter — in about 30 seconds.',
  },
  {
    blockType: 'foundingClient',
    eyebrow: 'Heights Discounted Pricing',
    headline: 'First 5 small businesses save up to $1,000.',
    description:
      'A temporary discount for our first cohort of Heights clients, in exchange for a review and a case study.',
    spotsTotal: 5,
    spotsRemaining: 5,
    offers: [{ name: 'Starter Site', priceFounding: '$999', priceRetail: '$1,950', savings: 'Save $951' }],
    cta: { label: 'Claim your discount', href: '#lp-start' },
  },
  {
    blockType: 'pricing',
    eyebrow: 'The offer',
    headline: 'One package, one price, fourteen days.',
    description:
      'No hourly bills, no scope creep. Fixed price, fixed timeline, senior-engineer sign-off on every line of code.',
    layoutVariant: 'centered-single',
    anchorId: 'offer',
    tiers: [
      {
        name: 'Starter Site',
        price: '$999',
        originalPrice: '$1,950',
        priceNote: 'discounted · 14-day build',
        description:
          'A 5-page small business website that handles 90% of what a Heights business needs — mobile-first, fast, and fully editable.',
        highlighted: true,
        features: [
          { label: '5 bespoke pages designed for your business', included: true },
          { label: 'Mobile-first, under 200KB JavaScript', included: true },
          { label: 'Block-based CMS — your team edits every section', included: true },
          { label: 'Google Business Profile setup + LocalBusiness schema', included: true },
          { label: 'Contact form + GA4 + conversion tracking pre-wired', included: true },
          { label: 'First month of hosting free', included: true },
          { label: '14-day delivery, guaranteed in writing', included: true },
        ],
        cta: { label: 'Claim your discount', href: '#lp-start' },
      },
    ],
  },
  {
    blockType: 'bundleConfigurator',
    eyebrow: 'Build your package',
    headline: 'Bundle the build with what comes after.',
    description:
      'Most clients add a Care plan and a Local SEO Sprint within their first 90 days anyway. Bundling locks the discount in up front.',
    formId: 'lp-start',
    formHeading: 'Tell us what you need.',
    formDescription:
      'Build a package above if you like, then send a note. We reply within one business day with next steps.',
    submitLabel: 'Send my request',
    successMessage: "Thanks — we've got your request. We'll reply within one business day.",
    options: [
      { name: 'Starter Site', description: '5-page site, 14-day delivery. The foundation.', cost: '$999', once: 999, required: true },
      { name: 'Care plan', description: 'Hosting, backups, monitoring, 1hr/mo edits. Drops to $99/mo for 12 months.', cost: '$99/mo', monthly: 99, save: 600, defaultOn: true },
      { name: 'Local SEO Sprint', description: 'GBP optimization, 10 citations, schema, 1 cornerstone page.', cost: '+$900', once: 900, save: 295 },
      { name: 'Brand mini system', description: "Logo cleanup, color + type system, if you don't have one yet.", cost: '+$300', once: 300 },
    ],
  },
  {
    blockType: 'processSteps',
    eyebrow: 'How it works',
    headline: 'Five steps. Two weeks. No mystery.',
    steps: [
      { number: '01', title: 'Intro call', description: "30 minutes. What you need, what it costs, whether we're a fit." },
      { number: '02', title: 'Design preview', description: 'You approve a Figma mockup before any code is written.' },
      { number: '03', title: 'Build', description: 'The 14-day clock starts. One developer, daily progress.' },
      { number: '04', title: 'Review', description: 'One round of revisions. We tune copy, photos, and details.' },
      { number: '05', title: 'Launch', description: 'Live site, GitHub repo handed over, GBP and schema in place.' },
    ],
  },
  {
    blockType: 'animatedStats',
    eyebrow: 'What you get',
    headline: 'Numbers we hold ourselves to.',
    items: [
      { value: 14, decimals: 0, suffix: ' days', label: 'From kickoff to launch', description: 'Discounted clients delivered first.' },
      { value: 0.9, decimals: 1, suffix: 's', label: 'Typical load time', description: 'Down from 8s on the sites we replace.' },
      { value: 140, decimals: 0, suffix: '%', label: 'More organic traffic', description: 'Six months in, on a sample rebuild.', note: 'sample' },
      { value: 0, decimals: 0, prefix: '$', label: 'In hidden fees', description: 'Fixed price. No scope-creep clauses.' },
    ],
  },
  {
    blockType: 'testimonials',
    eyebrow: 'What clients said',
    headline: 'Real work, real businesses.',
    mode: 'latest',
    limit: 3,
  },
  {
    blockType: 'faq',
    eyebrow: 'Common questions',
    headline: 'Everything you wanted to ask.',
    mode: 'manual',
    items: [
      { question: "What if I don't like the design?", answer: 'You see a Figma mockup before any code is written. If the mockup is not right, we iterate until it is. The build clock does not start until you approve the direction.' },
      { question: 'Do I own the code?', answer: 'Yes. The code lives in a GitHub repo we hand over on launch. No lock-in — though most clients keep us as their host because it is already optimized.' },
      { question: 'Can you work with my existing brand?', answer: 'Yes. If you have a logo, colors, and fonts, we use them. If not, we recommend a small design system as a $300 add-on.' },
      { question: "What's the next step?", answer: 'Send a note via the form, or book a call. We reply within one business day and send a written proposal within 48 hours of the intro call.' },
    ],
  },
  {
    blockType: 'calendlyBooking',
    eyebrow: 'Book a call',
    headline: 'Pick a time that works for you.',
    description: "A 30-minute intro call. We talk about what you need, what it costs, and whether we're a fit. No hard sell.",
    calendlyUrl: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call',
    displayMode: 'inline',
    inlineHeight: 720,
    popupButtonLabel: 'Book a 30-min discovery call',
    showEmailFallback: true,
  },
  {
    blockType: 'cta',
    variant: 'emphasized',
    headline: 'Discounted pricing ends at 5 clients.',
    description: 'Right now, that means a lower price and a faster project. Start your project before the cohort fills.',
    primaryCta: { label: 'Claim your discount', href: '#lp-start' },
    secondaryCta: { label: 'See recent work', href: '/portfolio' },
  },
  {
    blockType: 'mobileCta',
    primaryLabel: 'Run free audit',
    primaryHref: '#audit',
  },
]

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'landingPages',
    where: { slug: { equals: SLUG } },
    limit: 1,
    depth: 0,
  })

  const doc = existing.docs[0] as { id: string | number } | undefined
  if (!doc) {
    return NextResponse.json(
      { ok: false, error: `No landingPages record with slug "${SLUG}". Seed it first (npm run seed).` },
      { status: 404 },
    )
  }

  await payload.update({
    collection: 'landingPages',
    id: doc.id,
    data: {
      // _status published so the public read (which fetches published versions)
      // picks up the new layout immediately.
      _status: 'published',
      layout: EXPRESS_LAYOUT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  })

  return NextResponse.json({
    ok: true,
    slug: SLUG,
    id: doc.id,
    blocks: EXPRESS_LAYOUT.map((b) => b.blockType),
    blockCount: EXPRESS_LAYOUT.length,
  })
}
