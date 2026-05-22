/* eslint-disable @typescript-eslint/no-explicit-any */
/* Seed initial content via Payload's onInit hook. Runs once on server boot; idempotent (updates instead of duplicates). */
import path from 'node:path'
import type { Payload } from 'payload'
import { pushDevSchema } from '@payloadcms/drizzle'

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@blackhartconsulting.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'changeme123!'
const SEED_ON_BOOT = process.env.SEED_ON_BOOT !== 'false'

const rt = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [{
      type: 'paragraph', format: '', indent: 0, version: 1,
      children: [{ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' }],
    }],
  },
})

// Article-grade rich text: each node is either a paragraph, heading (h2/h3),
// or bullet list. Pass blocks as tuples: ['p', 'text'] | ['h2', 'text'] | ['h3', 'text'] | ['ul', [...]].
type RTBlock =
  | ['p', string]
  | ['h2', string]
  | ['h3', string]
  | ['ul', string[]]
  | ['quote', string]

const rtText = (text: string) => ({ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' })

const rtParagraph = (text: string) => ({
  type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr',
  children: [rtText(text)],
})

const rtHeading = (tag: 'h2' | 'h3', text: string) => ({
  type: 'heading', tag, format: '', indent: 0, version: 1, direction: 'ltr',
  children: [rtText(text)],
})

const rtList = (items: string[]) => ({
  type: 'list', listType: 'bullet', tag: 'ul', start: 1, format: '', indent: 0, version: 1, direction: 'ltr',
  children: items.map((item) => ({
    type: 'listitem', value: 1, format: '', indent: 0, version: 1, direction: 'ltr',
    children: [rtText(item)],
  })),
})

const rtQuote = (text: string) => ({
  type: 'quote', format: '', indent: 0, version: 1, direction: 'ltr',
  children: [rtText(text)],
})

const rtDoc = (blocks: RTBlock[]) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
    children: blocks.map((b) => {
      if (b[0] === 'p') return rtParagraph(b[1])
      if (b[0] === 'h2') return rtHeading('h2', b[1])
      if (b[0] === 'h3') return rtHeading('h3', b[1])
      if (b[0] === 'ul') return rtList(b[1])
      if (b[0] === 'quote') return rtQuote(b[1])
      return rtParagraph('')
    }),
  },
})

