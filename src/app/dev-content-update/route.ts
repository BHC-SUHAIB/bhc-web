/**
 * Dev-only content update endpoint — 2026-05-22 conversion-fix pass.
 *
 * Applies the LP-conversion changes that can't be expressed as code-only edits
 * (homepage / About / LP copy lives in Payload, not in seed). Idempotent: each
 * step checks current state and skips if the desired state is already in place.
 *
 *   curl -X POST http://localhost:3000/dev-content-update
 *
 * Production: SSH in, set ALLOW_DEV_SEED=one-time-yes in .env, restart the
 * container, POST the route, then remove the env var and restart again.
 *
 * Steps applied:
 *   A. Home page hero subheadline — strip "using modern AI tooling " phrasing.
 *   B. Home page FAQ — remove "Do you use AI in your workflow?" item if present.
 *   C. About page rich-text blocks — replace AI-tooling sentences with
 *      accountable-owner phrasing (Our mission + Who you'll work with).
 *   D. Express-website LP hero — eyebrow → "Houston · 14-Day Delivery".
 *   E. Express-website LP — insert "Who builds it" richText block between the
 *      founding-client banner and pricing (only if not already present).
 *   F. All landing pages — founding-client Care plan offer: priceFounding
 *      "$149/mo", priceRetail "" (fixes the "Free$149/mo" misread).
 *   G. Testimonials — upsert Kaiti Wachter (WAYGFT) at sortOrder 5 so she
 *      surfaces ahead of Grace + Philip in the latest-3 carousel.
 *   H. Testimonials — set featured=false on the "Quote Length Test" filler
 *      so it stops appearing in carousels (keeps the row for QA).
 *
 * Delete this file once the changes have shipped to prod.
 */

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Headshot URL — same one used on the About page rich-text founder block,
// served from the DigitalOcean Spaces CDN edge (no Media upload needed).
const SUHAIB_HEADSHOT_URL = 'https://bhc-media.nyc3.cdn.digitaloceanspaces.com/suhaib-headshot.jpg'

// Shortened founder bio for the LP. The About page version runs ~120 words
// with extra detail on engagement model; this is ~75 words and front-loads
// the "one person on the build" pitch since LP visitors only skim.
const WHO_BUILDS_IT_PARAGRAPHS: string[] = [
  "You'll work directly with Suhaib Chaudhry — the only person on the build. No account managers, no junior handoffs, no agency layers between you and the work. Every brief, every line of code, every design decision goes through one accountable owner.",
  "Suhaib has shipped production web software for over a decade across consumer, e-commerce, and B2B SaaS, and started Black Hart to bring that craft to small and mid-market businesses at prices that make sense for a business still proving its model.",
]

// Replacement pairs applied to JSON-serialized Lexical content. Each `from`
// must match verbatim (curly apostrophes included) — entries that don't match
// the current document are no-ops, so it's safe to leave them in across runs.
const AI_REPLACEMENTS: Array<[string, string]> = [
  // About → Our mission
  [
    'We close that gap with modern AI tooling used carefully and with a senior reviewer accountable for every deliverable. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
    'We close that gap with a senior, accountable owner on every deliverable, a fixed-price model, and a tight delivery window. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
  ],
  [
    'We close that gap with modern AI tooling — used carefully, with a senior reviewer accountable for every deliverable. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
    'We close that gap with a senior, accountable owner on every deliverable, a fixed-price model, and a tight delivery window. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
  ],
  // About → Who you'll work with (rework variant)
  [
    "That’s the whole point: pair a senior developer with modern AI tooling and you get the kind of deliverables you’d normally pay $20K+ for, shipped in days instead of months.",
    "That’s the whole point: a senior developer doing the work himself, shipping the kind of deliverables you’d normally pay $20K+ for in days instead of months.",
  ],
  // About → Who you'll work with (older onInit variant)
  [
    "started Black Hart to apply modern AI tooling to small-business work that traditional agencies overcharge for.",
    "started Black Hart to bring that craft to small-business work that traditional agencies overcharge for.",
  ],
  // About → How we work / similar paragraphs
  [
    "We use modern AI tooling alongside human judgment to ship faster than traditional agencies. A senior reviewer is accountable for every line of code, every word of copy, and every design decision.",
    "A senior developer is accountable for every line of code, every word of copy, and every design decision — no junior handoffs, no agency layers between you and the work.",
  ],
  [
    "We use modern AI tooling alongside human judgment to ship faster than traditional agencies. A senior reviewer is accountable for every line of code, every word of copy, and every design decision. You’re not paying for AI to do your work; you’re paying for senior consulting that uses AI to do more of it, in less time.",
    "A senior developer is accountable for every line of code, every word of copy, and every design decision. No junior handoffs, no agency layers between you and the work. The studio ships in days because one person owns the brief end to end, not because anything is being automated away.",
  ],
]

