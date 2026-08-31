/**
 * One-shot content seed: add the Prometheus EQ portfolio case study to the
 * `projects` collection, with its four case-study screenshots uploaded to
 * `media`. Needed because src/seed/onInit.ts only runs on a FRESH database
 * (a brand-new install) — the live prod DB already exists, so the
 * prometheus-eq entry added there in this same change will never seed
 * itself in. This route applies that same content to an already-running
 * database instead.
 *
 *   curl -X POST http://localhost:3000/dev-add-prometheuseq            (local)
 *   curl -X POST https://blackhartconsulting.com/dev-add-prometheuseq  (prod: needs ALLOW_DEV_SEED)
 *
 * Idempotent: media is matched by alt text (skips re-upload if present),
 * and the project is matched by slug (updates in place on re-run). Returns
 * 403 in production unless ALLOW_DEV_SEED=one-time-yes is set on the
 * container — see src/lib/dev-route-guard.ts for the full unlock recipe.
 */

import path from 'node:path'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { revalidateContent } from '@/lib/cms-revalidate'

export const dynamic = 'force-dynamic'

// Minimal rich-text helpers mirroring rtDoc() in src/seed/onInit.ts, so the
// challenge/approach/outcome fields render the same paragraph/heading/list
// structure as every other case study.
type RTBlock = ['p', string] | ['h3', string] | ['ul', string[]]

