/**
 * Dev-only seed endpoint. Reuses the booted Payload instance from the dev
 * server, sidestepping the Node 24 + Payload CLI loadEnv compatibility issue.
 *
 *   curl -X POST http://localhost:3000/dev-seed-rework
 *
 * Returns 403 in production. Delete before merging the rework branch.
 */

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Lexical rich-text helper — single paragraph wrapped in the minimal node
// shape Payload's lexical editor expects. Used for the About page intro.
const rt = (text: string) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
    children: [{
      type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr',
      children: [{ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' }],
    }],
  },
})

// ── Shared block fragments ──────────────────────────────────────────

// Founding Client banner — national now (no Heights), still credible.
const FOUNDING_BANNER = {
  blockType: 'foundingClient',
  eyebrow: 'Founding Client Pricing',
  headline: 'First 5 clients save up to $1,000.',
  description:
    'A temporary discount for our founding cohort. Trades a lower price for a Google review, a written testimonial, and case-study permission. Founding clients also lock their Care + SEO retainer rate for the first 12 months — even if our public pricing rises after the cohort fills. Open to small and mid-market businesses anywhere in the U.S. (and beyond).',
  // Counter values now live on the SiteSettings global (foundingSpotsTotal +
  // foundingSpotsRemaining) so they can be edited from the admin without a
  // re-seed. These block-level fields are left only as legacy defaults in
  // case the global is ever cleared.
  spotsTotal: 5,
  spotsRemaining: 5,
  offers: [
    { name: 'Starter Site', priceFounding: '$1,495', priceRetail: '$1,950', savings: 'Save $455' },
    { name: 'Pro Site', priceFounding: '$3,500', priceRetail: '$4,500', savings: 'Save $1,000' },
    { name: 'Local SEO Sprint', priceFounding: '$1,195', priceRetail: '$1,495', savings: 'Save $300' },
    { name: 'All Care plans', priceFounding: 'Free', priceRetail: '$149/mo', savings: 'First month free' },
  ],
  cta: { label: 'Claim a founding spot', href: '/contact' },
}

// Bundles — keep US-wide framing too.
const BUNDLES = {
  blockType: 'bundleOffer',
  eyebrow: 'Bundle & save',
  headline: 'Bundle the build with what comes after.',
  description:
    'Most clients add a Care plan and a Local SEO Sprint within their first 90 days anyway. Bundling locks the discount in up front.',
  backgroundImageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&q=80',
  bundles: [
    {
      name: 'Site + Care',
      tagline: 'Build it, then keep it healthy. The default for most clients.',
      price: '$1,495 + $99/mo',
      savings: 'Care drops from $149 → $99/mo for 12 months',
      includes: [
        { label: 'Starter Site — 5-page site, 14-day delivery' },
        { label: 'Care plan: hosting, monitoring, backups, 1hr/mo edits' },
        { label: 'First month of Care free' },
        { label: 'Founding-client price applied' },
      ],
      cta: { label: 'Start this bundle', href: '/contact?bundle=site-care' },
      highlighted: true,
    },
    {
      name: 'Site + Care + SEO Sprint',
      tagline: 'For owners who want to start ranking from day one.',
      price: '$2,395 + $99/mo',
      savings: 'Save $400 vs buying separately',
      includes: [
        { label: 'Everything in Site + Care' },
        { label: 'Local SEO Sprint: GBP optimization, 10 citations, schema markup' },
        { label: '1 cornerstone service or location page' },
        { label: '2-week SEO setup, delivered alongside site launch' },
      ],
      cta: { label: 'Start this bundle', href: '/contact?bundle=site-care-seo' },
    },
  ],
}

const LP_CONTACT_FORM = {
  blockType: 'contactForm',
  eyebrow: 'Prefer email?',
  headline: 'Send us a note instead.',
  description:
    "If a phone call isn't your thing, drop your details below — we'll reply within one business day.",
  successMessage:
    "Thanks — we'll be in touch within one business day.",
  showCompanyField: true,
  showProjectTypeField: false,
  showBudgetField: false,
  submitLabel: 'Send inquiry',
}

// Calendly block factory — defaulted to the BHC subscription URL. Suhaib
// updates this once per LP via the admin if he wants different event types
// per niche (e.g. dental-only intake calls).
function calendly(opts: { headline?: string; description?: string; mode?: 'inline' | 'popup'; buttonLabel?: string; bg?: string; emailFallback?: boolean } = {}) {
  return {
    blockType: 'calendlyBooking',
    eyebrow: 'Book a 30-min discovery call',
    headline: opts.headline ?? 'Pick a time that works for you.',
    description:
      opts.description ??
      'Thirty minutes. We talk through what you need, what it costs, and whether we are a fit. No hard sell.',
    calendlyUrl: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call',
    displayMode: opts.mode ?? 'inline',
    popupButtonLabel: opts.buttonLabel ?? 'Book a 30-min discovery call',
    inlineHeight: 720,
    backgroundImageUrl: opts.bg,
    // Email fallback — set to true on pages without a visible contact form
    // (homepage) so visitors who don't want to book have a path to email.
    showEmailFallback: opts.emailFallback ?? false,
    emailLabel: 'Email us instead',
  }
}

const HOMEPAGE_PRICING_TIERS = [
  {
    name: 'Single Page',
    price: '$795',
    priceNote: 'fixed · 5-day build',
    description: 'For solopreneurs, contractors, and event campaigns. One long-form page that makes the case.',
    features: [
      { label: 'One conversion-focused page', included: true },
      { label: 'Mobile-first, under 150KB JS', included: true },
      { label: 'Contact form + GA4', included: true },
      { label: 'First month of hosting free', included: true },
      { label: '1 round of post-launch revisions', included: true },
    ],
    cta: { label: 'Start a single page', href: '/contact?tier=single' },
  },
  {
    name: 'Starter Site',
    price: '$1,495',
    originalPrice: '$1,950',
    priceNote: 'founding · 14-day build',
    description: 'The most-bought tier. A 5-page site that fits 90% of what businesses need.',
    highlighted: true,
    features: [
      { label: 'Up to 5 bespoke pages', included: true },
      { label: 'Block-based CMS (Payload)', included: true },
      { label: 'Technical SEO + LocalBusiness schema', included: true },
      { label: 'Google Business Profile setup', included: true },
      { label: 'First month of hosting free', included: true },
      { label: '1 round of post-launch revisions', included: true },
      { label: '14-day delivery, guaranteed', included: true },
    ],
    cta: { label: 'Claim a founding spot', href: '/contact?tier=starter' },
  },
  {
    name: 'Pro Site',
    price: '$3,500',
    originalPrice: '$4,500',
    priceNote: 'founding · 21-day build',
    description: 'For established businesses ready to invest in content + SEO. Multi-location welcome.',
    features: [
      { label: 'Up to 12 bespoke pages', included: true },
      { label: 'Full CMS + blog system', included: true },
      { label: 'Case study templates', included: true },
      { label: 'Schema, GBP, technical SEO', included: true },
      { label: '30 days of SEO content writing', included: true },
      { label: '2 rounds of post-launch revisions', included: true },
    ],
    cta: { label: 'Start a Pro Site', href: '/contact?tier=pro' },
  },
]

