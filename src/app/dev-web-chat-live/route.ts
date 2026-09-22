/**
 * One-shot content update: AI Front Desk web chat goes live on the Pro plan.
 *
 * Web chat was marked "coming soon" (e578f55). It now ships on Pro, built on
 * Retell's chat widget. This walks every published page, landing page,
 * article, and FAQ and:
 *   - drops the "Web chat with the same brain (coming soon)" setup feature,
 *   - adds "Web chat on your website" to every Front Desk Pro feature list,
 *   - swaps the capability-grid card from "coming soon" to live,
 * then, on the ai-front-desk page only, uploads the chat mockup, inserts the
 * web chat text + image blocks after the capability grid, adds the FAQ entry,
 * and updates the plans note. Other content is left untouched.
 *
 *   curl -X POST http://localhost:3001/dev-web-chat-live            (local)
 *   curl -X POST https://blackhartconsulting.com/dev-web-chat-live  (prod: needs ALLOW_DEV_SEED)
 *
 * Idempotent: a second run finds nothing to change and reports zero changes.
 * Delete this route once it has run on prod.
 */

import path from 'node:path'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { revalidateContent } from '@/lib/cms-revalidate'
import {
  WEB_CHAT_FAQ_A,
  WEB_CHAT_FAQ_Q,
  WEB_CHAT_MEDIA_ALT,
  WEB_CHAT_PRICING_NOTE,
  webChatMediaBlock,
  webChatTextBlock,
} from '@/seed/reset-content'

export const dynamic = 'force-dynamic'

const SETUP_CHAT_FEATURE = 'Web chat with the same brain (coming soon)'
const PRO_CHAT_FEATURE = 'Web chat on your website'

const REPLACEMENTS: Array<[string, string]> = [
  ['Web chat, coming soon', 'Chats on your website'],
  [
    'Next up: the same trained brain answering questions in a chat widget on your site.',
    'On Pro, the same trained brain answers questions and books visitors in a chat window on your site, by text or voice.',
  ],
]

const OLD_PRICING_NOTE = 'Month to month after the first 30 days. Annual prepay gets two months free.'

type Collection = 'pages' | 'landingPages' | 'articles' | 'faqs'
const COLLECTIONS: Array<{ slug: Collection; drafts: boolean; prefix: string }> = [
  { slug: 'pages', drafts: true, prefix: '' },
  { slug: 'landingPages', drafts: true, prefix: '/lp' },
  { slug: 'articles', drafts: true, prefix: '/articles' },
  { slug: 'faqs', drafts: false, prefix: '' },
]

type Feature = { label?: unknown; id?: unknown; [k: string]: unknown }
const isFeatureList = (v: unknown[]): v is Feature[] =>
  v.length > 0 && v.every((x) => x && typeof x === 'object' && typeof (x as Feature).label === 'string')

function walk(value: unknown, hits: string[]): unknown {
  if (typeof value === 'string') {
    let out = value
    for (const [from, to] of REPLACEMENTS) {
      if (out.includes(from) && !out.includes(to)) {
        out = out.split(from).join(to)
        hits.push(from.slice(0, 50))
      }
    }
    return out
  }
  if (Array.isArray(value)) {
    let list = value.map((v) => walk(v, hits))
    if (isFeatureList(list)) {
      const labels = list.map((x) => x.label)
      if (labels.includes(SETUP_CHAT_FEATURE)) {
        list = list.filter((x) => x.label !== SETUP_CHAT_FEATURE)
        hits.push('drop setup chat feature')
      }
      // Front Desk Pro: "500 calls a month", "Everything in Plus", "Multi-line", ...
      const isPro = labels.includes('500 calls a month') && labels.includes('Everything in Plus')
      if (isPro && !labels.includes(PRO_CHAT_FEATURE)) {
        const at = labels.indexOf('Everything in Plus') + 1
        const { id: _id, ...template } = list[at - 1] as Feature
        list = [...list.slice(0, at), { ...template, label: PRO_CHAT_FEATURE }, ...list.slice(at)]
        hits.push('add pro chat feature')
      }
    }
    return list
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) next[k] = walk(v, hits)
    return next
  }
  return value
}

