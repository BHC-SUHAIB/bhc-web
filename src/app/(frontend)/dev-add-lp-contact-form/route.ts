import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { revalidateContent } from '@/lib/cms-revalidate'

export const dynamic = 'force-dynamic'

// Dev-only one-shot — places a low-friction contact form on a niche landing
// page so its `generate_lead` submit event can feed the "Lead - Form Submit"
// Google Ads conversion (which has no form firing it today).
//
// Two gotchas this endpoint accounts for:
//
// 1. The "PageSpeed audit" tool on these LPs is ITSELF a `contactForm` block,
//    distinguished only by the sentinel eyebrow "PageSpeed audit" (see
//    blocks/render/RenderBlocks.tsx — that eyebrow swaps the form for the audit
//    widget). A naive "does a contactForm exist?" check sees the audit tool and
//    wrongly concludes a form is present. We treat a contactForm as a REAL form
//    only when its eyebrow is NOT that sentinel.
//
// 2. landingPages has versions.drafts enabled, so we read the PUBLISHED version
//    and write back with _status:'published'. Without it the change would land
//    in an unpublished draft and never reach the live page.
//
// Targets ?slug=<lp> (default "express-website"). Idempotent: skips if a real
// (non-audit) contactForm already exists. Inserts directly after the Calendly
// booking block; aborts if that anchor is missing rather than guess placement.
// Disabled in production unless ALLOW_DEV_SEED=one-time-yes (see dev-route-guard).
//
// One-shot prod usage (after deploy):
//   curl -X POST "https://blackhartconsulting.com/dev-add-lp-contact-form"

const AUDIT_SENTINEL_EYEBROW = 'PageSpeed audit'

// Low-friction: name + email + message only; async-friendly copy; no em dashes.
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

const isRealForm = (b: any) =>
  b?.blockType === 'contactForm' && b?.eyebrow !== AUDIT_SENTINEL_EYEBROW

const summarize = (layout: any[]) =>
  layout.map((b) => ({ blockType: b?.blockType, eyebrow: b?.eyebrow ?? null }))

export async function POST(req: Request) {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const slug = new URL(req.url).searchParams.get('slug') || 'express-website'
  const payload = await getPayload({ config })

  // Read the PUBLISHED version explicitly. depth:0 keeps any block relations as
  // ids so the layout round-trips cleanly when written back.
  const res = await payload.find({
    collection: 'landingPages',
    where: { slug: { equals: slug } },
    draft: false,
    depth: 0,
    limit: 1,
  })
  const lp = res.docs[0]
  if (!lp) {
    return NextResponse.json({ error: `No landing page with slug "${slug}"` }, { status: 404 })
  }

  const layout: any[] = Array.isArray(lp.layout) ? [...lp.layout] : []
  const before = summarize(layout)

  // Idempotent — skip if a REAL (non-audit) contact form already exists.
  if (layout.some(isRealForm)) {
    return NextResponse.json({ ok: true, slug, action: 'already-present', blocks: before })
  }

  // Safety: only write if this looks like the real live LP — it must carry the
  // Calendly booking block (our insertion anchor). Refuse rather than guess.
  const bookingIdx = layout.findIndex((b) => b?.blockType === 'calendlyBooking')
  if (bookingIdx === -1) {
    return NextResponse.json(
      { ok: false, slug, action: 'aborted-no-anchor', reason: 'no calendlyBooking block; refusing to guess placement', blocks: before },
      { status: 409 },
    )
  }

  layout.splice(bookingIdx + 1, 0, CONTACT_FORM_BLOCK)

  // Write back as a PUBLISHED version (drafts are enabled — without _status the
  // change would be saved as an unpublished draft and never go live).
  await payload.update({
    collection: 'landingPages',
    id: lp.id,
    data: { layout, _status: 'published' } as any,
  })

  // The afterChange hook revalidates too; call the same helper explicitly so the
  // tag + /lp/<slug> path refresh immediately (Next 16 revalidateTag(tag,{expire:0})).
  revalidateContent({ tag: 'landingPages', slug, slugPathPrefix: '/lp' })

  return NextResponse.json({
    ok: true,
    slug,
    action: 'inserted',
    insertedAfterIndex: bookingIdx,
    before,
    after: summarize(layout),
  })
}
