/**
 * One-shot content seed: add two cold-outreach landing pages to the
 * `landingPages` collection, for the auto-repair and barber/salon verticals.
 *
 * Both LPs lead with the free personalized demo site offer (the outreach
 * "we already built your homepage preview" angle), reuse the real nine-SKU
 * pricing from src/seed/reset-content.ts (Starter Site, the Open for
 * Business bundle, AI Front Desk), and end with the demo-request form. They
 * are separate from src/seed/onInit.ts because that seed only runs on a
 * fresh database — the live prod DB already exists, so this route applies
 * the same content to an already-running database instead (mirrors
 * src/app/dev-add-prometheuseq/route.ts and dev-seed-local-pages/route.ts).
 *
 *   curl -X POST http://localhost:3000/dev-add-vertical-lps            (local)
 *   curl -X POST https://blackhartconsulting.com/dev-add-vertical-lps  (prod: needs ALLOW_DEV_SEED)
 *
 * Idempotent: each LP is matched and upserted by slug. Returns 403 in
 * production unless ALLOW_DEV_SEED=one-time-yes is set on the container —
 * see src/lib/dev-route-guard.ts for the full unlock recipe.
 *
 * Both LPs stay noindex (the LandingPages collection default) — this is
 * paid/cold-outreach traffic, not organic.
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { revalidateContent } from '@/lib/cms-revalidate'
import { TIER_BLOCKS, guaranteesBlock, rtDoc, FAQ_DEMO, PHONE_DISPLAY, PHONE_TEL } from '@/seed/reset-content'

export const dynamic = 'force-dynamic'

const manualFaq = (items: Array<{ question: string; answer: string }>, headline: string) => ({
  blockType: 'faq',
  eyebrow: 'Common questions',
  headline,
  mode: 'manual',
  items,
})

// Shared bundle fragment (same facts as bundlesBlock's first entry in
// reset-content.ts) — reused verbatim so the numbers never drift from the
// canonical catalog.
const openForBusinessBundle = {
  blockType: 'bundleOffer',
  eyebrow: 'Bundle and save',
  headline: 'Open for Business: the site and the phone, together.',
  layoutVariant: 'receipt',
  bundles: [
    {
      name: 'Open for Business',
      price: '$999',
      monthly: '+ $149 a month',
      includes: [
        { label: 'Starter Site, live in 7 days' },
        { label: 'Google Business Profile set up' },
        { label: 'AI Front Desk setup and Basic plan (300 minutes)' },
        { label: 'Hosting included in the monthly' },
      ],
      note: 'Sold separately: $1,193 plus $208 a month.',
      cta: { label: 'Start the bundle', href: '/contact?tier=bundle-open-for-business#contact-form' },
    },
  ],
}

const demoProcessSteps = {
  blockType: 'processSteps',
  eyebrow: 'How the free demo works',
  headline: 'Four steps, no meetings.',
  steps: [
    { title: 'We pull your Google listing', description: 'Your business name, hours, services, and reviews. Nothing to fill out on your end.' },
    { title: 'We build your homepage preview', description: 'A working mockup with your real information, ready to view on your phone, within 48 hours.' },
    { title: 'You look it over', description: 'A private link, yours to share with whoever else weighs in on the business.' },
    { title: 'You decide', description: 'Like it, and $699 puts the full site live in 7 days. Pass, and nothing happens: no follow-up call, no charge.' },
  ],
}

const demoRequestForm = {
  blockType: 'demoRequestForm',
  eyebrow: 'Two minutes, tops',
  headline: 'Get your free demo site.',
  description: 'Send your business name and Google listing link. The mockup is built from your public listing, so there is nothing else to fill in.',
  submitLabel: 'Send me my demo',
  fineprint: 'No call. No obligation. Reply within one business day.',
  successMessage: 'Request received. Your demo link lands in your inbox within 48 hours.',
}

const starterPricing = (headline: string) => ({
  blockType: 'pricing',
  eyebrow: 'What you get',
  headline,
  description: 'One flat price, no hourly clock, delivered in writing.',
  layoutVariant: 'centered-single',
  anchorId: 'pricing',
  tiers: [TIER_BLOCKS.starterSite],
})

const LANDING_PAGES: Array<{
  title: string
  slug: string
  campaign: string
  niche: string
  seo: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layout: any[]
}> = [
  {
    title: 'Houston Auto Repair Free Demo',
    slug: 'houston-auto-repair',
    campaign: 'Houston Auto Repair - Cold Outreach',
    niche: 'contractor',
    seo: {
      metaTitle: 'Free Website Demo for Houston Auto Repair Shops | Black Hart Consulting',
      metaDescription: 'See a homepage built from your Google listing before you spend anything. For Houston auto repair, tire, and detailing shops. Free, no call required.',
      noIndex: true,
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'A free demo for Houston auto shops',
        headline: 'Your shop has hundreds of five-star reviews. Your website should look like it.',
        subheadline: 'We already built a homepage preview for your shop from your Google listing: your real hours, your real services, your real reviews. Look at it before you spend a dollar.',
        align: 'left',
        ctas: [{ label: 'See my free demo', href: '#demo-request', variant: 'primary' }],
        showPhoneCta: true,
      },
      {
        blockType: 'richText',
        eyebrow: 'Why this matters',
        maxWidth: 'medium',
        variant: 'lede',
        content: rtDoc([
          ['p', 'A customer with a check engine light does not walk into the first open bay. They search your shop name, land on your website, and decide in seconds whether to call or keep scrolling. If that site looks like it was built years ago, the reviews on your Google listing do not save you: the click already went to the shop next door with a site that looks like it is still in business.'],
          ['p', 'You already did the hard part. The reviews are real, the work is good, and customers keep coming back. The only piece missing is a website that says so before they ever pick up the phone.'],
        ]),
      },
      starterPricing('A site built for a shop, not a template.'),
      openForBusinessBundle,
      demoProcessSteps,
      guaranteesBlock,
      demoRequestForm,
      {
        blockType: 'outcomeCards',
        eyebrow: 'While the site is being built',
        headline: 'What happens to the calls you already miss?',
        cards: [
          {
            title: 'Never miss another call',
            blurb: 'Industry studies put missed calls at 20 to 40 percent during business hours, and a shop mid-repair rarely has a free hand to answer the phone. Our AI Front Desk answers every call, books the appointment, and texts the caller back if a call is missed.',
            priceLine: '$299 setup, then from $149 a month.',
            href: '/ai-front-desk',
            ctaLabel: 'See how it works',
            demoHref: PHONE_TEL,
            demoLabel: `Call it now: ${PHONE_DISPLAY}`,
          },
        ],
      },
      manualFaq(FAQ_DEMO, 'The free demo, answered.'),
      {
        blockType: 'cta',
        headline: 'See your shop’s new homepage before you decide anything.',
        description: 'Send your business name and Google listing. Your free demo link lands in your inbox within 48 hours.',
        variant: 'emphasized',
        primaryCta: { label: 'See my free demo', href: '#demo-request' },
        secondaryCta: { label: `Call ${PHONE_DISPLAY}`, href: PHONE_TEL },
      },
    ],
  },
  {
    title: 'Houston Barbers and Salons Free Demo',
    slug: 'houston-barbers-salons',
    campaign: 'Houston Barbers and Salons - Cold Outreach',
    niche: 'salonspa',
    seo: {
      metaTitle: 'Free Website Demo for Houston Barbers and Salons | Black Hart Consulting',
      metaDescription: 'See a homepage built from your Google listing before you spend anything. For Houston barber shops and hair salons. Free, no call required.',
      noIndex: true,
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'A free demo for Houston barbers and salons',
        headline: 'Every unanswered call is a client who books somewhere else.',
        subheadline: 'We already built a homepage preview for your shop from your Google listing: your real services, your real hours, your real reviews. Look at it before you spend a dollar.',
        align: 'left',
        ctas: [{ label: 'See my free demo', href: '#demo-request', variant: 'primary' }],
        showPhoneCta: true,
      },
      {
        blockType: 'richText',
        eyebrow: 'Why this matters',
        maxWidth: 'medium',
        variant: 'lede',
        content: rtDoc([
          ['p', 'A client looking for a fresh cut or a new color does not call the first name on a list. They search, land on a website, and check for real photos, current hours, and a way to book before they call anyone. If the site loads slowly or looks out of date, they move to the next name without ever picking up the phone.'],
          ['p', 'Your chair is full because the work is good and clients keep coming back. The only piece missing is a website that gets a new client to book before they close the tab.'],
        ]),
      },
      starterPricing('A site built to get you booked, not just seen.'),
      openForBusinessBundle,
      demoProcessSteps,
      guaranteesBlock,
      demoRequestForm,
      {
        blockType: 'outcomeCards',
        eyebrow: 'While the site is being built',
        headline: 'What happens to the calls you already miss?',
        cards: [
          {
            title: 'Never miss another booking',
            blurb: 'Industry studies put missed calls at 20 to 40 percent during business hours, and a stylist mid-appointment cannot stop to answer the phone. Our AI Front Desk answers every call, books the appointment, and texts back anyone who could not get through.',
            priceLine: '$299 setup, then from $149 a month.',
            href: '/ai-front-desk',
            ctaLabel: 'See how it works',
            demoHref: PHONE_TEL,
            demoLabel: `Call it now: ${PHONE_DISPLAY}`,
          },
        ],
      },
      manualFaq(FAQ_DEMO, 'The free demo, answered.'),
      {
        blockType: 'cta',
        headline: 'See your new homepage before you decide anything.',
        description: 'Send your business name and Google listing. Your free demo link lands in your inbox within 48 hours.',
        variant: 'emphasized',
        primaryCta: { label: 'See my free demo', href: '#demo-request' },
        secondaryCta: { label: `Call ${PHONE_DISPLAY}`, href: PHONE_TEL },
      },
    ],
  },
]

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })
  const results: Array<{ slug: string; action: 'created' | 'updated'; id: string | number }> = []

  for (const lp of LANDING_PAGES) {
    const data = {
      title: lp.title,
      slug: lp.slug,
      campaign: lp.campaign,
      niche: lp.niche,
      _status: 'published',
      publishedAt: new Date().toISOString(),
      seo: lp.seo,
      layout: lp.layout,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    const existing = await payload.find({
      collection: 'landingPages',
      where: { slug: { equals: lp.slug } },
      limit: 1,
      depth: 0,
    })

    const doc = existing.docs[0] as { id: string | number } | undefined
    if (doc) {
      await payload.update({ collection: 'landingPages', id: doc.id, data })
      results.push({ slug: lp.slug, action: 'updated', id: doc.id })
    } else {
      const created = await payload.create({ collection: 'landingPages', data })
      results.push({ slug: lp.slug, action: 'created', id: created.id })
    }

    // LandingPages' own afterChange hook already revalidates on create/update;
    // this is a defensive extra call for the one-shot-script context (mirrors
    // dev-add-prometheuseq/route.ts).
    revalidateContent({ tag: 'landingPages', slug: lp.slug, slugPathPrefix: '/lp' })
  }

  return NextResponse.json({ ok: true, landingPages: results })
}
