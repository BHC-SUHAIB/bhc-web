/* eslint-disable @typescript-eslint/no-explicit-any */
/* Seed initial content: admin user, globals (header/footer/settings), home page,
 * services/about/contact pages, sample projects, sample testimonials, AND a
 * full set of niche-specific landing pages (express, dental, med spa,
 * restaurant, real estate). Each LP is a CMS-driven entry in the LandingPages
 * collection — editors can clone, tweak, and create new LPs from the admin
 * without touching code. The (lp)/lp/[slug] dynamic route serves them.
 *
 * Run locally:
 *   npx tsx src/seed/seed.ts
 *
 * Idempotent: if a record exists by slug it's updated; otherwise created.
 */

import { getPayload } from 'payload'
import config from '../payload.config'

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@blackhartconsulting.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'changeme123!'

const rt = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: [{ type: 'text', text, format: 0, version: 1 }],
      },
    ],
    direction: 'ltr',
  },
})

// ───────────────────────────────────────────────────────────────────────
// Shared block fragments
// ───────────────────────────────────────────────────────────────────────

// Founding-client banner — same pricing offer rendered identically across the
// homepage and every niche LP. Driven by a shared block so the spot counter
// stays consistent.
const FOUNDING_BANNER = {
  blockType: 'foundingClient',
  eyebrow: 'Heights Founding Client Pricing',
  headline: 'First 5 small businesses save up to $1,000.',
  description:
    'A temporary discount for our first cohort of Heights clients. Trades a lower price for a Google review, a written testimonial, and case-study permission — exactly the assets we need most right now.',
  spotsTotal: 5,
  spotsRemaining: 5,
  offers: [
    { name: 'Starter Site', priceFounding: '$1,495', priceRetail: '$1,950', savings: 'Save $455' },
    { name: 'The Pro Site', priceFounding: '$3,500', priceRetail: '$4,500', savings: 'Save $1,000' },
    { name: 'Local SEO Sprint', priceFounding: '$1,195', priceRetail: '$1,495', savings: 'Save $300' },
    { name: 'All Care plans', priceFounding: 'Free', priceRetail: '$149/mo', savings: 'First month free' },
  ],
  cta: { label: 'Claim a founding spot', href: '/contact' },
}