type Block = { blockType?: string; eyebrow?: string; description?: string; items?: unknown; [k: string]: unknown }

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  try {
    const payload = await getPayload({ config })
    const changes: Array<{ collection: string; slug: string; fields: string[]; hits: string[] }> = []
    const failed: Array<{ collection: string; id: string | number; error: string }> = []

    // The mockup image for the ai-front-desk page (reused if already uploaded).
    const existingMedia = await payload.find({ collection: 'media', where: { alt: { equals: WEB_CHAT_MEDIA_ALT } }, limit: 1 })
    const media = existingMedia.docs[0] ?? await payload.create({
      collection: 'media',
      data: { alt: WEB_CHAT_MEDIA_ALT } as never,
      filePath: path.resolve(process.cwd(), 'public/seed-assets/ai-front-desk/web-chat-demo.jpg'),
    })

    for (const col of COLLECTIONS) {
      const res = await payload.find({ collection: col.slug, limit: 1000, depth: 0, draft: false, pagination: false })
      for (const doc of res.docs as unknown as Array<Record<string, unknown> & { id: string | number }>) {
        const data: Record<string, unknown> = {}
        const hits: string[] = []
        for (const [key, value] of Object.entries(doc)) {
          if (['id', 'createdAt', 'updatedAt', '_status'].includes(key)) continue
          const before = hits.length
          const next = walk(value, hits)
          if (hits.length > before) data[key] = next
        }

        // ai-front-desk only: web chat section, FAQ entry, plans note.
        if (col.slug === 'pages' && doc.slug === 'ai-front-desk') {
          const layout = ((data.layout ?? doc.layout) as Block[]).map((b) => ({ ...b }))
          const chatAt = layout.findIndex((b) => b.blockType === 'richText' && b.eyebrow === webChatTextBlock.eyebrow)
          if (chatAt !== -1 && layout[chatAt].variant !== webChatTextBlock.variant) {
            layout[chatAt] = { ...webChatTextBlock } as Block
            hits.push('refresh web chat section')
          }
          if (chatAt === -1) {
            const at = layout.findIndex((b) => b.blockType === 'services')
            if (at === -1) throw new Error('ai-front-desk: services block not found')
            layout.splice(at + 1, 0, { ...webChatTextBlock } as Block, webChatMediaBlock(media.id) as Block)
            hits.push('insert web chat section')
          }
          for (const b of layout) {
            if (b.blockType === 'pricing' && b.description === OLD_PRICING_NOTE) {
              b.description = WEB_CHAT_PRICING_NOTE
              hits.push('plans note')
            }
            if (b.blockType === 'faq' && Array.isArray(b.items)) {
              const items = b.items as Array<{ question?: string }>
              if (!items.some((i) => i.question === WEB_CHAT_FAQ_Q)) {
                b.items = [...items, { question: WEB_CHAT_FAQ_Q, answer: WEB_CHAT_FAQ_A }]
                hits.push('faq entry')
              }
            }
          }
          if (hits.length) data.layout = layout
        }

        if (!hits.length) continue
        try {
          if (col.drafts) data._status = 'published'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await payload.update({ collection: col.slug, id: doc.id, data: data as any, depth: 0 })
          const slug = String(doc.slug ?? doc.question ?? doc.id)
          changes.push({ collection: col.slug, slug, fields: Object.keys(data).filter((k) => k !== '_status'), hits })
          if (col.slug !== 'faqs') revalidateContent({ tag: col.slug, slug: doc.slug as string, slugPathPrefix: col.prefix })
        } catch (e) {
          failed.push({ collection: col.slug, id: doc.id, error: e instanceof Error ? e.message : String(e) })
        }
      }
    }
    revalidateContent({ tag: 'faqs' })

    return NextResponse.json({ ok: failed.length === 0, marker: 'web-chat-live-v1', mediaId: media.id, changes, failed })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