// Hero subheadline string-replacements applied directly to the field value.
// Live homepage uses the first form; the others are legacy variants kept here
// for safety so an older snapshot also gets cleaned up.
const HOME_HERO_SUBHEAD_REPLACEMENTS: Array<[string, string]> = [
  [
    'A solo developer using modern AI tooling to ship fast, fixed-price websites',
    'A solo developer shipping fast, fixed-price websites',
  ],
  [
    'using modern AI tooling to ship',
    'shipping',
  ],
  [
    ', modern AI tooling,',
    ',',
  ],
]

// Find/replace pairs that get applied verbatim to any plain-text field
// (eyebrow, headline, description). Used to clean up legacy AI eyebrow copy
// like "Built by humans + AI" on hero blocks anywhere in the layout.
const PLAIN_TEXT_REPLACEMENTS: Array<[string, string]> = [
  ['Built by humans + AI', 'Built by hand'],
  ['Modern craft, modern tooling, one line of accountability.', 'Modern craft, one line of accountability.'],
]

function replaceInLexicalJson(content: unknown, pairs: Array<[string, string]>): { content: any; changed: boolean } {
  if (!content || typeof content !== 'object') return { content, changed: false }
  let json: string
  try { json = JSON.stringify(content) } catch { return { content, changed: false } }
  let changed = false
  for (const [from, to] of pairs) {
    // Strip the surrounding quotes JSON.stringify adds so the search needle
    // matches the inner text within "text":"..." nodes.
    const fromEsc = JSON.stringify(from).slice(1, -1)
    const toEsc = JSON.stringify(to).slice(1, -1)
    if (json.includes(fromEsc)) {
      json = json.split(fromEsc).join(toEsc)
      changed = true
    }
  }
  if (!changed) return { content, changed: false }
  return { content: JSON.parse(json), changed: true }
}

function applyPlainReplacements(value: unknown): { value: any; changed: boolean } {
  if (typeof value !== 'string') return { value, changed: false }
  let out = value
  let changed = false
  for (const [from, to] of PLAIN_TEXT_REPLACEMENTS) {
    if (out.includes(from)) { out = out.split(from).join(to); changed = true }
  }
  return { value: out, changed }
}

function applyHomeSubheadReplacements(value: unknown): { value: any; changed: boolean } {
  if (typeof value !== 'string') return { value, changed: false }
  let out = value
  let changed = false
  for (const [from, to] of HOME_HERO_SUBHEAD_REPLACEMENTS) {
    if (out.includes(from)) { out = out.split(from).join(to); changed = true }
  }
  return { value: out, changed }
}