const rtText = (text: string) => ({ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' })
const rtParagraph = (text: string) => ({
  type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr',
  children: [rtText(text)],
})
const rtHeading = (text: string) => ({
  type: 'heading', tag: 'h3', format: '', indent: 0, version: 1, direction: 'ltr',
  children: [rtText(text)],
})
const rtList = (items: string[]) => ({
  type: 'list', listType: 'bullet', tag: 'ul', start: 1, format: '', indent: 0, version: 1, direction: 'ltr',
  children: items.map((item) => ({
    type: 'listitem', value: 1, format: '', indent: 0, version: 1, direction: 'ltr',
    children: [rtText(item)],
  })),
})
const rtDoc = (blocks: RTBlock[]) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
    children: blocks.map((b) => (b[0] === 'p' ? rtParagraph(b[1]) : b[0] === 'h3' ? rtHeading(b[1]) : rtList(b[1]))),
  },
})

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })

  const ensureMedia = async (alt: string, relPath: string) => {
    const existing = await payload.find({ collection: 'media', where: { alt: { equals: alt } }, limit: 1 })
    if (existing.totalDocs > 0) return existing.docs[0]
    try {
      return await payload.create({
        collection: 'media',
        data: { alt } as never,
        filePath: path.resolve(process.cwd(), relPath),
      })
    } catch (err) {
      payload.logger.warn({ err, relPath }, '[dev-add-prometheuseq] media upload failed (continuing without image)')
      return null
    }
  }

  const peqMediaHero = await ensureMedia(
    'Prometheus EQ: homepage hero (Warm Graphite theme, Classic Serif pairing)',
    'public/seed-assets/prometheuseq/prometheuseq-hero.png',
  )
  const peqMediaServices = await ensureMedia(
    'Prometheus EQ: Services page with the Illuminate, Ignite, Transform tiers',
    'public/seed-assets/prometheuseq/prometheuseq-services.png',
  )
  const peqMediaProcess = await ensureMedia(
    'Prometheus EQ: Our Process page walking the six-step methodology',
    'public/seed-assets/prometheuseq/prometheuseq-process.png',
  )
  const peqMediaChristian = await ensureMedia(
    'Prometheus EQ: Christian Organizational Consulting bonus page',
    'public/seed-assets/prometheuseq/prometheuseq-christian-consulting.png',
  )

  const prometheusEQProject: Record<string, unknown> = {
    title: 'Prometheus EQ',
    slug: 'prometheus-eq',
    group: 'client',
    summary: 'A hand-built culture and climate consulting site for Philip Parmar’s second brand, a sister site to Prometheus Minds. He picked the final look by remixing a live, self-contained mockup himself: six themes, five fonts, four hero styles, before a line of real content was written.',
    client: 'Prometheus EQ',
    industry: 'Organizational consulting / Culture & leadership',
    projectType: 'website',
    year: 2026,
    teamSize: 1,
    liveUrl: 'https://prometheuseq.com',
    ...(peqMediaHero?.id ? { heroImage: peqMediaHero.id } : {}),
    stack: [
      { name: 'Hand-rolled HTML/CSS/JS (no framework)', category: 'language' },
      { name: 'CSS custom-property theme engine', category: 'design' },
      { name: 'Playfair Display + Source Serif 4 (Google Fonts)', category: 'design' },
      { name: 'Node.js (contact microservice)', category: 'tool' },
      { name: 'Resend (transactional email)', category: 'tool' },
      { name: 'Caddy', category: 'hosting' },
      { name: 'DigitalOcean', category: 'hosting' },
    ],
    challenge: rtDoc([
      ['p', 'Philip Parmar was building a second consulting brand alongside Prometheus Minds, his ADHD and neurodiverse tutoring practice in the Twin Cities. Prometheus EQ needed to serve a different audience entirely: businesses, schools, nonprofits, healthcare organizations, and Christian ministries looking for culture and climate consulting, leadership development, and executive coaching.'],
      ['p', 'The two brands share a founder but had to feel distinct. Prometheus EQ needed its own identity, not a re-skin of Prometheus Minds, while still reading as part of the same family to anyone who knew both. And Philip needed to feel confident in a direction before any real content or a real build began, without a slow back-and-forth of "try a different color" emails.'],
    ]),
    approach: rtDoc([
      ['h3', 'A mockup he could remix himself'],
      ['p', 'Instead of static comps, we sent one self-contained HTML file that opened straight in the browser: no server, no install. It carried all five pages (Home, About, Services, Our Process, Contact) built on a token-driven theme engine. A gear icon opened a live control panel: six color themes, five font pairings, three density settings, four hero layouts, and three homepage section orders, all switchable instantly. A "copy current combo" button serialized the exact picks into a short string Philip could paste straight into his reply, so feedback came back as a precise spec instead of a vague impression.'],
      ['h3', 'Opening on the family resemblance'],
      ['p', 'The mockup defaulted to a theme called Prometheus Gold (black and gold), a deliberate nod to Prometheus Minds’ palette so the two sites would read as siblings before Philip had touched a single setting. He ultimately picked a different direction, Warm Graphite (dark ink and a gold accent on parchment), which still carries the same gold thread.'],
      ['h3', 'A dedicated page for faith-based clients'],
      ['p', 'Part of Philip’s client base is Christian organizations and ministries, so the site ships a Christian Organizational Consulting page: scripture-anchored content that reframes the same culture and climate methodology around biblical stewardship and servant leadership. It’s linked from the Services page rather than the main nav, available without narrowing the site’s general positioning. It was added after launch with an idempotent script that patches the built HTML directly, so re-running it is a no-op once the section exists.'],
      ['h3', 'Same engine, simpler production build'],
      ['p', 'The shipped site reuses the exact CSS custom-property theme engine from the mockup (the same data-theme, data-font, and data-hero attributes drive both), but the live picker itself was stripped out for visitors. It’s still there for us: changing the production look is a one-line attribute change, not a redesign.'],
      ['h3', 'A contact form with no framework to maintain'],
      ['p', 'The backend is a single small Node.js service, no framework, under 50 lines, running behind Caddy on its own DigitalOcean droplet. It validates the organization and message fields and the email format server-side, drops a honeypot field to filter bots, and sends through Resend. A /api/contact/health endpoint reports whether the Resend key is configured.'],
    ]),
    outcome: rtDoc([
      ['p', 'Prometheus EQ launched as its own site on its own infrastructure, separate from both Prometheus Minds and Black Hart Consulting.'],
      ['ul', [
        'Five core pages (Home, About, Services, Our Process, Contact) plus the Christian Organizational Consulting bonus page.',
        'Services page built around three named tiers: Illuminate (assessment), Ignite (turning insight into action), and Transform (ongoing partnership).',
        'Our Process page walks the full six-step methodology: Discovery, Organizational Assessment, Data Analysis, Executive Report & Strategic Recommendations, Leadership Presentation & Workshop, and Implementation & Ongoing Partnership.',
        'Working contact form wired to Resend, with honeypot spam filtering and server-side validation.',
        'Shares a founder and a visual thread (the gold accent) with Prometheus Minds, while standing as its own brand with its own theme, fonts, and hosting.',
      ]],
    ]),
    metrics: [
      { value: '6', label: 'live color themes previewed pre-build' },
      { value: '5', label: 'font pairings tested in the interactive mockup' },
      { value: '6', label: 'pages: 5 core + 1 faith-based bonus page' },
      { value: '2', label: 'sister brands sharing one founder' },
    ],
    gallery: [
      ...(peqMediaServices?.id ? [{
        image: peqMediaServices.id,
        caption: 'The Services page: three named tiers, Illuminate, Ignite, and Transform, each scoped to a different stage of engagement.',
      }] : []),
      ...(peqMediaProcess?.id ? [{
        image: peqMediaProcess.id,
        caption: 'The Our Process page lays out the full six-step methodology, from Discovery through Implementation & Ongoing Partnership.',
      }] : []),
      ...(peqMediaChristian?.id ? [{
        image: peqMediaChristian.id,
        caption: 'The Christian Organizational Consulting page: scripture-anchored content for faith-based clients, linked from Services rather than the main nav.',
      }] : []),
    ],
    featured: true,
    publishedAt: new Date().toISOString(),
  }

  const existing = await payload.find({
    collection: 'projects',
    where: { slug: { equals: 'prometheus-eq' } },
    limit: 1,
  })

  let result: { action: 'created' | 'updated'; id: string | number }
  if (existing.totalDocs > 0) {
    const updated = await payload.update({
      collection: 'projects',
      id: existing.docs[0].id,
      data: prometheusEQProject as never,
    })
    result = { action: 'updated', id: updated.id }
  } else {
    const created = await payload.create({ collection: 'projects', data: prometheusEQProject as never })
    result = { action: 'created', id: created.id }
  }

  // Projects' own afterChange hook already revalidates 'projects' + /portfolio
  // on create/update; this is a defensive extra call for the one-shot-script
  // context (mirrors dev-seed-local-pages/route.ts).
  revalidateContent({ tag: 'projects', paths: ['/portfolio', '/'] })
  revalidateContent({ tag: 'projects', slug: 'prometheus-eq', slugPathPrefix: '/portfolio' })

  return NextResponse.json({ ok: true, project: result })
}
