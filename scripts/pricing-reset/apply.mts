/* eslint-disable @typescript-eslint/no-explicit-any */
/* Pricing-reset content migration (Phase 2). Idempotent: upserts pages by
 * slug (full replace), patches about/contact/heights/local-seo and the six
 * landing pages in place, rewrites the FAQ collection, and updates the
 * header + footer globals. Never deletes a page.
 *
 * Run locally:
 *   npx tsx scripts/pricing-reset/apply.mts
 * Refuses to run against a postgres DATABASE_URI unless --allow-non-local is
 * passed (stop point: production runs need explicit approval).
 */

process.env.SEED_ON_BOOT = 'false' // keep getPayload() from running the boot seed

import nextEnv from '@next/env'
const envMod = (nextEnv as { loadEnvConfig?: (d: string) => void }).loadEnvConfig
  ? (nextEnv as { loadEnvConfig: (d: string) => void })
  : (nextEnv as unknown as { default: { loadEnvConfig: (d: string) => void } }).default
envMod.loadEnvConfig(process.cwd())

const dbUri = process.env.DATABASE_URI || 'file:./payload.db'
if (/^postgres(ql)?:\/\//.test(dbUri) && !process.argv.includes('--allow-non-local')) {
  console.error('Refusing to run against a postgres DATABASE_URI without --allow-non-local (stop point).')
  process.exit(1)
}

const FORBIDDEN = /founding|spots remaining|\$1,950|\$4,500|\$1,495|Save \$|retail|346[ .-]?560[ .-]?5430|3465605430/i