// ── Niche LP factory ─────────────────────────────────────────────────

type NicheLpInput = {
  title: string; slug: string; niche: string; campaign: string
  metaTitle: string; metaDescription: string
  heroEyebrow: string; heroHeadline: string; heroSub: string
  heroBackgroundUrl: string
  heroPrimaryCta: { label: string; href: string }
  heroSecondaryCta?: { label: string; href: string }
  starterPriceLine: string // niche-specific price-note copy
  starterFeatures: string[]
  faqItems: Array<{ question: string; answer: string }>
  calendlyHeadline?: string
  bookingBg?: string
  statsBg?: string
}

function makeNicheLandingPage(input: NicheLpInput) {
  return {
    title: input.title,
    slug: input.slug,
    niche: input.niche,
    campaign: input.campaign,
    publishedAt: new Date().toISOString(),
    seo: { metaTitle: input.metaTitle, metaDescription: input.metaDescription, noIndex: true },
    layout: [
      {
        blockType: 'hero',
        eyebrow: input.heroEyebrow,
        headline: input.heroHeadline,
        subheadline: input.heroSub,
        align: 'left',
        backgroundImageUrl: input.heroBackgroundUrl,
        // LPs use heavy overlay (was extra-heavy) so the photo is faintly
        // visible behind the dimming, giving texture without sacrificing
        // headline readability.
        overlayStrength: 'heavy',
        ctas: [
          { label: input.heroPrimaryCta.label, href: input.heroPrimaryCta.href, variant: 'primary' },
          ...(input.heroSecondaryCta ? [{ label: input.heroSecondaryCta.label, href: input.heroSecondaryCta.href, variant: 'ghost' }] : []),
        ],
        // Phone CTA on every LP hero — paid traffic with voice preference
        // shouldn't have to scroll to the footer to find a number to call.
        showPhoneCta: true,
      },
      FOUNDING_BANNER,
      {
        blockType: 'pricing',
        eyebrow: 'The offer',
        headline: 'One package, one price, fourteen days.',
        description: 'No hourly bills, no scope creep. Fixed price, fixed timeline, senior-engineer sign-off on every line of code.',
        // Wider, page-centered single tier — fixes the awkward
        // left-aligned solo card the user flagged.
        layoutVariant: 'centered-single',
        tiers: [
          {
            name: 'Starter Site',
            price: '$1,495',
            originalPrice: '$1,950',
            priceNote: input.starterPriceLine,
            description: '5-page website, mobile-first, live in 14 days.',
            highlighted: true,
            features: input.starterFeatures.map((label) => ({ label, included: true })),
            cta: { label: 'Claim a founding spot', href: '/contact' },
          },
        ],
      },
      // Calendly booking section — primary conversion point on every LP.
      calendly({
        headline: input.calendlyHeadline ?? 'Book a 30-minute intro call.',
        description:
          'Pick any open time. We will walk through what you need, ballpark a price, and figure out whether we are a fit — all in 30 minutes.',
        mode: 'inline',
        bg: input.bookingBg,
      }),
      {
        blockType: 'stats',
        eyebrow: 'What you get',
        backgroundImageUrl: input.statsBg,
        items: [
          { value: '14 days', label: 'From kickoff to launch', description: 'Founding clients delivered first.' },
          { value: '<200KB', label: 'First-paint JavaScript', description: 'Fast on the worst phone in your customer base.' },
          { value: '$0', label: 'In hidden fees', description: 'Hosting first month free. No scope creep clauses.' },
        ],
      },
      // Compact unlinked FeaturedProjects — shows the latest 3 project
      // screenshots with names below them, centered. UNLINKED on purpose
      // so visitors can't navigate away from the LP. Replaces the previous
      // "View portfolio" CTA button.
      {
        blockType: 'featuredProjects',
        eyebrow: 'Recent work',
        headline: 'Real projects, real businesses.',
        description: 'A few sites we have shipped recently.',
        mode: 'latest',
        limit: 3,
        compact: true,
        linked: false,
        viewAllLabel: '',
        viewAllHref: '',
      },
      { blockType: 'testimonials', eyebrow: 'What clients said', headline: 'Real work, real businesses.', mode: 'latest', limit: 3 },
      // Auto mode: pulls every featured FAQ from the FAQs collection in
       // the admin. Single source of truth across home + 5 LPs + services
       // + about + contact. Drop a niche-specific FAQ in the admin and
       // it surfaces on every page that renders this block.
      { blockType: 'faq', eyebrow: 'Common questions', headline: 'Everything you wanted to ask.', mode: 'auto', limit: 12 },
      LP_CONTACT_FORM,
    ],
  }
}

// ── Niche LP definitions ─────────────────────────────────────────────

