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
 *   A. Home page — recursive string sweep across every block (catches the
 *      hero subheadline, the services "Four disciplines..." intro, and any
 *      future stray mentions); foundingClient Care plan offer fix; FAQ
 *      filter dropping any "Do you use AI" question if present.
 *   B. About page — recursive string sweep that reaches plain text fields
 *      AND Lexical text nodes (handles "Our mission" long-form, the bare
 *      "We use modern AI tooling alongside human judgment..." on "How we
 *      work", and any "Who you'll work with" variants).
 *   C. Landing pages — recursive sweep + Care plan offer fix on every LP;
 *      express-website additionally gets hero eyebrow → "Houston · 14-Day
 *      Delivery" and the "Who builds it" rich-text block inserted between
 *      the founding banner and pricing.
 *   D. Testimonials — upsert Kaiti Wachter (WAYGFT) at sortOrder 5 so she
 *      surfaces ahead of Grace + Philip in the latest-3 carousel; set
 *      featured=false on the "Quote Length Test" filler row.
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

// Headshot URL — same image served from the DigitalOcean Spaces CDN edge.
// The "-1" suffix is the actual filename Payload's Media collection assigned
// on upload (collision-avoidance). The first cut of this endpoint used
// "suhaib-headshot.jpg" without the suffix and got a 403 from Spaces.
// The About page uses image_id (Media upload) which resolves to the real
// filename automatically; LP blocks rely on this literal URL.
const SUHAIB_HEADSHOT_URL = 'https://bhc-media.nyc3.cdn.digitaloceanspaces.com/suhaib-headshot-1.jpg'

// First-person founder bio for the LP. Warmer + more inviting than a 3rd-
// person About page bio, since the LP is paid traffic that needs to convert.
// Two short paragraphs (~70 words total): hello + what makes the studio
// different, then credibility + an open invitation. No em dashes (reads as
// AI-generated to the demographic per the project's writing memory).
const WHO_BUILDS_IT_PARAGRAPHS: string[] = [
  "Hi, I'm Suhaib, and I run Black Hart Consulting as a one-person studio out of Houston. When you hire me, I'm the one designing your site, writing every line of code, and showing up to every call. No account managers, no junior handoffs, no agency overhead between us.",
  "I've spent over a decade building websites for businesses big and small. If you're thinking about a new site or a rebuild, I'd love to hear about it.",
]

// Unified replacement list — applied recursively to every string field on
// every block (plain text AND Lexical text nodes via the same walker). Longer
// most-specific patterns first so they win when both could match the same
// span. Order matters: when two pairs overlap on the same substring, the
// earlier one fires and the later one no longer finds its needle.
const TEXT_REPLACEMENTS: Array<[string, string]> = [
  // ── Long-form About variants (Lexical paragraphs) ──────────────────────
  [
    'We use modern AI tooling alongside human judgment to ship faster than traditional agencies. A senior reviewer is accountable for every line of code, every word of copy, and every design decision. You’re not paying for AI to do your work; you’re paying for senior consulting that uses AI to do more of it, in less time.',
    'A senior developer is accountable for every line of code, every word of copy, and every design decision. No junior handoffs, no agency layers between you and the work. The studio ships in days because one person owns the brief end to end, not because anything is being automated away.',
  ],
  [
    'We use modern AI tooling alongside human judgment to ship faster than traditional agencies. A senior reviewer is accountable for every line of code, every word of copy, and every design decision.',
    'A senior developer is accountable for every line of code, every word of copy, and every design decision — no junior handoffs, no agency layers between you and the work.',
  ],
  [
    'We close that gap with modern AI tooling used carefully and with a senior reviewer accountable for every deliverable. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
    'We close that gap with a senior, accountable owner on every deliverable, a fixed-price model, and a tight delivery window. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
  ],
  [
    'We close that gap with modern AI tooling — used carefully, with a senior reviewer accountable for every deliverable. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
    'We close that gap with a senior, accountable owner on every deliverable, a fixed-price model, and a tight delivery window. Agency-quality work, shipped in days instead of months, at a price that makes sense for a business still proving its model.',
  ],
  [
    'That’s the whole point: pair a senior developer with modern AI tooling and you get the kind of deliverables you’d normally pay $20K+ for, shipped in days instead of months.',
    'That’s the whole point: a senior developer doing the work himself, shipping the kind of deliverables you’d normally pay $20K+ for in days instead of months.',
  ],
  [
    'started Black Hart to apply modern AI tooling to small-business work that traditional agencies overcharge for.',
    'started Black Hart to bring that craft to small-business work that traditional agencies overcharge for.',
  ],

  // ── Hero / plain-text variants on home + services pages ────────────────
  [
    'A solo developer using modern AI tooling to ship fast, fixed-price websites',
    'A solo developer shipping fast, fixed-price websites',
  ],
  [
    'Four disciplines, one solo developer working alongside modern AI tooling.',
    'Four disciplines, one solo developer accountable for every deliverable.',
  ],
  [
    'using modern AI tooling to ship',
    'shipping',
  ],
  [
    ', modern AI tooling,',
    ',',
  ],

  // ── Bare-sentence variant (About → How we work) ──────────────────────
  // Must appear AFTER the longer "We use modern AI tooling... A senior
  // reviewer is accountable..." pairs above so those win when both could
  // match. When the longer text isn't in the doc (the actual current state
  // on prod), this bare version is the one that fires.
  [
    'We use modern AI tooling alongside human judgment to ship faster than traditional agencies.',
    'A senior developer is accountable for every line of code, every word of copy, and every design decision.',
  ],

  // ── Eyebrow / headline shorts ──────────────────────────────────────────
  ['Built by humans + AI', 'Built by hand'],
  ['Modern craft, modern tooling, one line of accountability.', 'Modern craft, one line of accountability.'],
]

// Recursive walker: applies TEXT_REPLACEMENTS to every string value inside an
// arbitrarily nested block object. Mutates in place and returns true when
// anything changed. Plain text fields (eyebrow, headline, description, items
// array elements, bullets, etc.) all flow through here. Lexical rich-text
// content has text in `text` properties on leaf nodes, which the walker also
// reaches — so one helper handles both shapes.
function sweepStrings(obj: any): boolean {
  if (obj == null || typeof obj !== 'object') return false
  let modified = false
  const entries: Array<[string | number, any]> = Array.isArray(obj)
    ? obj.map((v, i) => [i, v])
    : Object.keys(obj).map((k) => [k, obj[k]])
  for (const [key, val] of entries) {
    if (typeof val === 'string') {
      let out = val
      let changed = false
      for (const [from, to] of TEXT_REPLACEMENTS) {
        if (out.includes(from)) { out = out.split(from).join(to); changed = true }
      }
      if (changed) {
        ;(obj as any)[key] = out
        modified = true
      }
    } else if (val && typeof val === 'object') {
      if (sweepStrings(val)) modified = true
    }
  }
  return modified
}

// Care plan offer fix on a single foundingClient block. Returns true when
// the block was mutated. Used on every page / LP that may have a founding-
// client banner with the "Free / $149/mo" Care plan shape — originally
// only LPs were swept, but the homepage carries its own copy of the same
// block and was missed on the first pass.
function fixCarePlanOffers(block: any): boolean {
  if (block?.blockType !== 'foundingClient' || !Array.isArray(block.offers)) return false
  let modified = false
  block.offers = block.offers.map((o: any) => {
    if (o?.name === 'All Care plans' && o?.priceFounding === 'Free') {
      modified = true
      return { ...o, priceFounding: '$149/mo', priceRetail: null }
    }
    return o
  })
  return modified
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
  // Strategy: sweep every block's string fields (recursively, including
  // Lexical text nodes) for the TEXT_REPLACEMENTS list, drop any FAQ items
  // whose question is "Do you use AI in your workflow?", and apply the
  // foundingClient Care plan fix. The first pass missed the homepage's
  // foundingClient block (it only looped over LPs) and missed the bare
  // "Four disciplines..." sentence on the services block (no enumeration
  // covered the services block's description field).
  const homeRes = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })
  const home = homeRes.docs[0] as any
  if (home) {
    const layout: any[] = Array.isArray(home.layout) ? [...home.layout] : []
    let modified = false

    for (let i = 0; i < layout.length; i++) {
      const block = { ...layout[i] }
      if (sweepStrings(block)) { modified = true; changes.push(`home.block[${i}] (${block.blockType}): text replacements applied`) }
      if (fixCarePlanOffers(block)) { modified = true; changes.push(`home.block[${i}].foundingClient.offers: Care plan price fixed`) }
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

  // ── C. About page ───────────────────────────────────────────────────
  // Same recursive sweep, which reaches Lexical text nodes inside richText
  // blocks (where the long-form "modern AI tooling" sentences live) AND
  // plain text fields on hero/stats/CTA blocks.
  const aboutRes = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 1 })
  const about = aboutRes.docs[0] as any
  if (about) {
    const layout: any[] = Array.isArray(about.layout) ? [...about.layout] : []
    let modified = false
    for (let i = 0; i < layout.length; i++) {
      const block = { ...layout[i] }
      if (sweepStrings(block)) { modified = true; changes.push(`about.block[${i}] (${block.blockType}): text replacements applied`) }
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

    // F. Care plan offer fix + general text sweep — applies to every LP.
    // Sweep catches any stray AI mentions in niche LP heroes/FAQ/etc.
    for (let i = 0; i < layout.length; i++) {
      const block = { ...layout[i] }
      if (sweepStrings(block)) { modified = true; changes.push(`lp[${slug}].block[${i}] (${block.blockType}): text replacements applied`) }
      if (fixCarePlanOffers(block)) { modified = true; changes.push(`lp[${slug}].foundingClient.offers: Care plan price fixed`) }
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

      // E. Ensure the "Who builds it" rich-text block is present AND has the
      // latest copy + headshot URL. First pass inserted the block but skipped
      // it on rerun (idempotent insert) — which meant the wrong headshot URL
      // from the first cut never got fixed. Now: replace in place if found
      // and the content/URL drifted, otherwise insert.
      const desiredContent = buildLexicalParagraphs(WHO_BUILDS_IT_PARAGRAPHS)
      const desiredContentJson = JSON.stringify(desiredContent)
      const existingIdx = layout.findIndex((b: any) =>
        b?.blockType === 'richText' && typeof b?.eyebrow === 'string' && b.eyebrow.toLowerCase().startsWith('who builds it'),
      )
      const blockBase = {
        blockType: 'richText' as const,
        eyebrow: 'Who builds it',
        maxWidth: 'medium' as const,
        variant: 'default' as const,
        imageUrl: SUHAIB_HEADSHOT_URL,
        imageFocus: 'face' as const,
        content: desiredContent,
      }
      if (existingIdx >= 0) {
        const old = layout[existingIdx]
        const needsUpdate =
          old?.imageUrl !== SUHAIB_HEADSHOT_URL ||
          JSON.stringify(old?.content) !== desiredContentJson
        if (needsUpdate) {
          // Preserve the block's existing id so Payload doesn't churn refs.
          layout[existingIdx] = { ...blockBase, ...(old?.id ? { id: old.id } : {}) }
          modified = true
          changes.push(`lp[express-website].block[${existingIdx}]: "Who builds it" updated (URL + copy)`)
        }
      } else {
        const insertIdx = (() => {
          const fcIdx = layout.findIndex((b: any) => b?.blockType === 'foundingClient')
          if (fcIdx >= 0) return fcIdx + 1
          const heroI = layout.findIndex((b: any) => b?.blockType === 'hero')
          return heroI >= 0 ? heroI + 1 : 0
        })()
        layout.splice(insertIdx, 0, blockBase)
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
