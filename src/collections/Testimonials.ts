import type { CollectionConfig } from 'payload'

// Testimonials collection. Schema is intentionally identical to what
// already exists in production — every previous attempt to change the
// `quote` column type or `rating` field type triggered Drizzle's
// interactive schema-push prompt, which hangs the no-TTY container in
// Docker. v7 keeps every column shape stable and only customises
// admin presentation (rating gets an interactive star widget) and
// public render (carousel + paragraph splitting in the block).
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  access: { read: () => true },
  admin: {
    group: 'Library',
    useAsTitle: 'author',
    defaultColumns: ['author', 'company', 'role', 'rating', 'featured', 'sortOrder', 'updatedAt'],
    description: 'Client quotes shown by the Testimonials block on any page.',
  },
  fields: [
    // Rating sits first so admins are prompted for it before writing
    // the quote. Same `select` field type and same options the prod
    // schema already has — the dropdown is replaced by an interactive
    // star widget purely on the client.
    { name: 'rating', type: 'select', admin: {
      description: 'Optional 1–5 star rating, in half-star steps. Click to set, hover to preview, × to clear.',
      components: { Field: '/components/admin/RatingField#default' },
    }, options: [
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
    // Quote remains a plain textarea — multi-paragraph reviews work
    // because admins can press Enter twice between paragraphs and the
    // public render splits the string on blank lines into <p> blocks.
    //
    // 400-character cap keeps every quote inside the carousel's fixed
    // height (TestimonialsCarousel renders at h-[420px]). Going over
    // makes the slide grow vertically and pushes the surrounding page
    // content around as the carousel rotates.
    { name: 'quote', type: 'textarea', required: true, maxLength: 400, admin: {
      description: 'Up to 400 characters. Press Enter twice between paragraphs. Both blank-line breaks and single line breaks are preserved on the public site. Anything past 400 chars makes the carousel grow taller than its fixed slot.',
      rows: 8,
    } },
    { name: 'author', type: 'text', required: true, admin: { description: 'Person being quoted (e.g. "Grace R.")' } },
    { type: 'row', fields: [
      { name: 'role', type: 'text', admin: { width: '50%', description: 'e.g. "Head of Marketing"' } },
      { name: 'company', type: 'text', admin: { width: '50%', description: 'e.g. "Northlake Consulting"' } },
    ] },
    { name: 'featured', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar', description: 'Include in Testimonials blocks set to "Auto (latest featured)".' } },
    { name: 'sortOrder', type: 'number', admin: { position: 'sidebar', description: 'Lower numbers appear first. Ties fall back to most recently updated.' } },
  ],
}
