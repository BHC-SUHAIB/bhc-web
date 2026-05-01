import type { CollectionConfig } from 'payload'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  access: { read: () => true },
  admin: {
    useAsTitle: 'author',
    defaultColumns: ['author', 'company', 'role', 'featured', 'sortOrder', 'updatedAt'],
    description: 'Client quotes shown by the Testimonials block on any page.',
  },
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'author', type: 'text', required: true, admin: { description: 'Person being quoted (e.g. "Grace R.")' } },
    { type: 'row', fields: [
      { name: 'role', type: 'text', admin: { width: '50%', description: 'e.g. "Head of Marketing"' } },
      { name: 'company', type: 'text', admin: { width: '50%', description: 'e.g. "Northlake Consulting"' } },
    ] },
    { name: 'rating', type: 'select', admin: { description: 'Optional 1–5 star rating, in half-star steps. Leave blank to hide stars.' }, options: [
      { label: 'No rating', value: '0' },
      { label: '0.5 stars', value: '0.5' },
      { label: '1 star', value: '1' },
      { label: '1.5 stars', value: '1.5' },
      { label: '2 stars', value: '2' },
      { label: '2.5 stars', value: '2.5' },
      { label: '3 stars', value: '3' },
      { label: '3.5 stars', value: '3.5' },
      { label: '4 stars', value: '4' },
      { label: '4.5 stars', value: '4.5' },
      { label: '5 stars', value: '5' },
    ] },
    { name: 'featured', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar', description: 'Include in Testimonials blocks set to "Auto (latest featured)".' } },
    { name: 'sortOrder', type: 'number', admin: { position: 'sidebar', description: 'Lower numbers appear first. Ties fall back to most recently updated.' } },
  ],
}