async function main() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const content = await import('../../src/seed/reset-content')
  const payload = await getPayload({ config })
  const log = (msg: string) => console.log(`[apply] ${msg}`)

  // ── 1. Full-replace page upserts ──────────────────────────────────────────
  const fullPages = [
    content.homePage(), content.servicesPage(), content.fixItPage(),
    content.aiFrontDeskPage(), content.automationPage(), content.freeDemoSitePage(),
    content.thanksPage(),
  ]
  for (const data of fullPages) {
    const existing = await payload.find({ collection: 'pages', where: { slug: { equals: data.slug } }, limit: 1 })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'pages', data: data as any })
      log(`page ${data.slug}: created`)
    } else {
      await payload.update({ collection: 'pages', id: existing.docs[0].id, data: data as any })
      log(`page ${data.slug}: updated`)
    }
  }

  // ── 1b. Home featuredProjects: manual order PM, WAYGFT (Phase 2 spec) ────
  {
    const bySlug = async (slug: string) => {
      const r = await payload.find({ collection: 'projects', where: { slug: { equals: slug } }, limit: 1 })
      return r.docs[0]?.id ?? null
    }
    const pm = await bySlug('prometheus-minds')
    const waygft = await bySlug('waygft')
    if (pm && waygft) {
      const res = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })
      const home = res.docs[0]
      if (home) {
        const layout: any[] = (home.layout ?? []).map((b: any) =>
          b.blockType === 'featuredProjects' ? { ...b, mode: 'manual', projects: [pm, waygft] } : b,
        )
        await payload.update({ collection: 'pages', id: home.id, data: { layout } as any })
        log('page home: featuredProjects pinned to Prometheus Minds, WAYGFT')
      }
    } else {
      log('featuredProjects pin skipped (prometheus-minds/waygft not found)')
    }
  }

  // ── 2. About: insert "How we build" after the three principles ───────────
  {
    const res = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 1 })
    const about = res.docs[0]
    if (about) {
      const layout: any[] = [...(about.layout ?? [])]
      const already = layout.some((b) => b.blockType === 'richText' && b.eyebrow === 'How we build')
      if (!already) {
        const principlesIdx = layout.findIndex(
          (b) => b.blockType === 'services' && /principle/i.test(String(b.headline ?? '')),
        )
        const insertAt = principlesIdx >= 0 ? principlesIdx + 1 : layout.length - 1
        layout.splice(insertAt, 0, content.howWeBuildBlock)
        await payload.update({ collection: 'pages', id: about.id, data: { layout } as any })
        log('page about: inserted "How we build"')
      } else {
        log('page about: "How we build" already present')
      }
    } else {
      log('page about: NOT FOUND, skipped')
    }
  }

  // ── 3. Contact: noCallNeeded + audit description reprice ─────────────────
  {
    const res = await payload.find({ collection: 'pages', where: { slug: { equals: 'contact' } }, limit: 1 })
    const contact = res.docs[0]
    if (contact) {
      const layout: any[] = (contact.layout ?? []).map((b: any) => {
        if (b.blockType === 'contactForm') {
          return {
            ...b,
            noCallNeeded: true,
            description: typeof b.description === 'string'
              ? b.description.replace('$297 Site Health Sprint', '$249 Site Health Sprint')
              : b.description,
          }
        }
        return b
      })
      await payload.update({ collection: 'pages', id: contact.id, data: { layout } as any })
      log('page contact: noCallNeeded set')
    }
  }

  // ── 4. FAQ collection rewrites ───────────────────────────────────────────
  {
    const res = await payload.find({ collection: 'faqs', limit: 200 })
    let rewritten = 0
    for (const doc of res.docs as any[]) {
      const rule = content.FAQ_COLLECTION_REWRITES.find((r) => r.match === doc.question)
      if (rule) {
        await payload.update({
          collection: 'faqs', id: doc.id,
          data: { question: rule.question, answer: rule.answer, ...(rule.category ? { category: rule.category } : {}) } as any,
        })
        rewritten++
      } else if (FORBIDDEN.test(`${doc.question} ${doc.answer}`)) {
        log(`WARNING faq ${doc.id} still carries forbidden text: ${doc.question}`)
      }
    }
    log(`faqs: ${rewritten} rewritten`)
  }

  // ── 5. Heights + Local SEO page patches ──────────────────────────────────
  const patchLocalPage = async (
    slug: string,
    opts: { primary: { label: string; href: string }; subAppend: string; faqRewrites: Record<string, string> },
  ) => {
    const res = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1 })
    const page = res.docs[0]
    if (!page) { log(`page ${slug}: NOT FOUND, skipped`); return }
    const layout: any[] = (page.layout ?? []).map((b: any) => {
      if (b.blockType === 'hero') {
        const sub = String(b.subheadline ?? '')
        const subheadline = sub.includes('AI Front Desk') ? sub : sub + opts.subAppend
        const rest = (b.ctas ?? []).filter((c: any) => c.href !== opts.primary.href && !/book/i.test(c.label ?? ''))
        const book = (b.ctas ?? []).find((c: any) => /book/i.test(c.label ?? ''))
        return {
          ...b,
          subheadline,
          ctas: [
            { label: opts.primary.label, href: opts.primary.href, variant: 'primary' },
            ...(book ? [{ ...book, label: 'Book a 30-min call', variant: 'secondary' }] : []),
            ...rest.filter((c: any) => c.variant !== 'primary'),
            { label: 'AI Front Desk', href: '/ai-front-desk', variant: 'ghost' },
          ].slice(0, 3),
        }
      }
      if (b.blockType === 'faq' && Array.isArray(b.items)) {
        const rewriteFor = (q: string) => {
          const key = Object.keys(opts.faqRewrites).find((k) => k.trim() === String(q ?? '').trim())
          return key ? opts.faqRewrites[key] : null
        }
        return {
          ...b,
          items: b.items.map((it: any) => {
            const answer = rewriteFor(it.question)
            return answer ? { ...it, answer } : it
          }),
        }
      }
      return b
    })
    await payload.update({ collection: 'pages', id: page.id, data: { layout } as any })
    log(`page ${slug}: patched`)
  }

  await patchLocalPage('web-design-houston-heights', {
    primary: { label: 'See your site first', href: '/free-demo-site' },
    subAppend: content.HEIGHTS_FRONT_DESK_SENTENCE,
    faqRewrites: content.HEIGHTS_FAQ_REWRITES,
  })
  await patchLocalPage('local-seo-houston', {
    primary: { label: 'Start with the $449 Sprint', href: '/contact?tier=seo-sprint' },
    subAppend: content.LOCAL_SEO_FRONT_DESK_SENTENCE,
    faqRewrites: content.LOCAL_SEO_FAQ_REWRITES,
  })

  // ── 6. Landing pages (paused Ads pages; stay noindex, never deleted) ─────
  const websitesTiers = content.websitesPricingBlock()

  const transformNicheLp = (lp: any): any[] => {
    const layout: any[] = []
    for (const b of lp.layout ?? []) {
      if (b.blockType === 'foundingClient') {
        layout.push(content.whyPricesLowBlock)
        continue
      }
      if (b.blockType === 'hero') {
        layout.push({
          ...b,
          headline: String(b.headline ?? '').replace(/In 14 days/gi, 'In 7 days'),
          ctas: [
            { label: 'See your site first', href: '/free-demo-site', variant: 'primary' },
            { label: 'Book a 30-min call', href: 'https://calendly.com/suhaib-blackhartconsulting/discovery-call', variant: 'ghost' },
          ],
        })
        continue
      }
      if (b.blockType === 'stats') {
        layout.push({
          ...b,
          items: (b.items ?? []).map((it: any) => {
            if (it.value === '14 days') return { ...it, value: '7 days', description: 'Fixed scope, fixed price, fixed launch date.' }
            if (/founding|discount/i.test(String(it.description ?? ''))) return { ...it, description: 'Fixed scope, fixed price, fixed launch date.' }
            return it
          }),
        })
        continue
      }
      if (b.blockType === 'pricing') {
        layout.push({
          ...websitesTiers,
          eyebrow: b.eyebrow ?? 'The offer',
          ...(lp.slug === 'houston-midmarket'
            ? {
                headline: 'Two ways to start. Sized for mid-market.',
                description: 'A Pro Site with full CMS and 30 days of SEO content, or a scoped Custom Build with a fixed proposal in 48 hours.',
                tiers: [content.TIER_BLOCKS.proSite, content.TIER_BLOCKS.customBuild],
              }
            : {}),
        })
        continue
      }
      if (b.blockType === 'cta') {
        layout.push(content.demoCtaBlock)
        continue
      }
      layout.push(b)
    }
    return layout
  }

  const transformExpressLp = (lp: any): any[] => {
    const layout: any[] = []
    for (const b of lp.layout ?? []) {
      switch (b.blockType) {
        case 'heroPhoto':
          layout.push({
            ...b,
            eyebrow: 'Houston Heights · 7-Day Delivery',
            headline: 'A custom small business website. In 7 days. From $699.',
            subheadline: 'Built with AI tooling, reviewed line by line by a senior developer, hosted by us, kept fast. See a working demo of your new site before you pay a dollar.',
            ctas: [
              { label: 'Run my free site audit', href: '#audit', style: 'brass' },
              { label: 'See your site first', href: '/free-demo-site', style: 'onphoto' },
            ],
          })
          break
        case 'guaranteeStrip':
          layout.push({
            ...b,
            items: [
              { value: '7 days', label: 'Kickoff to launch' },
              { value: '$699', label: 'Starter Site, flat' },
              { value: '90+', label: 'Mobile Lighthouse score' },
              { value: '1 dev', label: 'Senior review on every line' },
            ],
          })
          break
        case 'foundingClient':
          layout.push(content.whyPricesLowBlock)
          break
        case 'pricing':
          layout.push({
            blockType: 'pricing',
            eyebrow: 'The offer',
            headline: 'One package, one price, seven days.',
            description: 'A five-page Starter Site on a CMS you can edit. Buy it outright or subscribe and own it in a year.',
            layoutVariant: 'centered-single',
            anchorId: 'offer',
            tiers: [content.TIER_BLOCKS.starterSite],
          })
          break
        case 'bundleConfigurator':
          layout.push({
            ...b,
            options: [
              { name: 'Starter Site', description: '5-page site, 7-day delivery. The foundation.', cost: '$699', once: 699, required: true, defaultOn: false },
              { name: 'Host plan', description: 'Hosting, backups, monitoring, 30 min of edits a month. First month free.', cost: '$59/mo', monthly: 59, defaultOn: true },
              { name: 'Local SEO + AI Search Sprint', description: 'GBP setup, 10 citations, schema, FAQ page, llms.txt.', cost: '+$449', once: 449 },
              { name: 'AI Front Desk setup', description: 'Answers every call and books jobs. Plan from $149/mo billed separately.', cost: '+$299', once: 299 },
            ],
          })
          break
        case 'animatedStats':
          layout.push({
            ...b,
            items: (b.items ?? []).map((it: any) => {
              if (it.value === 14) return { ...it, value: 7, description: 'Fixed scope, fixed launch date.' }
              if (/discount|founding/i.test(String(it.description ?? ''))) return { ...it, description: 'Fixed scope, fixed launch date.' }
              return it
            }),
          })
          break
        case 'cta':
          layout.push({
            blockType: 'cta',
            headline: 'See your new site before you pay a dollar.',
            description: 'Send your business name and Google listing. A working mockup is in your inbox within 48 hours. No call, no obligation.',
            variant: 'emphasized',
            primaryCta: { label: 'See your site first', href: '/free-demo-site' },
            secondaryCta: { label: 'See recent work', href: '/portfolio' },
          })
          break
        default:
          layout.push(b)
      }
    }
    return layout
  }

  // New-catalog SEO strings for the paused LPs (old prices and founding
  // language removed; pages stay noindex).
  const LP_SEO: Record<string, { metaTitle?: string; metaDescription?: string }> = {
    'houston-midmarket': {
      metaDescription: 'For 5-to-50-person Houston companies. Senior-engineer accountable, fixed-price Pro Site builds at $1,795 in 14 days, or a scoped Custom Build. Free site audit, no call required.',
    },
    'heights-real-estate': {
      metaTitle: 'Real Estate Team Websites in Houston Heights: IDX, From $699',
    },
    'heights-med-spa': {
      metaTitle: 'Med Spa Websites in Houston Heights: Online Booking, From $699',
    },
    'heights-dental': {
      metaTitle: 'Dental Practice Websites in Houston Heights, From $699',
      metaDescription: 'Custom websites for Houston Heights dental practices. New-patient lead capture, online booking, insurance verification. 7-day delivery, $699 flat.',
    },
    'express-website': {
      metaTitle: 'Houston Heights Small Business Websites: Free Audit, $699 Rebuild',
      metaDescription: 'Heights-local web studio. Free 5-minute site audit with 3 specific fixes in your inbox within a business day. Or a custom website built in 7 days, from $699.',
    },
  }

  {
    const res = await payload.find({ collection: 'landingPages', limit: 100, draft: true })
    for (const lp of res.docs as any[]) {
      const layout = lp.slug === 'express-website' ? transformExpressLp(lp) : transformNicheLp(lp)
      const seoPatch = LP_SEO[lp.slug]
      const data: any = { layout }
      if (seoPatch) data.seo = { ...(lp.seo ?? {}), ...seoPatch }
      await payload.update({ collection: 'landingPages', id: lp.id, data })
      log(`landingPage ${lp.slug}: transformed`)
    }
  }

  // ── 7. Globals (nav + CTA + footer links per 1e) ─────────────────────────
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
  log('global header: updated')

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
      copyright: `© ${new Date().getFullYear()} Black Hart Consulting LLC`,
    } as any,
  })
  log('global footer: updated')

  // ── 8. Forbidden-string sweep over everything just written ───────────────
  let residuals = 0
  const sweep = (label: string, doc: any) => {
    const s = JSON.stringify(doc)
    const m = s.match(new RegExp(FORBIDDEN.source, 'gi'))
    if (m) {
      // "retail" inside unrelated words (e.g. LandingPages niche option) is
      // checked in context during Phase 4; report everything here.
      residuals += m.length
      log(`RESIDUAL in ${label}: ${[...new Set(m)].join(', ')}`)
    }
  }
  for (const c of ['pages', 'landingPages', 'faqs'] as const) {
    const res = await payload.find({ collection: c, limit: 200, draft: true })
    for (const doc of res.docs as any[]) sweep(`${c}/${doc.slug ?? doc.id}`, doc)
  }
  sweep('global header', await payload.findGlobal({ slug: 'header' }))
  sweep('global footer', await payload.findGlobal({ slug: 'footer' }))
  sweep('global siteSettings', await payload.findGlobal({ slug: 'siteSettings' }))
  log(residuals === 0 ? 'sweep clean: no forbidden strings in CMS content' : `sweep found ${residuals} residual match(es), listed above`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
