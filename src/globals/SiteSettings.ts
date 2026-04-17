import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  access: { read: () => true },
  admin: { description: 'Global site title, description, favicon, OG image' },
  fields: [
    { name: 'siteName', type: 'text', defaultValue: 'Black Hart Consulting' },
    { name: 'tagline', type: 'text', defaultValue: 'Consulting for the web — done right.' },
    { name: 'defaultMetaDescription', type: 'textarea' },
    { name: 'defaultOgImage', type: 'upload', relationTo: 'media' as const },
    { name: 'defaultTheme', type: 'select', defaultValue: 'dark', options: [
      { label: 'Dark (matches brand)', value: 'dark' },
      { label: 'Light', value: 'light' },
      { label: 'Follow system preference', value: 'system' },
    ] },
  ],
}
