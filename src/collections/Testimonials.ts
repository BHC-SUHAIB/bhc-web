import type { CollectionConfig } from 'payload'
import { lexicalEditor, BoldFeature, ItalicFeature, ParagraphFeature } from '@payloadcms/richtext-lexical'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  access: { read: () => true },
  admin: {
    useAsTitle: 'author',
    defaultColumns: ['author', 'company', 'role', 'rating', 'featured', 'sortOrder', 'updatedAt'],
    description: 'Client quotes shown by the Testimonials block on any page.',
  },
  fields: [
    // Rating sits above the quote so admins are prompted for it first.
    // Stored as text so 0.5-step values round-trip cleanly without
    // float drift. The custom field component renders interactive
    // half-star clicks with hover preview + clear button.
    { name: 'rating', type: 'text', admin: {
      description: 'Optional 1–5 star rating, in half-star steps. Click to set, hover to preview, × to clear.',
      components: { Field: '/components/admin/RatingField#default' },
    } },
    { name: 'quote', type: 'richText', required: true, editor: lexicalEditor({
      features: () => [ParagraphFeature(), BoldFeature(), ItalicFeature()],
    }) },
    { name: 'author', type: 'text', required: true, admin: { description: 'Person being quoted (e.g. "Grace R.")' } },
    { type: 'row', fields: [
      { name: 'role', type: 'text', admin: { width: '50%', description: 'e.g. "Head of Marketing"' } },
      { name: 'company', type: 'text', admin: { width: '50%', description: 'e.g. "Northlake Consulting"' } },
    ] },
    { name: 'featured', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar', description: 'Include in Testimonials blocks set to "Auto (latest featured)".' } },
    { name: 'sortOrder', type: 'number', admin: { position: 'sidebar', description: 'Lower numbers appear first. Ties fall back to most recently updated.' } },
  ],
}
