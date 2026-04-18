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
    // Shared contact info — surfaced in header, footer, and contact page.
    // Edit here once; changes propagate everywhere the site renders it.
    { name: 'contactEmail', type: 'email', defaultValue: 'hello@blackhartconsulting.com', admin: { description: 'Public contact address shown on the site.' } },
    { name: 'contactPhone', type: 'text', defaultValue: '(866) 434-9777', admin: { description: 'Public phone number in display format. tel: link is derived automatically.' } },
  ],
}
