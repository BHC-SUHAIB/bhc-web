/**
 * One-shot content seed: create the local-SEO service-area PAGES (not paid LPs).
 *
 * Unlike the /lp/* landing pages (noindex, no nav, paid traffic), these are
 * INDEXED pages in the `pages` collection. They get the sitewide LocalBusiness
 * + BreadcrumbList JSON-LD from the frontend layout, are included in
 * sitemap.ts, and target long-tail local queries (the real organic growth
 * lever). Each carries unique localized copy, FAQPage schema (via the Faq
 * block), and an on-page contact form with the booking + call CTAs.
 *
 *   curl -X POST http://localhost:3000/dev-seed-local-pages            (local)
 *   curl -X POST https://blackhartconsulting.com/dev-seed-local-pages  (prod: needs ALLOW_DEV_SEED)
 *
 * Idempotent: re-running upserts the same layout by slug. Returns 403 in
 * production unless ALLOW_DEV_SEED=one-time-yes is set on the container.
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { revalidateContent } from '@/lib/cms-revalidate'

export const dynamic = 'force-dynamic'

// Minimal single-paragraph Lexical rich text (mirrors the rt() helper in
// src/seed/onInit.ts) so richText blocks render localized prose.
const rt = (text: string) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
    children: [{
      type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr',
      children: [{ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' }],
    }],
  },
})

// Shared on-page lead form. Renders the booking callout + phone/email aside
// (NAP) + the qualifying contact form, and fires generate_lead on submit.
const leadForm = (headline: string, description: string) => ({
  blockType: 'contactForm',
  eyebrow: 'Start the conversation',
  headline,
  description,
  showCompanyField: true,
  showProjectTypeField: true,
  showBudgetField: true,
  submitLabel: 'Send inquiry',
  successMessage: 'Thanks. Your note is in. We reply within one business day from hello@blackhartconsulting.com.',
})

const LOCAL_PAGES: Array<{ title: string; slug: string; seo: Record<string, unknown>; layout: unknown[] }> = [
  {
    title: 'Web Design in Houston Heights',
    slug: 'web-design-houston-heights',
    seo: {
      metaTitle: 'Web Design in Houston Heights | Black Hart Consulting',
      metaDescription:
        'Custom web design for Houston Heights small businesses. Fast, mobile-first sites that rank in the local pack and turn neighborhood searches into calls. Fixed price, 14-day build.',
      noIndex: false,
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Houston Heights · Web design',
        headline: 'Web design for Houston Heights businesses.',
        subheadline:
          'A custom, fast, mobile-first site built a few blocks from your storefront. We design for how Heights customers actually search: on a phone, near 19th Street or Heights Mercantile, looking for someone local they can trust.',
        align: 'left',
        ctas: [
          { label: 'Book a 30-min call', href: '/contact', variant: 'primary' },
          { label: 'See pricing', href: '/services', variant: 'ghost' },
        ],
      },
      {
        blockType: 'richText', maxWidth: 'medium', variant: 'lede',
        content: rt(
          'Most Heights businesses lose customers in the gap between a Google search and a phone call. A slow, dated, hard-to-read-on-mobile site is the leak. We close it with a site that loads in under a second, reads cleanly on the phone people actually search on, and makes the next step obvious.',
        ),
      },
      {
        blockType: 'stats',
        eyebrow: 'What you get',
        items: [
          { value: '14 days', label: 'Kickoff to launch', description: 'Fixed price, fixed timeline, in writing.' },
          { value: 'Local pack', label: 'Built to rank locally', description: 'LocalBusiness schema + Google Business Profile setup included.' },
          { value: 'The Heights', label: 'Where we build', description: 'Houston-based, so feedback happens in your timezone.' },
        ],
      },
      {
        blockType: 'richText', maxWidth: 'medium',
        content: rt(
          'A template site treats a Heights coffee shop, a dental practice, and a law office the same way. Yours should not. We design around your real customer journey: the services they search for, the proof that earns trust, and the one action you want them to take. Then we wire Google Business Profile, LocalBusiness schema, and conversion tracking so the work is measurable, not a leap of faith.',
        ),
      },
      {
        blockType: 'faq',
        eyebrow: 'Common questions',
        headline: 'Web design in the Heights, answered.',
        mode: 'manual',
        items: [
          { question: 'Do you only work with Houston Heights businesses?', answer: 'The Heights is home base, so a lot of our work is local. But most of our clients are remote across Houston and beyond. Being nearby just makes in-person kickoffs easy when you want one.' },
          { question: 'Will a new site actually help me show up in Google?', answer: 'Yes. Every build ships with Google Business Profile setup and LocalBusiness schema, which is what moves a Heights business into the local 3-pack. We also fix the technical basics (speed, mobile, titles) that Google uses to rank you.' },
          { question: 'How much does a small business website cost?', answer: 'A 5-page Starter Site is a fixed price, quoted before kickoff, with founding-client pricing for our first Heights clients. No hourly billing and no scope-creep surprises. See the Services page for current numbers.' },
          { question: 'How long does it take?', answer: 'Fourteen days from kickoff to launch for a Starter Site, guaranteed in writing. You approve the design direction before any code is written, so the clock only starts once you are happy with the direction.' },
        ],
      },
      leadForm(
        'Get a quote for your Heights website.',
        'A sentence on your business and what you need is enough. We reply within one business day, or grab a time on the call.',
      ),
    ],
  },
  {
    title: 'Local SEO in Houston',
    slug: 'local-seo-houston',
    seo: {
      metaTitle: 'Local SEO in Houston | Black Hart Consulting',
      metaDescription:
        'Local SEO for Houston businesses. Google Business Profile optimization, citations, and LocalBusiness schema that move you into the Houston local 3-pack. Monthly and measurable.',
      noIndex: false,
    },
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Houston · Local SEO',
        headline: 'Local SEO that puts Houston businesses on the map.',
        subheadline:
          'We get you into the Google local pack for the searches that bring real customers: "near me", your neighborhood, your service. Built from the Heights, focused on Houston, measured every month.',
        align: 'left',
        ctas: [
          { label: 'Book a 30-min call', href: '/contact', variant: 'primary' },
          { label: 'See SEO pricing', href: '/services', variant: 'ghost' },
        ],
      },
      {
        blockType: 'richText', maxWidth: 'medium', variant: 'lede',
        content: rt(
          'In Houston, the directories and national agencies own the head terms. You win two other places instead: the local 3-pack, where a verified Google Business Profile and proximity decide who shows, and the long-tail neighborhood searches your competitors ignore. That is exactly where we work.',
        ),
      },
      {
        blockType: 'stats',
        eyebrow: 'What we optimize',
        items: [
          { value: 'GBP', label: 'Profile that ranks', description: 'Categories, services, posts, and review velocity dialed in.' },
          { value: 'Schema', label: 'LocalBusiness markup', description: 'NAP, geo, and areaServed Google can read, on every page.' },
          { value: 'Citations', label: 'Consistent NAP', description: 'Yelp, Apple Maps, Bing, BBB, and the Houston chambers.' },
        ],
      },
      {
        blockType: 'richText', maxWidth: 'medium',
        content: rt(
          'Local SEO is not one trick. It is a verified, fully-filled Google Business Profile, consistent name-address-phone across every directory, LocalBusiness schema on your site, neighborhood and service pages that match real searches, and a steady habit of recent reviews. We handle the technical work, build the pages, and report rankings and calls every month so you can see it working.',
        ),
      },
      {
        blockType: 'faq',
        eyebrow: 'Common questions',
        headline: 'Local SEO in Houston, answered.',
        mode: 'manual',
        items: [
          { question: 'How long until I see results from local SEO?', answer: 'Google Business Profile and schema work usually move a Houston business in the local 3-pack within two to four weeks. Broader organic gains follow over months two and three as Google trusts the changes and the reviews build up.' },
          { question: 'What is the local 3-pack and why does it matter?', answer: 'It is the map plus three business listings Google shows above the regular results for local searches. For "near me" and neighborhood queries it captures most of the clicks, so getting in is the highest-ROI move for a local business.' },
          { question: 'Do I need a new website for local SEO to work?', answer: 'Not always. We can run local SEO on your existing site if it is technically sound. If it is slow or missing the basics, we will tell you, and a Starter Site rebuild often pays for itself in recovered search traffic.' },
          { question: 'Is local SEO a monthly service?', answer: 'Yes. Rankings, reviews, and citations need consistent work, so local SEO is a monthly engagement with a clear report each month. One-time setup sprints are available if you only need the foundation laid.' },
        ],
      },
      leadForm(
        'Get a local SEO plan for your business.',
        'Tell us your business and the searches you want to win. We reply within one business day, or book a call to talk it through.',
      ),
    ],
  },
]

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })
  const results: Array<{ slug: string; action: 'created' | 'updated'; id: string | number }> = []

  for (const page of LOCAL_PAGES) {
    const data = {
      title: page.title,
      slug: page.slug,
      _status: 'published',
      publishedAt: new Date().toISOString(),
      seo: page.seo,
      layout: page.layout,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      limit: 1,
      depth: 0,
    })

    const doc = existing.docs[0] as { id: string | number } | undefined
    if (doc) {
      await payload.update({ collection: 'pages', id: doc.id, data })
      results.push({ slug: page.slug, action: 'updated', id: doc.id })
    } else {
      const created = await payload.create({ collection: 'pages', data })
      results.push({ slug: page.slug, action: 'created', id: created.id })
    }
    revalidateContent({ tag: 'pages', slug: page.slug, slugPathPrefix: '' })
  }

  return NextResponse.json({ ok: true, pages: results })
}
