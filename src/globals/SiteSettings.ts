import type { GlobalConfig } from 'payload'
import { revalidateContent } from '../lib/cms-revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  access: { read: () => true },
  admin: { group: 'Site', description: 'Global site title, description, favicon, OG image' },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        revalidateContent({ tag: 'globalSiteSettings' })
        revalidateContent({ tag: 'globals' })
        return doc
      },
    ],
  },
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

    // Founding-cohort counter — surfaced inside the FoundingClient banner on
    // every page that renders it (homepage + 5 LPs). Living on the global
    // means decrementing when a new client signs is a single edit here in
    // the admin instead of touching the seed file or the block on each page.
    {
      name: 'foundingSpotsTotal',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 99,
      admin: { description: 'Total founding-client spots in the cohort (denominator in the "X of Y remaining" pill).' },
    },
    {
      name: 'foundingSpotsRemaining',
      type: 'number',
      defaultValue: 5,
      min: 0,
      max: 99,
      admin: { description: 'Spots remaining in the founding cohort. Decrement by 1 each time a founding client signs. Drives the live counter on the homepage and every LP.' },
    },

    // Timezone for invoice / subscription date display in the admin dashboard
    // and branded emails. Doesn't affect storage (always UTC ISO strings) —
    // only the human-readable presentation. Default is America/Chicago since
    // BHC is based in Houston.
    {
      name: 'displayTimezone',
      type: 'select',
      defaultValue: 'America/Chicago',
      options: [
        { label: 'America/Chicago (Houston, CT)', value: 'America/Chicago' },
        { label: 'America/New_York (ET)', value: 'America/New_York' },
        { label: 'America/Denver (MT)', value: 'America/Denver' },
        { label: 'America/Los_Angeles (PT)', value: 'America/Los_Angeles' },
        { label: 'America/Phoenix (AZ, no DST)', value: 'America/Phoenix' },
        { label: 'UTC', value: 'UTC' },
      ],
      admin: { description: 'Timezone used for displaying dates in the admin dashboard + branded emails.' },
    },

    // Local SEO / NAP. Drives the sitewide LocalBusiness (ProfessionalService)
    // JSON-LD built in src/lib/schema.ts. Keep these identical to the Google
    // Business Profile so Google reads one consistent NAP everywhere.
    {
      type: 'group',
      name: 'localSeo',
      label: 'Local SEO / NAP',
      admin: { description: 'Name, address, geo, hours, and social profiles used to build LocalBusiness structured data for the Google Local Pack. Keep identical to your Google Business Profile.' },
      fields: [
        { name: 'streetAddress', type: 'text', admin: { description: 'Street address. Leave blank if you operate as a service-area business with no public storefront.' } },
        { name: 'addressLocality', type: 'text', defaultValue: 'Houston' },
        { name: 'addressRegion', type: 'text', defaultValue: 'TX' },
        { name: 'postalCode', type: 'text', admin: { description: 'ZIP code. Leave blank if no public address is published.' } },
        { name: 'addressCountry', type: 'text', defaultValue: 'US' },
        { name: 'latitude', type: 'number', defaultValue: 29.7989, admin: { description: 'Service-area center latitude. Default is the Houston Heights centroid.' } },
        { name: 'longitude', type: 'number', defaultValue: -95.3989, admin: { description: 'Service-area center longitude. Default is the Houston Heights centroid.' } },
        { name: 'serviceRadiusMiles', type: 'number', defaultValue: 25, admin: { description: 'Service radius in miles, used for the GeoCircle areaServed.' } },
        { name: 'openingHours', type: 'text', defaultValue: 'Mo-Fr 09:00-18:00', admin: { description: 'Schema.org openingHours string, e.g. "Mo-Fr 09:00-18:00".' } },
        {
          name: 'sameAs',
          type: 'array',
          label: 'Social / profile links (sameAs)',
          admin: { description: 'Full https URLs for Google Business Profile, Clutch, LinkedIn, Instagram, etc. Feeds schema.org sameAs. Add these once they exist.' },
          fields: [{ name: 'url', type: 'text' }],
        },
      ],
    },
  ],
}
