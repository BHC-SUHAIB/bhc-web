import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  access: { read: () => true },
  admin: {
    group: '▤ Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'client', 'year', 'featured', 'updatedAt'],
    description: 'Portfolio case studies. Detailed project write-ups.',
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'summary', type: 'textarea', required: true, admin: { description: 'Short 1-2 line teaser shown on cards and the portfolio listing' } },
    { name: 'heroImage', type: 'upload', relationTo: 'media' as const, admin: { description: 'Upload from Media library. Recommended 2400\u00d71350 (16:9).' } },

    { type: 'row', fields: [
      { name: 'client', type: 'text', admin: { width: '33%' } },
      { name: 'industry', type: 'text', admin: { width: '33%' } },
      { name: 'projectType', type: 'select', admin: { width: '34%' }, options: [
        { label: 'Website', value: 'website' },
        { label: 'Web app', value: 'webapp' },
        { label: 'Mobile app', value: 'mobile' },
        { label: 'SEO engagement', value: 'seo' },
        { label: 'Brand / design', value: 'brand' },
        { label: 'Hosting / infrastructure', value: 'infra' },
        { label: 'Other', value: 'other' },
      ] },
    ] },

    { type: 'row', fields: [
      { name: 'year', type: 'number', admin: { width: '25%' } },
      { name: 'duration', type: 'text', admin: { width: '25%', description: 'e.g. "6 weeks"' } },
      { name: 'teamSize', type: 'number', admin: { width: '25%' } },
      { name: 'liveUrl', type: 'text', admin: { width: '25%' } },
    ] },

    { name: 'stack', type: 'array', admin: { description: 'Technologies used' }, fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'category', type: 'select', options: [
        { label: 'Framework', value: 'framework' },
        { label: 'Language', value: 'language' },
        { label: 'Database', value: 'db' },
        { label: 'Hosting / infra', value: 'hosting' },
        { label: 'CMS', value: 'cms' },
        { label: 'Design', value: 'design' },
        { label: 'Tool', value: 'tool' },
      ] },
    ] },

    { name: 'challenge', type: 'richText', admin: { description: 'What problem did the client have?' } },
    { name: 'approach', type: 'richText', admin: { description: 'What did we do, and why did we make the decisions we made? (Frameworks chosen, trade-offs, etc.)' } },
    { name: 'outcome', type: 'richText', admin: { description: 'What happened. Include measurable metrics (load time, traffic, rankings, conversions).' } },

    { name: 'metrics', type: 'array', admin: { description: 'Highlighted key metrics (shown prominently)' }, maxRows: 4, fields: [
      { name: 'value', type: 'text', required: true, admin: { description: 'e.g. "140%" or "0.9s"' } },
      { name: 'label', type: 'text', required: true, admin: { description: 'e.g. "increase in organic traffic"' } },
    ] },

    { name: 'gallery', type: 'array', fields: [
      { name: 'image', type: 'upload', relationTo: 'media' as const, required: true },
      { name: 'caption', type: 'text' },
    ] },

    { name: 'testimonial', type: 'group', fields: [
      { name: 'quote', type: 'textarea' },
      { name: 'author', type: 'text' },
      { name: 'role', type: 'text' },
    ] },

    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Show on the home page "featured projects" block' } },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },

    {
      // (Phase E #32) Quick-create invoice button — pre-fills with project
      // context, lets the operator pick a Client, add line items, and
      // finalize a Stripe invoice in one click.
      name: 'quickCreateInvoice',
      type: 'ui',
      label: 'Bill this project',
      admin: {
        components: {
          Field: '/components/admin/QuickCreateInvoiceField#default',
        },
      },
    },
  ],
}