function buildLexicalParagraphs(paragraphs: string[]): any {
  return {
    root: {
      type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr',
        children: [{ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' }],
      })),
    },
  }
}

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })
  const changes: string[] = []
  const skipped: string[] = []
  const failed: Array<{ where: string; error: string }> = []

  // Helper: catch + record errors per step so one failure doesn't bomb the
  // whole endpoint. The first attempt at this endpoint died on a Payload
  // ValidationError from a single LP's Care plan offer, which short-circuited
  // every other update (testimonials, About page, etc.) and returned a 500
  // HTML page with no JSON body. Per-step catches + a top-level try/catch
  // (wrapping the whole handler) guarantee the caller always gets useful JSON.
  const tryStep = async (where: string, fn: () => Promise<void>) => {
    try { await fn() } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      failed.push({ where, error: msg })
    }
  }

  try {

  // ── A + B. Home page ────────────────────────────────────────────────
  const homeRes = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })
  const home = homeRes.docs[0] as any
  if (home) {
    const layout: any[] = Array.isArray(home.layout) ? [...home.layout] : []
    let modified = false

    for (let i = 0; i < layout.length; i++) {
      const block = { ...layout[i] }

      if (block.blockType === 'hero') {
        const sub = applyHomeSubheadReplacements(block.subheadline)
        if (sub.changed) { block.subheadline = sub.value; modified = true; changes.push('home.hero.subheadline: stripped AI tooling phrasing') }
        const eb = applyPlainReplacements(block.eyebrow)
        if (eb.changed) { block.eyebrow = eb.value; modified = true; changes.push('home.hero.eyebrow: rewritten') }
      }

      if (block.blockType === 'faq' && Array.isArray(block.items)) {
        const beforeLen = block.items.length
        block.items = block.items.filter((it: any) =>
          typeof it?.question !== 'string' || !it.question.toLowerCase().includes('do you use ai'))
        if (block.items.length !== beforeLen) { modified = true; changes.push(`home.faq: removed ${beforeLen - block.items.length} AI-related question(s)`) }
      }

      layout[i] = block
    }

    if (modified) {
      await tryStep('home.update', async () => {
        await payload.update({ collection: 'pages', id: home.id, data: { layout } })
      })
    } else {
      skipped.push('home: already up to date')
    }
  }

  // ── C. About page rich-text ─────────────────────────────────────────
  const aboutRes = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 1 })
  const about = aboutRes.docs[0] as any
  if (about) {
    const layout: any[] = Array.isArray(about.layout) ? [...about.layout] : []
    let modified = false
    for (let i = 0; i < layout.length; i++) {
      const block = { ...layout[i] }
      if (block.blockType === 'richText' && block.content) {
        const { content, changed } = replaceInLexicalJson(block.content, AI_REPLACEMENTS)
        if (changed) { block.content = content; modified = true; changes.push(`about.richText[${i}]: AI mentions replaced`) }
      }
      if (block.blockType === 'hero') {
        const eb = applyPlainReplacements(block.eyebrow)
        if (eb.changed) { block.eyebrow = eb.value; modified = true; changes.push('about.hero.eyebrow: rewritten') }
        const hl = applyPlainReplacements(block.headline)
        if (hl.changed) { block.headline = hl.value; modified = true; changes.push('about.hero.headline: rewritten') }
      }
      layout[i] = block
    }
    if (modified) {
      await tryStep('about.update', async () => {
        await payload.update({ collection: 'pages', id: about.id, data: { layout } })
      })
    } else {
      skipped.push('about: already up to date')
    }
  }

  // ── D + E + F. Landing pages ────────────────────────────────────────
  const lpsRes = await payload.find({ collection: 'landingPages', limit: 100 })
  for (const lp of lpsRes.docs as any[]) {
    const slug: string = lp.slug
    const layout: any[] = Array.isArray(lp.layout) ? [...lp.layout] : []
    let modified = false

    // F. Care plan offer fix — applies to every LP that has the founding-
    // client block with the broken "Free / $149/mo" shape.
    for (let i = 0; i < layout.length; i++) {
      const block = { ...layout[i] }
      if (block.blockType === 'foundingClient' && Array.isArray(block.offers)) {
        let offersModified = false
        const newOffers = block.offers.map((o: any) => {
          if (o?.name === 'All Care plans' && o?.priceFounding === 'Free') {
            offersModified = true
            // priceRetail is now optional in the foundingClient schema, so
            // clearing it lets the tile render just "$149/mo" + the
            // "First month free" savings line. A non-null value here used
            // to leave a strikethrough next to "Free" that read as
            // "Free is the new price" — misleading on a recurring offer.
            return { ...o, priceFounding: '$149/mo', priceRetail: null }
          }
          return o
        })
        if (offersModified) {
          block.offers = newOffers
          modified = true
          changes.push(`lp[${slug}].foundingClient.offers: Care plan price fixed`)
        }
      }
      layout[i] = block
    }

    // Express-website-only: D (eyebrow) + E (Who builds it block).
    if (slug === 'express-website') {
      // D. Hero eyebrow → "Houston · 14-Day Delivery"
      const heroIdx = layout.findIndex((b: any) => b?.blockType === 'hero')
      if (heroIdx >= 0) {
        const hero = { ...layout[heroIdx] }
        if (hero.eyebrow !== 'Houston · 14-Day Delivery') {
          hero.eyebrow = 'Houston · 14-Day Delivery'
          layout[heroIdx] = hero
          modified = true
          changes.push('lp[express-website].hero.eyebrow: → "Houston · 14-Day Delivery"')
        }
      }

      // E. Insert "Who builds it" rich-text block between founding_client and
      // pricing — idempotent via the eyebrow string check.
      const alreadyHasWhoBuildsIt = layout.some((b: any) =>
        b?.blockType === 'richText' && typeof b?.eyebrow === 'string' && b.eyebrow.toLowerCase().startsWith('who builds it'),
      )
      if (!alreadyHasWhoBuildsIt) {
        const insertIdx = (() => {
          const fcIdx = layout.findIndex((b: any) => b?.blockType === 'foundingClient')
          if (fcIdx >= 0) return fcIdx + 1
          const heroI = layout.findIndex((b: any) => b?.blockType === 'hero')
          return heroI >= 0 ? heroI + 1 : 0
        })()
        const whoBuildsIt = {
          blockType: 'richText',
          eyebrow: 'Who builds it',
          maxWidth: 'medium',
          variant: 'default',
          imageUrl: SUHAIB_HEADSHOT_URL,
          imageFocus: 'face',
          content: buildLexicalParagraphs(WHO_BUILDS_IT_PARAGRAPHS),
        }
        layout.splice(insertIdx, 0, whoBuildsIt)
        modified = true
        changes.push(`lp[express-website].layout: inserted "Who builds it" at position ${insertIdx}`)
      }
    }

    if (modified) {
      // Wrap each LP update so a single ValidationError doesn't take down
      // the rest of the batch. The caller sees the failure in `failed[]`
      // and can target a re-run after fixing the offending field.
      await tryStep(`lp[${slug}].update`, async () => {
        await payload.update({ collection: 'landingPages', id: lp.id, data: { layout } })
      })
    } else {
      skipped.push(`lp[${slug}]: already up to date`)
    }
  }

  // ── G. Upsert Kaiti Wachter testimonial ─────────────────────────────
  const kaitiQuote =
    'Black Hart Consulting did an outstanding job on WAYGFT. The site is clean, intuitive, and engaging — and captures the heart behind our message. The team was professional, responsive, and followed through on every commitment. If you want strong design with a strategic approach, highly recommend.'
  const kaitiData = {
    author: 'Kaiti Wachter',
    role: 'Founder',
    company: 'WAYGFT',
    quote: kaitiQuote,
    featured: true,
    sortOrder: 5,
  }
  await tryStep('testimonials.upsertKaiti', async () => {
    const kaitiExisting = await payload.find({
      collection: 'testimonials',
      where: { author: { equals: kaitiData.author } },
      limit: 1,
    })
    if (kaitiExisting.totalDocs === 0) {
      await payload.create({ collection: 'testimonials', data: kaitiData as any })
      changes.push('testimonials: created Kaiti Wachter (WAYGFT)')
    } else {
      const existing = kaitiExisting.docs[0] as any
      const needsUpdate =
        existing.featured !== true ||
        existing.quote !== kaitiQuote ||
        existing.role !== kaitiData.role ||
        existing.company !== kaitiData.company
      if (needsUpdate) {
        await payload.update({ collection: 'testimonials', id: existing.id, data: kaitiData as any })
        changes.push('testimonials: updated existing Kaiti Wachter row')
      } else {
        skipped.push('testimonials: Kaiti Wachter already current')
      }
    }
  })

  // ── H. Unfeature the filler testimonial ─────────────────────────────
  await tryStep('testimonials.unfeatureFiller', async () => {
    const filler = await payload.find({
      collection: 'testimonials',
      where: { author: { equals: 'Quote Length Test' } },
      limit: 1,
    })
    if (filler.docs[0]) {
      const fillerDoc = filler.docs[0] as any
      if (fillerDoc.featured !== false) {
        await payload.update({ collection: 'testimonials', id: fillerDoc.id, data: { featured: false } })
        changes.push('testimonials: unfeatured "Quote Length Test" filler')
      } else {
        skipped.push('testimonials: filler already unfeatured')
      }
    }
  })

    // Bust caches so the public site picks up the changes on next request
    // without waiting for the 60s unstable_cache window to expire. Next 16
    // requires the CacheLifeConfig second arg (expire: 0 = immediate).
    revalidateTag('pages', { expire: 0 })
    revalidateTag('landingPages', { expire: 0 })
    revalidateTag('testimonials', { expire: 0 })
    revalidateTag('global:siteSettings', { expire: 0 })

    return NextResponse.json({ ok: failed.length === 0, changes, skipped, failed })
  } catch (err: unknown) {
    // Top-level safety net. If anything throws outside the per-step try/catch
    // helpers above (e.g. payload.find on a missing collection), still return
    // JSON so the caller can debug rather than getting Next.js's HTML 500.
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, error: msg, changes, skipped, failed },
      { status: 500 },
    )
  }
}
