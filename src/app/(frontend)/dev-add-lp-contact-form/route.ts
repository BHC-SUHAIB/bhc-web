import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { revalidateContent } from '@/lib/cms-revalidate'

export const dynamic = 'force-dynamic'

// Dev-only one-shot — places a low-friction contact form on a niche landing
// page so its `generate_lead` submit event can finally feed the "Lead - Form
// Submit" Google Ads conversion action, which has no form firing it today.
//
// The form block and its generate_lead push already exist in code (see
// blocks/render/ContactForm.tsx); the page just doesn't carry the block. LP
// layout is CMS data, not code, so this patches the landingPages record.
//
// Targets ?slug=<lp> (default "express-website"). Idempotent: skips if the LP
// already has a contactForm block. Inserts directly after the Calendly booking
// block so the page reads "book a call... or just send a message", falling back
// to before a trailing CTA, else appended. Disabled in production unless
// ALLOW_DEV_SEED=one-time-yes (see lib/dev-route-guard.ts for the droplet dance).
//
// One-shot prod usage (after deploy):
//   curl -X POST "https://blackhartconsulting.com/dev-add-lp-contact-form"
//   curl -X POST "https://blackhartconsulting.com/dev-add-lp-contact-form?slug=<other-lp>"

// Low-friction: name + email + message only (company/project/budget off),
// async-friendly copy, no em dashes per house style.
const CONTACT_FORM_BLOCK = {
  blockType: 'contactForm',
  eyebrow: 'Rather just send a message?',
  headline: 'Tell us what you need.',
  description:
    "Not ready to book a call? Leave your name, email, and a sentence about your business, and we'll reply within one business day.",
  successMessage:
    "Thanks, we'll reply within one business day. Want to talk sooner? Use the call button above.",
  showCompanyField: false,
  showProjectTypeField: false,
  showBudgetField: false,
  submitLabel: 'Send message',
}

export async function POST(req: Request) {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const slug = new URL(req.url).searchParams.get('slug') || 'express-website'
  const payload = await getPayload({ config })

  const res = await payload.find({
    collection: 'landingPages',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
  })
  const lp = res.docs[0]
  if (!lp) {
    return NextResponse.json({ error: `No landing page with slug "${slug}"` }, { status: 404 })
  }

  const layout: any[] = Array.isArray(lp.layout) ? [...lp.layout] : []

  // Idempotent — never add a second form on a re-run.
  if (layout.some((b) => b?.blockType === 'contactForm')) {
    return NextResponse.json({ ok: true, slug, action: 'already-present', blocks: layout.length })
  }

  const bookingIdx = layout.findIndex((b) => b?.blockType === 'calendlyBooking')
  let insertAt: number
  if (bookingIdx !== -1) {
    insertAt = bookingIdx + 1
  } else {
    const lastCta = layout.map((b) => b?.blockType).lastIndexOf('cta')
    insertAt = lastCta !== -1 ? lastCta : layout.length
  }
  layout.splice(insertAt, 0, CONTACT_FORM_BLOCK)

  await payload.update({ collection: 'landingPages', id: lp.id, data: { layout } as any })

  // The landingPages afterChange hook already revalidates on update; call the
  // same blessed helper explicitly so the tag + the /lp/<slug> path refresh
  // immediately (Next 16 `revalidateTag(tag, { expire: 0 })`, handled inside).
  revalidateContent({ tag: 'landingPages', slug, slugPathPrefix: '/lp' })

  return NextResponse.json({ ok: true, slug, action: 'inserted', insertedAt: insertAt, blocks: layout.length })
}
