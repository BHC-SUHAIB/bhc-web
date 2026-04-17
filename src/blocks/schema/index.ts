import type { Block } from 'payload'

const richTextEditor = { editor: undefined } as const

export const Hero: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heros' },
  interfaceName: 'HeroBlock',
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'Small label above the headline' } },
    { name: 'headline', type: 'text', required: true },
    { name: 'subheadline', type: 'textarea' },
    { name: 'align', type: 'select', defaultValue: 'left', options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
    ] },
    { name: 'ctas', type: 'array', maxRows: 3, fields: [
      { name: 'label', type: 'text', required: true },
      { name: 'href', type: 'text', required: true },
      { name: 'variant', type: 'select', defaultValue: 'primary', options: [
        { label: 'Primary (filled)', value: 'primary' },
        { label: 'Secondary (outlined)', value: 'secondary' },
        { label: 'Ghost (text only)', value: 'ghost' },
      ] },
    ] },
    { name: 'image', type: 'upload', relationTo: 'media' as const, admin: { description: 'Optional hero image' } },
  ],
}

export const Services: Block = {
  slug: 'services',
  labels: { singular: 'Services', plural: 'Services' },
  interfaceName: 'ServicesBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'items', type: 'array', minRows: 1, fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'textarea' },
      { name: 'icon', type: 'select', options: [
        { label: 'Globe (web)', value: 'globe' },
        { label: 'Search (SEO)', value: 'search' },
        { label: 'Smartphone (apps)', value: 'smartphone' },
        { label: 'Server (hosting)', value: 'server' },
        { label: 'Sparkles (design)', value: 'sparkles' },
        { label: 'Zap (performance)', value: 'zap' },
        { label: 'Shield (security)', value: 'shield' },
        { label: 'Code (dev)', value: 'code' },
        { label: 'Lightbulb (strategy)', value: 'lightbulb' },
      ] },
      { name: 'bullets', type: 'array', fields: [{ name: 'label', type: 'text' }] },
    ] },
  ],
}

export const Pricing: Block = {
  slug: 'pricing',
  labels: { singular: 'Pricing', plural: 'Pricing' },
  interfaceName: 'PricingBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'tiers', type: 'array', minRows: 1, maxRows: 5, fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'price', type: 'text', required: true, admin: { description: 'e.g. "$2,500" or "From $1,500/mo"' } },
      { name: 'priceNote', type: 'text', admin: { description: 'Small line under price, e.g. "one-time" or "per month"' } },
      { name: 'description', type: 'textarea' },
      { name: 'features', type: 'array', fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'included', type: 'checkbox', defaultValue: true },
      ] },
      { name: 'cta', type: 'group', fields: [
        { name: 'label', type: 'text' },
        { name: 'href', type: 'text' },
      ] },
      { name: 'highlighted', type: 'checkbox', defaultValue: false, admin: { description: 'Visually emphasize this tier' } },
    ] },
  ],
}

export const FeaturedProjects: Block = {
  slug: 'featuredProjects',
  labels: { singular: 'Featured projects', plural: 'Featured projects' },
  interfaceName: 'FeaturedProjectsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'mode', type: 'select', defaultValue: 'latest', options: [
      { label: 'Auto (latest featured)', value: 'latest' },
      { label: 'Manual selection', value: 'manual' },
    ] },
    { name: 'limit', type: 'number', defaultValue: 3, min: 1, max: 12, admin: { condition: (_, s: { mode?: string }) => s.mode === 'latest' } },
    { name: 'projects', type: 'relationship', relationTo: 'projects' as const, hasMany: true, admin: { condition: (_, s: { mode?: string }) => s.mode === 'manual' } },
    { name: 'viewAllLabel', type: 'text', defaultValue: 'View all projects' },
    { name: 'viewAllHref', type: 'text', defaultValue: '/portfolio' },
  ],
}

export const Testimonials: Block = {
  slug: 'testimonials',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  interfaceName: 'TestimonialsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text' },
    { name: 'items', type: 'array', minRows: 1, fields: [
      { name: 'quote', type: 'textarea', required: true },
      { name: 'author', type: 'text', required: true },
      { name: 'role', type: 'text' },
      { name: 'company', type: 'text' },
    ] },
  ],
}

export const Stats: Block = {
  slug: 'stats',
  labels: { singular: 'Stats', plural: 'Stats' },
  interfaceName: 'StatsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text' },
    { name: 'items', type: 'array', minRows: 1, maxRows: 6, fields: [
      { name: 'value', type: 'text', required: true, admin: { description: 'e.g. "140%" or "0.9s" or "12M+"' } },
      { name: 'label', type: 'text', required: true },
      { name: 'description', type: 'text' },
    ] },
  ],
}

export const CTA: Block = {
  slug: 'cta',
  labels: { singular: 'Call to action', plural: 'Calls to action' },
  interfaceName: 'CTABlock',
  fields: [
    { name: 'headline', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'primaryCta', type: 'group', fields: [
      { name: 'label', type: 'text', required: true },
      { name: 'href', type: 'text', required: true },
    ] },
    { name: 'secondaryCta', type: 'group', fields: [
      { name: 'label', type: 'text' },
      { name: 'href', type: 'text' },
    ] },
    { name: 'variant', type: 'select', defaultValue: 'default', options: [
      { label: 'Default', value: 'default' },
      { label: 'Emphasized (brass accent)', value: 'emphasized' },
    ] },
  ],
}

export const RichTextBlock: Block = {
  slug: 'richText',
  labels: { singular: 'Rich text', plural: 'Rich text' },
  interfaceName: 'RichTextBlock',
  fields: [
    { name: 'content', type: 'richText' },
    { name: 'maxWidth', type: 'select', defaultValue: 'prose', options: [
      { label: 'Narrow (prose — 68ch)', value: 'prose' },
      { label: 'Medium (2xl — 42rem)', value: 'medium' },
      { label: 'Wide (full)', value: 'wide' },
    ] },
  ],
}

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  labels: { singular: 'Media', plural: 'Media' },
  interfaceName: 'MediaBlockBlock',
  fields: [
    { name: 'media', type: 'upload', relationTo: 'media' as const, required: true },
    { name: 'caption', type: 'text' },
    { name: 'fullBleed', type: 'checkbox', defaultValue: false },
  ],
}

export const ContactFormBlock: Block = {
  slug: 'contactForm',
  labels: { singular: 'Contact form', plural: 'Contact forms' },
  interfaceName: 'ContactFormBlockBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text', required: true, defaultValue: 'Tell us about your project.' },
    { name: 'description', type: 'textarea' },
    { name: 'successMessage', type: 'textarea', defaultValue: 'Thanks \u2014 we\u2019ll reply within one business day.' },
    { name: 'showCompanyField', type: 'checkbox', defaultValue: true },
    { name: 'showProjectTypeField', type: 'checkbox', defaultValue: true },
    { name: 'showBudgetField', type: 'checkbox', defaultValue: true },
    { name: 'submitLabel', type: 'text', defaultValue: 'Send inquiry' },
  ],
}

export const Faq: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  interfaceName: 'FaqBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'headline', type: 'text' },
    { name: 'items', type: 'array', minRows: 1, fields: [
      { name: 'question', type: 'text', required: true },
      { name: 'answer', type: 'textarea', required: true },
    ] },
  ],
}

export const allBlocks = [
  Hero,
  Services,
  Pricing,
  FeaturedProjects,
  Testimonials,
  Stats,
  CTA,
  RichTextBlock,
  MediaBlock,
  Faq,
  ContactFormBlock,
]
