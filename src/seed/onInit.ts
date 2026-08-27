/* eslint-disable @typescript-eslint/no-explicit-any */
/* Seed initial content via Payload's onInit hook. Runs once on server boot; idempotent (updates instead of duplicates). */
import path from 'node:path'
import type { Payload } from 'payload'
import * as resetContent from './reset-content'
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

    // Globals are seeded only when empty (or with FORCE_GLOBALS_UPSERT=true),
    // so admin edits and content-script writes survive restarts. A fresh
    // database still comes up with the correct nav, CTA, and footer.
    const forceGlobals = process.env.FORCE_GLOBALS_UPSERT === 'true'

    const existingSettings = await payload.findGlobal({ slug: 'siteSettings' })
    if (forceGlobals || !existingSettings?.siteName) {
      await payload.updateGlobal({
        slug: 'siteSettings',
        data: {
          siteName: 'Black Hart Consulting',
          tagline: 'Websites, AI phone answering, and automations for service businesses.',
          defaultMetaDescription: 'Websites, AI phone answering, and automations for service businesses. Built in days at fixed prices by a Houston studio.',
          defaultTheme: 'dark',
          contactEmail: 'hello@blackhartconsulting.com',
          contactPhone: '(866) 434-9777',
        } as any,
      })
    }

    const existingHeader = await payload.findGlobal({ slug: 'header' })
    if (forceGlobals || !existingHeader?.nav?.length) {
      await payload.updateGlobal({
        slug: 'header',
        data: {
          nav: [
            { label: 'Services', href: '/services' },
            { label: 'AI Front Desk', href: '/ai-front-desk' },
            { label: 'Work', href: '/portfolio' },
            { label: 'Articles', href: '/articles' },
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
          ],
          cta: { show: true, label: 'See your site first', href: '/free-demo-site' },
        } as any,
      })
    }

    const existingFooter = await payload.findGlobal({ slug: 'footer' })
    if (forceGlobals || !existingFooter?.columns?.length) {
      await payload.updateGlobal({
        slug: 'footer',
        data: {
          tagline: 'Websites, phone answering, and automations for businesses that care how their work shows up.',
          columns: [
            { heading: 'Services', links: [
              { label: 'Websites', href: '/services#websites' },
              { label: 'AI Front Desk', href: '/ai-front-desk' },
              { label: 'Automation', href: '/automation' },
              { label: 'Local SEO + AI Search', href: '/services#seo' },
              { label: 'Fix-it menu', href: '/fix-it' },
            ] },
            { heading: 'Studio', links: [
              { label: 'Free demo site', href: '/free-demo-site' },
              { label: 'Work', href: '/portfolio' },
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
    }

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
    // Canonical page layouts live in src/seed/reset-content.ts (2026-08
    // pricing reset) and are shared with scripts/pricing-reset/apply.mts.
    const homeData: any = { ...resetContent.homePage(), publishedAt: new Date().toISOString() }

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
        resetContent.howWeBuildBlock,
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
          noCallNeeded: true,
          submitLabel: 'Send inquiry' },
        { blockType: 'faq', headline: 'Common questions before you write', items: [
          { question: 'What should I include in my first note?', answer: 'A sentence on your company, a sentence on what you\u2019re trying to build or fix, and a rough budget range if you have one. We\u2019ll take it from there.' },
          { question: 'What\u2019s the engagement process?', answer: 'Write what you need, or use the Buy button on any package. Payment runs through Stripe: pay in full or subscribe, and a 50 percent deposit by invoice is available on request for Pro Site, Custom Build, and Internal Tool. Kickoff starts the moment your intake form is in.' },
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
    const servicesData: any = { ...resetContent.servicesPage(), publishedAt: new Date().toISOString() }

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

    // New catalog pages (2026-08 pricing reset): fix-it, ai-front-desk,
    // automation, free-demo-site, thanks. Create-if-missing only; the content
    // script (apply.mts) owns updates.
    for (const build of [
      resetContent.fixItPage, resetContent.aiFrontDeskPage, resetContent.automationPage,
      resetContent.freeDemoSitePage, resetContent.thanksPage,
    ]) {
      const data: any = { ...build(), publishedAt: new Date().toISOString() }
      const existing = await payload.find({ collection: 'pages', where: { slug: { equals: data.slug } }, limit: 1 })
      if (existing.totalDocs === 0) {
        await payload.create({ collection: 'pages', data })
        payload.logger.info(`[seed] ${data.slug} page created`)
      }
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
      group: 'client',
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
      group: 'client',
      summary: 'A worldwide wall of anonymous gratitude \u2014 quotes, stories, photos, and videos, moderated by one human, delivered over a global CDN. Scaffolded, branded, and shipped to production in 5 days.',
      client: 'Kaiti (waygft)',
      industry: 'Consumer / Community',
      projectType: 'webapp',
      year: 2026,
      duration: '5 days (7 commits)',
      teamSize: 1,
      // liveUrl intentionally omitted: waygft.life is powered off (client hosting
      // lapsed), so linking it would send visitors to a dead site. Restore
      // `liveUrl: 'https://waygft.life'` if the client resumes hosting.
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
        ['p', 'Shipped in 5 days. Seven commits from `create-next-app` to a moderated, multimedia, CDN-backed, mobile-ready production site live at waygft.life.'],
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
        { value: '5 days', label: 'scaffold \u2192 production' },
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

    // --- Misbah media uploads (composited iOS-simulator captures on warm panels) ---
    // ⚠️ Hero uses a UNIQUE filename (`misbah-hero.png`, NOT the generic `hero.png`):
    // every project ships a `hero.png` seed-asset, and on the flat Spaces bucket they
    // collide — Misbah's was overwritten by MergeBird's `hero.png`, so the portfolio
    // card showed MergeBird's image. The alt is changed too, so `ensureMedia` creates a
    // FRESH media record (the old one points at the clobbered `hero.png`). Keep app
    // seed-assets uniquely named to avoid this.
    const misbahMediaHero = await ensureMedia(
      'Misbah app hero — Quran, Home prayer-countdown, and Duas (3-up composite)',
      'public/seed-assets/misbah/misbah-hero.png',
    )
    const misbahMediaQibla = await ensureMedia(
      'Misbah — Qibla compass with live bearing and distance to the Kaaba in Makkah',
      'public/seed-assets/misbah/qibla.png',
    )
    const misbahMediaQuran = await ensureMedia(
      'Misbah — full offline Quran: searchable surah list with per-surah recitation downloads',
      'public/seed-assets/misbah/quran.png',
    )
    const misbahMediaDuas = await ensureMedia(
      'Misbah — Hisn al-Muslim dua collection grouped into eight everyday categories',
      'public/seed-assets/misbah/duas.png',
    )
    const misbahMediaMonthly = await ensureMedia(
      'Misbah — full-month prayer timetable with region-aware calculation methods',
      'public/seed-assets/misbah/monthly.png',
    )

    // --- Misbah project (first-party iOS app, live on the App Store) ---
    const misbahProject: any = {
      title: 'Misbah — Prayer, Qibla & Quran',
      slug: 'misbah',
      summary: 'A warm, privacy-first iOS companion for daily Muslim worship — accurate prayer times with a no-server Live Activity countdown, a Qibla compass, the full offline Quran, and the complete Hisn al-Muslim dua collection. Built in SwiftUI with a framework-light core for a future Android port. Collects nothing; works on-device.',
      client: 'Black Hart Consulting (first-party app)',
      industry: 'Muslim lifestyle / Consumer iOS',
      projectType: 'mobile',
      year: 2026,
      duration: 'Launched July 2026',
      teamSize: 1,
      ...(misbahMediaHero?.id ? { heroImage: misbahMediaHero.id } : {}),
      stack: [
        { name: 'SwiftUI', category: 'framework' },
        { name: 'Swift 6 (strict concurrency)', category: 'language' },
        { name: 'MisbahCore (Swift Package)', category: 'framework' },
        { name: 'WidgetKit', category: 'framework' },
        { name: 'ActivityKit / Live Activities', category: 'framework' },
        { name: 'SwiftData', category: 'db' },
        { name: 'StoreKit 2', category: 'tool' },
        { name: 'Core Location', category: 'tool' },
        { name: 'Adhan (prayer-time engine)', category: 'tool' },
      ],
      challenge: rtDoc([
        ['p', 'The Muslim prayer-app category is crowded, ad-heavy, and — as a string of well-documented investigations between 2020 and 2025 showed — a place where some of the most popular apps quietly sold users’ precise location to data brokers, with the data ending up in the hands of military and immigration agencies. For an app opened during worship, that is a profound breach of trust.'],
        ['p', 'The brief was to build the opposite: a warm, beautiful daily companion for the five prayers, the Qibla, the Quran, and the everyday duas — with an architecture that is privacy-first by construction. No account, no ads, no analytics, no tracking, and nothing about the user collected or sold. And it had to feel calm and premium, not utilitarian.'],
        ['p', 'The hardest constraint followed straight from that stance: the signature feature — a live countdown to the next prayer on the Lock Screen — had to work with no push server (which would mean running a backend that sees every user’s location and schedule). Apple’s Live Activities are designed to be driven by push. Doing it server-free is swimming upstream.'],
      ]),
      approach: rtDoc([
        ['h3', 'Privacy-first, by construction'],
        ['p', 'Prayer times and the Qibla are computed entirely on-device from Core Location and an open-source astronomical engine. There is no backend, no analytics SDK, and no advertising SDK anywhere in the app. The only network call is optional Quran-recitation audio, streamed from a public host and cached locally. The App Store privacy label is, truthfully, “Data Not Collected.”'],
        ['h3', 'A no-server Live Activity that survives the night'],
        ['p', 'The next-prayer countdown runs on the Lock Screen, Dynamic Island, CarPlay, and Apple Watch — with no push server. The trick: the Live Activity bakes the whole upcoming prayer schedule into its state, and the widget recomputes the current prayer at render time, counting down from the device clock. So when iOS re-renders the activity at its stale-date boundary, it advances to the next prayer on its own — even while the phone is asleep. A WidgetKit timeline and a best-effort background refresh layer on top for reliability.'],
        ['h3', 'A framework-light core for a future Android port'],
        ['p', 'All of the logic, content, and design tokens live in MisbahCore — a SwiftUI-free Swift package — with every platform capability (location, notifications, purchases) behind a protocol. That keeps the door open to a native Jetpack Compose rebuild against the same core, without re-deriving prayer math or re-authoring content.'],
        ['h3', 'The full Quran and an authentic dua library, offline'],
        ['p', 'The complete Quran ships offline — Uthmani Arabic plus a public-domain translation, all 114 surahs — with stream-and-cache recitation, so each verse is available offline after its first play. The full Hisn al-Muslim collection (267 duas across eight everyday categories, 233 with bundled audio) is searchable down to the individual supplication.'],
        ['h3', 'Calm, premium design'],
        ['p', 'A warm palette, a serif display face for the countdown, hand-tuned Arabic typography, and four sky-phase gradients that shift with the time of day. Monetization is a one-time “Misbah Plus” unlock plus an optional tip jar — no ads, no subscription traps.'],
      ]),
      outcome: rtDoc([
        ['p', 'Version 1.0 shipped to the App Store in July 2026 and is live in 174 countries — roughly 85 Swift files behind a calm five-tab interface, with a reusable Swift-package core ready for Android.'],
        ['ul', [
          'Five daily prayers with adhan audio, per-prayer reminders, and a full-month timetable (region-aware calculation methods).',
          'A no-server next-prayer Live Activity engineered to roll over overnight — on Lock Screen, Dynamic Island, CarPlay, and Apple Watch.',
          'A magnetometer Qibla compass with live bearing and distance to Makkah, plus an AR Qibla mode.',
          'The full offline Quran with translation, bookmarks, translation search, and stream-and-cache recitation.',
          '267 Hisn al-Muslim duas in eight categories, 233 with audio, searchable to the individual dua.',
          'A first-run feature tour, a daily prayer log with qada (missed-prayer) make-up, a Ramadan suite, a tasbih counter, and Home / Lock-Screen widgets.',
        ]],
        ['p', 'Every one of those features runs without collecting a single byte of user data — the very thing the category’s biggest names gave up.'],
      ]),
      metrics: [
        { value: '0', label: 'trackers, ads, or data sold' },
        { value: '100%', label: 'on-device — works offline' },
        { value: '114', label: 'surahs, full Quran offline' },
        { value: '267', label: 'Hisn al-Muslim duas' },
      ],
      gallery: [
        ...(misbahMediaQibla?.id ? [{
          image: misbahMediaQibla.id,
          caption: 'The Qibla compass — live bearing and distance to the Kaaba, computed on-device from the magnetometer.',
        }] : []),
        ...(misbahMediaQuran?.id ? [{
          image: misbahMediaQuran.id,
          caption: 'The full Quran ships offline — a searchable surah list with per-surah recitation downloads for offline listening.',
        }] : []),
        ...(misbahMediaDuas?.id ? [{
          image: misbahMediaDuas.id,
          caption: 'The complete Hisn al-Muslim collection, grouped into eight everyday categories and searchable to the individual dua.',
        }] : []),
        ...(misbahMediaMonthly?.id ? [{
          image: misbahMediaMonthly.id,
          caption: 'A full-month prayer timetable with region-aware calculation methods (ISNA shown).',
        }] : []),
      ],
      appInstall: {
        status: 'live',
        appName: 'Misbah',
        appStoreUrl: 'https://apps.apple.com/app/id6776505999',
        platformNote: 'iPhone & iPad — iOS 17+',
      },
      featured: true,
      publishedAt: new Date().toISOString(),
    }

    const existingMisbah = await payload.find({
      collection: 'projects',
      where: { slug: { equals: misbahProject.slug } },
      limit: 1,
    })
    if (existingMisbah.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: misbahProject })
      payload.logger.info('[seed] project created: misbah')
    } else if (process.env.FORCE_MISBAH_UPSERT === 'true') {
      await payload.update({
        collection: 'projects',
        id: existingMisbah.docs[0].id,
        data: misbahProject,
      })
      payload.logger.info('[seed] project upserted: misbah (FORCE_MISBAH_UPSERT)')
    }

    // --- EstimatedTax media uploads (live captures of estimatedtax.io, light theme) ---
    const etHero = await ensureMedia(
      'EstimatedTax — homepage hero: the set-aside question beside a live 2026 estimate preview card',
      'public/seed-assets/estimatedtax/hero.png',
    )
    const etEstimate = await ensureMedia(
      'EstimatedTax — the guided calculator: federal + self-employment tax, effective rate, and four quarterly payments',
      'public/seed-assets/estimatedtax/estimate.png',
    )
    const etStates = await ensureMedia(
      'EstimatedTax — a per-state page (California) showing the combined federal + state estimate',
      'public/seed-assets/estimatedtax/states.png',
    )
    const etScorp = await ensureMedia(
      'EstimatedTax — the built-in S-Corp vs sole-proprietor comparison with a break-even verdict',
      'public/seed-assets/estimatedtax/scorp.png',
    )
    const etProfessions = await ensureMedia(
      'EstimatedTax — programmatic SEO: twelve profession-specific tax calculator pages',
      'public/seed-assets/estimatedtax/professions.png',
    )
    const etGuides = await ensureMedia(
      'EstimatedTax — the guides hub: fifteen plain-language self-employed tax guides',
      'public/seed-assets/estimatedtax/guides.png',
    )

    // --- EstimatedTax project (first-party product, live at estimatedtax.io) ---
    const estimatedTaxProject: any = {
      title: 'EstimatedTax — 2026 Self-Employment Tax Estimator',
      slug: 'estimatedtax',
      summary: 'A free, SEO-first 2026 tax estimator for freelancers and the self-employed — federal + self-employment tax, all 50 states and D.C., an S-Corp break-even, and a real paid email-reminder service. 84 statically-generated pages, every tax calculation client-side, shipped to estimatedtax.io.',
      client: 'Black Hart Consulting (first-party product)',
      industry: 'FinTech / Tax',
      projectType: 'webapp',
      year: 2026,
      duration: 'days, not weeks',
      teamSize: 1,
      liveUrl: 'https://estimatedtax.io',
      ...(etHero?.id ? { heroImage: etHero.id } : {}),
      stack: [
        { name: 'Next.js 15 (App Router)', category: 'framework' },
        { name: 'React 19', category: 'framework' },
        { name: 'TypeScript', category: 'language' },
        { name: 'Tailwind CSS v3', category: 'design' },
        { name: 'Vitest', category: 'tool' },
        { name: 'Stripe (subscriptions)', category: 'tool' },
        { name: 'Resend', category: 'tool' },
        { name: 'Vercel (hosting + Cron)', category: 'hosting' },
      ],
      challenge: rtDoc([
        ['p', 'Freelancers and the self-employed have to estimate and pre-pay their own taxes four times a year — and the existing tools are either ad-choked, inaccurate, or quietly harvesting the income figures people type in. The goal was a free 2026 estimator that is fast, genuinely accurate, completely private, and built to rank in search so it compounds on its own.'],
        ['p', 'Three constraints shaped everything. The tax math had to be exactly right for 2026 — real IRS figures, self-employment tax, the QBI deduction, all fifty states. Nothing a user typed could ever leave the browser. And it had to monetize without the sleaze the category is known for: no ad walls, no fake “free” that paywalls the actual answer.'],
      ]),
      approach: rtDoc([
        ['h3', 'Static-first Next.js, with the tax engine 100% in the browser'],
        ['p', 'The whole site is statically generated — 84 pages — and the tax engine is a pure, dependency-free TypeScript module that runs entirely client-side. Nothing the user types is ever sent anywhere, the result is instant, and hosting is effectively free. The calculator itself is a guided three-step wizard whose numbers update live as you type.'],
        ['h3', 'One locked tax config, pinned by regression tests'],
        ['p', 'Every 2026 figure — brackets, the standard deduction, the Social Security wage base, the QBI thresholds — lives in a single locked config file that is the only source of truth; no number is hardcoded anywhere else. 67 Vitest tests pin the math against hand-derived anchors (a $120k sole proprietor owes exactly $28,462), so a refactor can never silently change someone’s tax.'],
        ['h3', 'Programmatic SEO at real scale'],
        ['p', 'All 50 states plus D.C. ship with verified 2026 brackets, alongside 15 plain-language guides and 12 profession-specific calculator pages (rideshare driver, real estate agent, consultant, and more). Every page is generated from data with tailored metadata, JSON-LD, an explainer, and an FAQ — the prose surface that earns search rankings and AI citations.'],
        ['h3', 'The hard tax details, done properly'],
        ['p', 'Beyond the basics: the §199A QBI deduction with its high-income phase-out and specified-service-business rules, an S-Corp vs sole-proprietor comparison with a real break-even verdict, the safe-harbor rule, a W-2 withholding offset for people with a day job, and a one-tap .ics export of the four due dates.'],
        ['h3', 'Monetization that is actually a product'],
        ['p', 'Three honest revenue streams: CPA and payroll (Gusto) affiliate placements that adapt to the user’s situation, and a real Pro tier. Pro is not a paywall on free features — it is a backend-gated email reminder service (a Stripe subscription feeds a daily Vercel Cron job that emails only active subscribers, via Resend, before each due date), something free users genuinely cannot replicate.'],
        ['h3', 'A calm “financial instrument” design'],
        ['p', 'A custom Sage design system with full light/dark support, three layered typefaces, and a results ledger that reads like a statement rather than a form. No ads, no sign-up, no clutter — the kind of tool people actually trust with a money question.'],
      ]),
      outcome: rtDoc([
        ['p', 'Shipped to estimatedtax.io: a free, fast, private 2026 tax estimator that already monetizes.'],
        ['ul', [
          '84 statically-generated pages — the calculator, all 50 states + D.C., 15 guides, and 12 profession pages.',
          'A guided calculator: federal income tax, self-employment tax, the QBI deduction with its high-earner phase-out, and the four quarterly payments with safe-harbor sizing.',
          'A built-in S-Corp vs sole-proprietor break-even, a W-2 withholding offset, .ics calendar export, and shareable result links.',
          'A real Pro subscription — backend-gated email reminders via Stripe → Vercel Cron → Resend.',
          'CPA + payroll affiliate placements that adapt to the user’s numbers.',
          'Verified in Google Search Console with an 84-URL sitemap; light/dark, fully responsive, zero ads.',
        ]],
        ['p', 'Every calculation runs in the browser — not a single byte of anyone’s financial data is collected — and the SEO surface is built to compound over time. A free tool that respects its users and still pays for itself.'],
      ]),
      metrics: [
        { value: '84', label: 'statically-generated pages' },
        { value: '51', label: 'states + D.C. covered' },
        { value: '67', label: 'tests pinning the tax math' },
        { value: '0', label: 'bytes of user data collected' },
      ],
      gallery: [
        ...(etEstimate?.id ? [{
          image: etEstimate.id,
          caption: 'The guided calculator — federal + self-employment tax, your effective rate, and the four quarterly payments, all computed live in the browser.',
        }] : []),
        ...(etStates?.id ? [{
          image: etStates.id,
          caption: 'Every state has its own page: choose California and the estimate folds in state income tax for a combined federal + state total ($34,757 here).',
        }] : []),
        ...(etScorp?.id ? [{
          image: etScorp.id,
          caption: 'A built-in S-Corp vs sole-proprietor comparison nets the self-employment-tax saving against payroll costs and returns a plain break-even verdict.',
        }] : []),
        ...(etProfessions?.id ? [{
          image: etProfessions.id,
          caption: 'Programmatic SEO: twelve profession-specific calculator pages, each with the deductions and S-Corp math that actually apply to that line of work.',
        }] : []),
        ...(etGuides?.id ? [{
          image: etGuides.id,
          caption: 'Fifteen plain-language guides — set-aside math, the safe harbor, QBI, the S-Corp break-even — each backed by the same free calculator.',
        }] : []),
      ],
      featured: true,
      publishedAt: new Date().toISOString(),
    }

    const existingET = await payload.find({
      collection: 'projects',
      where: { slug: { equals: estimatedTaxProject.slug } },
      limit: 1,
    })
    if (existingET.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: estimatedTaxProject })
      payload.logger.info('[seed] project created: estimatedtax')
    } else if (process.env.FORCE_ESTIMATEDTAX_UPSERT === 'true') {
      await payload.update({
        collection: 'projects',
        id: existingET.docs[0].id,
        data: estimatedTaxProject,
      })
      payload.logger.info('[seed] project upserted: estimatedtax (FORCE_ESTIMATEDTAX_UPSERT)')
    }

    // --- Sidecar media uploads (designed store assets for the flagship "Sidecar for Kajabi") ---
    const scHero = await ensureMedia(
      'Sidecar for Kajabi — product banner: export your Kajabi data in one click',
      'public/seed-assets/sidecar/hero-banner.jpg',
    )
    const scExportBar = await ensureMedia(
      'Sidecar — the one-click export bar injected above a Kajabi contacts table',
      'public/seed-assets/sidecar/product-1.jpg',
    )
    const scFields = await ensureMedia(
      'Sidecar — Full export recovers all 15 contact fields from the 6 Kajabi shows',
      'public/seed-assets/sidecar/product-2.jpg',
    )
    const scPricing = await ensureMedia(
      'Sidecar — free one-click CSV, with JSON and Full export on the Pro tier',
      'public/seed-assets/sidecar/product-3.jpg',
    )

    // --- Sidecar project (first-party product, flagship live at blackhartconsulting.com/sidecar/kajabi) ---
    const sidecarProject: any = {
      title: 'Sidecar — One-Click Data Export for Kajabi',
      slug: 'sidecar',
      summary: 'A Manifest V3 browser extension that overlays Kajabi and adds the one-click export its dashboard refuses to give you — CSV, Excel, JSON, a branded PDF report, on-page insights, and a Full export that walks every page to pull every field — built on a reusable engine designed to ship the same fix across a whole portfolio of locked-in platforms. Every export runs in the browser; nothing leaves the device. Built, validated on a live account, and now live on the Chrome Web Store.',
      client: 'Black Hart Consulting (first-party product)',
      industry: 'Creator Economy / SaaS Tools',
      projectType: 'webapp',
      year: 2026,
      duration: 'days, not weeks',
      teamSize: 1,
      liveUrl: 'https://blackhartconsulting.com/sidecar/kajabi',
      ...(scHero?.id ? { heroImage: scHero.id } : {}),
      stack: [
        { name: 'TypeScript', category: 'language' },
        { name: 'Manifest V3 (Chrome Extension)', category: 'framework' },
        { name: 'Vite 8 + @crxjs/vite-plugin', category: 'tool' },
        { name: 'Shadow DOM (isolated UI)', category: 'framework' },
        { name: 'ExtensionPay + Stripe', category: 'tool' },
        { name: 'npm workspaces (monorepo)', category: 'tool' },
        { name: 'Chrome Web Store', category: 'hosting' },
      ],
      challenge: rtDoc([
        ['p', 'Kajabi runs the businesses of hundreds of thousands of creators on $200–400/month plans, but it will not let them take their own data with them. There is no public API, the contact list shows only a fraction of the fields it actually stores, and the one built-in export is a slow CSV that gets emailed to you and expires in three days. Plenty of people end up copy-pasting rows by hand.'],
        ['p', 'The brief had two layers. Build the export Kajabi withholds — cleanly and safely, inside a dashboard we do not control and must not break. And build it so the same fix can ship for the next locked-in platform, and the one after that, without starting from scratch each time.'],
      ]),
      approach: rtDoc([
        ['h3', 'An overlay, not an integration'],
        ['p', 'Kajabi has no API to connect to, so Sidecar does not try. A Manifest V3 content script injects a small export bar directly above Kajabi’s own tables — People, Sales, Analytics — inside the dashboard the user is already logged into. The whole UI lives in a Shadow DOM, so the host’s styles can’t break it and it can’t break Kajabi.'],
        ['h3', 'The real product is a reusable engine'],
        ['p', 'The valuable part isn’t the Kajabi extension — it’s @sidecar/core: a shared engine for mounting, Shadow-DOM widgets, settings, a centralized selector registry with a self-check, scraping, export, and ExtensionPay licensing. A whole new target is roughly six thin files — config, selectors, manifest and entry points — layered over that core. Kajabi is the flagship; Teachable, Thinkific and an email-billing cluster ride the same rails.'],
        ['h3', 'Resilient to a host you don’t control'],
        ['p', 'Every selector for a platform lives in one registry behind a self-check and a kill-switch, so when Kajabi ships a DOM change the extension degrades safely instead of silently exporting garbage. The targets are validated on a live account, never guessed — Kajabi’s contact table is a table.sage-table that sits outside the page’s main element, exactly the kind of detail you only learn by checking.'],
        ['h3', 'Full export — the Pro feature that earns its price'],
        ['p', 'Kajabi’s list shows six columns; the other nine — phone, mobile, address, city, state, country, zip, tags and custom fields — live on each contact’s profile page. Kajabi is a client-rendered app with no bulk API, so Full export drives the list’s own pagination to walk every page, then opens each contact’s profile in the user’s logged-in session and assembles all fifteen fields — every contact, every page — with bounded concurrency. Instant and on-device, versus Kajabi’s slow, emailed, three-day-expiry file. Change-tracking goes a step further: each Full export is diffed against a hashed, on-device fingerprint of the previous one, stamping every row new or changed since last time — recurring value with no new permissions and nothing kept on disk but one-way hashes.'],
        ['h3', 'A Pro toolkit that compounds across the line'],
        ['p', 'Pro is more than a raw dump. JSON, a formatted Excel workbook, a branded PDF report, and an on-page Insights panel — totals, revenue and your top contacts — all computed on the device. Each is a dependency-free module in @sidecar/core, hand-rolled (a from-scratch .xlsx and PDF writer) to keep the bundle tiny and “no remote code” trivially true for Chrome’s reviewers. Built once for the second extension, the whole suite dropped straight into the flagship — the reusable-engine bet paying off.'],
        ['h3', 'Privacy as a hard constraint — and a real business model'],
        ['p', 'Everything runs in the browser: no servers, no analytics, no data off the device — the only network calls are to the user’s own Kajabi pages. Free one-click CSV is the hook; Pro ($5/mo or $39 lifetime) unlocks JSON, Excel, a PDF report, Insights and the all-pages Full export, gated by ExtensionPay on top of Black Hart’s existing Stripe. Each platform ships as its own Chrome Web Store listing, with scoped permissions and isolated payouts.'],
      ]),
      outcome: rtDoc([
        ['p', 'Shipped the flagship — Sidecar for Kajabi — built, validated on a live Kajabi account, and now published on the Chrome Web Store, with the reusable engine behind it ready for the next platform.'],
        ['ul', [
          'A Manifest V3 extension that injects a one-click export bar over every Kajabi table — People, Sales and Analytics.',
          'Free CSV; a Pro tier adding JSON, Excel, a branded PDF report, on-page Insights, and a Full export that walks every page to recover all 15 contact fields from the 6 the list shows. It also flags what’s new or changed since your last export.',
          '@sidecar/core — a shared, dependency-free engine (selectors + self-check, kill-switch, scraping, hand-rolled Excel and PDF writers, insights, licensing) that turns a new target into roughly six files.',
          'ExtensionPay + Stripe billing at $5/mo or $39 lifetime, with per-extension store listings and isolated payouts.',
          'A Black Hart–themed marketing, support and privacy site, plus a full set of Chrome Web Store assets; the listing is now live.',
          'Six platforms mapped on the roadmap: Kajabi → Teachable → Thinkific, then an email-billing cluster.',
        ]],
        ['p', 'The flagship is live on the Chrome Web Store, installable today. The bet isn’t a single extension — it’s the engine that turns each approval into a repeatable, privacy-first product line.'],
      ]),
      metrics: [
        { value: '15', label: 'contact fields recovered, vs Kajabi’s 6' },
        { value: '~6', label: 'files to ship the next platform' },
        { value: '6', label: 'platforms on the roadmap' },
        { value: '100%', label: 'on-device — no servers, no tracking' },
      ],
      gallery: [
        ...(scExportBar?.id ? [{
          image: scExportBar.id,
          caption: 'The injected export bar sits directly above Kajabi’s own contacts table — one click writes a clean CSV to your downloads, with no copy-paste and no waiting on an emailed file.',
        }] : []),
        ...(scFields?.id ? [{
          image: scFields.id,
          caption: 'Kajabi’s list shows six columns; the Pro Full export gathers all fifteen — phone, address, tags and custom fields — by walking every page and reading each contact’s profile in the user’s own session.',
        }] : []),
        ...(scPricing?.id ? [{
          image: scPricing.id,
          caption: 'Free one-click CSV is the hook; Pro ($5/mo or $39 lifetime) unlocks JSON, Excel, a PDF report, Insights and the all-pages Full export, billed through ExtensionPay on the existing Stripe account.',
        }] : []),
      ],
      featured: true,
      publishedAt: new Date().toISOString(),
    }

    const existingSidecar = await payload.find({
      collection: 'projects',
      where: { slug: { equals: sidecarProject.slug } },
      limit: 1,
    })
    if (existingSidecar.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: sidecarProject })
      payload.logger.info('[seed] project created: sidecar')
    } else if (process.env.FORCE_SIDECAR_UPSERT === 'true') {
      await payload.update({
        collection: 'projects',
        id: existingSidecar.docs[0].id,
        data: sidecarProject,
      })
      payload.logger.info('[seed] project upserted: sidecar (FORCE_SIDECAR_UPSERT)')
    }

    // --- Scrubbr media uploads (captures of the live tool at scrubbr.pro) ---
    const scrubHero = await ensureMedia('Scrubbr — homepage hero', 'public/seed-assets/scrubbr/hero.png')
    const scrubMeta = await ensureMedia('Scrubbr — metadata inspection panel', 'public/seed-assets/scrubbr/metadata.png')
    const scrubRedact = await ensureMedia('Scrubbr — true PDF redaction canvas', 'public/seed-assets/scrubbr/redact.png')
    const scrubVerify = await ensureMedia('Scrubbr — removal verification report', 'public/seed-assets/scrubbr/verify.png')
    const scrubPro = await ensureMedia('Scrubbr — Pro unlock', 'public/seed-assets/scrubbr/pro.png')

    // --- Scrubbr project (first-party product, live at scrubbr.pro) ---
    const scrubbrProject: any = {
      title: 'Scrubbr — In-Browser Metadata Scrubber & True Redactor',
      slug: 'scrubbr',
      summary:
        'A 100%-in-browser tool that strips hidden metadata from PDFs and images and performs true redaction — destroying the text and pixels under your boxes, not just covering them — then re-parses the output to prove removal. No upload endpoint exists; files never leave the device. Built and launched in a single session: live, taking real payments, and scoring a perfect 100 across Lighthouse.',
      client: 'Black Hart Consulting (first-party product)',
      industry: 'Privacy / Security Tools',
      projectType: 'webapp',
      year: 2026,
      duration: 'one session (10 commits, build to launch)',
      teamSize: 1,
      liveUrl: 'https://scrubbr.pro',
      ...(scrubHero?.id ? { heroImage: scrubHero.id } : {}),
      stack: [
        { name: 'React 19 + Vite 8', category: 'framework' },
        { name: 'TypeScript', category: 'language' },
        { name: 'pdf-lib + pdf.js', category: 'tool' },
        { name: 'exifr + piexifjs (EXIF)', category: 'tool' },
        { name: 'Stripe Checkout + serverless', category: 'tool' },
        { name: 'Resend (license email)', category: 'tool' },
        { name: 'Vercel', category: 'hosting' },
      ],
      challenge: rtDoc([
        ['p', 'The “private PDF tool” space is crowded, but the two operations people actually need to do safely — strip a file’s hidden metadata, and redact it so the underlying text is truly gone — were missing client-side. Every online option uploads your file to a server, asking you to trust a deletion policy you can’t verify.'],
        ['p', 'And most “redaction” is a black rectangle drawn on top: the original text sits underneath, fully selectable and extractable — a well-documented way sensitive documents leak. We wanted a tool that removes the data for real, never uploads the file, and can prove both.'],
      ]),
      approach: rtDoc([
        ['h3', 'Everything in the browser — no upload endpoint exists'],
        ['p', 'Metadata reading, scrubbing, redaction and verification all run locally in JavaScript and WebAssembly. There is no server that receives files. Even pdf.js’s worker, fonts and CMaps are bundled as local assets, so the heavy PDF path makes no third-party request either — the only network calls the app can make are licensing, which carry a key and never a file. You can confirm it in the network tab.'],
        ['h3', 'True redaction by flattening, not covering'],
        ['p', 'For each marked PDF page we render it to a high-resolution raster, paint the redaction boxes onto the image, and rebuild the page from that flattened raster — so the underlying text and vector objects no longer exist in the file. Images are burned in at the pixel level. Pages you don’t mark are copied through untouched, so their text stays selectable.'],
        ['h3', 'Verification that re-parses the real bytes'],
        ['p', 'The differentiator is the verify step. After scrubbing, we re-open the output and confirm each removed field is gone; after redaction, we re-extract the text that sat under the boxes and prove none of it survived, and that flattened pages yield zero extractable text. It checks the output, not the intention.'],
        ['h3', 'Lossless image stripping'],
        ['p', 'For JPEG and PNG we rewrite the container — dropping the EXIF, GPS, IPTC and XMP segments and chunks — without recompressing, so the image is byte-for-byte preserved and GPS can be removed on its own while keeping the rest of EXIF.'],
        ['h3', 'Built to be found, and to pay for itself'],
        ['p', 'Eight high-intent routes are prerendered to static HTML — with SoftwareApplication, HowTo and FAQ JSON-LD — via a custom prerender step, no SSG framework, so the tool ranks and AI assistants can cite it. A $5 one-time Pro tier (batch + PDF/A) runs on Stripe Checkout through three small Vercel serverless functions with a stateless HMAC license, and Resend emails the key on purchase.'],
      ]),
      outcome: rtDoc([
        ['p', 'Built and launched in a single working session: live at scrubbr.pro, taking real payments, and scoring a perfect 100/100/100/100 on Lighthouse.'],
        ['ul', [
          'Metadata scrub for PDFs (info dictionary, XMP, thumbnails) and images (EXIF, GPS, IPTC, XMP) — lossless for JPEG/PNG — with every field shown before removal.',
          'True redaction for PDFs and images that destroys the content under each box, verified by re-extracting text from the output.',
          'A verification step that re-parses the real output bytes to prove metadata is gone and redacted text is unrecoverable.',
          'Eight prerendered SEO routes with JSON-LD, a 0.3s desktop load, and zero file-bearing network requests — confirmed in the network tab.',
          'A $5 Pro tier (batch + PDF/A) on Stripe Checkout with serverless licensing and emailed keys via Resend.',
        ]],
        ['p', 'The whole premise is verifiable, not asserted: open your network tab and watch nothing leave your device.'],
      ]),
      metrics: [
        { value: '0', label: 'files uploaded — 100% in your browser' },
        { value: '4×100', label: 'Lighthouse: perf, a11y, SEO, best-practices' },
        { value: '8', label: 'prerendered SEO routes' },
        { value: '0.3s', label: 'desktop load (LCP)' },
      ],
      gallery: [
        ...(scrubMeta?.id ? [{
          image: scrubMeta.id,
          caption: 'Drop in a file and every hidden field surfaces — author, software, GPS, timestamps — flagged and individually removable. Here, a confidential PDF’s eight metadata blocks, ready to strip.',
        }] : []),
        ...(scrubRedact?.id ? [{
          image: scrubRedact.id,
          caption: 'True redaction: drag a box over anything sensitive and the page is flattened so the text underneath is destroyed, not covered. No selectable text survives.',
        }] : []),
        ...(scrubVerify?.id ? [{
          image: scrubVerify.id,
          caption: 'The trust differentiator — Scrubbr re-parses the output bytes and confirms each field is actually gone. It verifies the result, not the intent.',
        }] : []),
        ...(scrubPro?.id ? [{
          image: scrubPro.id,
          caption: 'Free for single-file scrub, redact and verify; a $5 one-time Pro unlock adds batch processing and PDF/A export, billed through Stripe.',
        }] : []),
      ],
      featured: true,
      publishedAt: new Date().toISOString(),
    }

    const existingScrubbr = await payload.find({
      collection: 'projects',
      where: { slug: { equals: scrubbrProject.slug } },
      limit: 1,
    })
    if (existingScrubbr.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: scrubbrProject })
      payload.logger.info('[seed] project created: scrubbr')
    } else if (process.env.FORCE_SCRUBBR_UPSERT === 'true') {
      await payload.update({
        collection: 'projects',
        id: existingScrubbr.docs[0].id,
        data: scrubbrProject,
      })
      payload.logger.info('[seed] project upserted: scrubbr (FORCE_SCRUBBR_UPSERT)')
    }

    // --- Sidecar for Teachable media uploads (store captures of the shipped extension) ---
    const stHero = await ensureMedia(
      'Sidecar for Teachable — the one-click export bar above the students table',
      'public/seed-assets/sidecar-teachable/hero.jpg',
    )
    const stFull = await ensureMedia(
      'Sidecar for Teachable — Full export pulls every field across every page (10 → 15)',
      'public/seed-assets/sidecar-teachable/full-export.jpg',
    )
    const stPain = await ensureMedia(
      'Sidecar for Teachable — instant on-device export vs Teachable’s 24-minute emailed CSV',
      'public/seed-assets/sidecar-teachable/pain-point.jpg',
    )
    const stPricing = await ensureMedia(
      'Sidecar for Teachable — free CSV, Pro unlocks the full toolkit',
      'public/seed-assets/sidecar-teachable/pricing.jpg',
    )

    // --- Sidecar for Teachable project (first-party product — the engine’s second platform) ---
    const sidecarTeachableProject: any = {
      title: 'Sidecar — One-Click Student Export for Teachable',
      slug: 'sidecar-teachable',
      summary:
        'The second extension in the Sidecar line: a Manifest V3 browser extension that adds one-click CSV, Excel, PDF and JSON export to the Teachable admin — plus a Pro “Full export” that taps Teachable’s own API to pull every student, across every page, with every field. Built in a day on the shared @sidecar/core engine, dependency-free, entirely on-device, and now live on the Chrome Web Store.',
      client: 'Black Hart Consulting (first-party product)',
      industry: 'Online Course Platforms / Creator Tools',
      projectType: 'webapp',
      year: 2026,
      duration: '1 day on the shared engine',
      teamSize: 1,
      liveUrl: 'https://blackhartconsulting.com/sidecar/teachable',
      ...(stHero?.id ? { heroImage: stHero.id } : {}),
      stack: [
        { name: 'TypeScript', category: 'language' },
        { name: 'Manifest V3 (Chrome Extension)', category: 'framework' },
        { name: 'Vite 8 + @crxjs/vite-plugin', category: 'tool' },
        { name: 'Shadow DOM (isolated UI)', category: 'framework' },
        { name: 'Hand-rolled OOXML + PDF writers', category: 'tool' },
        { name: 'ExtensionPay + Stripe', category: 'tool' },
        { name: 'Chrome Web Store', category: 'hosting' },
      ],
      challenge: rtDoc([
        ['p', 'Teachable runs the course businesses of hundreds of thousands of creators, but getting your own student list out is a chore. The built-in export emails you a CSV that expires in about 24 minutes; the admin paginates 25 students at a time; and the richer fields — phone, tags, sign-up source, sign-in history, address — never appear in the list at all. Even the bulk tools sit behind a paywall.'],
        ['p', 'The deeper goal was to prove a thesis. Sidecar for Kajabi had shipped on a reusable engine we claimed could deliver the same fix across platform after platform. Teachable was the test: build a second, more capable extension in a fraction of the time, on the same core, without starting over.'],
      ]),
      approach: rtDoc([
        ['h3', 'A second platform on the same engine'],
        ['p', 'The whole extension is a thin layer over @sidecar/core — config, selectors, a manifest and entry points. We validated the live admin rather than guessing: Teachable’s students list is a real table.tch-table.student-table that paginates 25 rows at a time, and the shared scraper handled its header-in-the-body markup with no core change.'],
        ['h3', 'Reverse-engineering Teachable’s own API'],
        ['p', 'Unlike Kajabi’s server-rendered profiles, Teachable’s admin is a client-rendered single-page app — fetching a page just returns an empty shell. So we traced the dashboard’s own network calls to /api/v1/users?page=N, a JSON endpoint that returns every field for every user with clean pagination metadata. Full export pages through it in the user’s own logged-in session, filters to enrolled students, and assembles all fifteen fields across every page — collapsing “all pages” and “all fields” into one feature.'],
        ['h3', 'Dependency-free Excel and PDF, written by hand'],
        ['p', 'Rather than inject hundreds of kilobytes of SheetJS and jsPDF into a content script, we hand-rolled the writers: a minimal ZIP plus an OOXML worksheet for real .xlsx, and a from-scratch PDF generator (Helvetica, WinAnsi encoding, true pagination) for the branded report. The whole extension is about 11 KB gzipped — and there is no remote code for Chrome’s reviewers to question.'],
        ['h3', 'A richer Pro tier, validated live'],
        ['p', 'Free one-click CSV is the hook; Pro adds JSON and Excel export, a branded PDF report, an on-page Insights panel (revenue, roles, top students), and the Full export. Every feature was validated on a live Teachable account — the exported workbook checked field-by-field against the dashboard before submitting. Privacy stays absolute: nothing leaves the browser except the call to Teachable’s own API, on the user’s click.'],
      ]),
      outcome: rtDoc([
        ['p', 'Shipped Sidecar’s second extension — built in a day on the shared engine, validated live, and now published on the Chrome Web Store.'],
        ['ul', [
          'A Manifest V3 extension that adds a one-click export bar above the Teachable students table — CSV free; JSON, Excel, a PDF report and an Insights panel on Pro.',
          'Full export — pages through Teachable’s /api/v1/users API to pull every student across every page with all 15 fields, far beyond the 10 columns the dashboard shows.',
          'Dependency-free .xlsx and PDF writers added to @sidecar/core, so the whole bundle stays ~11 KB gzipped with zero remote code.',
          'A Black Hart–themed marketing, support and privacy site at blackhartconsulting.com/sidecar/teachable, plus a complete Chrome Web Store listing, now live.',
          'Proof of the thesis: a second platform shipped on the same core, validating the engine that makes each new target cheap.',
        ]],
        ['p', 'Two extensions are now live in the Chrome Web Store from a single engine. Next on the same rails: Thinkific.'],
      ]),
      metrics: [
        { value: '15', label: 'student fields, across every page' },
        { value: '~11 KB', label: 'bundle gzipped — xlsx & PDF hand-rolled' },
        { value: '1 day', label: 'to ship on the shared engine' },
        { value: '100%', label: 'on-device — no servers, no tracking' },
      ],
      gallery: [
        ...(stFull?.id ? [{
          image: stFull.id,
          caption: 'The dashboard shows ten columns on one page; the Pro Full export gathers all fifteen fields — phone, tags, sign-up source, sign-in stats, address — for every student across every page, by paging through Teachable’s own API.',
        }] : []),
        ...(stPain?.id ? [{
          image: stPain.id,
          caption: 'Teachable’s built-in export emails a CSV that expires in about 24 minutes. Sidecar writes the file to your downloads instantly, on your device, with no email round-trip.',
        }] : []),
        ...(stPricing?.id ? [{
          image: stPricing.id,
          caption: 'Free one-click CSV is the hook; Pro ($5/mo or $39 lifetime) unlocks JSON and Excel export, a PDF report, Insights, and the Full export — billed through ExtensionPay on the existing Stripe account.',
        }] : []),
      ],
      featured: false,
      publishedAt: new Date().toISOString(),
    }

    const existingSidecarTeachable = await payload.find({
      collection: 'projects',
      where: { slug: { equals: sidecarTeachableProject.slug } },
      limit: 1,
    })
    if (existingSidecarTeachable.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: sidecarTeachableProject })
      payload.logger.info('[seed] project created: sidecar-teachable')
    } else if (process.env.FORCE_SIDECAR_TEACHABLE_UPSERT === 'true') {
      await payload.update({
        collection: 'projects',
        id: existingSidecarTeachable.docs[0].id,
        data: sidecarTeachableProject,
      })
      payload.logger.info('[seed] project upserted: sidecar-teachable (FORCE_SIDECAR_TEACHABLE_UPSERT)')
    }

    // --- Certo media uploads (light-theme captures of the iOS app) ---
    const certoHero = await ensureMedia(
      'Certo — hero: three app screens (a graded question, the scaled-score mock result, and the readiness dashboard) on the brand navy',
      'public/seed-assets/certo/hero.png',
    )
    const certoSimulation = await ensureMedia(
      'Certo — the scaled-score mock-exam result: 761 of 1000, above the 700 pass line, with a per-topic breakdown',
      'public/seed-assets/certo/simulation.png',
    )
    const certoQuestion = await ensureMedia(
      'Certo — an original scenario question graded in place, with the correct answer highlighted',
      'public/seed-assets/certo/question.png',
    )
    const certoReadiness = await ensureMedia(
      'Certo — the readiness dashboard: a calibrated score, mastery by topic, and an accuracy trend',
      'public/seed-assets/certo/readiness.png',
    )
    const certoCatalog = await ensureMedia(
      'Certo — the certification catalog: 26 exams across five industries, progress tracked separately',
      'public/seed-assets/certo/catalog.png',
    )
    const certoGuarantee = await ensureMedia(
      'Certo — the readiness-gated pass guarantee screen',
      'public/seed-assets/certo/guarantee.png',
    )

    // --- Certo project (first-party product, submitted to the App Store) ---
    const certoProject: any = {
      title: 'Certo — Exam Prep & Practice',
      slug: 'certo',
      summary:
        'A native iOS exam-prep app spanning 26 professional certifications across five industries — technology, business & project management, finance, legal, and healthcare — with 3,281 original scenario questions, a scaled-score mock-exam simulation, spaced-repetition review, and deep per-option explanations. 100% original content, written to the public exam blueprints: no leaked or brain-dump questions, no ban risk. Built in SwiftUI with over-the-air content updates and a full StoreKit 2 catalog.',
      client: 'Black Hart Consulting (first-party app)',
      industry: 'EdTech / Professional certification',
      projectType: 'mobile',
      year: 2026,
      duration: 'Submitted — in App Store review',
      teamSize: 1,
      ...(certoHero?.id ? { heroImage: certoHero.id } : {}),
      stack: [
        { name: 'SwiftUI', category: 'framework' },
        { name: 'Swift', category: 'language' },
        { name: 'SwiftData', category: 'db' },
        { name: 'StoreKit 2', category: 'tool' },
        { name: 'Swift Charts', category: 'framework' },
        { name: 'Xcode Cloud (CI/CD)', category: 'hosting' },
        { name: 'App Store Connect API', category: 'tool' },
        { name: 'Python (content pipeline)', category: 'tool' },
        { name: 'Next.js (remote content host)', category: 'framework' },
      ],
      challenge: rtDoc([
        ['p', 'Certification prep is dominated by “brain-dump” sites that traffic in leaked, real exam questions. Using them violates the certification bodies’ NDAs, can get a candidate’s result revoked or their account banned, and is legally infringing — yet they persist, because learners genuinely want realistic, exam-shaped practice and the honest alternatives are thin and scattered.'],
        ['p', 'The brief was to build the credible, native alternative: one iOS app covering 26 certifications across five very different professional worlds — cloud and security, project management, finance and accounting, legal, and healthcare — with practice good enough to actually predict exam readiness, under a hard rule that every question is original. No leaked content, no ban risk.'],
        ['p', 'That rule is also the hardest constraint. Originality has to hold at the scale of thousands of questions; a single wrong answer key erodes trust instantly across a paid catalog; and one monetization model has to work for audiences as different as a DevOps engineer and a paralegal.'],
      ]),
      approach: rtDoc([
        ['h3', 'Original content, written to the public blueprints'],
        ['p', 'Every question is authored from scratch against each exam’s publicly published skills outline — never copied or paraphrased from real items. The content lives in a versioned JSON pipeline with Python validators that enforce structure and a consistent explanation template, so all 26 banks stay uniform. We then ran a citation-grounded answer-key audit across every question, verifying keys against authoritative public sources — Microsoft Learn, AWS and Google Cloud docs, the IRS, FDA/CMS, PMI, the Scrum Guide, ASQ — with brain-dump sites explicitly excluded.'],
        ['h3', 'A real scaled-score simulation, not a quiz'],
        ['p', 'The signature feature is a timed, blueprint-weighted mock exam that reports a scaled score against a true pass line, with a per-domain breakdown — so readiness is something you measure, not something you guess at. Practice, spaced-repetition review, and the full simulation all draw from the same bank but score and pace differently.'],
        ['h3', 'Learning that actually sticks'],
        ['p', 'Every question carries a worked explanation of why the right answer is right and why each distractor is wrong. A real SM-2 spaced-repetition scheduler resurfaces missed items just as you’re about to forget them, and built-in plus user-authored flashcards cover the rote layer.'],
        ['h3', 'Ship content without shipping an app update'],
        ['p', 'Question banks are versioned and served from a remote content host, so a corrected or expanded exam reaches users over the air — no App Store release required. The app downloads a bank only when its version is strictly higher, then swaps it in place.'],
        ['h3', 'Monetization across five industries'],
        ['p', 'A full StoreKit 2 catalog: per-exam one-time unlocks, five industry bundles, a lifetime all-access, and an auto-renewing yearly subscription with a free trial. Free “funnel” exams drive installs, and a readiness-gated pass guarantee — study, clear a full mock, and if the real exam doesn’t go your way your next exam is on us — doubles as a conversion lever.'],
        ['h3', 'Shipped from a beta-OS machine via Xcode Cloud'],
        ['p', 'The development Mac runs a macOS beta that can’t archive for the App Store locally, so the entire release path — archive, upload, and submit — is driven through Xcode Cloud and the App Store Connect API from the command line, including the full in-app-purchase catalog and every store asset.'],
      ]),
      outcome: rtDoc([
        ['p', 'A complete, polished v1 — submitted to the App Store with its full in-app-purchase catalog — built around a study loop (practice → simulate → review) that measures real readiness instead of just tallying a score.'],
        ['ul', [
          '26 certification banks across technology, business & PM, finance, legal, and healthcare — 3,281 original scenario questions.',
          'Timed, blueprint-weighted exam simulations with a scaled score, a true pass line, and a per-domain breakdown.',
          'SM-2 spaced-repetition review, a worked “why each option” explanation on every question, and built-in plus custom flashcards.',
          'A citation-grounded answer-key audit across all 26 banks — zero wrong keys, and zero leaked or brain-dump content.',
          'Over-the-air content updates through a versioned remote host, so fixes ship without an App Store release.',
          'A complete StoreKit 2 catalog — per-exam unlocks, five industry bundles, lifetime all-access, and a yearly subscription with a free trial.',
        ]],
        ['p', 'The whole product rests on one promise the category’s biggest names can’t make: every question is original, written to the public outlines — no leaked content, no ban risk.'],
      ]),
      metrics: [
        { value: '26', label: 'certifications, one app' },
        { value: '3,281', label: 'original practice questions' },
        { value: '5', label: 'industries covered' },
        { value: '0', label: 'leaked or brain-dump items' },
      ],
      gallery: [
        ...(certoSimulation?.id
          ? [{
              image: certoSimulation.id,
              caption:
                'The signature feature — a timed, scaled-score mock exam with a true pass line, a per-domain breakdown, and elapsed time. Readiness you can measure.',
            }]
          : []),
        ...(certoQuestion?.id
          ? [{
              image: certoQuestion.id,
              caption:
                'Every question is an original scenario written to the public exam blueprint, graded in place with a worked explanation of why each option is right or wrong.',
            }]
          : []),
        ...(certoReadiness?.id
          ? [{
              image: certoReadiness.id,
              caption:
                'A calibrated readiness score, mastery by topic, and an accuracy trend over time — so you know when you’re actually ready to sit the exam.',
            }]
          : []),
        ...(certoCatalog?.id
          ? [{
              image: certoCatalog.id,
              caption:
                '26 certifications across five industries — technology, business & PM, finance, legal, and healthcare — each tracked separately, in one app.',
            }]
          : []),
        ...(certoGuarantee?.id
          ? [{
              image: certoGuarantee.id,
              caption:
                'A readiness-gated pass guarantee: study, clear a full in-app mock, and if the real exam doesn’t go your way, your next exam is on us.',
            }]
          : []),
      ],
      appInstall: {
        status: 'live',
        appName: 'Certo',
        appStoreUrl: 'https://apps.apple.com/app/id6776512986',
        platformNote: 'iPhone & iPad — iOS 17+',
      },
      featured: true,
      publishedAt: new Date().toISOString(),
    }

    const existingCerto = await payload.find({
      collection: 'projects',
      where: { slug: { equals: certoProject.slug } },
      limit: 1,
    })
    if (existingCerto.totalDocs === 0) {
      await payload.create({ collection: 'projects', data: certoProject })
      payload.logger.info('[seed] project created: certo')
    } else if (process.env.FORCE_CERTO_UPSERT === 'true') {
      await payload.update({
        collection: 'projects',
        id: existingCerto.docs[0].id,
        data: certoProject,
      })
      payload.logger.info('[seed] project upserted: certo (FORCE_CERTO_UPSERT)')
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
      {
        title: 'What an AI receptionist actually costs a Houston contractor',
        slug: 'ai-receptionist-cost-houston-contractor',
        excerpt: 'Missed calls are the most expensive line item most contractors never see. Here is what human answering services cost, what AI answering costs, where the money goes, and when to skip it.',
        author: 'Suhaib Chaudhry',
        readTime: 7,
        category: 'strategy',
        tags: [{ label: 'AI Front Desk' }, { label: 'Phone answering' }, { label: 'Contractors' }],
        featured: true,
        publishedAt: '2026-08-26T09:00:00.000Z',
        content: rtDoc([
          ['p', 'Ask a Houston contractor what a missed call costs and most will shrug. Ask what their average job is worth and they answer instantly. Put the two numbers together and the shrug goes away: if your average job is $400 and you miss five calls a week, the phone is quietly costing you more than your truck payment.'],
          ['h2', 'The missed-call problem, with numbers'],
          ['p', 'Industry studies of home-service businesses consistently find that somewhere between a quarter and half of inbound calls go unanswered, depending on season and crew size. That is not laziness. You are under a sink, on a roof, or driving I-45. The caller does not know that, and the data on caller behavior is brutal: most people who reach voicemail for a service business do not leave a message. They call the next company Google shows them.'],
          ['p', 'The math compounds during exactly the weeks you can least afford it. A summer AC failure or a hard freeze multiplies call volume right when every tech is booked, so the calls you miss are the highest-intent calls of the year.'],
          ['h2', 'What a human answering service costs'],
          ['p', 'The traditional fix is a human answering service. They typically bill per minute or per call, and for a service business doing real volume the invoice lands between a few hundred and a couple thousand dollars a month. The per-minute rates look small until you multiply them out; a hundred five-minute calls at typical rates is real money.'],
          ['ul', [
            'Per-minute plans commonly run one to two dollars per minute at small-business volumes.',
            'Flat plans with a few hundred minutes included tend to start in the low hundreds per month.',
            'After-hours and bilingual coverage usually cost extra.',
          ]],
          ['p', 'The bigger issue is not price. A generalist operator reading a script cannot quote your services, does not know your service area, and usually ends the call with "someone will call you back." That is a message-taking service, not a front desk.'],
          ['h2', 'What AI answering costs, and where the money goes'],
          ['p', 'AI phone answering has crossed the line from novelty to boring utility. The recurring cost has three parts: the platform fee for the software, the per-minute cost of the calls themselves (telephony plus the AI models doing speech and reasoning), and the one-time setup work of teaching it your business.'],
          ['p', 'Market pricing today puts a configured small-business AI receptionist in the one-to-four-hundred-dollars-a-month range for typical call volumes, with per-minute overages measured in cents rather than dollars. Setup, done properly, is where the real value hides. The software is a commodity; the script, the knowledge base, and the guardrails are not.'],
          ['h2', 'What to require before you sign anything'],
          ['ul', [
            'It answers from your existing number via forwarding. No porting, no new number on your truck wraps.',
            'It quotes only prices you approved in writing, and says "I will have Suhaib confirm that" for everything else.',
            'It books directly into your calendar or field-service software, not into a spreadsheet someone checks later.',
            'Missed calls get a text back within a minute, because half your callers would rather text anyway.',
            'You get a transcript and summary of every call, and you can read them whenever you want.',
            'You can turn it off with a phone setting, not a support ticket.',
          ]],
          ['h2', 'When not to use one'],
          ['p', 'Skip AI answering if your volume is a handful of calls a week and you genuinely answer them. Skip it if your jobs are won on long consultative calls where the first conversation is the sale. And skip any vendor who cannot let you call a live demo line before you pay; if they will not let you hear it, they know something you should.'],
          ['h2', 'What we run'],
          ['p', 'Our AI Front Desk is the same system that answers our own line at (866) 434-9777, around the clock. Setup is $299: we write the script and knowledge base for your business, you approve the voice and greeting, we connect your calendar and test five real scenarios with you. Plans are $149 a month for 300 minutes, $249 for 750, and $399 for 1,500, month to month after the first 30 days, with overage at $0.35 a minute. Call our line first and try to stump it; that is the whole pitch.'],
          ['quote', 'The phone is the cheapest employee you will ever hire or the most expensive one you never noticed you fired.'],
        ]),
      },
      {
        title: 'How to show up when someone asks ChatGPT or Google for a plumber',
        slug: 'show-up-in-chatgpt-google-local-search',
        excerpt: 'AI assistants now answer "who should I call" questions directly. Here is how they pick local businesses, and the 30-day checklist that gets yours mentioned.',
        author: 'Suhaib Chaudhry',
        readTime: 7,
        category: 'seo',
        tags: [{ label: 'Local SEO' }, { label: 'AI search' }, { label: 'Google Business Profile' }],
        featured: true,
        publishedAt: '2026-08-26T10:00:00.000Z',
        content: rtDoc([
          ['p', 'A growing share of "who should I call" questions never touch a search results page. Someone asks ChatGPT for a plumber in the Heights, or asks Google and gets an AI-written answer with three business names in it. If your business is one of the three, you get the call. If not, you do not even know the question was asked.'],
          ['h2', 'How AI answers pick local businesses'],
          ['p', 'AI assistants do not crawl your homepage and admire the design. They lean on structured, corroborated data: your Google Business Profile, the consistency of your name and address across directories, review volume and recency, and machine-readable markup on your site. When several independent sources agree about what you do and where you do it, you become a safe answer. Ambiguity, staleness, and contradictions make you an unsafe answer, and unsafe answers get skipped.'],
          ['h2', 'Google Business Profile is still the spine'],
          ['p', 'Both Google\u2019s AI results and third-party assistants weight the Business Profile heavily because it is verified and structured. Complete every field: services with descriptions, hours, service area, photos, and the exact categories that match what you sell. A profile updated weekly signals a business that exists; one untouched since 2023 signals a coin flip.'],
          ['h2', 'Schema is how your site talks to machines'],
          ['p', 'LocalBusiness, Service, and FAQPage schema are small blocks of code that state, unambiguously, who you are, what you offer, and where you serve. Humans never see them. Every machine that decides whether to recommend you reads them first. Most small-business sites in Houston have none, which is the whole opportunity.'],
          ['h2', 'FAQ pages answer the questions assistants get asked'],
          ['p', 'People ask assistants questions, so pages that answer questions in plain language get quoted. A real FAQ page, with the questions your customers actually ask and specific answers with numbers in them, gives an assistant something safe to lift. Marketing prose does not.'],
          ['h2', 'Reviews and citations are the corroboration'],
          ['p', 'Reviews prove you are real and recently active; assistants favor volume plus recency over a perfect score. Citations, meaning your name, address, and phone listed identically on Yelp, Bing Places, Apple Business Connect, and the industry directories, are the cross-checking layer. One old phone number on a forgotten directory is exactly the contradiction that gets you skipped.'],
          ['h2', 'llms.txt, the new robots.txt'],
          ['p', 'llms.txt is an emerging convention: a plain-text file on your site that tells AI crawlers what your business is and which pages matter. It costs ten minutes and puts you ahead of nearly every competitor, because almost nobody has one yet.'],
          ['h2', 'The 30-day checklist'],
          ['ul', [
            'Week 1: complete every Google Business Profile field, add 10 photos, fix your categories.',
            'Week 1: put your exact name, address, and phone in the site footer and match it everywhere.',
            'Week 2: add LocalBusiness and Service schema to the site, validate it, request re-indexing.',
            'Week 2: submit or correct listings on Yelp, Bing Places, Apple Business Connect, and Facebook.',
            'Week 3: publish an FAQ page answering your ten most common customer questions with real numbers.',
            'Week 3: add llms.txt and make sure your services pages say the neighborhoods you serve, by name.',
            'Week 4: start automated review requests after every job and reply to every review, good or bad.',
          ]],
          ['h2', 'If you want it done for you'],
          ['p', 'This checklist is exactly what our Local SEO + AI Search Sprint delivers: the audit, the full Business Profile setup, ten citations, the schema, the FAQ page, and llms.txt, done in ten days for $449. It also comes inside the Booked Solid bundle. Do it yourself with the list above, or hand it to us; either way, stop being the business the assistants cannot safely recommend.'],
          ['quote', 'You cannot win the answers you never knew were being asked. Structure is how you get invited.'],
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