// Bundle offer — combines website build with care or SEO at a discount.
// Two bundles only: anything more becomes a decision-paralysis problem.
const BUNDLES = {
  blockType: 'bundleOffer',
  eyebrow: 'Bundle & save',
  headline: 'Bundle the build with what comes after.',
  description:
    'Most clients add a Care plan and a Local SEO Sprint within their first 90 days anyway. Bundling locks the discount in up front.',
  bundles: [
    {
      name: 'Site + Care',
      tagline: 'Build it, then keep it healthy. The default for most small businesses.',
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

// Standard contact form for niche LPs. Compact — no company / project type /
// budget fields because LP buyers are converting on price + niche fit, not
// scoping a custom build.
const LP_CONTACT_FORM = {
  blockType: 'contactForm',
  eyebrow: 'Ready to talk?',
  headline: 'Tell us about your business.',
  description:
    "A sentence or two about what you do and what you're trying to fix. We'll reply within one business day with next steps.",
  successMessage:
    "Thanks — we'll be in touch within one business day. In the meantime, feel free to text the number below if you'd rather chat.",
  showCompanyField: true,
  showProjectTypeField: false,
  showBudgetField: false,
  submitLabel: 'Send inquiry',
}

// Niche-specific factory — produces a complete LP layout from a small set of
// inputs. Keeps every niche page consistent in structure so the admin UX is
// predictable and editors can create new niche pages by copying any existing
// LandingPage record and tweaking 5-6 fields.
type NicheLpInput = {
  title: string
  slug: string
  niche: string
  campaign: string
  metaTitle: string
  metaDescription: string
  heroEyebrow: string
  heroHeadline: string
  heroSub: string
  heroBackgroundUrl: string
  heroPrimaryCta: { label: string; href: string }
  heroSecondaryCta?: { label: string; href: string }
  starterFeatures: string[] // 5-7 niche-specific deliverables for the Starter Site tier
  faqItems: Array<{ question: string; answer: string }>
}

function makeNicheLandingPage(input: NicheLpInput) {
  return {
    title: input.title,
    slug: input.slug,
    niche: input.niche,
    campaign: input.campaign,
    publishedAt: new Date().toISOString(),
    seo: {
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      noIndex: true,
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: input.heroEyebrow,
        headline: input.heroHeadline,
        subheadline: input.heroSub,
        align: 'left',
        backgroundImageUrl: input.heroBackgroundUrl,
        overlayStrength: 'medium',
        ctas: [
          { label: input.heroPrimaryCta.label, href: input.heroPrimaryCta.href, variant: 'primary' },
          ...(input.heroSecondaryCta
            ? [{ label: input.heroSecondaryCta.label, href: input.heroSecondaryCta.href, variant: 'ghost' }]
            : []),
        ],
      },
      FOUNDING_BANNER,
      {
        blockType: 'pricing',
        eyebrow: 'The offer',
        headline: 'One package, one price, fourteen days.',
        description:
          'No hourly bills, no scope creep. Fixed price, fixed timeline, senior-engineer sign-off on every line of code.',
        tiers: [
          {
            name: 'Starter Site',
            price: '$1,495',
            priceNote: 'founding price · was $1,950',
            description: '5-page small business website, mobile-first, live in 14 days.',
            highlighted: true,
            features: input.starterFeatures.map((label) => ({ label, included: true })),
            cta: { label: 'Claim a founding spot', href: '/contact' },
          },
        ],
      },
      {
        blockType: 'stats',
        eyebrow: 'What you get',
        items: [
          { value: '14 days', label: 'From kickoff to launch', description: 'Founding clients delivered first.' },
          { value: '<200KB', label: 'First-paint JavaScript', description: 'Fast on the worst phone in your customer base.' },
          { value: '$0', label: 'In hidden fees', description: 'Hosting first month free. No scope creep clauses.' },
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
        items: input.faqItems,
      },
      LP_CONTACT_FORM,
      {
        blockType: 'cta',
        headline: 'Ready when you are.',
        description: 'Founding-client pricing ends when we hit 5 small businesses. Right now, that means a lower price and a faster project.',
        primaryCta: { label: 'Claim a founding spot', href: '/contact' },
        secondaryCta: { label: 'See recent work', href: '/portfolio' },
        variant: 'emphasized',
      },
    ],
  }
}

// ───────────────────────────────────────────────────────────────────────
// Main run
// ───────────────────────────────────────────────────────────────────────

async function run() {
  const payload = await getPayload({ config })

  console.log('Seeding Black Hart Consulting content...')

  // Admin user
  const usersRes = await payload.find({ collection: 'users', limit: 1 })
  if (usersRes.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Admin' as any },
    })
    console.log(`  created admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  }

  // Site settings
  await payload.updateGlobal({
    slug: 'siteSettings',
    data: {
      siteName: 'Black Hart Consulting',
      tagline: 'Heights small business websites — in 14 days, from $1,495.',
      defaultMetaDescription:
        'Houston Heights web designer building fast, fixed-price websites for small businesses. 14-day delivery. Hosting, SEO, and care plans included.',
      defaultTheme: 'dark',
      contactEmail: 'hello@blackhartconsulting.com',
      contactPhone: '(346) 555-0142',
    } as any,
  })

  // Header
  await payload.updateGlobal({
    slug: 'header',
    data: {
      nav: [
        { label: 'Services', href: '/services' },
        { label: 'Portfolio', href: '/portfolio' },
        { label: 'Pricing', href: '/#pricing' },
        { label: 'Contact', href: '/contact' },
      ],
      cta: { show: true, label: 'Claim a founding spot', href: '/contact' },
    } as any,
  })

  // Footer
  await payload.updateGlobal({
    slug: 'footer',
    data: {
      tagline: 'Heights small business websites in 14 days. Built by humans, hosted by us, kept fast forever.',
      columns: [
        { heading: 'Services', links: [
          { label: 'Website design & build', href: '/services#web' },
          { label: 'Local SEO Sprint', href: '/services#seo' },
          { label: 'Care plans', href: '/services#care' },
          { label: 'Quick-win add-ons', href: '/services#addons' },
        ] },
        { heading: 'For your business', links: [
          { label: 'Dental practices', href: '/lp/heights-dental' },
          { label: 'Med spas', href: '/lp/heights-med-spa' },
          { label: 'Restaurants & cafés', href: '/lp/heights-restaurant' },
          { label: 'Real estate teams', href: '/lp/heights-real-estate' },
        ] },
        { heading: 'Studio', links: [
          { label: 'Portfolio', href: '/portfolio' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
          { label: 'Articles', href: '/articles' },
        ] },
      ],
      social: [
        { platform: 'linkedin', href: 'https://linkedin.com/company/blackhartconsulting' },
        { platform: 'github', href: 'https://github.com/blackhartconsulting' },
        { platform: 'email', href: 'mailto:hello@blackhartconsulting.com' },
      ],
      copyright: `© ${new Date().getFullYear()} Black Hart Consulting LLC · Houston, TX`,
    } as any,
  })

  // ──────────────────────────────────────────────────────────────────
  // HOME PAGE — full rewrite with new pricing, founding banner, bundles
  // ──────────────────────────────────────────────────────────────────
  const homeExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })
  const homeData: any = {
    title: 'Home',
    slug: 'home',
    publishedAt: new Date().toISOString(),
    seo: {
      metaTitle: 'Black Hart Consulting — Heights small business websites, in 14 days',
      metaDescription:
        'Houston Heights web designer. Fixed-price small business websites built in 14 days, from $1,495. Founding-client discount for the first 5 small businesses.',
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Houston Heights · Small Business Web Design',
        headline: 'Heights small business websites — in 14 days, from $1,495.',
        subheadline:
          "We build fast, focused, fixed-price websites for the small businesses that make the Heights what it is. One developer, one engagement manager, one bill. No agency layers, no surprise costs, no six-week design sprints.",
        align: 'left',
        backgroundImageUrl:
          'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1920&q=80',
        overlayStrength: 'heavy',
        ctas: [
          { label: 'Claim a founding spot', href: '/contact', variant: 'primary' },
          { label: 'See the offer', href: '/#pricing', variant: 'ghost' },
        ],
      },
      FOUNDING_BANNER,
      {
        blockType: 'stats',
        eyebrow: 'How we work',
        headline: 'Three things we promise.',
        items: [
          { value: '14 days', label: 'Site live, every time', description: 'Fixed scope, fixed price, fixed launch date. Founding clients shipped first.' },
          { value: '<200KB', label: 'First-paint JavaScript', description: 'Your site loads under a second on the worst phone in your customer base.' },
          { value: 'Same-week', label: 'Edits after launch', description: 'Need a price changed, hours updated, photo swapped? Done within five business days.' },
        ],
      },
      {
        blockType: 'services',
        eyebrow: 'What we do',
        headline: 'Built for small businesses, not enterprise.',
        description:
          "We picked our scope on purpose. Every offer below is sized for an owner-operated business that wants their site to stop being a problem and start being a tool.",
        items: [
          { title: 'Website design & build', icon: 'globe', description: '5-page small business sites or 12-page pro sites. Mobile-first, fast, on a CMS your team actually uses.', bullets: [
            { label: 'Custom design tuned to your brand' },
            { label: 'Block-based CMS — every section editable' },
            { label: 'Performance budget enforced — under 1s loads' },
          ] },
          { title: 'Local SEO', icon: 'search', description: 'GBP setup, schema, citations, content. Built for businesses competing inside Houston, not nationally.', bullets: [
            { label: 'Google Business Profile complete optimization' },
            { label: 'LocalBusiness schema + 10 citation submissions' },
            { label: 'Cornerstone service / location pages' },
          ] },
          { title: 'Care plans', icon: 'shield', description: 'Hosting, monitoring, backups, and ongoing edits — so your site keeps working without you thinking about it.', bullets: [
            { label: 'Managed hosting + automated daily backups' },
            { label: 'Monthly performance + uptime report' },
            { label: '1–6 hours of edits per month, depending on plan' },
          ] },
          { title: 'Quick-win add-ons', icon: 'zap', description: 'Fixed-price productized fixes for specific pain. From $295. Shipped in 3–7 days.', bullets: [
            { label: 'GBP setup • schema markup • site speed sprint' },
            { label: 'GA4 + conversion tracking • mobile audit' },
            { label: '5-page SEO refresh • fixable in a week' },
          ] },
        ],
      },
      {
        blockType: 'pricing',
        eyebrow: 'Pricing',
        headline: 'Three sites. One you.',
        description:
          'Custom quotes exist for bigger work — but most Heights small businesses fit one of these. Founding-client pricing applies to all three through the first 5 clients.',
        tiers: [
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
            priceNote: 'founding · was $1,950 · 14-day build',
            description: 'The most-bought tier. A 5-page site that handles 90% of small business needs.',
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
            name: 'The Pro Site',
            price: '$3,500',
            priceNote: 'founding · was $4,500 · 21-day build',
            description: 'For established small businesses ready to invest in content + SEO. Multi-location welcome.',
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
        ],
      },
      BUNDLES,
      {
        blockType: 'featuredProjects',
        eyebrow: 'Recent work',
        headline: 'A few projects we’re proud of.',
        description: 'The short version is below. Each case study covers what we shipped, why it works, and what changed for the client.',
        mode: 'latest',
        limit: 3,
        viewAllLabel: 'View all projects',
        viewAllHref: '/portfolio',
      },
      {
        blockType: 'testimonials',
        eyebrow: 'Clients',
        headline: 'What they said after launch.',
        mode: 'latest',
        limit: 3,
      },
      {
        blockType: 'faq',
        eyebrow: 'Common questions',
        headline: 'Everything you wanted to ask.',
        items: [
          { question: 'What’s included in the Starter Site?', answer: 'Up to 5 bespoke pages, Payload CMS so your team can edit every section, Google Business Profile setup, LocalBusiness schema markup, contact form with GA4 conversion tracking, mobile-first responsive design, and 14-day delivery guaranteed. First month of hosting is free.' },
          { question: 'What does “founding-client pricing” actually mean?', answer: 'For our first 5 small business clients in the Heights, every package is discounted. In exchange, you provide a Google review at launch, a written testimonial we can publish, and permission to use the work as a case study. After 5 clients, prices return to retail.' },
          { question: 'Do you take payment plans?', answer: 'Yes. Starter Site splits as 50% deposit + 50% on launch, or 3 monthly payments of $695. The Pro Site splits as 50% deposit + 50% on launch, or 4 monthly payments of $1,200. All via Stripe.' },
          { question: 'What if I need more than 5 pages?', answer: 'The Pro Site handles up to 12. Beyond that we quote custom — most clients don’t need more than 12 pages, but we’ll tell you up front if your scope is bigger.' },
          { question: 'Can I edit the site after launch?', answer: 'Yes. Every site ships with a full Payload CMS — you can add, remove, and reorder sections, change copy, swap images, publish blog posts, and edit pricing without touching code.' },
          { question: 'Where are you based?', answer: 'Houston Heights. Most clients are local Heights businesses; some are remote and we’ve shipped projects across Texas, the US, and a few internationally. Time zones are rarely an issue.' },
        ],
      },
      {
        blockType: 'cta',
        headline: 'Let’s talk about your site.',
        description: 'No hard sell. A 30-minute call where we figure out what you need, what it would cost, and whether we’re a fit.',
        primaryCta: { label: 'Claim a founding spot', href: '/contact' },
        secondaryCta: { label: 'See the portfolio', href: '/portfolio' },
        variant: 'emphasized',
      },
    ],
  }

  if (homeExisting.totalDocs === 0) {
    await payload.create({ collection: 'pages', data: homeData })
    console.log('  created home page')
  } else {
    await payload.update({ collection: 'pages', id: homeExisting.docs[0].id, data: homeData })
    console.log('  updated home page')
  }

  // ──────────────────────────────────────────────────────────────────
  // ABOUT PAGE
  // ──────────────────────────────────────────────────────────────────
  const aboutExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 1 })
  const aboutData: any = {
    title: 'About',
    slug: 'about',
    publishedAt: new Date().toISOString(),
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'About',
        headline: 'Built in the Heights, for the Heights.',
        subheadline:
          'A solo studio with senior-grade craft, a fixed-price model, and an obsession with sites that load fast and convert better.',
        align: 'left',
      },
      {
        blockType: 'richText',
        maxWidth: 'prose',
        content: rt(
          'Black Hart Consulting was founded to give Houston small businesses the same level of web craft that was previously only available to enterprise. We don’t do six-week design sprints, we don’t hand you off to a different account manager every quarter, and we don’t bill hourly. You hire one person, get a fixed price, and your site goes live in 14 days.',
        ),
      },
      {
        blockType: 'stats',
        items: [
          { value: '2026', label: 'Founded' },
          { value: 'Heights', label: 'Houston, TX' },
          { value: 'Solo', label: 'Senior craft, no agency layers' },
        ],
      },
      {
        blockType: 'cta',
        headline: 'Want to work together?',
        primaryCta: { label: 'Get in touch', href: '/contact' },
      },
    ],
  }
  if (aboutExisting.totalDocs === 0) { await payload.create({ collection: 'pages', data: aboutData }); console.log('  created about page') }
  else { await payload.update({ collection: 'pages', id: aboutExisting.docs[0].id, data: aboutData }); console.log('  updated about page') }

  // ──────────────────────────────────────────────────────────────────
  // CONTACT PAGE
  // ──────────────────────────────────────────────────────────────────
  const contactExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'contact' } }, limit: 1 })
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
          'A sentence on what you do, a sentence on what you’re trying to fix or build, and a rough budget if you have one. We’ll reply within one business day.',
        align: 'left',
      },
      {
        blockType: 'contactForm',
        eyebrow: 'Project inquiry',
        headline: 'Start the conversation.',
        description:
          'Replies usually within an hour during business hours. Definitely within one business day.',
        showCompanyField: true,
        showProjectTypeField: true,
        showBudgetField: true,
        submitLabel: 'Send inquiry',
      },
      {
        blockType: 'faq',
        headline: 'Before you write:',
        items: [
          { question: 'What should I include in my first note?', answer: 'A sentence on your business, a sentence on what you’re trying to build or fix, and a rough budget range if you have one. We’ll take it from there.' },
          { question: 'What’s the engagement process?', answer: '1) 30-min intro call. 2) We send a scoped proposal within 48 hours. 3) You review, we iterate. 4) Signed contract, 50% deposit (or first monthly payment), kickoff within a week. 5) Site live in 14 days for the Starter Site, 21 days for Pro Site.' },
          { question: 'Do you take payment plans?', answer: 'Yes. Starter Site splits as 50% / 50% or 3 monthly payments. The Pro Site splits the same way over 4 months. SEO Sprints split 50% / 50%. All via Stripe.' },
        ],
      },
    ],
  }
  if (contactExisting.totalDocs === 0) { await payload.create({ collection: 'pages', data: contactData }); console.log('  created contact page') }
  else { await payload.update({ collection: 'pages', id: contactExisting.docs[0].id, data: contactData }); console.log('  updated contact page') }

  // ──────────────────────────────────────────────────────────────────
  // SERVICES PAGE — deep dive on every offering
  // ──────────────────────────────────────────────────────────────────
  const servicesExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'services' } }, limit: 1 })
  const servicesData: any = {
    title: 'Services',
    slug: 'services',
    publishedAt: new Date().toISOString(),
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Services',
        headline: 'Everything we do, with prices.',
        subheadline: 'No “contact us for pricing.” Real numbers, real timelines, real deliverables.',
        align: 'left',
      },
      // Website tiers
      {
        blockType: 'pricing',
        eyebrow: 'Website packages',
        headline: 'Three websites. Pick the one that fits.',
        description: 'Founding-client pricing applies to all three through the first 5 clients.',
        tiers: (homeData.layout as any[]).find((b) => b.blockType === 'pricing')?.tiers ?? [],
      },
      // Care plans
      {
        blockType: 'pricing',
        eyebrow: 'Care plans',
        headline: 'After launch — keep it running.',
        description: 'Bundled with every site at a discount, but standalone pricing if you want to skip Care or upgrade later.',
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
            description: 'For revenue-critical sites needing a partner on call.',
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
      // SEO
      {
        blockType: 'pricing',
        eyebrow: 'Local SEO',
        headline: 'Local SEO — from sprint to scale.',
        description: 'Most Heights small businesses start with the Sprint. The monthly tiers exist for businesses ready to compete harder.',
        tiers: [
          {
            name: 'Local SEO Sprint',
            price: '$1,195',
            priceNote: 'one-time · founding price · 2-week delivery',
            description: 'A full local SEO setup, delivered as a one-time engagement. No monthly contract.',
            highlighted: true,
            features: [
              { label: 'Full local SEO audit (delivered as PDF)', included: true },
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
              { label: 'AI-search optimization (LLM citation focus)', included: true },
              { label: 'Conversion tracking dashboard', included: true },
            ],
            cta: { label: 'Start SEO Growth', href: '/contact?seo=growth' },
          },
        ],
      },
      // Add-ons
      {
        blockType: 'pricing',
        eyebrow: 'Quick-win add-ons',
        headline: 'Fixed-price productized fixes.',
        description: 'For specific pain points. Sold standalone or as project upsells. All shipped in 3-7 days.',
        tiers: [
          {
            name: 'Google Business Profile Setup',
            price: '$295',
            priceNote: 'one-time · 3-day delivery',
            description: 'Complete GBP setup or audit + repair. Photos, services, hours, schema, and review-request automation.',
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
            description: 'Make your existing site faster. Often the highest-ROI thing you can do for SEO + conversion.',
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
        ],
      },
      {
        blockType: 'cta',
        headline: 'Talk to us about your project.',
        primaryCta: { label: 'Get in touch', href: '/contact' },
        variant: 'default',
      },
    ],
  }
  if (servicesExisting.totalDocs === 0) { await payload.create({ collection: 'pages', data: servicesData }); console.log('  created services page') }
  else { await payload.update({ collection: 'pages', id: servicesExisting.docs[0].id, data: servicesData }); console.log('  updated services page') }

  // ──────────────────────────────────────────────────────────────────
  // LANDING PAGES — express + 4 niche LPs
  // ──────────────────────────────────────────────────────────────────

  const landingPages: NicheLpInput[] = [
    {
      title: 'Express Website (Heights)',
      slug: 'express-website',
      niche: 'generic',
      campaign: 'Search · Web Design · US · LP Express',
      metaTitle: 'Heights Small Business Website — $1,495, 14-Day Delivery',
      metaDescription:
        'Custom 5-page small business website for Houston Heights businesses. Founding-client price $1,495 (was $1,950). 14-day delivery guaranteed.',
      heroEyebrow: 'Houston Heights · 14-Day Delivery',
      heroHeadline: 'A custom small business website. In 14 days. From $1,495.',
      heroSub:
        'Built by hand, hosted by us, kept fast forever. Founding-client pricing for the first 5 Heights small businesses.',
      heroBackgroundUrl:
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80',
      heroPrimaryCta: { label: 'Claim a founding spot', href: '/contact?tier=starter' },
      heroSecondaryCta: { label: 'See the deliverables', href: '#pricing' },
      starterFeatures: [
        '5 bespoke pages designed for your business',
        'Mobile-first, under 200KB JavaScript',
        'Block-based CMS — your team edits every section',
        'Google Business Profile setup + LocalBusiness schema',
        'Contact form + GA4 + conversion tracking pre-wired',
        'First month of hosting free, then $99/mo bundle price',
        '14-day delivery, guaranteed in writing',
      ],
      faqItems: [
        { question: 'What if I don’t like the design?', answer: 'You see a Figma mockup before any code is written. If the mockup isn’t right, we iterate until it is. The 14-day clock doesn’t start until you approve the design direction.' },
        { question: 'Do I own the code?', answer: 'Yes. The code lives in a GitHub repo we hand over to you on launch. No proprietary lock-in. You can host it anywhere — but most clients keep us as their host because it’s already optimized.' },
        { question: 'Can you work with my existing brand?', answer: 'Yes. If you have a logo, color palette, and fonts, we use them. If not, we recommend a small design system as part of the project (typically $300 add-on).' },
        { question: 'What’s the next step?', answer: 'Send a quick note via the form below. We’ll reply within one business day with a calendar link for a 30-minute intro call. From the call, you get a written proposal within 48 hours.' },
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
      heroSub:
        'Built around what dental patients actually need: online booking, insurance verification, before/after photos, and a phone number that’s easy to find. Founding-client pricing for the first 5 Heights practices.',
      heroBackgroundUrl:
        'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80',
      heroPrimaryCta: { label: 'Claim a founding spot', href: '/contact?niche=dental' },
      heroSecondaryCta: { label: 'See what’s included', href: '#pricing' },
      starterFeatures: [
        '5 pages: Home, Services, About, New Patients, Contact',
        'Online booking integration (Dentrix / Open Dental compatible)',
        'Insurance accepted list (configurable in CMS)',
        'Before / after photo gallery with HIPAA-safe handling',
        'Patient testimonial section + Google review automation',
        'Mobile-first, under 200KB JavaScript',
        'GBP setup + Dentist + LocalBusiness schema',
        'New-patient form with HIPAA-safe submission',
      ],
      faqItems: [
        { question: 'Is the patient form HIPAA compliant?', answer: 'The form itself doesn’t collect PHI by default — just name, email, phone, and a free-text note. If you want to collect insurance details or symptoms, we use a HIPAA-compliant form provider (TypeForm Healthcare, Jotform HIPAA, or your existing patient portal).' },
        { question: 'Can you migrate my existing patient reviews?', answer: 'Yes. We pull verified Google reviews into a homepage carousel automatically. If you have testimonials elsewhere (Yelp, ZocDoc), we can import those too.' },
        { question: 'Do you handle GoodReceptionist / online booking integration?', answer: 'Yes. We work with Dentrix Ascend, Open Dental, NexHealth, and most modern PMS systems for online booking widgets. If you’re on something specific, tell us in the inquiry form.' },
        { question: 'How fast will new patients actually find us?', answer: 'GBP optimization + Dentist schema usually moves a Heights practice into the local 3-pack within 2-4 weeks. Real new-patient acquisition follows in months 2-3 as Google trusts the changes.' },
      ],
    },
    {
      title: 'Heights Med Spa Websites',
      slug: 'heights-med-spa',
      niche: 'medspa',
      campaign: 'Search · Med Spa · Heights',
      metaTitle: 'Med Spa Websites in Houston Heights — Online Booking, $1,495',
      metaDescription:
        'Custom med spa websites for Houston Heights aesthetic clinics. Online booking, gift cards, treatment packages. 14-day delivery, $1,495 founding price.',
      heroEyebrow: 'For Houston Heights Med Spas',
      heroHeadline: 'A med spa website that fills your appointment book.',
      heroSub:
        'Online booking front and center, gift cards that actually convert, treatment packages that don’t require a sales call. Founding-client pricing for the first 5 Heights clinics.',
      heroBackgroundUrl:
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1920&q=80',
      heroPrimaryCta: { label: 'Claim a founding spot', href: '/contact?niche=medspa' },
      heroSecondaryCta: { label: 'See what’s included', href: '#pricing' },
      starterFeatures: [
        '5 pages: Home, Treatments, Pricing, About, Contact',
        'Online booking integration (Vagaro, Mindbody, Square)',
        'Gift card e-commerce (Stripe-powered)',
        'Treatment package builder with transparent pricing',
        'Before / after gallery with consent tracking',
        'GBP setup + MedicalBusiness + Service schema',
        'Mother’s Day / holiday landing page templates',
        'Mobile-first, fast on every customer’s phone',
      ],
      faqItems: [
        { question: 'Will online booking work with my existing scheduling system?', answer: 'Yes — we integrate with Vagaro, Mindbody, Square Appointments, and Acuity out of the box. If you’re on something custom, tell us and we’ll quote the integration.' },
        { question: 'Can I sell gift cards online?', answer: 'Yes. Gift cards are a major revenue lever for med spas — most clinics 5-10x their gift card revenue once it’s available online. We use Stripe to handle delivery, redemption, and balance tracking. Funds land in your account same-week.' },
        { question: 'How do you handle before/after photos legally?', answer: 'We build a consent-tracking system into the gallery. Each photo includes a backend record of the patient’s signed consent (uploaded as a PDF). You can show photos publicly with full audit trail.' },
        { question: 'Will the site help me rank for treatment-specific searches?', answer: 'Yes. Each treatment gets its own page with Service + Offer schema. People searching “Botox Heights”, “microneedling Houston”, etc. find your treatment-specific page directly, not a buried subcategory.' },
      ],
    },
    {
      title: 'Heights Restaurant & Café Websites',
      slug: 'heights-restaurant',
      niche: 'restaurant',
      campaign: 'Search · Restaurant · Heights',
      metaTitle: 'Restaurant Websites in Houston Heights — Reservations + Online Ordering',
      metaDescription:
        'Custom websites for Houston Heights restaurants and cafés. Online reservations, native menu (not PDF), online ordering. $1,495 founding price.',
      heroEyebrow: 'For Houston Heights Restaurants & Cafés',
      heroHeadline: 'A restaurant website hungry diners actually use.',
      heroSub:
        'Native HTML menu (not PDF) so Google can index it, online reservations, and integration with whatever ordering platform you use. Founding-client pricing for the first 5 Heights restaurants.',
      heroBackgroundUrl:
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80',
      heroPrimaryCta: { label: 'Claim a founding spot', href: '/contact?niche=restaurant' },
      heroSecondaryCta: { label: 'See what’s included', href: '#pricing' },
      starterFeatures: [
        '5 pages: Home, Menu, Story, Reservations, Visit',
        'Native HTML menu with Menu schema (not a PDF)',
        'OpenTable / Resy / Tock reservation integration',
        'DoorDash / GrubHub / UberEats deep links',
        'Events page for private bookings + bookable form',
        'GBP setup + Restaurant + LocalBusiness schema',
        'Mobile-first menu (most diners are on a phone)',
        'Email signup for daily specials / new menu drops',
      ],
      faqItems: [
        { question: 'Why does it matter that the menu is HTML, not PDF?', answer: 'Google can’t fully index PDFs the way it indexes HTML pages. With a native menu, your dishes show up in “gyro near me”, “breakfast Heights”, and similar searches. PDFs are essentially invisible. This single change typically drives a 15-30% lift in organic traffic for restaurants.' },
        { question: 'Can the menu be updated easily?', answer: 'Yes. Items, prices, descriptions, and dietary tags are all editable in the CMS. Update your daily specials in the morning before service, no developer involved.' },
        { question: 'Do you integrate with DoorDash / GrubHub / UberEats?', answer: 'Yes — typically as deep links from your site to your existing storefronts on each platform. If you want a unified ordering experience on your own site, we use ChowNow or the Stripe-powered Snackpass alternative — quoted as an add-on.' },
        { question: 'What about catering / private events?', answer: 'Included. We build a dedicated Events page with a booking form for private bookings, plus a cateringinquiry flow that hits your inbox with all the details (date, headcount, budget, dietary requirements).' },
      ],
    },
    {
      title: 'Heights Real Estate Team Websites',
      slug: 'heights-real-estate',
      niche: 'realestate',
      campaign: 'Search · Real Estate · Heights',
      metaTitle: 'Real Estate Team Websites in Houston Heights — IDX, $1,495',
      metaDescription:
        'Custom websites for Houston Heights real estate teams and agents. IDX listings, neighborhood pages, lead capture. $1,495 founding price.',
      heroEyebrow: 'For Houston Heights Real Estate Teams',
      heroHeadline: 'A real estate site that wins listings + buyers.',
      heroSub:
        'IDX listings integration, deep neighborhood pages for the Heights, and a lead-capture flow that doesn’t feel like a trap. Founding-client pricing for the first 5 Heights teams.',
      heroBackgroundUrl:
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&q=80',
      heroPrimaryCta: { label: 'Claim a founding spot', href: '/contact?niche=realestate' },
      heroSecondaryCta: { label: 'See what’s included', href: '#pricing' },
      starterFeatures: [
        '5 pages: Home, Listings, Neighborhoods, About, Contact',
        'IDX integration (Realtyna, IDX Broker, IHF compatible)',
        'Deep Heights neighborhood pages (sub-area SEO)',
        'Property valuation lead-capture tool',
        'Agent bio pages with contact + booking',
        'GBP setup + RealEstateAgent + Place schema',
        'Mobile-first, fast even with image-heavy listings',
        'Lead-capture form + CRM webhook (Follow Up Boss / kvCORE / Boomtown)',
      ],
      faqItems: [
        { question: 'Which IDX provider do you use?', answer: 'Whichever one your MLS supports. Realtyna and IDX Broker are the most flexible for design customization. iHomeFinder works fine but constrains design more. We’ll recommend based on your MLS.' },
        { question: 'Can the site capture leads into our existing CRM?', answer: 'Yes. We webhook leads into Follow Up Boss, kvCORE, Boomtown, Salesforce, or any CRM with a webhook endpoint. Lead alerts also go to email + SMS so the team can respond fast.' },
        { question: 'Will the neighborhood pages actually rank?', answer: 'Yes — usually within 2-4 months for Heights sub-area searches like “Woodland Heights homes for sale” or “Norhill bungalows”. Each neighborhood page targets one specific micro-search and includes neighborhood-specific content + schema.' },
        { question: 'Can each agent on the team have their own profile page?', answer: 'Yes. Up to 5 agent profile pages on the Starter Site (each with photo, bio, listings, contact, booking link). The Pro Site supports unlimited agent profiles.' },
      ],
    },
  ]

  for (const lp of landingPages) {
    const lpData = makeNicheLandingPage(lp)
    const existing = await payload.find({
      collection: 'landingPages',
      where: { slug: { equals: lp.slug } },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'landingPages', data: lpData as any })
      console.log(`  created landing page: /lp/${lp.slug}`)
    } else {
      await payload.update({ collection: 'landingPages', id: existing.docs[0].id, data: lpData as any })
      console.log(`  updated landing page: /lp/${lp.slug}`)
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // SAMPLE PROJECTS (preserved from original seed)
  // ──────────────────────────────────────────────────────────────────
  const sampleProjects: any[] = [
    {
      title: 'Northlake Consulting',
      slug: 'northlake-consulting',
      summary: 'A 12-year-old Drupal site, rebuilt on Next.js. Load time dropped from 8s to 0.9s. Organic traffic up 140% in six months.',
      client: 'Northlake Consulting',
      industry: 'Professional services',
      projectType: 'website',
      year: 2025,
      duration: '7 weeks',
      teamSize: 3,
      liveUrl: 'https://northlake.example.com',
      stack: [
        { name: 'Next.js', category: 'framework' },
        { name: 'TypeScript', category: 'language' },
        { name: 'Payload CMS', category: 'cms' },
        { name: 'Postgres', category: 'db' },
        { name: 'DigitalOcean', category: 'hosting' },
        { name: 'Tailwind CSS', category: 'design' },
      ],
      challenge: rt('Northlake’s existing site was a 12-year-old Drupal 7 install on shared hosting. It took 8 seconds to load on 3G, ranked on page 4 for its primary keyword, and the marketing team couldn’t edit it without filing a developer ticket.'),
      approach: rt('We rebuilt on Next.js with Payload CMS for content management. Chose Postgres over MongoDB for transactional integrity and familiarity with the client’s existing data team. Migrated all 400 existing blog posts with 301 redirects on every URL to preserve link equity. Shipped a block-based CMS so marketing can build and edit pages without us.'),
      outcome: rt('Load time: 8.1s → 0.9s. Organic sessions: +140% in the first six months. Conversion rate from organic traffic: +62%. The marketing team now publishes without tickets — we track on average 2.3 edits per week by their team.'),
      metrics: [
        { value: '0.9s', label: 'First-load time (was 8.1s)' },
        { value: '+140%', label: 'Organic traffic, 6 months' },
        { value: '+62%', label: 'Conversion from organic' },
        { value: '100%', label: 'URL preservation (zero broken redirects)' },
      ],
      testimonial: {
        quote: 'They actually explained the trade-offs in plain language. We understood why we were picking Next.js over WordPress, not just that we were.',
        author: 'Sarah Chen',
        role: 'Head of Marketing, Northlake Consulting',
      },
      featured: true,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    },
  ]

  for (const proj of sampleProjects) {
    const existing = await payload.find({ collection: 'projects', where: { slug: { equals: proj.slug } }, limit: 1 })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: proj })
      console.log(`  created project: ${proj.slug}`)
    } else {
      await payload.update({ collection: 'projects', id: existing.docs[0].id, data: proj })
      console.log(`  updated project: ${proj.slug}`)
    }
  }

  // Sample testimonials
  const sampleTestimonials: any[] = [
    { quote: 'Six weeks from brief to production. The site loads faster than our old one even loaded its splash screen. Our bounce rate dropped 34% in the first month.', author: 'Sarah Chen', role: 'Head of Marketing', company: 'Northlake Consulting', featured: true, sortOrder: 10 },
    { quote: 'Black Hart completely transformed my website from the ground up. They built something strategic and functional that I’m actually proud to show clients.', author: 'Philip Parmar', role: 'Founder', company: 'Prometheus Minds', featured: true, sortOrder: 20 },
  ]
  for (const t of sampleTestimonials) {
    const existing = await payload.find({
      collection: 'testimonials',
      where: { and: [{ author: { equals: t.author } }, { company: { equals: t.company } }] },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'testimonials', data: t })
      console.log(`  created testimonial: ${t.author}`)
    } else {
      await payload.update({ collection: 'testimonials', id: existing.docs[0].id, data: t })
      console.log(`  updated testimonial: ${t.author}`)
    }
  }

  console.log('\n✓ Seed complete.')
  console.log(`  Admin: ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
  console.log(`  ⚠ CHANGE THE PASSWORD after first login.`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
