import type { CollectionConfig } from 'payload'
import { allBlocks } from '../blocks/schema'

// Landing pages live in their own collection because they use the (lp)/layout.tsx
// — no SiteHeader, no SiteFooter, noindex by default. Same block library as
// Pages, so editors can compose new LPs from the same drag-and-drop sections.
//
// Routing: src/app/(lp)/lp/[slug]/page.tsx resolves a slug to a record here.
// GTM is injected by (lp)/layout.tsx automatically — no per-page wiring needed.
//
// Created via the admin → "Landing pages" → "Add new" → drop in a Hero block,
// pricing, contact form. The dataLayer events fire from the block render
// components (ContactForm fires generate_lead, etc.), so analytics works on
// any LP without extra setup.

export const LandingPages: CollectionConfig = {
  slug: 'landingPages',
  labels: { singular: 'Landing Page', plural: 'Landing Pages' },
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'campaign', 'publishedAt', 'updatedAt'],
    description: 'Paid-traffic landing pages. No nav, no footer, noindex by default. URL is /lp/{slug}. Drop in blocks like any other page — GA4/GTM/Conversion Linker fire automatically.',
    group: 'Content',
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true, admin: { description: 'Internal name. Not shown to visitors unless you put it in a Hero headline.' } },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug — final URL is /lp/{slug}. Use kebab-case (e.g. "dentist-website-houston", "express-website").',
      },
    },
    {
      name: 'campaign',
      type: 'text',
      admin: {
        description: 'Optional Google Ads campaign / ad group label this LP belongs to. For your own bookkeeping; not rendered.',
      },
    },
    {
      name: 'niche',
      type: 'select',
      admin: { description: 'Industry vertical this LP targets. Used for internal segmentation.' },
      options: [
        { label: 'Generic / Express', value: 'generic' },
        { label: 'Dental practice', value: 'dental' },
        { label: 'Medical / Med spa', value: 'medspa' },
        { label: 'Law firm', value: 'legal' },
        { label: 'Restaurant / Cafe', value: 'restaurant' },
        { label: 'Boutique / Retail', value: 'boutique' },
        { label: 'Fitness studio', value: 'fitness' },
        { label: 'Real estate', value: 'realestate' },
        { label: 'Salon / Spa', value: 'salonspa' },
        { label: 'Contractor / Trades', value: 'contractor' },
        { label: 'Professional services', value: 'professional' },
      ],
    },
    { name: 'seo', type: 'group', fields: [
      { name: 'metaTitle', type: 'text', admin: { description: 'Falls back to page title if empty' } },
      { name: 'metaDescription', type: 'textarea' },
      { name: 'ogImage', type: 'upload', relationTo: 'media' as const },
      {
        name: 'noIndex',
        type: 'checkbox',
        defaultValue: true,
        admin: { description: 'Default: true. Paid-traffic LPs should not compete with organic /services for SEO. Uncheck only if this LP doubles as an organic landing page.' },
      },
    ] },
    {
      name: 'layout',
      type: 'blocks',
      required: true,
      admin: { description: 'Drag to reorder. Click + to add a section. All standard blocks are available — Hero, Pricing, FAQ, Contact Form, etc.' },
      blocks: allBlocks,
    },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },
  ],
}