const LANDING_PAGES: NicheLpInput[] = [
  {
    title: 'Express Website',
    slug: 'express-website',
    niche: 'generic',
    campaign: 'Search · Web Design · US · LP Express',
    metaTitle: 'Custom Small Business Website — $1,495, 14-Day Delivery',
    metaDescription:
      'Custom 5-page website for small to mid-market businesses across the U.S. Founding-client price $1,495 (was $1,950). 14-day delivery guaranteed.',
    heroEyebrow: 'U.S. & Worldwide · 14-Day Delivery',
    heroHeadline: 'A custom website. In 14 days. From $1,495.',
    heroSub: 'Built by hand, hosted by us, kept fast forever. Founding-client pricing for our first 5 clients — open to small and mid-market businesses anywhere.',
    // Designer working on website mockups — directly tied to the "we'll
    // build your site in 14 days" promise this LP makes.
    heroBackgroundUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1920&q=80',
    heroPrimaryCta: { label: 'Book a 30-min discovery call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call' },
    heroSecondaryCta: { label: 'See the deliverables', href: '#pricing' },
    starterPriceLine: 'founding price · 14-day delivery',
    starterFeatures: [
      '5 bespoke pages designed for your business',
      'Mobile-first, under 200KB JavaScript',
      'Block-based CMS — your team edits every section',
      'Google Business Profile setup + LocalBusiness schema',
      'Contact form + GA4 + conversion tracking pre-wired',
      'First month of hosting free, then $99/mo bundle price',
      '14-day delivery, guaranteed in writing',
    ],
    // bookingBg removed — Calendly section sits next to Stats which has bg
    // bookingBg: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1920&q=80',
    statsBg: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80',
    faqItems: [
      { question: 'What if I don’t like the design?', answer: 'You see a Figma mockup before any code is written. If the mockup isn’t right, we iterate until it is. The 14-day clock doesn’t start until you approve the design direction.' },
      { question: 'Do I own the code?', answer: 'Yes. The code lives in a GitHub repo we hand over to you on launch. No proprietary lock-in.' },
      { question: 'Can you work with my existing brand?', answer: 'Yes. If you have a logo, color palette, and fonts, we use them.' },
      { question: 'Where are you based — and do you take remote clients?', answer: 'Houston, Texas. Most of our clients are remote, across the U.S. and a few international. Time zones are rarely an issue.' },
    ],
  },
  {
    title: 'Heights Dental Practice Websites',
    slug: 'heights-dental',
    niche: 'dental',
    campaign: 'Search · Dental · Heights',
    metaTitle: 'Dental Practice Websites in Houston Heights — $1,495',
    metaDescription:
      'Custom websites for Houston Heights dental practices. New-patient lead capture, online booking, insurance verification. 14-day delivery, $1,495 founding price.',
    heroEyebrow: 'For Houston Heights Dentists',
    heroHeadline: 'A new-patient website for your practice. In 14 days.',
    heroSub: 'Built around what dental patients actually need: online booking, insurance verification, before/after photos, and a phone number that’s easy to find.',
    heroBackgroundUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80',
    heroPrimaryCta: { label: 'Book a 30-min discovery call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call' },
    heroSecondaryCta: { label: 'See what’s included', href: '#pricing' },
    starterPriceLine: 'founding price · 14-day delivery',
    starterFeatures: [
      '5 pages: Home, Services, About, New Patients, Contact',
      'Online booking integration (Dentrix / Open Dental compatible)',
      'Insurance accepted list (configurable in CMS)',
      'Before / after photo gallery with HIPAA-safe handling',
      'Patient testimonial section + Google review automation',
      'GBP setup + Dentist + LocalBusiness schema',
      'New-patient form with HIPAA-safe submission',
    ],
    // bookingBg removed — Calendly section sits next to Stats which has bg
    // bookingBg: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1920&q=80',
    statsBg: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1920&q=80',
    calendlyHeadline: 'Book a 30-minute discovery call. We will scope your practice site.',
    faqItems: [
      { question: 'Is the patient form HIPAA compliant?', answer: 'The form itself doesn’t collect PHI by default. If you want to collect insurance details or symptoms, we use a HIPAA-compliant form provider.' },
      { question: 'Can you migrate my existing patient reviews?', answer: 'Yes. We pull verified Google reviews into a homepage carousel automatically.' },
      { question: 'Do you handle online booking integration?', answer: 'Yes. We work with Dentrix Ascend, Open Dental, NexHealth, and most modern PMS systems.' },
      { question: 'Do you only work with Houston Heights practices?', answer: 'No — this page is targeted at Heights dentists, but we work with practices across the U.S. The Heights niche just lets us go deeper on the local SEO setup.' },
    ],
  },
  {
    title: 'Heights Med Spa Websites',
    slug: 'heights-med-spa',
    niche: 'medspa',
    campaign: 'Search · Med Spa · Heights',
    metaTitle: 'Med Spa Websites in Houston Heights — Online Booking, $1,495',
    metaDescription: 'Custom med spa websites for Houston Heights aesthetic clinics. Online booking, gift cards, treatment packages.',
    heroEyebrow: 'For Houston Heights Med Spas',
    heroHeadline: 'A med spa website that fills your appointment book.',
    heroSub: 'Online booking front and center, gift cards that actually convert, treatment packages that don’t require a sales call.',
    heroBackgroundUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1920&q=80',
    heroPrimaryCta: { label: 'Book a 30-min discovery call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call' },
    heroSecondaryCta: { label: 'See what’s included', href: '#pricing' },
    starterPriceLine: 'founding price · 14-day delivery',
    starterFeatures: [
      '5 pages: Home, Treatments, Pricing, About, Contact',
      'Online booking integration (Vagaro, Mindbody, Square)',
      'Gift card e-commerce (Stripe-powered)',
      'Treatment package builder with transparent pricing',
      'Before / after gallery with consent tracking',
      'GBP setup + MedicalBusiness + Service schema',
      'Mother’s Day / holiday landing page templates',
    ],
    // bookingBg removed — Calendly section sits next to Stats which has bg
    // bookingBg: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=1920&q=80',
    statsBg: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1920&q=80',
    calendlyHeadline: 'Book a 30-minute discovery call. We will scope your med spa site.',
    faqItems: [
      { question: 'Will online booking work with my existing system?', answer: 'Yes. Vagaro, Mindbody, Square Appointments, Acuity supported out of the box.' },
      { question: 'Can I sell gift cards online?', answer: 'Yes. Most clinics 5-10x their gift card revenue once available online.' },
      { question: 'How do you handle before/after photos legally?', answer: 'We build a consent-tracking system into the gallery with backend records of signed consents.' },
      { question: 'Do you only work with Houston Heights clinics?', answer: 'No — we work with med spas anywhere in the U.S. The Heights focus on this page just helps with local SEO copy.' },
    ],
  },
  {
    title: 'Heights Restaurant & Café Websites',
    slug: 'heights-restaurant',
    niche: 'restaurant',
    campaign: 'Search · Restaurant · Heights',
    metaTitle: 'Restaurant Websites in Houston Heights — Reservations + Online Ordering',
    metaDescription: 'Custom websites for Houston Heights restaurants and cafés. Native menu, online reservations, online ordering.',
    heroEyebrow: 'For Houston Heights Restaurants & Cafés',
    heroHeadline: 'A restaurant website hungry diners actually use.',
    heroSub: 'Native HTML menu (not PDF) so Google can index it, online reservations, and integration with whatever ordering platform you use.',
    heroBackgroundUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80',
    heroPrimaryCta: { label: 'Book a 30-min discovery call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call' },
    heroSecondaryCta: { label: 'See what’s included', href: '#pricing' },
    starterPriceLine: 'founding price · 14-day delivery',
    starterFeatures: [
      '5 pages: Home, Menu, Story, Reservations, Visit',
      'Native HTML menu with Menu schema (not a PDF)',
      'OpenTable / Resy / Tock reservation integration',
      'DoorDash / GrubHub / UberEats deep links',
      'Events page for private bookings + bookable form',
      'GBP setup + Restaurant + LocalBusiness schema',
      'Email signup for daily specials / new menu drops',
    ],
    // bookingBg removed — Calendly section sits next to Stats which has bg
    // bookingBg: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80',
    statsBg: 'https://images.unsplash.com/photo-1481833761820-0509d3217039?w=1920&q=80',
    calendlyHeadline: 'Book a 30-minute discovery call. We will scope your restaurant site.',
    faqItems: [
      { question: 'Why does it matter that the menu is HTML, not PDF?', answer: 'Google can’t fully index PDFs. Native menus drive 15-30% more organic traffic.' },
      { question: 'Can the menu be updated easily?', answer: 'Yes. All editable in the CMS — update daily specials before service.' },
      { question: 'Do you integrate with delivery platforms?', answer: 'Yes — typically as deep links to your existing storefronts.' },
      { question: 'Do you only work with Heights restaurants?', answer: 'No — we work with restaurants across the U.S. This page just leans into Heights-local copy for ad targeting.' },
    ],
  },
  {
    title: 'Heights Real Estate Team Websites',
    slug: 'heights-real-estate',
    niche: 'realestate',
    campaign: 'Search · Real Estate · Heights',
    metaTitle: 'Real Estate Team Websites in Houston Heights — IDX, $1,495',
    metaDescription: 'Custom websites for Houston Heights real estate teams and agents. IDX listings, neighborhood pages, lead capture.',
    heroEyebrow: 'For Houston Heights Real Estate Teams',
    heroHeadline: 'A real estate site that wins listings + buyers.',
    heroSub: 'IDX listings integration, deep neighborhood pages for the Heights, and a lead-capture flow that doesn’t feel like a trap.',
    heroBackgroundUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&q=80',
    heroPrimaryCta: { label: 'Book a 30-min discovery call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call' },
    heroSecondaryCta: { label: 'See what’s included', href: '#pricing' },
    starterPriceLine: 'founding price · 14-day delivery',
    starterFeatures: [
      '5 pages: Home, Listings, Neighborhoods, About, Contact',
      'IDX integration (Realtyna, IDX Broker, IHF compatible)',
      'Deep Heights neighborhood pages (sub-area SEO)',
      'Property valuation lead-capture tool',
      'Agent bio pages with contact + booking',
      'GBP setup + RealEstateAgent + Place schema',
      'Lead-capture form + CRM webhook (Follow Up Boss / kvCORE / Boomtown)',
    ],
    // bookingBg removed — Calendly section sits next to Stats which has bg
    // bookingBg: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80',
    statsBg: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1920&q=80',
    calendlyHeadline: 'Book a 30-minute discovery call. We will scope your team site.',
    faqItems: [
      { question: 'Which IDX provider do you use?', answer: 'Whichever one your MLS supports. Realtyna and IDX Broker are most flexible.' },
      { question: 'Can the site capture leads into our CRM?', answer: 'Yes. Webhook into Follow Up Boss, kvCORE, Boomtown, or any CRM with a webhook.' },
      { question: 'Will the neighborhood pages actually rank?', answer: 'Yes — usually within 2-4 months for Heights sub-area searches.' },
      { question: 'Do you only work with Heights teams?', answer: 'No — we work with real estate teams across the U.S. The Heights focus on this page just helps with neighborhood SEO copy.' },
    ],
  },
]

