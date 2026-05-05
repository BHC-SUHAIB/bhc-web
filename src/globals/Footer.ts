import type { GlobalConfig } from 'payload'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: { read: () => true },
  admin: { group: '◯ Site', description: 'Site footer' },
  fields: [
    { name: 'tagline', type: 'text', defaultValue: 'Websites, SEO, and hosting for businesses that care how their work shows up online.' },
    { name: 'columns', type: 'array', maxRows: 4, fields: [
      { name: 'heading', type: 'text', required: true },
      { name: 'links', type: 'array', fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
      ] },
    ] },
    { name: 'social', type: 'array', fields: [
      { name: 'platform', type: 'select', required: true, options: [
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'GitHub', value: 'github' },
        { label: 'X (Twitter)', value: 'x' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'Dribbble', value: 'dribbble' },
        { label: 'Mastodon', value: 'mastodon' },
        { label: 'Email', value: 'email' },
      ] },
      { name: 'href', type: 'text', required: true },
    ] },
    { name: 'copyright', type: 'text', defaultValue: '\u00a9 Black Hart Consulting LLC' },
  ],
}
