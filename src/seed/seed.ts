/* eslint-disable @typescript-eslint/no-explicit-any */
/* Seed initial content: admin user, globals (header/footer/settings), home page with blocks, 3 sample projects. */

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
      tagline: 'Websites, SEO, apps, and hosting \u2014 done right.',
      defaultMetaDescription: 'Websites, SEO, app design, and hosting for businesses that care how their work shows up online.',
      defaultTheme: 'dark',
    } as any,
  })

  // Header
  await payload.updateGlobal({
    slug: 'header',
    data: {
      nav: [
        { label: 'Services', href: '/services' },
        { label: 'Portfolio', href: '/portfolio' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
      cta: { show: true, label: 'Start a project', href: '/contact' },
    } as any,
  })

  // Footer
  await payload.updateGlobal({
    slug: 'footer',
    data: {
      tagline: 'Websites, SEO, and hosting for businesses that care how their work shows up online.',
      columns: [
        { heading: 'Services', links: [
          { label: 'Website design & build', href: '/services#web' },
          { label: 'SEO & search', href: '/services#seo' },
          { label: 'App design', href: '/services#apps' },
          { label: 'Hosting & infrastructure', href: '/services#hosting' },
        ] },
        { heading: 'Studio', links: [
          { label: 'Portfolio', href: '/portfolio' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
        ] },
        { heading: 'Resources', links: [
          { label: 'Articles', href: '/articles' },
          { label: 'Pricing', href: '/#pricing' },
        ] },
      ],
      social: [
        { platform: 'linkedin', href: 'https://linkedin.com/company/blackhartconsulting' },
        { platform: 'github', href: 'https://github.com/blackhartconsulting' },
        { platform: 'email', href: 'mailto:hello@blackhartconsulting.com' },
      ],
      copyright: `\u00a9 ${new Date().getFullYear()} Black Hart Consulting LLC`,
    } as any,
  })

  // Home page
  const homeExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })
  const homeData: any = {
    title: 'Home',
    slug: 'home',
    publishedAt: new Date().toISOString(),
    seo: {
      metaTitle: 'Black Hart Consulting \u2014 Websites, SEO, apps, hosting',
      metaDescription: 'Steady craft for businesses that care how their work shows up online.',
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Black Hart Consulting',
        headline: 'Websites, SEO, and hosting for businesses that care how their work shows up online.',
        subheadline: 'We design the site. We make it rank. We keep it online. One team, one bill, one line of accountability.',
        align: 'left',
        ctas: [
          { label: 'Start a project', href: '/contact', variant: 'primary' },
          { label: 'See recent work', href: '/portfolio', variant: 'ghost' },
        ],
      },
      {
        blockType: 'stats',
        eyebrow: 'Signal, not noise',
        items: [
          { value: '0.9s', label: 'Avg. first-load time', description: 'Across every site we\u2019ve shipped in the last 18 months.' },
          { value: '140%', label: 'Avg. organic traffic lift', description: 'After a full audit + rebuild engagement.' },
          { value: '6', label: 'Weeks to launch', description: 'From first brief to production for a standard site.' },
          { value: '99.99%', label: 'Uptime SLA', description: 'Redundant hosting across two regions.' },
        ],
      },
      {
        blockType: 'services',
        eyebrow: 'What we do',
        headline: 'Four disciplines, one team.',
        description: 'Most agencies hand you off to a different vendor for each service. We don\u2019t. You get one engagement manager and one bill.',
        items: [
          { title: 'Website design & build', icon: 'globe', description: 'Bespoke marketing sites and web apps built on Next.js, shipped with a CMS your team actually uses.', bullets: [
            { label: 'Design system from scratch or on top of your brand' },
            { label: 'CMS-driven content, every section editable' },
            { label: 'Performance budget \u2014 loads under 1s on 3G' },
          ] },
          { title: 'SEO & search', icon: 'search', description: 'Technical SEO audits, content strategy, and month-over-month optimization that actually moves rankings.', bullets: [
            { label: 'Full technical audit with prioritized action plan' },
            { label: 'Structured data, Core Web Vitals, crawl budget' },
            { label: 'Content architecture and internal linking' },
          ] },
          { title: 'App design & development', icon: 'smartphone', description: 'iOS, Android, and web app UX for teams who need more than a marketing site.', bullets: [
            { label: 'Product discovery and wireframes' },
            { label: 'Design system tailored to your product' },
            { label: 'React Native or native iOS/Android' },
          ] },
          { title: 'Hosting & infrastructure', icon: 'server', description: 'Managed hosting with actual humans answering when something breaks.', bullets: [
            { label: 'Deploys to DigitalOcean, AWS, or Vercel' },
            { label: 'Monitoring, backups, CDN, TLS' },
            { label: 'One flat monthly fee, no surprise bills' },
          ] },
          { title: 'Performance', icon: 'zap', description: 'Make your existing site fast \u2014 often the highest-ROI engagement we run.', bullets: [
            { label: 'Lighthouse + real-user-monitoring' },
            { label: 'Image, font, and bundle optimization' },
            { label: 'Measurable before/after in 2 weeks' },
          ] },
          { title: 'Strategy & consulting', icon: 'lightbulb', description: 'Not ready to build? Hire us for a strategic sprint.', bullets: [
            { label: 'Architecture review for existing systems' },
            { label: 'CMS + stack recommendations' },
            { label: 'Vendor selection and contract review' },
          ] },
        ],
      },
      {
        blockType: 'featuredProjects',
        eyebrow: 'Recent work',
        headline: 'A few projects we\u2019re proud of.',
        description: 'The short version is below. Each case study goes into the why behind the framework choices, what we shipped, and what actually changed for the client.',
        mode: 'latest',
        limit: 3,
        viewAllLabel: 'View all projects',
        viewAllHref: '/portfolio',
      },
      {
        blockType: 'pricing',
        eyebrow: 'Pricing',
        headline: 'Transparent engagement tiers.',
        description: 'Custom quotes exist \u2014 but most engagements fit one of these. All prices exclude hosting, which is billed separately.',
        tiers: [
          { name: 'Landing page', price: '$2,500', priceNote: 'one-time', description: 'A single polished page for a product launch, event, or campaign.', features: [
            { label: '1 custom-designed landing page', included: true },
            { label: 'CMS-ready \u2014 edit copy & images yourself', included: true },
            { label: 'Analytics & form integration', included: true },
            { label: 'Deployed on your hosting or ours', included: true },
            { label: 'Ongoing content updates', included: false },
          ], cta: { label: 'Start a landing page', href: '/contact' } },
          { name: 'Marketing site', price: 'From $8,500', priceNote: 'typical 6-week engagement', description: 'Multi-page marketing site with full CMS, blog, and case studies. Our most common engagement.', highlighted: true, features: [
            { label: 'Up to 12 bespoke pages', included: true },
            { label: 'Full block-based CMS', included: true },
            { label: 'Case study and blog systems', included: true },
            { label: 'Technical SEO foundation', included: true },
            { label: 'Performance budget guarantee', included: true },
            { label: 'First 30 days of SEO work included', included: true },
          ], cta: { label: 'Get a quote', href: '/contact' } },
          { name: 'Managed retainer', price: 'From $1,500', priceNote: 'per month', description: 'Ongoing development, SEO, and hosting \u2014 for when you don\u2019t want to think about any of this again.', features: [
            { label: 'Hosting + monitoring + backups', included: true },
            { label: '8\u201316 hours of dev/SEO per month', included: true },
            { label: 'Same-day turnaround on small changes', included: true },
            { label: 'Monthly performance report', included: true },
            { label: 'Direct Slack channel', included: true },
          ], cta: { label: 'Talk to us', href: '/contact' } },
        ],
      },
      {
        blockType: 'testimonials',
        eyebrow: 'Clients',
        headline: 'What they said after launch.',
        items: [
          { quote: 'Six weeks from brief to production. The site loads faster than our old one even loaded its splash screen. Our bounce rate dropped 34% in the first month.', author: 'Sarah Chen', role: 'Head of Marketing', company: 'Northlake Consulting' },
          { quote: 'They actually explained the trade-offs in plain language. We understood why we were picking Next.js over WordPress, not just that we were.', author: 'Marcus Oduya', role: 'Founder & CEO', company: 'Cairn Analytics' },
          { quote: 'Best SEO engagement we\u2019ve run. Everything was measurable. Organic traffic is up 140% six months in, and we can point to the exact changes that moved it.', author: 'Rachel Donovan', role: 'Marketing Director', company: 'Edgewater Law' },
        ],
      },
      {
        blockType: 'faq',
        eyebrow: 'Questions',
        headline: 'Common questions we get.',
        items: [
          { question: 'Do you work with clients outside your region?', answer: 'Yes. Most of our clients are remote. We\u2019ve shipped projects across North America, the UK, and Australia. Time zones are rarely an issue.' },
          { question: 'How do you price custom work?', answer: 'Scoped fixed-price for anything that fits a clear brief. Hourly retainers for ongoing work. We\u2019ll give you a quote within 48 hours of our initial call.' },
          { question: 'Do you handle hosting, or just build the site?', answer: 'Both. You can host with us (managed DigitalOcean or AWS, monthly fee) or we\u2019ll deploy to your existing host. We document the deployment regardless, so you\u2019re never stuck.' },
          { question: 'What stack do you build on?', answer: 'Default is Next.js + Payload CMS + Postgres, deployed to DigitalOcean. We\u2019ll use a different stack if your situation calls for it \u2014 for example, Shopify for a commerce-first site. We pick the right tool, not the fashionable one.' },
          { question: 'Can we edit the site after launch?', answer: 'Yes. Every site ships with a full CMS \u2014 you can add, remove, and reorder sections, change copy, swap images, publish blog posts, and edit pricing without touching code.' },
        ],
      },
      {
        blockType: 'cta',
        headline: 'Let\u2019s talk about what you\u2019re building.',
        description: 'No hard sell. A 30-minute call where we understand what you\u2019re trying to do, and figure out whether we\u2019re a fit.',
        primaryCta: { label: 'Book a call', href: '/contact' },
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

  // About page (simple)
  const aboutExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 1 })
  const aboutData: any = {
    title: 'About',
    slug: 'about',
    publishedAt: new Date().toISOString(),
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'About',
        headline: 'Mature work, from people who have done this before.',
        subheadline: 'Black Hart Consulting was founded to give small and mid-market businesses the same level of web craft that was previously only available to enterprise.',
        align: 'left',
      },
      {
        blockType: 'richText',
        maxWidth: 'prose',
        content: rt('We are a small team: senior designers, developers, and SEO specialists who got tired of watching good businesses get saddled with slow, unmaintainable websites built by the cheapest bid. We prefer slow, considered work over hype, and we\u2019d rather turn down a project than deliver one we don\u2019t believe in.'),
      },
      {
        blockType: 'stats',
        items: [
          { value: '2021', label: 'Founded' },
          { value: '47', label: 'Projects shipped' },
          { value: '12', label: 'Countries served' },
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

  // Contact page
  const contactExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'contact' } }, limit: 1 })
  const contactData: any = {
    title: 'Contact',
    slug: 'contact',
    publishedAt: new Date().toISOString(),
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Get in touch',
        headline: 'Let\u2019s figure out if we\u2019re a fit.',
        subheadline: 'Send us a note with a sentence or two about what you\u2019re building. We\u2019ll reply within one business day.',
        align: 'left',
        ctas: [
          { label: 'hello@blackhartconsulting.com', href: 'mailto:hello@blackhartconsulting.com', variant: 'primary' },
        ],
      },
      {
        blockType: 'faq',
        headline: 'Before you write:',
        items: [
          { question: 'What should I include in my first note?', answer: 'A sentence on your company, a sentence on what you\u2019re trying to build or fix, and a rough budget range if you have one. We\u2019ll take it from there.' },
          { question: 'What\u2019s the engagement process?', answer: '1) 30-min intro call. 2) We send a scoped proposal within 48 hours. 3) You review, we iterate. 4) Signed contract, 50% deposit, kickoff within a week.' },
          { question: 'Do you take equity or deferred compensation?', answer: 'Occasionally for mission-aligned early-stage startups. Not by default.' },
        ],
      },
    ],
  }
  if (contactExisting.totalDocs === 0) { await payload.create({ collection: 'pages', data: contactData }); console.log('  created contact page') }
  else { await payload.update({ collection: 'pages', id: contactExisting.docs[0].id, data: contactData }); console.log('  updated contact page') }

  // Services page (so the nav link has a target)
  const servicesExisting = await payload.find({ collection: 'pages', where: { slug: { equals: 'services' } }, limit: 1 })
  const servicesData: any = {
    title: 'Services',
    slug: 'services',
    publishedAt: new Date().toISOString(),
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Services',
        headline: 'Four disciplines. One senior team.',
        subheadline: 'The short version is on the home page. This is the long version.',
        align: 'left',
      },
      ...((homeData.layout as any[]).filter((b) => b.blockType === 'services')),
      ...((homeData.layout as any[]).filter((b) => b.blockType === 'pricing')),
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

  // Sample projects
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
      challenge: rt('Northlake\u2019s existing site was a 12-year-old Drupal 7 install on shared hosting. It took 8 seconds to load on 3G, ranked on page 4 for its primary keyword, and the marketing team couldn\u2019t edit it without filing a developer ticket.'),
      approach: rt('We rebuilt on Next.js with Payload CMS for content management. Chose Postgres over MongoDB for transactional integrity and familiarity with the client\u2019s existing data team. Migrated all 400 existing blog posts with 301 redirects on every URL to preserve link equity. Shipped a block-based CMS so marketing can build and edit pages without us.'),
      outcome: rt('Load time: 8.1s \u2192 0.9s. Organic sessions: +140% in the first six months. Conversion rate from organic traffic: +62%. The marketing team now publishes without tickets \u2014 we track on average 2.3 edits per week by their team.'),
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
    {
      title: 'Cairn Analytics dashboard',
      slug: 'cairn-analytics',
      summary: 'An internal data dashboard rebuilt from scratch. React + server-side rendering cut initial load from 12 seconds to under 1.',
      client: 'Cairn Analytics',
      industry: 'Data / SaaS',
      projectType: 'webapp',
      year: 2025,
      duration: '10 weeks',
      teamSize: 4,
      liveUrl: 'https://app.cairn.example.com',
      stack: [
        { name: 'Next.js', category: 'framework' },
        { name: 'TypeScript', category: 'language' },
        { name: 'tRPC', category: 'framework' },
        { name: 'Postgres + Supabase', category: 'db' },
        { name: 'Vercel', category: 'hosting' },
        { name: 'shadcn/ui', category: 'design' },
      ],
      challenge: rt('Cairn\u2019s existing dashboard was a client-side React SPA that fetched 40MB of JSON on page load. Users were quitting the tab before the first chart rendered.'),
      approach: rt('We rebuilt on Next.js with the App Router, moving the data-heavy work to the server. Used tRPC for type-safe API calls between server and client. Introduced incremental loading and virtualized tables for the long data views. Picked Supabase for auth and database to avoid operational overhead on a small team.'),
      outcome: rt('Initial page load: 12s \u2192 0.8s. Time-to-first-chart: 4.5s \u2192 1.1s. Daily active users (who previously churned during load): +45%.'),
      metrics: [
        { value: '0.8s', label: 'Initial load (was 12s)' },
        { value: '+45%', label: 'Daily active users' },
        { value: '0', label: 'Errors in first month' },
      ],
      testimonial: {
        quote: 'Six weeks from brief to production. The site loads faster than our old one even loaded its splash screen.',
        author: 'Marcus Oduya',
        role: 'Founder, Cairn Analytics',
      },
      featured: true,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    },
    {
      title: 'Edgewater Law SEO engagement',
      slug: 'edgewater-law-seo',
      summary: 'Six months of technical SEO work for a mid-sized law firm. Organic traffic up 140%. Ranked for their target practice area in-region.',
      client: 'Edgewater Law',
      industry: 'Legal',
      projectType: 'seo',
      year: 2024,
      duration: '6 months (ongoing)',
      teamSize: 2,
      stack: [
        { name: 'Screaming Frog', category: 'tool' },
        { name: 'Ahrefs', category: 'tool' },
        { name: 'Schema.org structured data', category: 'tool' },
        { name: 'WordPress', category: 'cms' },
      ],
      challenge: rt('Edgewater had a clean WordPress site but was invisible on Google. They\u2019d never done SEO beyond installing Yoast. Site structure was flat, internal linking was random, and they had no structured data on their practice area pages.'),
      approach: rt('We started with a full technical audit \u2014 Screaming Frog crawl, Core Web Vitals, indexability. Built a topic cluster strategy around their four practice areas. Rewrote meta titles and descriptions, added schema.org Attorney and LegalService markup, restructured internal linking into hub-and-spoke. Wrote 18 long-form practice-area deep-dives over six months.'),
      outcome: rt('Organic traffic: +140% in six months. Ranked #1 locally for their primary practice area keyword. Phone inquiries from the website: +180%.'),
      metrics: [
        { value: '+140%', label: 'Organic traffic' },
        { value: '#1', label: 'Local ranking (primary keyword)' },
        { value: '+180%', label: 'Inbound phone inquiries' },
      ],
      testimonial: {
        quote: 'Best SEO engagement we\u2019ve run. Everything was measurable. We can point to the exact changes that moved it.',
        author: 'Rachel Donovan',
        role: 'Marketing Director, Edgewater Law',
      },
      featured: true,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
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

  console.log('\n\u2713 Seed complete.')
  console.log(`  Admin: ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
  console.log(`  \u26a0 CHANGE THE PASSWORD after first login.`)
  process.exit(0)
}

run().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