// Page seed contract:
//   - On first boot (page doesn't exist), the page is created from this seed.
//   - On every subsequent boot, the page is left untouched UNLESS the matching
//     FORCE_*_UPSERT env var is set to 'true', in which case the page is
//     overwritten from this seed (one-time migration mechanism).
//   - Going forward, the Payload admin UI is the source of truth for the
//     Home, About, Services, and Contact pages. Do not introduce unconditional
//     updates here for those pages.
export async function seedOnInit(payload: Payload): Promise<void> {
  if (!SEED_ON_BOOT) return

  // Payload's Drizzle adapters hard-skip push when NODE_ENV=production
  // (see @payloadcms/db-postgres/connect.js line ~110). That means fresh
  // production deploys have no tables unless we force the push ourselves.
  // In dev, Payload already handles push inside adapter.connect() \u2014 calling
  // it again here causes "index already exists" errors on SQLite, so only
  // run in production.
  const adapterName = (payload.db as any)?.name
  if (
    (adapterName === 'postgres' || adapterName === 'sqlite') &&
    process.env.NODE_ENV === 'production'
  ) {
    try {
      await pushDevSchema(payload.db as any)
      payload.logger.info('[seed] schema push complete')
    } catch (e) {
      payload.logger.warn({ err: e }, '[seed] schema push failed (may already be in sync)')
    }
  }

  try {
    const users = await payload.find({ collection: 'users', limit: 1 })

    // No early-return guard. Every create below is individually guarded
    // with `if (existing.totalDocs === 0) create(...)`, so re-running is a
    // no-op for already-seeded content. Globals are always upserted. The
    // contact page is upserted so layout upgrades (e.g. adding the contact
    // form block) propagate to installations that were seeded before.
    if (users.totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Admin' as any },
      })
      payload.logger.info(`[seed] admin user created: ${ADMIN_EMAIL} (password read from SEED_ADMIN_PASSWORD env; change at first login)`)
    }

    await payload.updateGlobal({
      slug: 'siteSettings',
      data: {
        siteName: 'Black Hart Consulting',
        tagline: 'Websites, SEO, apps, and hosting \u2014 done right.',
        defaultMetaDescription: 'Custom websites, SEO, and managed hosting from a Houston-based digital studio. Fixed-price builds in days, not months.',
        defaultTheme: 'dark',
        contactEmail: 'hello@blackhartconsulting.com',
        contactPhone: '(866) 434-9777',
      } as any,
    })

    await payload.updateGlobal({
      slug: 'header',
      data: {
        nav: [
          { label: 'Services', href: '/services' },
          { label: 'Portfolio', href: '/portfolio' },
          { label: 'Articles', href: '/articles' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
        ],
        cta: { show: true, label: 'Start a project', href: '/contact' },
      } as any,
    })

    await payload.updateGlobal({
      slug: 'footer',
      data: {
        tagline: 'Websites, SEO, and hosting for businesses that care how their work shows up online.',
        columns: [
          { heading: 'Services', links: [
            { label: 'Care plans', href: '/services#care' },
            { label: 'Website design & build', href: '/services#websites' },
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
            { label: 'Pricing', href: '/services' },
            { label: 'SMS opt-in', href: '/sms' },
            { label: 'Privacy Policy', href: '/privacy' },
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

    // ensureMedia is used by both page seeds (founder portrait, article hero
    // images) and project seeds (case-study screenshots). Declared once up
    // front so every callsite below resolves the same closure.
    const ensureMedia = async (alt: string, relPath: string) => {
      const existing = await payload.find({ collection: 'media', where: { alt: { equals: alt } }, limit: 1 })
      if (existing.totalDocs > 0) return existing.docs[0]
      try {
        return await payload.create({
          collection: 'media',
          data: { alt } as any,
          filePath: path.resolve(process.cwd(), relPath),
        })
      } catch (err) {
        payload.logger.warn({ err, relPath }, '[seed] media upload failed (continuing without image)')
        return null
      }
    }

    // --- Pages ---
    const servicesBlock = {
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
        { title: 'App design & development', icon: 'smartphone', description: 'Webapps and mobile experiences for teams who need more than a marketing site.', bullets: [
          { label: 'Product discovery and wireframes' },
          { label: 'Webapps in Next.js or React' },
          { label: 'Native iOS / Android available on a project basis' },
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
          { label: 'Stack and architecture review' },
          { label: 'CMS recommendations' },
          { label: 'Pre-rebuild planning and roadmapping' },
        ] },
      ],
    }

    const websitesPricingBlock = {
      blockType: 'pricing',
      eyebrow: 'Websites',
      headline: 'Fixed-price builds. No surprise invoices.',
      description: 'Every website project is scoped to a fixed fee before kickoff. Hosting is included on every Care plan, or $79/mo standalone.',
      tiers: [
        { name: 'Express Landing Page', price: '$1,495', priceNote: 'one-time', description: 'Template-driven, conversion-focused. Live in 5\u20137 days.', features: [
          { label: '1 conversion-focused landing page', included: true },
          { label: 'Custom-styled, on-brand', included: true },
          { label: 'Analytics & form integration', included: true },
          { label: 'Deployed on your hosting or ours', included: true },
          { label: 'Ongoing content updates', included: false },
        ], cta: { label: 'Start an express page', href: '/contact' } },
        { name: 'Custom Landing Page', price: '$2,500', priceNote: 'one-time', description: 'A fully custom-designed landing page for a launch, event, or campaign.', features: [
          { label: '1 fully custom-designed page', included: true },
          { label: 'CMS-ready \u2014 edit copy & images yourself', included: true },
          { label: 'Analytics & form integration', included: true },
          { label: 'Deployed on your hosting or ours', included: true },
          { label: 'Ongoing content updates', included: false },
        ], cta: { label: 'Start a landing page', href: '/contact' } },
        { name: 'Starter Site', price: '$4,500', priceNote: 'one-time', description: 'Up to 5 bespoke pages with a real CMS \u2014 for businesses that need more than a one-pager.', features: [
          { label: 'Up to 5 bespoke pages', included: true },
          { label: 'Block-based CMS', included: true },
          { label: 'Technical SEO foundation', included: true },
          { label: 'Performance budget guarantee', included: true },
          { label: '3\u20134 week delivery', included: true },
        ], cta: { label: 'Start a Starter Site', href: '/contact' } },
        { name: 'Marketing Site', price: '$8,500', priceNote: 'typical 6-week engagement', description: 'Multi-page marketing site with full CMS, blog, and case studies. Our most common engagement.', highlighted: true, features: [
          { label: 'Up to 12 bespoke pages', included: true },
          { label: 'Full block-based CMS', included: true },
          { label: 'Case study and blog systems', included: true },
          { label: 'Technical SEO foundation', included: true },
          { label: 'Performance budget guarantee', included: true },
          { label: 'First 30 days of SEO work included', included: true },
        ], cta: { label: 'Start a Marketing Site', href: '/contact' } },
      ],
    }

    const carePricingBlock = {
      blockType: 'pricing',
      eyebrow: 'Care plans',
      headline: 'Stay fast, secure, and improving \u2014 month over month.',
      description: 'Every Care plan includes hosting, monitoring, backups, and SSL. Higher tiers add development hours and SEO work.',
      tiers: [
        { name: 'Care', price: '$295', priceNote: 'per month', description: 'Hands-off hosting and maintenance for a site that just needs to stay up.', features: [
          { label: 'Managed hosting + monitoring + backups', included: true },
          { label: 'SSL, CDN, uptime monitoring', included: true },
          { label: '2 hrs/mo for small edits', included: true },
          { label: 'Monthly performance report', included: true },
          { label: 'Direct Slack channel', included: false },
        ], cta: { label: 'Start a Care plan', href: '/contact' } },
        { name: 'Growth', price: '$895', priceNote: 'per month', description: 'For sites that should be improving every month, not just staying online.', highlighted: true, features: [
          { label: 'Everything in Care', included: true },
          { label: '6 hrs/mo of dev or SEO work', included: true },
          { label: 'Monthly strategy check-in', included: true },
          { label: 'Same-week turnaround on changes', included: true },
          { label: 'Direct Slack channel', included: false },
        ], cta: { label: 'Start a Growth plan', href: '/contact' } },
        { name: 'Scale', price: '$1,895', priceNote: 'per month', description: 'For revenue-critical sites that need a partner on call, not a vendor.', features: [
          { label: 'Everything in Growth', included: true },
          { label: '12 hrs/mo of dev or SEO work', included: true },
          { label: 'Direct Slack channel', included: true },
          { label: 'Same-day SLA on small changes', included: true },
          { label: 'Quarterly architecture review', included: true },
        ], cta: { label: 'Talk about Scale', href: '/contact' } },
      ],
    }

    const seoPricingBlock = {
      blockType: 'pricing',
      eyebrow: 'SEO retainers',
      headline: 'Search and AI-search visibility. Month over month.',
      description: 'Standalone SEO work \u2014 independent of website design. Sold separately because most businesses need ongoing search work, not another rebuild.',
      tiers: [
        { name: 'Local SEO Starter', price: '$750', priceNote: 'per month', description: 'Aimed at single-location service businesses competing locally.', features: [
          { label: 'Google Business Profile optimization', included: true },
          { label: 'Local citations + schema markup', included: true },
          { label: '1 SEO-optimized blog post / month', included: true },
          { label: 'Monthly ranking + traffic report', included: true },
          { label: 'Technical fixes (as needed)', included: true },
        ], cta: { label: 'Start Local SEO', href: '/contact' } },
        { name: 'SEO Growth', price: '$1,495', priceNote: 'per month', description: 'Full-stack SEO for businesses ready to compete in a real market.', highlighted: true, features: [
          { label: 'Everything in Local SEO Starter', included: true },
          { label: '2 content pieces / month', included: true },
          { label: 'Internal linking + content architecture', included: true },
          { label: 'GEO / AI-search optimization', included: true },
          { label: 'Conversion tracking setup', included: true },
        ], cta: { label: 'Start SEO Growth', href: '/contact' } },
        { name: 'SEO Scale', price: '$2,495', priceNote: 'per month', description: 'For businesses where organic search is a primary revenue channel.', features: [
          { label: 'Everything in SEO Growth', included: true },
          { label: 'Outreach + digital PR', included: true },
          { label: 'Deep technical SEO work', included: true },
          { label: 'Custom reporting dashboard', included: true },
          { label: 'Quarterly strategy review', included: true },
        ], cta: { label: 'Talk about SEO Scale', href: '/contact' } },
      ],
    }

    const foundingBannerBlock = {
      blockType: 'cta',
      headline: 'Founding Client pricing \u2014 30% off your first build.',
      description: 'The first 5 paid clients receive 30% off any Websites tier in exchange for a published case study. 5 spots remaining.',
      primaryCta: { label: 'Claim a founding spot', href: '/contact' },
      variant: 'emphasized',
    }

    const homeData: any = {
      title: 'Home', slug: 'home', publishedAt: new Date().toISOString(),
      seo: { metaTitle: 'Black Hart Consulting \u2014 Websites, SEO, apps, hosting', metaDescription: 'Steady craft for businesses that care how their work shows up online.' },
      layout: [
        { blockType: 'hero', eyebrow: 'Built by hand', headline: 'Websites, SEO, and hosting for businesses that care how their work shows up online.',
          subheadline: 'We design the site. We make it rank. We keep it online. One team, one bill, one line of accountability.', align: 'left',
          ctas: [
            { label: 'Start a project', href: '/contact', variant: 'primary' },
            { label: 'See recent work', href: '/portfolio', variant: 'ghost' },
          ] },
        { blockType: 'stats', eyebrow: 'Signal, not noise', items: [
          { value: '5 days', label: 'Fastest production launch', description: 'Prometheus Minds, kickoff to live, including 56 commits.' },
          { value: '<200KB', label: 'First-paint JS shipped', description: 'Down from the 1MB+ that most templates ship.' },
          { value: '$33/mo', label: 'All-in hosting cost', description: 'WAYGFT runs on a $28 droplet + $5 Spaces bucket.' },
        ] },
        servicesBlock,
        { blockType: 'featuredProjects', eyebrow: 'Recent work', headline: 'A few projects we\u2019re proud of.',
          description: 'The short version is below. Each case study goes into the why behind the framework choices, what we shipped, and what actually changed for the client.',
          mode: 'latest', limit: 3, viewAllLabel: 'View all projects', viewAllHref: '/portfolio' },
        foundingBannerBlock,
        websitesPricingBlock,
        carePricingBlock,
        seoPricingBlock,
        { blockType: 'testimonials', eyebrow: 'Clients', headline: 'What they said after launch.', mode: 'latest', limit: 3 },
        { blockType: 'faq', eyebrow: 'Questions', headline: 'Common questions we get.', items: [
          { question: 'Do you work with clients outside your region?', answer: 'Yes. Most of our clients are remote, and time zones are rarely an issue.' },
          { question: 'How do you price custom work?', answer: 'Scoped fixed-price for anything that fits a clear brief. Hourly retainers for ongoing work. We\u2019ll give you a quote within 48 hours of our initial call.' },
          { question: 'Do you handle hosting, or just build the site?', answer: 'Both. Every Care plan (Care, Growth, Scale) bundles managed hosting, monitoring, backups, and SSL \u2014 so you never see a separate hosting bill. Prefer to host elsewhere? We\u2019ll deploy to your existing host (DigitalOcean, AWS, Vercel, etc.) and document everything so you\u2019re never stuck. Standalone hosting without a Care plan is $79/mo.' },
          { question: 'What stack do you build on?', answer: 'Default is Next.js + Payload CMS + Postgres, deployed to DigitalOcean. We\u2019ll use a different stack if your situation calls for it \u2014 for example, Shopify for a commerce-first site. We pick the right tool, not the fashionable one.' },
          { question: 'Can we edit the site after launch?', answer: 'Yes. Every site ships with a full CMS \u2014 you can add, remove, and reorder sections, change copy, swap images, publish blog posts, and edit pricing without touching code.' },
        ] },
        { blockType: 'cta', headline: 'Let\u2019s talk about what you\u2019re building.',
          description: 'No hard sell. A 30-minute call where we understand what you\u2019re trying to do, and figure out whether we\u2019re a fit.',
          primaryCta: { label: 'Book a call', href: '/contact' },
          secondaryCta: { label: 'See the portfolio', href: '/portfolio' },
          variant: 'emphasized' },
      ],
    }

    const existingHome = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })
    if (existingHome.totalDocs === 0) {
      await payload.create({ collection: 'pages', data: homeData })
      payload.logger.info('[seed] home page created')
    } else if (process.env.FORCE_HOME_UPSERT === 'true') {
      await payload.update({
        collection: 'pages',
        id: existingHome.docs[0].id,
        data: homeData,
      })
      payload.logger.info('[seed] home page upserted (FORCE_HOME_UPSERT)')
    }

    // About \u2014 founder portrait
    const founderHeadshot = await ensureMedia(
      'Suhaib Chaudhry \u2014 founder of Black Hart Consulting (editorial portrait)',
      'public/seed-assets/about/suhaib-headshot.jpg',
    )

    const aboutData: any = {
      title: 'About', slug: 'about', publishedAt: new Date().toISOString(),
      layout: [
        { blockType: 'hero', eyebrow: 'About', headline: 'Modern craft, one line of accountability.',
          subheadline: 'Black Hart Consulting is a Houston-based digital studio. We build websites, run SEO, and keep them online \u2014 for businesses that care how their work shows up online.', align: 'left' },
        {
          blockType: 'richText',
          maxWidth: 'medium',
          variant: 'lede',
          content: rtDoc([
            ['p', 'We started Black Hart because most small businesses are stuck between two bad choices: a generic template site that looks like everyone else\u2019s, or an agency quote that\u2019s three times what it should cost.'],
            ['p', 'We close that gap with a senior, accountable owner on every deliverable, a fixed-price model, and a tight delivery window. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.'],
          ]),
        },
        { blockType: 'stats', items: [
          { value: '2', label: 'Recent launches in production' },
          { value: '5 days', label: 'Fastest project delivery' },
          { value: '100%', label: 'Projects shipped on quoted price' },
          { value: 'Houston, TX', label: 'Where we\u2019re based' },
        ] },
        {
          blockType: 'richText',
          maxWidth: 'medium',
          ...(founderHeadshot?.id ? { image: founderHeadshot.id, imageFocus: 'face' } : {}),
          content: rtDoc([
            ['h2', 'Who you\u2019ll work with'],
            ['p', 'You\u2019ll work directly with Suhaib Chaudhry, the founder of Black Hart Consulting. There\u2019s no account manager layer, no junior handoff \u2014 every brief, every line of code, and every design decision goes through one senior reviewer. That\u2019s the whole point of the studio: agency-grade craft from a single accountable owner, not a sales team funneling you to the cheapest contractor on a roster.'],
            ['p', 'Suhaib has been shipping production web software for over a decade \u2014 across consumer, fintech, and B2B SaaS \u2014 and started Black Hart to bring that craft to small-business work that traditional agencies overcharge for. The result: deliverables you\u2019d normally pay $20K+ for, shipped in days instead of months, at prices that make sense for a business that\u2019s still proving its model.'],
          ]),
        },
        { blockType: 'richText', maxWidth: 'medium', content: rtDoc([
          ['h2', 'How we work'],
          ['h3', 'Scope first.'],
          ['p', 'Every engagement starts with a 30-minute conversation, then a fixed-price proposal within 48 hours. We never bill hourly for project work \u2014 if a brief doesn\u2019t fit a clean scope, we\u2019ll tell you before you sign anything.'],
          ['h3', 'Build in days, not months.'],
          ['p', 'A senior developer is accountable for every line of code, every word of copy, and every design decision. No junior handoffs, no agency layers between you and the work. The studio ships in days because one person owns the brief end to end \u2014 not because anything is being automated away.'],
          ['h3', 'Stay involved after launch.'],
          ['p', 'Most agencies hand you a site and walk away. We host, monitor, and improve yours for as long as you\u2019d like \u2014 through Care, Growth, or Scale plans that scale up or down with your needs.'],
        ]) },
        { blockType: 'cta', headline: 'Want to work together?', primaryCta: { label: 'Get in touch', href: '/contact' } },
      ],
    }
    const existingAbout = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 1 })
    if (existingAbout.totalDocs === 0) {
      await payload.create({ collection: 'pages', data: aboutData })
      payload.logger.info('[seed] about page created')
    } else if (process.env.FORCE_ABOUT_UPSERT === 'true') {
      await payload.update({
        collection: 'pages',
        id: existingAbout.docs[0].id,
        data: aboutData,
      })
      payload.logger.info('[seed] about page upserted (FORCE_ABOUT_UPSERT)')
    }

    // Contact
    const contactData: any = {
      title: 'Contact', slug: 'contact', publishedAt: new Date().toISOString(),
      seo: {
        metaTitle: 'Contact — Black Hart Consulting',
        metaDescription:
          'Send a note about your project or book a 30-minute discovery call. We reply within one business day from hello@blackhartconsulting.com.',
      },
      layout: [
        { blockType: 'hero', eyebrow: 'Get in touch', headline: 'Let\u2019s figure out if we\u2019re a fit.',
          subheadline: 'Send a note with a sentence or two about what you\u2019re building. We\u2019ll reply within one business day.', align: 'left' },
        { blockType: 'contactForm',
          headline: 'Tell us about your project.',
          description: 'No boilerplate, no hard sell. A short note is enough \u2014 we\u2019ll follow up with a proper conversation.',
          successMessage: 'Thanks \u2014 your note is in. We\u2019ll reply within one business day from hello@blackhartconsulting.com.',
          showCompanyField: true,
          showProjectTypeField: true,
          showBudgetField: true,
          submitLabel: 'Send inquiry' },
        { blockType: 'faq', headline: 'Common questions before you write', items: [
          { question: 'What should I include in my first note?', answer: 'A sentence on your company, a sentence on what you\u2019re trying to build or fix, and a rough budget range if you have one. We\u2019ll take it from there.' },
          { question: 'What\u2019s the engagement process?', answer: '1) 30-min intro call. 2) We send a scoped proposal within 48 hours. 3) You review, we iterate. 4) Signed contract, 50% deposit, kickoff within a week.' },
          { question: 'Do you take projects outside North America?', answer: 'Yes. Most of our clients are remote. We\u2019ve shipped work across the US, UK, and Australia. Time zones are rarely an issue.' },
        ] },
      ],
    }
    const existingContact = await payload.find({ collection: 'pages', where: { slug: { equals: 'contact' } }, limit: 1 })
    if (existingContact.totalDocs === 0) {
      await payload.create({ collection: 'pages', data: contactData })
      payload.logger.info('[seed] contact page created')
    } else if (process.env.FORCE_CONTACT_UPSERT === 'true') {
      await payload.update({
        collection: 'pages',
        id: existingContact.docs[0].id,
        data: contactData,
      })
      payload.logger.info('[seed] contact page upserted (FORCE_CONTACT_UPSERT)')
    }

    // Services page
    const servicesData: any = {
      title: 'Services', slug: 'services', publishedAt: new Date().toISOString(),
      layout: [
        { blockType: 'hero', eyebrow: 'Services', headline: 'Four disciplines. One senior team.',
          subheadline: 'The short version is on the home page. This is the long version.', align: 'left' },
        servicesBlock,
        foundingBannerBlock,
        websitesPricingBlock,
        carePricingBlock,
        seoPricingBlock,
        { blockType: 'cta', headline: 'Talk to us about your project.', primaryCta: { label: 'Get in touch', href: '/contact' }, variant: 'default' },
      ],
    }
    const existingServices = await payload.find({ collection: 'pages', where: { slug: { equals: 'services' } }, limit: 1 })
    if (existingServices.totalDocs === 0) {
      await payload.create({ collection: 'pages', data: servicesData })
      payload.logger.info('[seed] services page created')
    } else if (process.env.FORCE_SERVICES_UPSERT === 'true') {
      await payload.update({
        collection: 'pages',
        id: existingServices.docs[0].id,
        data: servicesData,
      })
      payload.logger.info('[seed] services page upserted (FORCE_SERVICES_UPSERT)')
    }

    // --- Legacy sample-project cleanup ---
    // The original seed shipped three fabricated sample projects (Northlake
    // Consulting, Cairn Analytics, Edgewater Law SEO) to give the portfolio
    // page something to render. Those have been replaced by real client work
    // below, so any lingering legacy rows get deleted here. Idempotent: once
    // the rows are gone, subsequent boots find nothing to delete.
    const legacySlugs = ['northlake-consulting', 'cairn-analytics', 'edgewater-law-seo']
    for (const slug of legacySlugs) {
      const legacy = await payload.find({ collection: 'projects', where: { slug: { equals: slug } }, limit: 1 })
      if (legacy.totalDocs > 0) {
        await payload.delete({ collection: 'projects', id: legacy.docs[0].id })
        payload.logger.info(`[seed] legacy project removed: ${slug}`)
      }
    }

    // --- Testimonials collection seed -------------------------------------
    // Testimonials are now their own collection (admin can add/edit/remove),
    // and the Testimonials block on any page pulls from it. Seed the existing
    // Grace R. quote so a fresh install has at least one entry. Idempotent:
    // matched by author + company so the admin can edit the body without it
    // getting clobbered on next boot.
    const seedTestimonials: any[] = [
      {
        quote: 'We\u2019ve seen solid progress, especially with confidence. I\u2019d definitely recommend them to other parents looking for something that\u2019s both professional and personal.',
        author: 'Grace R.',
        role: 'Parent',
        company: 'Prometheus Minds (Google review)',
        featured: true,
        sortOrder: 10,
      },
      {
        // Multi-paragraph quote \u2014 \n\n triggers a paragraph break in
        // the public renderer, single \n becomes a soft line break.
        quote: [
          'Black Hart Consulting completely transformed my website from the ground up, and I couldn\u2019t be more impressed with the result. They rebuilt everything from scratch, adding multiple pages and features that have significantly improved how my business presents itself to the public. The site now feels professional, polished, and truly aligned with the level of service I provide.',
          'Since launching the new site, I\u2019ve noticed a clear difference in how clients engage with my business. Parents are coming in with a better understanding of what we offer, which has made conversations smoother and helped with conversions.',
          'They didn\u2019t just design a website, they built something functional and strategic. From the structure of the pages to the overall user experience, everything was clearly thought through with the business in mind.',
          'Beyond the quality of their work, their team was incredibly easy to work with. They were responsive, communicative, and made the entire process smooth from start to finish. I always felt confident that things were moving in the right direction.',
          'I\u2019d highly recommend Black Hart Consulting to any business owner looking for more than just a good-looking website. They build platforms that actually help your business grow.',
        ].join('\n\n'),
        author: 'Philip Parmar',
        role: 'Founder',
        company: 'Prometheus Minds',
        featured: true,
        sortOrder: 20,
      },
    ]
    for (const t of seedTestimonials) {
      const existing = await payload.find({
        collection: 'testimonials',
        where: { and: [{ author: { equals: t.author } }, { company: { equals: t.company } }] },
        limit: 1,
      })
      if (existing.totalDocs === 0) {
        await payload.create({ collection: 'testimonials', data: t })
        payload.logger.info(`[seed] testimonial created: ${t.author} \u00b7 ${t.company}`)
      }
    }

    // Migrate any home page testimonials block still carrying inline `items`
    // (the pre-collection schema) onto the new collection-backed mode. We
    // only touch blocks that have inline items + no `mode` set, so admin
    // edits in the new shape are preserved.
    const homeDoc = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })
    if (homeDoc.totalDocs > 0) {
      const layout = ((homeDoc.docs[0] as any).layout || []) as any[]
      const tIdx = layout.findIndex((b) => b?.blockType === 'testimonials')
      if (tIdx !== -1) {
        const block = layout[tIdx]
        const hasLegacyItems = Array.isArray(block?.items) && block.items.length > 0
        const alreadyMigrated = typeof block?.mode === 'string'
        if (hasLegacyItems && !alreadyMigrated) {
          layout[tIdx] = {
            blockType: 'testimonials',
            eyebrow: block.eyebrow ?? 'Clients',
            headline: block.headline ?? 'What they said after launch.',
            mode: 'latest',
            limit: 3,
          }
          await payload.update({ collection: 'pages', id: homeDoc.docs[0].id, data: { layout } as any })
          payload.logger.info('[seed] home testimonials block migrated to collection-backed mode')
        }
      }
    }

    // --- One-time migration: v1/v2 -> v3 (light-mode + no-bottom-bar) ---
    // Earlier iterations had three problems:
    //   1. v1 uploaded at 1440x900 (16:10) -> aspect-[16/9] clipped the top.
    //   2. v2 re-uploaded 1920x1080 under the original filenames -> DO
    //      Spaces CDN kept serving cached 16:10 originals at the edge.
    //   3. v2 captured 1920x1080 full viewport -> every hero ran slightly
    //      past the hero section, leaving a bottom bar (white for
    //      Prometheus Minds' light mode, white for WAYGFT) showing the
    //      start of the next section.
    //
    // v3 fixes all three:
    //   - `--force-prefers-color-scheme=light` so PM renders in light mode
    //     to match visitors' OS preference.
    //   - Per-page crop of the bottom bar (hero section only).
    //   - Filenames suffixed `-v3.png` so uploads land on fresh CDN paths
    //     that bypass the stale v1/v2 objects at the edge.
    //   - Alt texts versioned with "v3" so ensureMedia treats them as
    //     new documents.
    //
    // This migration detects any project carrying v1 OR v2 media (by any
    // matching alt-text signature) and deletes the project + all of its
    // case-study media. Normal seed below then recreates from v3 assets.
    // Idempotent: once v1/v2 rows are gone, this block is a no-op.
    const priorMigrationTargets: { projectSlug: string; legacyAlts: string[] }[] = [
      {
        projectSlug: 'prometheus-minds',
        legacyAlts: [
          // v1 alts
          'Prometheus Minds \u2014 new homepage hero (dark theme, gold CTA)',
          'Prometheus Minds \u2014 legacy Squarespace homepage with all-caps headline',
          'Prometheus Minds \u2014 new About page featuring Philip Parmar as founder',
          'Prometheus Minds \u2014 new Neurodiverse Tutoring service page',
          'Prometheus Minds \u2014 legacy Squarespace services page (wall-of-text caps)',
          // v2 alts
          'Prometheus Minds \u2014 new homepage hero v2 (dark theme, gold CTA)',
          'Prometheus Minds \u2014 legacy Squarespace homepage v2 (all-caps headline)',
          'Prometheus Minds \u2014 new About page v2 (Philip Parmar as founder)',
          'Prometheus Minds \u2014 new Neurodiverse Tutoring service page v2',
          'Prometheus Minds \u2014 legacy Squarespace services page v2 (wall-of-text caps)',
        ],
      },
      {
        projectSlug: 'waygft',
        legacyAlts: [
          // v1 alts
          'WAYGFT \u2014 homepage hero with rotating prompt and gradient pink palette',
          'WAYGFT \u2014 about page explaining the soft-landing philosophy of the gratitude wall',
          'WAYGFT \u2014 submission form with four content types (quote, story, photo, video)',
          'WAYGFT \u2014 latest moments page showing the 3-column masonry wall with mixed media',
          // v2 alts
          'WAYGFT \u2014 homepage hero v2 (rotating prompt and gradient pink palette)',
          'WAYGFT \u2014 about page v2 (soft-landing philosophy of the gratitude wall)',
          'WAYGFT \u2014 submission form v2 (four content types: quote, story, photo, video)',
          'WAYGFT \u2014 latest moments page v2 (3-column masonry wall with mixed media)',
          // v3 "latest" alt: superseded by v3b after a 90px white bar was found
          // at the bottom (pink-to-white transition that my original brightness
          // analysis missed because the jump was only ~13 gray-levels). Its
          // presence here forces the waygft project + its legacy "latest"
          // media to rebuild from v3b on next boot; the other v3 media
          // (home/about/submit) are left alone and reused by alt-text match.
          'WAYGFT \u2014 latest moments page v3 (3-column masonry wall with mixed media)',
        ],
      },
    ]
    for (const { projectSlug, legacyAlts } of priorMigrationTargets) {
      let anyLegacyMedia = false
      for (const alt of legacyAlts) {
        const mediaRes = await payload.find({ collection: 'media', where: { alt: { equals: alt } }, limit: 1 })
        if (mediaRes.totalDocs > 0) { anyLegacyMedia = true; break }
      }
      if (anyLegacyMedia) {
        // Delete the project first so it doesn't dangle with stale heroImage/gallery refs.
        const projRes = await payload.find({ collection: 'projects', where: { slug: { equals: projectSlug } }, limit: 1 })
        if (projRes.totalDocs > 0) {
          await payload.delete({ collection: 'projects', id: projRes.docs[0].id })
          payload.logger.info(`[seed] v3 migration: removed ${projectSlug} project (will be recreated below)`)
        }
        for (const alt of legacyAlts) {
          const mediaRes = await payload.find({ collection: 'media', where: { alt: { equals: alt } }, limit: 1 })
          if (mediaRes.totalDocs > 0) {
            await payload.delete({ collection: 'media', id: mediaRes.docs[0].id })
            payload.logger.info(`[seed] v3 migration: removed legacy media "${alt.slice(0, 60)}..."`)
          }
        }
      }
    }

    // --- Media uploads for the Prometheus Minds case study ---
    const pmMediaNewHome = await ensureMedia(
      'Prometheus Minds \u2014 new homepage hero v3 (light-mode capture)',
      'public/seed-assets/prometheus-minds/new-home-v3.png',
    )
    const pmMediaOldHome = await ensureMedia(
      'Prometheus Minds \u2014 legacy Squarespace homepage v3 (all-caps headline)',
      'public/seed-assets/prometheus-minds/old-home-v3.png',
    )
    const pmMediaNewAbout = await ensureMedia(
      'Prometheus Minds \u2014 new About page v3 (Philip Parmar as founder)',
      'public/seed-assets/prometheus-minds/new-about-v3.png',
    )
    const pmMediaNewServices = await ensureMedia(
      'Prometheus Minds \u2014 new Neurodiverse Tutoring service page v3',
      'public/seed-assets/prometheus-minds/new-services-v3.png',
    )
    const pmMediaOldServices = await ensureMedia(
      'Prometheus Minds \u2014 legacy Squarespace services page v3 (wall-of-text caps)',
      'public/seed-assets/prometheus-minds/old-services-v3.png',
    )

    // --- Prometheus Minds project (real client case study) ---
    const prometheusProject: any = {
      title: 'Prometheus Minds',
      slug: 'prometheus-minds',
      summary: 'Squarespace \u2192 custom Vite/React rebuild for an ADHD tutoring practice in the Twin Cities. New brand, block-based CMS with 27 content types, scheduled publishing, and a performance budget \u2014 shipped in 56 commits over 5 days.',
      client: 'Prometheus Minds',
      industry: 'Education / Neurodiverse tutoring',
      projectType: 'website',
      year: 2026,
      duration: '5 days (56 commits)',
      teamSize: 1,
      liveUrl: 'https://www.prometheusminds.com',
      ...(pmMediaNewHome?.id ? { heroImage: pmMediaNewHome.id } : {}),
      stack: [
        { name: 'React 19', category: 'framework' },
        { name: 'Vite 8', category: 'tool' },
        { name: 'React Router 7', category: 'framework' },
        { name: 'Tailwind CSS', category: 'design' },
        { name: 'Express 4', category: 'framework' },
        { name: 'SQLite', category: 'db' },
        { name: 'JWT + bcrypt', category: 'tool' },
        { name: 'Resend (transactional email)', category: 'tool' },
        { name: 'DigitalOcean', category: 'hosting' },
      ],
      challenge: rtDoc([
        ['p', 'Prometheus Minds had outgrown its Squarespace template. The existing site ran Squarespace 7.1 \u2014 all-caps headlines locked in by the theme, generic stock-photo layouts, and a content editor that couldn\u2019t keep pace with the practice: scheduled posts, structured service pages with per-tier pricing, a real blog, a newsletter.'],
        ['p', 'The performance ceiling was the platform itself. Squarespace shipped 20+ vendor scripts on every page load \u2014 reCAPTCHA, CSS runtime, component definitions, universal performance bundle \u2014 with no way to trim the bundle or preload the LCP hero. Each paid monthly dollar bought less and less control.'],
        ['p', 'The ask: a fully custom site the practice could actually run. Their own brand, their own CMS, their own hosting, and a publishing cadence that didn\u2019t require a Squarespace editor.'],
      ]),
      approach: rtDoc([
        ['h3', 'A mid-build pivot: tutor portal \u2192 CMS-only'],
        ['p', 'The original scope included a tutor portal for post-session notes and a parent login. A week in, we pivoted: Prometheus Minds already uses TutorBird for scheduling, billing, and parent communication. A second portal would have duplicated work and confused parents. We dropped ~1,200 lines of portal code and rerouted "Portal Login" to TutorBird. That time went into a services CMS and newsletter backend instead.'],
        ['h3', 'Block-based CMS with 27 content types'],
        ['p', 'Every public page is composed from blocks \u2014 Hero, FeatureGrid, PricingCards, Testimonials, ImageText, NumberedSteps, InlineContact, ServiceAreaBanner, and more. Philip can drag blocks into any order on any page, autosaving as he works. Each block has its own schema and its own React renderer, so the design and the CMS can never drift.'],
        ['h3', 'Three tiers of polish'],
        ['ul', [
          'Tier 1 \u2014 fundamentals: dynamic sitemap, robots.txt, alt-text validation, WCAG AA contrast, silent admin fetches, dark-background auth pages.',
          'Tier 2 \u2014 UX: drag-and-drop block reorder with auto-save, duplicate block/page, required-image warning, per-post SEO meta, error boundaries per route.',
          'Tier 3 \u2014 advanced: RSS feed, scheduled publishing for pages and blog posts, live preview, page versioning, image focal-point editor.',
        ]],
        ['h3', 'A real performance budget'],
        ['p', 'WebP logo, preload LCP hero image with matching fetchpriority, inline critical CSS, lazy-loaded admin portals and auth routes, responsive srcSets with Squarespace-CDN resize params for blog covers, and preconnect to image hosts. First paint ships <200KB of JS \u2014 down from the 1MB+ Squarespace sent on every page.'],
        ['h3', 'Auth with Resend-based password reset'],
        ['p', 'HMAC-signed reset tokens with a one-hour expiry, delivered through Resend for transactional email. JWT plus bcrypt for the admin session. No plaintext passwords, no reset links that live forever, and no third-party auth platform to depend on.'],
      ]),
      outcome: rtDoc([
        ['p', 'Shipped in five working days \u2014 56 commits from initial scaffold to production-ready, spanning Apr 17\u201322, 2026. Full design refresh, verbatim content restoration from the old site for SEO parity, and a CMS the owner actually runs.'],
        ['ul', [
          'Typography rebuilt around Plus Jakarta Sans + a custom gold/parchment/ink design system (old site: Squarespace template, all-caps headlines).',
          'Home page rebuilt with 12 sections, strict image/solid section rhythm, photo backgrounds chosen by the owner.',
          'Four dedicated service pages (Neurodiverse Tutoring, 6-Week ADHD Reset, Online Tutoring, About) \u2014 each fully block-composed.',
          'Blog system with per-post SEO, responsive cover images via CDN params, and a dynamic RSS feed.',
          'Contact form with three placements site-wide, an admin inbox, and rate-limiting. Three-field inquiry routing: service, budget, notes.',
          'Newsletter signup with admin-side subscriber list export.',
          'Mobile sticky CTA, custom-eased smooth scroll, respect for prefers-reduced-motion.',
        ]],
        ['p', 'The site now runs on a $12/month DigitalOcean droplet instead of Squarespace\u2019s $36/month Business plan \u2014 and the practice owns the stack, the content, and the roadmap.'],
      ]),
      metrics: [
        { value: '56', label: 'commits shipped in 5 days' },
        { value: '27', label: 'block types in the CMS' },
        { value: '<200KB', label: 'first-paint JS (was ~1MB)' },
        { value: '$24/mo', label: 'saved vs. Squarespace' },
      ],
      gallery: [
        ...(pmMediaOldHome?.id ? [{
          image: pmMediaOldHome.id,
          caption: 'Before \u2014 the original Squarespace homepage: all-caps headline, generic template hero, 1MB+ JS on every page.',
        }] : []),
        ...(pmMediaNewServices?.id ? [{
          image: pmMediaNewServices.id,
          caption: 'After \u2014 Neurodiverse Tutoring service page, one of four block-composed service pages with tier-specific pricing.',
        }] : []),
        ...(pmMediaNewAbout?.id ? [{
          image: pmMediaNewAbout.id,
          caption: 'The new About page introduces Philip Parmar as founder, leaning into the brand story rather than stock photography.',
        }] : []),
        ...(pmMediaOldServices?.id ? [{
          image: pmMediaOldServices.id,
          caption: 'Before \u2014 the old Services page: wall of all-caps copy, no visual hierarchy, no per-service imagery.',
        }] : []),
      ],
      testimonial: {
        quote: 'We\u2019ve seen solid progress, especially with confidence. I\u2019d definitely recommend them to other parents looking for something that\u2019s both professional and personal.',
        author: 'Grace R.',
        role: 'Parent, Prometheus Minds (Google review)',
      },
      featured: true,
      publishedAt: new Date().toISOString(),
    }

    const existingPM = await payload.find({
      collection: 'projects',
      where: { slug: { equals: prometheusProject.slug } },
      limit: 1,
    })
    if (existingPM.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: prometheusProject })
      payload.logger.info('[seed] project created: prometheus-minds')
    } else if (process.env.FORCE_PM_UPSERT === 'true') {
      // Opt-in refresh: re-runs overwrite the project's content when explicitly
      // requested (used during local iteration on the case-study copy).
      await payload.update({
        collection: 'projects',
        id: existingPM.docs[0].id,
        data: prometheusProject,
      })
      payload.logger.info('[seed] project upserted: prometheus-minds (FORCE_PM_UPSERT)')
    }

    // --- WAYGFT (What Are You Grateful For Today?) media uploads ---
    const wgtMediaHome = await ensureMedia(
      'WAYGFT \u2014 homepage hero v3 (rotating prompt, pink palette)',
      'public/seed-assets/waygft/home-v3.png',
    )
    const wgtMediaAbout = await ensureMedia(
      'WAYGFT \u2014 about page v3 (soft-landing philosophy of the gratitude wall)',
      'public/seed-assets/waygft/about-v3.png',
    )
    const wgtMediaSubmit = await ensureMedia(
      'WAYGFT \u2014 submission form v3 (four content types: quote, story, photo, video)',
      'public/seed-assets/waygft/submit-v3.png',
    )
    const wgtMediaLatest = await ensureMedia(
      'WAYGFT \u2014 latest moments page v3b (3-column masonry wall, cropped bottom bar)',
      'public/seed-assets/waygft/latest-v3b.png',
    )

    // --- WAYGFT project (real client case study) ---
    const waygftProject: any = {
      title: 'WAYGFT \u2014 What Are You Grateful For Today?',
      slug: 'waygft',
      summary: 'A worldwide wall of anonymous gratitude \u2014 quotes, stories, photos, and videos, moderated by one human, delivered over a global CDN. Scaffolded, branded, and shipped to production in a single day.',
      client: 'Kaiti (waygft)',
      industry: 'Consumer / Community',
      projectType: 'webapp',
      year: 2026,
      duration: '1 day (7 commits)',
      teamSize: 1,
      liveUrl: 'https://waygft.life',
      ...(wgtMediaHome?.id ? { heroImage: wgtMediaHome.id } : {}),
      stack: [
        { name: 'Next.js 16 (App Router)', category: 'framework' },
        { name: 'React 19', category: 'framework' },
        { name: 'TypeScript', category: 'language' },
        { name: 'Tailwind CSS v4', category: 'design' },
        { name: 'Framer Motion', category: 'design' },
        { name: 'Prisma', category: 'tool' },
        { name: 'PostgreSQL', category: 'db' },
        { name: 'DigitalOcean Spaces + CDN', category: 'hosting' },
        { name: 'jose (JWT) + bcrypt', category: 'tool' },
        { name: 'Zod', category: 'tool' },
      ],
      challenge: rtDoc([
        ['p', 'Kaiti wanted to launch a worldwide wall of gratitude: anyone could anonymously share a quote, a story, a photo, or a video of something that made them smile. One human \u2014 her \u2014 would moderate every post with love before it appeared on the wall. The brand had to feel soft and personal, not like a SaaS product.'],
        ['p', 'The constraints were real: every submission had to stay anonymous, but submitters needed rate-limiting so bad actors couldn\u2019t flood the queue. Photos and videos had to load fast globally without bloating the server. The admin side had to be simple enough that one person could run the whole moderation queue on a phone. And it had to go from idea to production in a weekend.'],
      ]),
      approach: rtDoc([
        ['h3', 'Next.js 16 App Router with the new \u201Cproxy.ts\u201D'],
        ['p', 'Built on the App Router to get streaming, ISR, and server-side rendering for the wall. Used Next 16\u2019s new `proxy.ts` (the successor to `middleware.ts`) to guard every /admin/* route with a JWT cookie check. The gratitude wall home page is statically rendered with ISR (60s revalidation); approving a post calls `revalidatePath(\'/\')` for instant publish.'],
        ['h3', 'A schema that\u2019s smaller than it sounds'],
        ['p', 'Prisma + Postgres. Two tables: `Post` (with enum fields for `PostType` \u2192 QUOTE/STORY/PHOTO/VIDEO and `PostStatus` \u2192 PENDING/APPROVED/REJECTED), and `Admin` (email + bcrypt hash + last-login timestamp). Two compound indexes on `(status, createdAt)` and `(status, approvedAt)` keep the moderation queue and the public wall snappy as the table grows.'],
        ['h3', 'Privacy-first rate limiting'],
        ['p', 'Six submissions per hour per IP \u2014 but the raw IP is never stored. Every submission hashes the IP with a salted SHA-256 before it touches the database. The rate limiter itself is an in-memory keyed store, so it resets on redeploy and never persists PII. Zod schemas validate every submission at the edge.'],
        ['h3', 'Spaces + CDN for zero-drama media'],
        ['p', 'Photos and videos upload directly to DigitalOcean Spaces via a signed S3 client (`@aws-sdk/client-s3`). Every object is served from the Spaces CDN edge, not the droplet \u2014 a 4 GB droplet can run this at scale without ever touching the media path. When an admin deletes a photo post, the object is deleted from Spaces too.'],
        ['h3', 'A soft-landing brand'],
        ['p', 'Three custom Google fonts layered together: Plus Jakarta Sans for body, Fraunces for serif headlines, Caveat for the script flourish. Pink/parchment palette with floating hearts animated by Framer Motion. A three-column autoscrolling wall that slows on hover. Duck emoji accents. A rotating-prompt hero that cycles through \u201Cmusic / pretty / that thing\u201D before the user finishes reading.'],
        ['h3', 'An admin panel a non-engineer can actually run'],
        ['p', 'Three tabs: Pending, Approved, Rejected. Each post renders inline (text, photo, or video), with approve/reject buttons and a delete confirmation. Settings page with a change-password flow. No build step, no CMS to learn \u2014 just a login and three tabs.'],
      ]),
      outcome: rtDoc([
        ['p', 'Shipped in a single day. Seven commits from `create-next-app` to a moderated, multimedia, CDN-backed, mobile-ready production site live at waygft.life.'],
        ['ul', [
          'Public gratitude wall with 3-column autoscroll and opacity mask.',
          'Four submission types: quote, story, photo, video \u2014 all moderated.',
          '/latest paginated archive and per-post permalinks (/p/[id]) with social share.',
          'Admin portal with pending/approved/rejected queues + change-password flow.',
          'Rate limit: 6 submissions per hour per IP, stored as salted SHA-256 hashes.',
          'Mobile-first nav and wall; reduced-motion respected.',
          'Deployed to a $28/mo DO droplet + $5/mo Spaces bucket \u2014 ~$33/mo all-in.',
        ]],
        ['p', 'The brand landed in a way that matters: warm, soft, unmistakably not a product demo. The kind of site people actually want to submit to.'],
      ]),
      metrics: [
        { value: '1 day', label: 'scaffold \u2192 production' },
        { value: '4', label: 'submission types supported' },
        { value: '100%', label: 'human-moderated posts' },
        { value: '~$33/mo', label: 'all-in hosting cost' },
      ],
      gallery: [
        ...(wgtMediaAbout?.id ? [{
          image: wgtMediaAbout.id,
          caption: 'The About page \u2014 a one-paragraph mission statement, framed to feel like a handwritten letter rather than a product page.',
        }] : []),
        ...(wgtMediaSubmit?.id ? [{
          image: wgtMediaSubmit.id,
          caption: 'Four submission types behind a single form: quote, story, photo, video. Optional signature, zero required PII.',
        }] : []),
        ...(wgtMediaLatest?.id ? [{
          image: wgtMediaLatest.id,
          caption: 'The /latest archive \u2014 a masonry wall with quotes, stories, and media posts interleaved, each one linkable and shareable.',
        }] : []),
      ],
      featured: true,
      publishedAt: new Date().toISOString(),
    }

    const existingWAYGFT = await payload.find({
      collection: 'projects',
      where: { slug: { equals: waygftProject.slug } },
      limit: 1,
    })
    if (existingWAYGFT.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: waygftProject })
      payload.logger.info('[seed] project created: waygft')
    } else if (process.env.FORCE_WAYGFT_UPSERT === 'true') {
      await payload.update({
        collection: 'projects',
        id: existingWAYGFT.docs[0].id,
        data: waygftProject,
      })
      payload.logger.info('[seed] project upserted: waygft (FORCE_WAYGFT_UPSERT)')
    }

    // --- Article hero images (Unsplash, downloaded into public/seed-assets/articles/) ---
    const articleHeroNextjs = await ensureMedia(
      'Why Next.js over WordPress \u2014 laptop displaying source code on a dark background',
      'public/seed-assets/articles/why-nextjs.jpg',
    )
    const articleHeroSeo = await ensureMedia(
      'A realistic SEO playbook \u2014 analytics dashboards on a laptop screen',
      'public/seed-assets/articles/seo-playbook.jpg',
    )
    const articleHeroHosting = await ensureMedia(
      'Managed hosting \u2014 server racks lit by cool blue indicator lights in a data center',
      'public/seed-assets/articles/managed-hosting.jpg',
    )
    const articleHeroCwv = await ensureMedia(
      'Core Web Vitals playbook \u2014 a developer working on a laptop with performance metrics on screen',
      'public/seed-assets/articles/core-web-vitals.jpg',
    )

    // --- Sample articles ---
    const sampleArticles: any[] = [
      {
        title: 'Why we build on Next.js instead of WordPress',
        slug: 'why-nextjs-over-wordpress',
        excerpt: 'WordPress still runs 40% of the web. But for the work our clients actually hire us to do, it\u2019s usually the wrong tool \u2014 here\u2019s why.',
        author: 'Suhaib Chaudhry',
        readTime: 7,
        category: 'engineering',
        tags: [{ label: 'Next.js' }, { label: 'WordPress' }, { label: 'Architecture' }],
        featured: true,
        ...(articleHeroNextjs?.id ? { heroImage: articleHeroNextjs.id } : {}),
        publishedAt: '2026-04-23T09:00:00.000Z',
        content: rtDoc([
          ['p', 'WordPress powers roughly 40% of the web. For a lot of projects it\u2019s a completely reasonable choice \u2014 the ecosystem is massive, hosts are cheap, and most editorial teams already know how to use it. We don\u2019t hate it.'],
          ['p', 'But most of the work we get hired for is not a brochure site that someone\u2019s cousin is going to take over in six months. It\u2019s a marketing site that needs to rank, load fast, and be editable by a non-technical team for years. For that, Next.js plus a structured CMS wins almost every time. Here\u2019s why.'],
          ['h2', 'The stack is the product'],
          ['p', 'On WordPress, the stack is PHP, MySQL, and whatever plugin landscape your site has accumulated. Upgrades are a calendar item. Plugin conflicts are a class of bug. Performance work usually starts with "turn off the plugins."'],
          ['p', 'On Next.js, the stack is React, TypeScript, and a database adapter of your choice. Dependencies update through a single package manifest. There\u2019s one place the code runs and one place your content lives. That\u2019s not an accident \u2014 it\u2019s the point.'],
          ['h2', 'Performance is a default, not a retrofit'],
          ['p', 'Next.js ships static HTML for anything that can be statically rendered, with automatic code splitting, image optimization, font optimization, and edge caching built in. A fresh Next.js install loads in under a second on a 3G connection. A fresh WordPress install usually does not.'],
          ['p', 'You can make WordPress fast. We\u2019ve done it. But "make WordPress fast" is a separate engagement. With Next.js, fast is the starting line.'],
          ['h2', 'The CMS is part of the design'],
          ['p', 'The worst WordPress sites we\u2019ve inherited have a content layer that fights the design. Gutenberg blocks don\u2019t line up with the theme. Editors use paragraph tags where the design expects a specific component. Every page ends up looking slightly different.'],
          ['p', 'With Payload CMS (our usual pick for Next.js), we define the content schema in TypeScript alongside the components that render it. The editor only sees blocks that actually exist in the design. The design and the CMS can never drift.'],
          ['h2', 'When WordPress is still the right call'],
          ['p', 'We pick WordPress for:'],
          ['ul', [
            'News sites with multiple editors, existing editorial workflows, and a Gutenberg-native team',
            'Sites where the client explicitly owns a WordPress host and isn\u2019t looking to migrate',
            'Simple directory or landing-page sites where the $30/mo managed WordPress host is legitimately the cheapest option',
          ]],
          ['p', 'Everything else \u2014 marketing sites, SaaS product pages, lead-gen sites, internal tools \u2014 gets Next.js.'],
          ['quote', 'Pick the tool that will still be working in three years when the person who hired you has moved on.'],
          ['p', 'That\u2019s the real test. Not the benchmark on the homepage. Not the number of plugins. Whether the site your successor inherits is something they can actually maintain.'],
        ]),
      },
      {
        title: 'A realistic SEO playbook for small teams',
        slug: 'realistic-seo-playbook',
        excerpt: 'Most SEO advice online is written for companies with a content team of twelve. This is what actually works when it\u2019s you, a designer, and one marketer.',
        author: 'Suhaib Chaudhry',
        readTime: 9,
        category: 'seo',
        tags: [{ label: 'SEO' }, { label: 'Content' }, { label: 'Small teams' }],
        featured: false,
        ...(articleHeroSeo?.id ? { heroImage: articleHeroSeo.id } : {}),
        publishedAt: '2026-04-12T09:00:00.000Z',
        content: rtDoc([
          ['p', 'Most SEO blogs are written by people selling SEO tools. They have an interest in making the work sound bigger than it is. The truth is that for a small business, 80% of the return comes from about six things \u2014 and none of them are buying a link package.'],
          ['h2', '1. Fix the technical foundation once'],
          ['p', 'Before any content strategy, handle the boring part. Make sure Google can crawl and index your site. Submit a sitemap. Fix broken links and redirect chains. Ensure your canonical tags are not fighting each other. Add schema.org structured data for your business type.'],
          ['p', 'This is a one-time job for most sites, usually a week or two of work. After that it\u2019s maintenance.'],
          ['h2', '2. Pick topic clusters, not keywords'],
          ['p', 'Don\u2019t chase "best web designer [your city]" and lose. Pick three or four topic clusters you have real authority in. Build a pillar page for each, then 5\u201310 supporting articles that link back to it.'],
          ['p', 'This works because Google ranks topical authority, not keyword density. When you\u2019re the obvious answer to a cluster of related questions, you rank for all of them.'],
          ['h2', '3. Write for the reader Google thinks is reading'],
          ['p', 'Every search has an intent: informational, navigational, transactional, commercial-investigation. Before you write, search the query and read the top three results. Match the format. If they\u2019re lists, write a list. If they\u2019re deep essays, write an essay. Google has already told you what it thinks the correct answer shape is.'],
          ['h2', '4. Internal linking is a lever'],
          ['p', 'The single most underused SEO lever for small sites. Every time you publish a new article, look at what else you\u2019ve written that relates, and add a link. This is how you build topical authority inside the site itself.'],
          ['ul', [
            'From every new article, link to 2\u20134 older related articles',
            'From every old article, link forward to the newest piece that updates or extends it',
            'Use descriptive anchor text \u2014 never "click here"',
          ]],
          ['h2', '5. Core Web Vitals are now non-negotiable'],
          ['p', 'Google uses page speed as a ranking signal. More importantly, users leave. A 4-second load costs you 35% of mobile traffic. If your LCP is over 2.5s or your CLS is over 0.1, fix it before you write another article.'],
          ['h2', '6. Measure one thing: organic sessions to the pages you care about'],
          ['p', 'Ignore the vanity metrics. Not total traffic. Not total rankings. The only chart that matters is organic sessions to the pages that convert. Filter Google Analytics to "organic search" and the URLs you want to rank. Everything else is noise.'],
          ['quote', 'SEO is a compounding game. You don\u2019t win it in a month. You win it in year two, after eighteen consistent months.'],
          ['p', 'Which is exactly why most small teams lose it: they give up in month four.'],
        ]),
      },
      {
        title: 'Managed hosting is a boring superpower',
        slug: 'managed-hosting-boring-superpower',
        excerpt: 'Your site going down at 2am on a Saturday is a human problem, not a technical one. Managed hosting is mostly about making sure a human is actually on call.',
        author: 'Suhaib Chaudhry',
        readTime: 5,
        category: 'hosting',
        tags: [{ label: 'Hosting' }, { label: 'DevOps' }, { label: 'Reliability' }],
        featured: false,
        ...(articleHeroHosting?.id ? { heroImage: articleHeroHosting.id } : {}),
        publishedAt: '2026-03-29T09:00:00.000Z',
        content: rtDoc([
          ['p', 'Self-hosting has never been easier. Docker, DigitalOcean, Caddy, GitHub Actions \u2014 for about $12 a month and an afternoon of setup, you can run a production site with automatic HTTPS, continuous deployment, and a managed database.'],
          ['p', 'So why do we still charge a monthly retainer for managed hosting? Because the hard part of hosting has never been the setup. It\u2019s the 2am Saturday.'],
          ['h2', 'What breaks, actually breaks'],
          ['p', 'In five years of running production sites, here\u2019s what\u2019s actually gone wrong:'],
          ['ul', [
            'A cron job filling up the disk with log rotations that stopped working after an apt upgrade',
            'A TLS certificate failing to auto-renew because the ACME challenge couldn\u2019t reach the server through a new firewall rule',
            'A database migration locking a critical table during a deploy',
            'An upstream dependency shipping a broken release that took the container out on restart',
            'A DDoS from a single abusive IP that the host\u2019s default config didn\u2019t block',
          ]],
          ['p', 'Every one of these required a human looking at logs within minutes, not hours. A monitoring system that pages you is table stakes. Someone who answers the page is the whole product.'],
          ['h2', 'What managed hosting actually is'],
          ['p', 'It\u2019s four things:'],
          ['ul', [
            'A human on call when something breaks',
            'A disaster recovery plan that has been tested this quarter',
            'Logs, metrics, and alerts configured for your specific workload',
            'Someone who knows the stack well enough to fix it, not just restart it',
          ]],
          ['p', 'You can buy each one separately. Bundle them into one engagement and you get a site that stays up.'],
          ['quote', 'The goal of good hosting is to be boring. You should forget it exists.'],
        ]),
      },
      {
        title: 'The Core Web Vitals playbook',
        slug: 'core-web-vitals-playbook',
        excerpt: 'LCP, CLS, INP. Three numbers Google uses to rank you. Here\u2019s the actual order of operations we use to get them into the green \u2014 in about a week, for most sites.',
        author: 'Suhaib Chaudhry',
        readTime: 8,
        category: 'performance',
        tags: [{ label: 'Core Web Vitals' }, { label: 'Performance' }, { label: 'Optimization' }],
        featured: false,
        ...(articleHeroCwv?.id ? { heroImage: articleHeroCwv.id } : {}),
        publishedAt: '2026-03-16T09:00:00.000Z',
        content: rtDoc([
          ['p', 'Core Web Vitals is how Google measures whether your site feels fast. There are three numbers: Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Interaction to Next Paint (INP). You want them green. This is the order we fix them in.'],
          ['h2', 'Step 1: Measure from real users, not Lighthouse'],
          ['p', 'Lighthouse runs in a controlled lab on your machine. Real users are on flaky 4G, on a phone from 2019. Pull Core Web Vitals from Google\u2019s Chrome UX Report (CrUX) or from your analytics platform. That\u2019s what Google is actually ranking on.'],
          ['h2', 'Step 2: Attack LCP first'],
          ['p', 'LCP is almost always the highest-impact metric. It\u2019s the time until the largest visible element paints \u2014 usually the hero image or the hero headline.'],
          ['ul', [
            'Preload the hero image. One line in your <head>.',
            'Serve hero images as AVIF or WebP, never JPEG, with a responsive <picture> or srcset.',
            'Set width and height on every image so the browser can allocate space before it loads.',
            'Self-host your fonts with font-display: swap. Never use Google\u2019s CDN directly.',
          ]],
          ['p', 'These four changes alone take a median site from 3.5s LCP to under 1.5s.'],
          ['h2', 'Step 3: Kill layout shift'],
          ['p', 'CLS is cheap to fix. Every layout shift is a thing that rendered before its space was reserved. Two culprits cover 90% of cases:'],
          ['ul', [
            'Images and videos without explicit dimensions',
            'Late-loading ads or embeds (YouTube, Twitter) without a fixed-height placeholder',
          ]],
          ['p', 'Wrap embeds in a container with a fixed aspect ratio. Always declare image dimensions. CLS goes green.'],
          ['h2', 'Step 4: INP is where you earn your money'],
          ['p', 'INP replaced FID in 2024 and it\u2019s harder to fix. It\u2019s the worst-case interaction latency on the page \u2014 click, type, scroll. It goes bad because the main thread is busy running a huge bundle of JavaScript.'],
          ['ul', [
            'Audit your bundle. Remove anything over 50kb that you\u2019re not using.',
            'Lazy-load anything below the fold.',
            'Debounce scroll and resize listeners. Never run expensive logic on every frame.',
            'Break up long tasks with requestIdleCallback or scheduler.yield.',
          ]],
          ['h2', 'Step 5: Ship and re-measure'],
          ['p', 'CrUX updates on a 28-day rolling window. You won\u2019t see the green bar until a full month after your deploy. Don\u2019t panic, don\u2019t re-optimize prematurely. Ship, wait 28 days, re-measure.'],
          ['quote', 'A fast site isn\u2019t a lucky site. It\u2019s a site where someone with authority said "we\u2019re going to take a week and fix this" and then actually took the week.'],
        ]),
      },
    ]

    for (const art of sampleArticles) {
      const existing = await payload.find({ collection: 'articles', where: { slug: { equals: art.slug } }, limit: 1 })
      if (existing.totalDocs === 0) {
        await payload.create({ collection: 'articles', data: art })
        payload.logger.info(`[seed] article created: ${art.slug}`)
      } else if (process.env.FORCE_ARTICLES_UPSERT === 'true') {
        await payload.update({
          collection: 'articles',
          id: existing.docs[0].id,
          data: art,
        })
        payload.logger.info(`[seed] article upserted: ${art.slug} (FORCE_ARTICLES_UPSERT)`)
      }
    }

    payload.logger.info('[seed] complete.')
  } catch (err) {
    payload.logger.error({ err }, '[seed] failed')
  }
}