// ── Endpoint ─────────────────────────────────────────────────────────

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })
  const log: string[] = []

  // ── GLOBALS ────────────────────────────────────────────────────
  // Site settings — ensure email + phone are populated for headers/footers
  // across both layouts.
  await payload.updateGlobal({
    slug: 'siteSettings',
    data: {
      contactEmail: 'hello@blackhartconsulting.com',
      contactPhone: '(866) 434-9777',
      // Founding cohort counter — edit in admin (SiteSettings global) when
      // a new client signs; this seed only initializes the value.
      foundingSpotsTotal: 5,
      foundingSpotsRemaining: 3,
    } as any,
  })
  log.push('updated siteSettings (email/phone)')

  // Footer — clear the social array per request (no LinkedIn / GitHub /
  // pseudo-email link in the main site footer). Keep tagline + columns +
  // copyright populated. Other fields are preserved by spreading prior state.
  const existingFooter = await payload.findGlobal({ slug: 'footer' }).catch(() => null) as any
  await payload.updateGlobal({
    slug: 'footer',
    data: {
      ...(existingFooter ?? {}),
      social: [],
    } as any,
  })
  log.push('updated footer (cleared social links)')

  // ── HOMEPAGE — US-focused, no "small business only" framing ─────
  const homeData: any = {
    title: 'Home',
    slug: 'home',
    publishedAt: new Date().toISOString(),
    seo: {
      metaTitle: 'Black Hart Consulting — Custom websites in 14 days, from $1,495',
      metaDescription:
        'A U.S. studio building fast, fixed-price websites for businesses of every size — small, mid-market, and enterprise. 14-day delivery, founding-client pricing.',
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Custom Web Design · United States & Worldwide',
        headline: 'Custom websites in 14 days, from $1,495.',
        subheadline:
          'A solo developer using modern AI tooling to ship fast, fixed-price websites for businesses across the U.S. and around the world. One bill, one accountable owner, no agency overhead — that’s how we keep prices honest and timelines short.',
        align: 'left',
        // Person at a laptop preparing to start a client meeting — adds a
        // human-touch element to the homepage hero (replaces the abstract
        // workspace photo previously shared with /portfolio).
        backgroundImageUrl: 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=1920&q=80',
        // Heavy (not extra-heavy) so the photo shows faintly behind the
        // headline — same treatment as About / Services / Contact / LP heroes
        // for visual consistency across the site.
        overlayStrength: 'heavy',
        ctas: [
          { label: 'Book a 30-min discovery call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call', variant: 'primary' },
          { label: 'See the offer', href: '/#pricing', variant: 'ghost' },
        ],
        // Phone CTA under hero buttons — captures voice-preferring inbound
        // callers without requiring a Calendly booking or contact form.
        showPhoneCta: true,
      },
      FOUNDING_BANNER,
      // Homepage simplification (rec #1): Stats block removed — content lives
      // on /services. Same for the BUNDLES block further down. Goal is to
      // collapse the homepage decision-load: hero → founding banner →
      // services → ONE pricing teaser (Starter only) with link to /services
      // → Calendly → recent work → testimonial → FAQ.
      {
        blockType: 'services',
        eyebrow: 'What we do',
        headline: 'Web, SEO, and care — under one roof.',
        description:
          'Four disciplines, one solo developer working alongside modern AI tooling. Sized for solo operators, mid-market companies, and larger teams that want a partner who ships fast.',
        items: [
          { title: 'Website design & build', icon: 'globe', description: 'Marketing sites and web apps, mobile-first, on a CMS your team actually uses.', bullets: [
            { label: 'Custom design tuned to your brand' },
            { label: 'Block-based CMS — every section editable' },
            { label: 'Performance budget enforced' },
          ], downloadHref: '/downloads/service-website' },
          { title: 'Local + national SEO', icon: 'search', description: 'GBP, schema, citations, content. Local for service businesses, national for SaaS + B2B.', bullets: [
            { label: 'Google Business Profile optimization' },
            { label: 'LocalBusiness or Organization schema' },
            { label: 'Cornerstone service / location pages' },
          ], downloadHref: '/downloads/service-seo' },
          { title: 'Care plans', icon: 'shield', description: 'Hosting, monitoring, backups, and ongoing edits — your site stays fast and online without your input.', bullets: [
            { label: 'Managed hosting + automated daily backups' },
            { label: 'Monthly performance + uptime report' },
            { label: '1–10 hours of edits per month' },
          ], downloadHref: '/downloads/service-care' },
          { title: 'Quick-win add-ons', icon: 'zap', description: 'Fixed-price productized fixes for specific pain. From $295. Shipped in 3–7 days.', bullets: [
            { label: 'GBP setup • schema • speed sprint' },
            { label: 'GA4 + conversion tracking' },
            { label: '5-page SEO refresh' },
          ], downloadHref: '/downloads/service-addons' },
        ],
      },
      // Homepage pricing TEASER — Starter Site only (the most-bought tier).
      // The full 3-tier grid + Custom Build + Care + SEO + add-ons live on
      // /services. The CTA on this teaser links to /services for visitors
      // who want to compare or browse beyond Starter.
      {
        blockType: 'pricing',
        eyebrow: 'Starter pricing',
        headline: 'Most clients start here.',
        description: 'Founding-client pricing on our most-popular tier. Want a comparison or a different size build? See all pricing →',
        layoutVariant: 'centered-single',
        tiers: [HOMEPAGE_PRICING_TIERS[1]],
      },
      // Secondary CTA leading into the full pricing page — not a Calendly
      // ask, just a softer "browse more" path for visitors who aren't yet
      // ready to book but want to compare.
      {
        blockType: 'cta',
        headline: 'See every package, every price, every deliverable.',
        description: 'Single Page · Starter · Pro · Custom Build · Care plans · Local SEO · quick-win add-ons — all on one page, every number visible.',
        primaryCta: { label: 'See all pricing →', href: '/services' },
        variant: 'default',
      },
      calendly({
        headline: 'Book a call — or email if you prefer.',
        description: 'Thirty minutes on Calendly to scope your project, or send a note if a call is not your style.',
        mode: 'popup',
        emailFallback: true,
      }),
      // Lead magnet — low-friction CTA for visitors who aren't ready to book
      // a call. Downloading the checklist fires `pdf_download` to the dataLayer
      // which we treat as a soft conversion (Google Ads "Secondary action").
      {
        blockType: 'leadMagnet',
        eyebrow: 'Free resource',
        headline: 'Take this checklist into any web-design conversation.',
        description: 'A 1-pager with the questions to ask, the contract gotchas to avoid, and the performance promises to demand in writing — even if you never hire us.',
        downloadHref: '/downloads/website-checklist',
        downloadLabel: 'Download the free checklist',
        fineprint: 'PDF · 2 pages · no email required',
      },
      {
        blockType: 'featuredProjects',
        eyebrow: 'Recent work',
        headline: 'A few projects we’re proud of.',
        description: 'Each case study covers what we shipped, why it works, and what changed for the client.',
        mode: 'latest',
        limit: 3,
        viewAllLabel: 'View all projects',
        viewAllHref: '/portfolio',
      },
      // Testimonials block uses the same carousel render as the LP version —
      // pulls all featured testimonials from the admin (Testimonials
      // collection, `featured: true`), capped at `limit`. Bump this if you
      // add more testimonials and want them all to rotate on the home hero.
      { blockType: 'testimonials', eyebrow: 'What clients said', headline: 'Real work, real businesses.', mode: 'latest', limit: 6 },
      // Auto mode pulls featured FAQs from the admin collection (single source
      // of truth across home + LPs + about + services + contact). Edit a FAQ
      // once and it propagates everywhere on the next 60s cache window.
      {
        blockType: 'faq',
        eyebrow: 'Common questions',
        headline: 'Everything you wanted to ask.',
        mode: 'auto',
        limit: 12,
      },
      {
        blockType: 'cta',
        headline: 'Let’s talk about your site.',
        description: 'No hard sell. A 30-minute discovery call where we figure out what you need, what it would cost, and whether we’re a fit.',
        primaryCta: { label: 'Book a 30-min discovery call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call' },
        secondaryCta: { label: 'See the portfolio', href: '/portfolio' },
        variant: 'emphasized',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80',
      },
    ],
  }

  // Force published status so the new content is what frontend renders.
  // Drafts are enabled on Pages and LandingPages collections; without
  // _status: 'published' the update goes to a draft and the live page
  // continues to serve the prior published version.
  const homeData_pub = { ...homeData, _status: 'published' }
  const homeExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })
  if (homeExisting.totalDocs === 0) {
    await payload.create({ collection: 'pages', data: homeData_pub })
    log.push('created home')
  } else {
    await payload.update({ collection: 'pages', id: homeExisting.docs[0].id, data: homeData_pub })
    log.push('updated home')
  }

  // ── CONTACT — add Calendly above the form ──────────────────────
  const contactData: any = {
    title: 'Contact',
    slug: 'contact',
    publishedAt: new Date().toISOString(),
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Get in touch',
        headline: 'Tell us about your business.',
        subheadline:
          'A sentence on what you do, a sentence on what you’re trying to fix or build, and a rough budget if you have one. Or just book directly below.',
        align: 'left',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1920&q=80',
        overlayStrength: 'heavy',
      },
      calendly({
        headline: 'Book a 30-min intro call.',
        description:
          'Pick any open time. We will walk through what you need, ballpark a price, and figure out whether we are a fit.',
        mode: 'inline',
      }),
      {
        blockType: 'contactForm',
        eyebrow: 'Or drop us a note',
        headline: 'Send a written inquiry.',
        description: 'If a call isn’t your thing, send us a note — we reply within one business day.',
        showCompanyField: true,
        showProjectTypeField: true,
        showBudgetField: true,
        submitLabel: 'Send inquiry',
      },
      // Auto FAQ — same centralized collection as everywhere else. Capped
      // tighter on /contact since visitors here are already mid-funnel.
      {
        blockType: 'faq',
        eyebrow: 'Common questions',
        headline: 'Before you write:',
        mode: 'auto',
        limit: 6,
      },
    ],
  }
  const contactData_pub = { ...contactData, _status: 'published' }
  const contactExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'contact' } }, limit: 1 })
  if (contactExisting.totalDocs === 0) { await payload.create({ collection: 'pages', data: contactData_pub }); log.push('created contact') }
  else { await payload.update({ collection: 'pages', id: contactExisting.docs[0].id, data: contactData_pub }); log.push('updated contact') }

  // ── ABOUT PAGE ─────────────────────────────────────────────────
  // Mirrors the structure on the live blackhartconsulting.com/about:
  // mission statement, founder bio (Suhaib Chaudhry), stats, and three
  // "How we work" callouts. Updated to align with new pricing language
  // (Care/Growth/Scale plans, founder-led, AI-leveraged delivery).
  const aboutData: any = {
    title: 'About',
    slug: 'about',
    publishedAt: new Date().toISOString(),
    _status: 'published',
    seo: {
      metaTitle: 'About — Black Hart Consulting',
      metaDescription: 'A Houston-based digital studio building custom websites for businesses across the U.S. Modern craft, modern tooling, one line of accountability.',
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'About',
        headline: 'Modern craft, modern tooling, one line of accountability.',
        subheadline:
          'Black Hart Consulting is a Houston-based digital studio. We build websites, run SEO, and keep them online for businesses that care how their work shows up online.',
        align: 'left',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?w=1920&q=80',
        overlayStrength: 'heavy',
      },
      {
        blockType: 'richText',
        maxWidth: 'prose',
        variant: 'lede',
        eyebrow: 'Our mission',
        content: rt(
          'We started Black Hart because most businesses are stuck between two bad choices: a generic template site that looks like everyone else’s, or an agency quote that’s three times what it should cost. We close that gap with modern AI tooling used carefully and with a senior reviewer accountable for every deliverable. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
        ),
      },
      {
        blockType: 'stats',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1554200876-56c2f25224fa?w=1920&q=80',
        items: [
          { value: '2', label: 'Recent launches in production' },
          { value: '5 days', label: 'Fastest project delivery' },
          { value: '100%', label: 'Projects shipped on quoted price' },
          { value: 'Houston, TX', label: 'Where we’re based' },
        ],
      },
      // Founder bio with the Suhaib headshot from the production CDN. The
      // RichText block renders an external imageUrl as a circular portrait
      // above the prose, with an eyebrow heading "Who you'll work with"
      // matching the live site.
      {
        blockType: 'richText',
        maxWidth: 'prose',
        imageUrl: 'https://bhc-media.nyc3.cdn.digitaloceanspaces.com/suhaib-headshot.jpg',
        imageFocus: 'face',
        eyebrow: 'Who you’ll work with',
        content: rt(
          'You’ll work directly with Suhaib Chaudhry, the founder of Black Hart Consulting — and the only person on the build. There’s no account manager layer, no junior handoff, no agency overhead. Every brief, every line of code, and every design decision goes through one accountable owner. That’s the whole point: pair a senior developer with modern AI tooling and you get the kind of deliverables you’d normally pay $20K+ for, shipped in days instead of months. Suhaib has been shipping production web software for over a decade across consumer, e-commerce, B2B SaaS, and other platforms. He started Black Hart to bring that craft to small and mid-market businesses at prices that make sense for a company that’s still proving its model.',
        ),
      },
      // "How we work" — three short principles. Rendered as a Services block
      // (3-column responsive grid) so they sit side-by-side at desktop and
      // stack with tighter spacing on mobile, with a clear section heading
      // above. Replaces the previous 3 standalone richText cards which had
      // no group title and stacked vertically with too much spacing.
      {
        blockType: 'services',
        eyebrow: 'How we work',
        headline: 'Three principles, every project.',
        items: [
          {
            title: 'Scope first.',
            icon: 'lightbulb',
            description:
              'Every engagement starts with a 30-minute discovery call, then a fixed-price proposal within 48 hours. We never bill hourly for project work — if a brief doesn’t fit a clean scope, we’ll tell you before you sign anything.',
          },
          {
            title: 'Build in days, not months.',
            icon: 'zap',
            description:
              'We use modern AI tooling alongside human judgment to ship faster than traditional agencies. A senior reviewer is accountable for every line of code, every word of copy, and every design decision.',
          },
          {
            title: 'Stay involved after launch.',
            icon: 'shield',
            description:
              'Most agencies hand you a site and walk away. We host, monitor, and improve yours through Care, Growth, or Scale plans that scale up or down with your needs.',
          },
        ],
      },
      {
        blockType: 'cta',
        headline: 'Want to work together?',
        description: 'Book a 30-minute discovery call or send us a note about what you are building.',
        primaryCta: { label: 'Book a 30-min discovery call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call' },
        secondaryCta: { label: 'Get in touch', href: '/contact' },
        variant: 'emphasized',
      },
    ],
  }
  const aboutExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 1 })
  if (aboutExisting.totalDocs === 0) { await payload.create({ collection: 'pages', data: aboutData }); log.push('created about') }
  else { await payload.update({ collection: 'pages', id: aboutExisting.docs[0].id, data: aboutData }); log.push('updated about') }

  // ── SERVICES PAGE ─────────────────────────────────────────────
  // Full deep-dive page. Includes:
  //  - 3 website tiers + the Custom Build option (anchor)
  //  - 3 Care plans
  //  - SEO Sprint + 3 SEO retainers
  //  - 6 quick-win add-ons
  //  - Calendly inline at the bottom
  const servicesData: any = {
    title: 'Services',
    slug: 'services',
    publishedAt: new Date().toISOString(),
    _status: 'published',
    seo: {
      metaTitle: 'Services + Pricing — Black Hart Consulting',
      metaDescription: 'Every service we offer with real prices, real timelines, real deliverables. Website tiers, Care plans, Local SEO Sprints, monthly SEO, and quick-win add-ons.',
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Services + Pricing',
        headline: 'Everything we do, with real numbers.',
        subheadline:
          'No “contact us for pricing.” Real prices, real timelines, real deliverables. Founding-client discounts apply through the first 5 clients.',
        align: 'left',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80',
        overlayStrength: 'heavy',
      },
      // Website tiers — 3 packaged tiers in a row
      {
        blockType: 'pricing',
        eyebrow: 'Website packages',
        headline: 'Three packaged tiers.',
        description: 'Founding-client pricing applies through the first 5 clients on all three.',
        layoutVariant: 'grid',
        tiers: HOMEPAGE_PRICING_TIERS,
      },
      // Custom Build — separate full-width block under the 3-tier grid.
      // Renders as one wide centered card to anchor the pricing list with
      // a "for bigger work" option without competing with the 3 main tiers.
      {
        blockType: 'pricing',
        headline: 'Need something bigger?',
        description: 'For larger sites, web apps, multi-location enterprise builds, or custom integrations beyond the Pro Site scope.',
        layoutVariant: 'centered-single',
        tiers: [
          {
            name: 'Custom Build',
            price: 'From $9,500',
            priceNote: 'scoped custom · 6+ weeks · quoted to actual scope',
            description: 'A discovery + scoping engagement first, then a fixed proposal. We say no when it doesn’t fit.',
            enterpriseBadge: true,
            features: [
              { label: 'Discovery + scoping engagement first', included: true },
              { label: 'Unlimited pages, custom integrations', included: true },
              { label: 'Multi-location, multi-language supported', included: true },
              { label: 'Web app or marketing site — both supported', included: true },
              { label: 'Dedicated weekly check-ins', included: true },
              { label: 'Quoted custom — pricing reflects actual scope', included: true },
            ],
            cta: { label: 'Scope a custom build', href: '/contact?tier=custom' },
          },
        ],
      },
      // Care plans
      {
        blockType: 'pricing',
        eyebrow: 'Care plans',
        headline: 'After launch — keep it running.',
        description: 'Bundled with every site at a discount, but standalone pricing if you want to skip Care or upgrade later.',
        layoutVariant: 'grid',
        tiers: [
          {
            name: 'Care',
            price: '$149',
            priceNote: 'per month',
            description: 'Hands-off hosting + maintenance. Every client adds this.',
            features: [
              { label: 'Managed hosting + monitoring + backups', included: true },
              { label: 'SSL, CDN, uptime monitoring', included: true },
              { label: '1 hr/mo for small edits', included: true },
              { label: 'Monthly performance + uptime report', included: true },
              { label: 'Email support', included: true },
            ],
            cta: { label: 'Add Care to your project', href: '/contact?addon=care' },
          },
          {
            name: 'Growth',
            price: '$495',
            priceNote: 'per month',
            description: 'For sites improving every month with dev + SEO work.',
            highlighted: true,
            features: [
              { label: 'Everything in Care', included: true },
              { label: '4 hrs/mo of dev or SEO work', included: true },
              { label: 'Monthly strategy email', included: true },
              { label: 'Same-week turnaround on changes', included: true },
              { label: 'Slack / SMS channel', included: true },
            ],
            cta: { label: 'Talk about Growth', href: '/contact?plan=growth' },
          },
          {
            name: 'Scale',
            price: '$1,295',
            priceNote: 'per month',
            description: 'For revenue-critical sites that need a partner on call.',
            features: [
              { label: 'Everything in Growth', included: true },
              { label: '10 hrs/mo of dev or SEO work', included: true },
              { label: 'Same-day SLA on small changes', included: true },
              { label: 'Quarterly architecture review', included: true },
            ],
            cta: { label: 'Talk about Scale', href: '/contact?plan=scale' },
          },
        ],
      },
      // SEO services
      {
        blockType: 'pricing',
        eyebrow: 'Local SEO',
        headline: 'From a one-time sprint to fully managed.',
        description: 'Most clients start with the Sprint. Monthly tiers exist for businesses ready to compete harder.',
        layoutVariant: 'grid',
        tiers: [
          {
            name: 'Local SEO Sprint',
            price: '$1,195',
            originalPrice: '$1,495',
            priceNote: 'one-time · founding · 2-week delivery',
            description: 'A full local SEO setup, delivered as a one-time engagement. No monthly contract.',
            highlighted: true,
            features: [
              { label: 'Full local SEO audit (PDF)', included: true },
              { label: 'Google Business Profile complete setup', included: true },
              { label: '10 local citation submissions', included: true },
              { label: 'LocalBusiness + Service schema markup', included: true },
              { label: '1 cornerstone service or location page', included: true },
              { label: 'Delivered in 2 weeks', included: true },
            ],
            cta: { label: 'Start a SEO Sprint', href: '/contact?seo=sprint' },
          },
          {
            name: 'Local SEO Monthly',
            price: '$395',
            priceNote: 'per month',
            description: 'For single-location service businesses competing locally.',
            features: [
              { label: 'Weekly Google Business Profile post', included: true },
              { label: '5 citation submissions per month', included: true },
              { label: '1 SEO-optimized blog post / month', included: true },
              { label: 'Monthly ranking + traffic report', included: true },
              { label: 'Quarterly strategy review', included: true },
            ],
            cta: { label: 'Start Local SEO', href: '/contact?seo=local' },
          },
          {
            name: 'SEO Growth',
            price: '$895',
            priceNote: 'per month',
            description: 'Full-stack SEO for businesses ready to compete.',
            features: [
              { label: 'Everything in Local SEO Monthly', included: true },
              { label: '2 long-form articles / month', included: true },
              { label: 'Internal linking + topic clusters', included: true },
              { label: 'AI-search optimization', included: true },
              { label: 'Conversion tracking dashboard', included: true },
            ],
            cta: { label: 'Start SEO Growth', href: '/contact?seo=growth' },
          },
        ],
      },
      // Quick-win add-ons
      {
        blockType: 'pricing',
        eyebrow: 'Quick-win add-ons',
        headline: 'Fixed-price productized fixes.',
        description: 'For specific pain points. Sold standalone or as project upsells. All shipped in 3-7 days.',
        layoutVariant: 'grid',
        tiers: [
          {
            name: 'Google Business Profile Setup',
            price: '$295',
            priceNote: 'one-time · 3-day delivery',
            description: 'Complete GBP setup or audit + repair. Photos, services, hours, schema, review-request automation.',
            features: [
              { label: 'GBP profile audit and complete setup', included: true },
              { label: 'NAP consistency check across 30+ directories', included: true },
              { label: 'Photo upload + categorization', included: true },
              { label: 'Review request email template', included: true },
            ],
            cta: { label: 'Order GBP Setup', href: '/contact?addon=gbp' },
          },
          {
            name: 'Site Speed Sprint',
            price: '$695',
            priceNote: 'one-time · 5-day delivery',
            description: 'Make your existing site faster. Often the highest-ROI thing for SEO + conversion.',
            features: [
              { label: 'Lighthouse + Core Web Vitals audit', included: true },
              { label: 'Image optimization (AVIF / WebP)', included: true },
              { label: 'JS / CSS bundle analysis + cleanup', included: true },
              { label: 'Before / after performance report', included: true },
            ],
            cta: { label: 'Order Speed Sprint', href: '/contact?addon=speed' },
          },
          {
            name: 'Schema Markup Pack',
            price: '$395',
            priceNote: 'one-time · 3-day delivery',
            description: 'LocalBusiness, Service, FAQPage, Article, BreadcrumbList. Direct effect on rich results + AI Overview citations.',
            features: [
              { label: 'Identify which schema types fit your business', included: true },
              { label: 'Implement on relevant pages', included: true },
              { label: 'Validate via schema.org validator', included: true },
              { label: 'Submit re-indexing request to Google', included: true },
            ],
            cta: { label: 'Order Schema Pack', href: '/contact?addon=schema' },
          },
          {
            name: 'GA4 + Conversion Tracking Setup',
            price: '$395',
            priceNote: 'one-time · 3-day delivery',
            description: 'Wire up GA4, GTM, Google Ads conversions, and dataLayer events so your campaigns can actually optimize.',
            features: [
              { label: 'GA4 property + measurement ID setup', included: true },
              { label: 'GTM container with key event triggers', included: true },
              { label: 'Google Ads conversion linker + actions', included: true },
              { label: 'End-to-end test with proof of firing', included: true },
            ],
            cta: { label: 'Order GA4 Setup', href: '/contact?addon=ga4' },
          },
          {
            name: '5-Page SEO Refresh',
            price: '$695',
            priceNote: 'one-time · 7-day delivery',
            description: 'Targeted SEO updates to 5 priority pages — titles, meta, schema, internal linking, content tweaks.',
            features: [
              { label: 'Title tag + meta description rewrite (5 pages)', included: true },
              { label: 'Schema markup added to each page', included: true },
              { label: 'Internal linking + content gap fill', included: true },
              { label: 'Lighthouse SEO score before / after report', included: true },
            ],
            cta: { label: 'Order 5-Page Refresh', href: '/contact?addon=seo-refresh' },
          },
          {
            name: 'Mobile Audit + Fix',
            price: '$595',
            priceNote: 'one-time · 5-day delivery',
            description: 'Full mobile audit with on-the-spot fixes. Most sites lose 40-60% of mobile traffic to bad mobile UX.',
            features: [
              { label: 'Audit on real iOS + Android devices', included: true },
              { label: 'Touch target, font sizing, viewport fixes', included: true },
              { label: 'Mobile Core Web Vitals optimization', included: true },
              { label: 'Before / after mobile-only Lighthouse report', included: true },
            ],
            cta: { label: 'Order Mobile Fix', href: '/contact?addon=mobile' },
          },
        ],
      },
      // Calendly at the end of the page
      calendly({
        headline: 'Want to scope a project?',
        description: 'Thirty minutes. We talk through what you need, what it costs, and whether we are a fit.',
        mode: 'inline',
      }),
      {
        blockType: 'cta',
        headline: 'Or send us a note instead.',
        primaryCta: { label: 'Get in touch', href: '/contact' },
        variant: 'default',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80',
      },
    ],
  }
  const servicesExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'services' } }, limit: 1 })
  if (servicesExisting.totalDocs === 0) { await payload.create({ collection: 'pages', data: servicesData }); log.push('created services') }
  else { await payload.update({ collection: 'pages', id: servicesExisting.docs[0].id, data: servicesData }); log.push('updated services') }

  // ── FAQS ───────────────────────────────────────────────────────
  // Centralized FAQ collection. Drives every FAQ block on the site (set
  // to mode='auto'). Idempotent: each FAQ is upserted by question text,
  // so editors can edit a question in the admin without their changes
  // being clobbered the next time this seed runs (it'll only OVERWRITE
  // if the question text matches an existing entry exactly — re-word a
  // question in admin and the seed becomes a no-op for it).
  //
  // sortOrder controls display order. Spaced by 10s so it's easy to slot
  // a new FAQ in the middle without renumbering everyone.
  const FAQ_SEED: Array<{ question: string; answer: string; category: 'pricing' | 'process' | 'ownership' | 'care'; sortOrder: number }> = [
    {
      category: 'pricing',
      sortOrder: 10,
      question: 'What’s included in the Starter Site at $1,495?',
      answer: 'Up to 5 bespoke pages, Payload CMS so your team can edit every section, Google Business Profile setup, LocalBusiness schema markup, contact form pre-wired with GA4 conversion tracking, mobile-first responsive design, and 14-day delivery — guaranteed in writing.',
    },
    {
      category: 'pricing',
      sortOrder: 20,
      question: 'What does “founding-client pricing” mean?',
      answer: 'For our first 5 clients, every package is discounted ($1,495 instead of $1,950 for Starter, $3,500 instead of $4,500 for Pro). In exchange, you provide a Google review at launch, a written testimonial, and case-study permission. Founding clients also lock their Care + SEO retainer rate for 12 months.',
    },
    {
      category: 'pricing',
      sortOrder: 30,
      question: 'What’s the difference between Starter and Pro?',
      answer: 'Starter = 5 pages, 14-day delivery, $1,495. Pro = up to 12 pages, 21-day delivery, full blog/CMS system, case study templates, plus 30 days of SEO content writing — $3,500. Pro is for businesses that already invest in content or have multiple locations.',
    },
    {
      category: 'pricing',
      sortOrder: 40,
      question: 'Do you take payment plans?',
      answer: 'Yes. Starter Site splits as 50%/50% or 3 monthly payments of $695. Pro Site splits 50%/50% or 4 monthly payments of $1,200. SEO Sprints split 50%/50%. No interest, no fees.',
    },
    {
      category: 'pricing',
      sortOrder: 50,
      question: 'What if I need more than 12 pages or something custom?',
      answer: 'The Custom Build tier starts at $9,500 and is for web apps, multi-location enterprise builds, multi-language sites, or custom integrations beyond the Pro Site scope. We start with a discovery + scoping engagement, then send a fixed-price proposal — and we say no when it doesn’t fit.',
    },
    {
      category: 'pricing',
      sortOrder: 60,
      question: 'Do you work with enterprise / mid-market clients?',
      answer: 'Yes — we’re open to engagements of every size. The packaged tiers cover most small-business needs; for larger or more complex builds, send a note and we’ll scope it custom.',
    },
    {
      category: 'process',
      sortOrder: 70,
      question: 'How does the engagement actually work?',
      answer: '1) 30-minute discovery call. 2) Fixed-price proposal within 48 hours. 3) Signed contract, 50% deposit (or first monthly), kickoff within a week. 4) Mockups for every page — you approve before any code is written. 5) Site live in 14 days (Starter) or 21 days (Pro).',
    },
    {
      category: 'process',
      sortOrder: 80,
      question: 'What if I don’t like the design?',
      answer: 'You see a mockup before any code is written. If the mockup isn’t right, we iterate until it is. The 14-day clock doesn’t start until you approve the design direction.',
    },
    {
      category: 'process',
      sortOrder: 90,
      question: 'Where are you based — and do you take remote clients?',
      answer: 'Houston, Texas. Most of our clients are remote, across the U.S. and a few international. Time zones are rarely an issue.',
    },
    {
      category: 'ownership',
      sortOrder: 100,
      question: 'Do I own the code?',
      answer: 'Yes. The code lives in a GitHub repo we hand over to you on launch. No proprietary lock-in, no hosting hostage situations — you can take it anywhere.',
    },
    {
      category: 'ownership',
      sortOrder: 110,
      question: 'What CMS do you use, and can my team edit it?',
      answer: 'Payload CMS. Every section of the site is a “block” your team can edit, reorder, or remove from a clean admin dashboard — no developer required for copy, image, or pricing changes.',
    },
    {
      category: 'ownership',
      sortOrder: 120,
      question: 'Can you work with my existing brand?',
      answer: 'Yes. If you have a logo, color palette, and fonts, we use them. If you don’t, we can scope a brand kit as part of the build.',
    },
    {
      category: 'care',
      sortOrder: 130,
      question: 'What does ongoing care cost?',
      answer: 'Care plan starts at $149/mo (managed hosting, automated daily backups, monitoring, 1 hour of edits per month). Growth at $495/mo bumps it to 5 hours of dev or SEO work. Scale at $1,295/mo bumps to 10 hours plus a monthly strategy call. All month-to-month, cancel any time.',
    },
    {
      category: 'care',
      sortOrder: 140,
      question: 'How do I get started?',
      answer: 'Book a 30-minute discovery call at blackhartconsulting.com, send a note to hello@blackhartconsulting.com, or call (866) 434-9777. We’ll scope your project, ballpark a price, and tell you whether we’re a fit — no hard sell.',
    },
  ]

  for (const f of FAQ_SEED) {
    const existing = await payload.find({
      collection: 'faqs',
      where: { question: { equals: f.question } },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'faqs', data: { ...f, featured: true } as any })
    } else {
      // Don't clobber edits — only update sortOrder + category to keep the
      // canonical structure in sync. Question + answer are admin-controlled
      // after first seed.
      await payload.update({
        collection: 'faqs',
        id: existing.docs[0].id,
        data: { sortOrder: f.sortOrder, category: f.category, featured: true } as any,
      })
    }
  }
  log.push(`seeded ${FAQ_SEED.length} faqs (idempotent)`)

  // ── LANDING PAGES ──────────────────────────────────────────────
  for (const lp of LANDING_PAGES) {
    const lpData = { ...makeNicheLandingPage(lp), _status: 'published' }
    const existing = await payload.find({
      collection: 'landingPages',
      where: { slug: { equals: lp.slug } },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'landingPages', data: lpData as any })
      log.push(`created /lp/${lp.slug}`)
    } else {
      await payload.update({ collection: 'landingPages', id: existing.docs[0].id, data: lpData as any })
      log.push(`updated /lp/${lp.slug}`)
    }
  }

  // Invalidate every cached payload-cache tag so the next request reads fresh
  // data instead of waiting for the 60s TTL. Matches the tags declared in
  // src/lib/payload-cache.ts.
  for (const tag of [
    'globals',
    'global:siteSettings',
    'global:footer',
    'pages',
    'landingPages',
    'projects',
    'articles',
    'testimonials',
    'faqs',
  ]) {
    revalidateTag(tag)
  }
  log.push('revalidated cache tags')

  return NextResponse.json({ ok: true, actions: log })
}
