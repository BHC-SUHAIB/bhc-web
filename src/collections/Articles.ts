import type { CollectionConfig } from 'payload'
import { revalidateContent } from '../lib/cms-revalidate'

export const Articles: CollectionConfig = {
  slug: 'articles',
  access: { read: () => true },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'author', 'publishedAt', 'featured'],
    description: 'Long-form writing — essays, field notes, deep dives.',
  },
  versions: { drafts: true },
  hooks: {
    beforeChange: [
      // A published article must always carry a publish date: the listing
      // sorts on it, cards display it, and structured data needs it. It went
      // missing once (2026-09: an article published by hand with the field
      // left blank shipped dateless), so stamp it on first publish and never
      // overwrite a date a human set.
      async ({ data }) => {
        if (data?._status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc }) => {
        const slug = (doc?.slug as string) ?? null
        const prevSlug = (previousDoc?.slug as string) ?? null
        revalidateContent({ tag: 'articles', paths: ['/articles'] })
        revalidateContent({ tag: 'articles', slug, slugPathPrefix: '/articles' })
        if (prevSlug && prevSlug !== slug) {
          revalidateContent({ tag: 'articles', slug: prevSlug, slugPathPrefix: '/articles' })
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        const slug = (doc?.slug as string) ?? null
        revalidateContent({ tag: 'articles', paths: ['/articles'] })
        revalidateContent({ tag: 'articles', slug, slugPathPrefix: '/articles' })
        return doc
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'URL path (e.g. "why-nextjs-over-wordpress")' } },
    { name: 'excerpt', type: 'textarea', required: true, admin: { description: 'Short 1-2 line teaser shown on cards and the articles listing' } },
    { name: 'heroImage', type: 'upload', relationTo: 'media' as const, admin: { description: 'Upload from Media library. Recommended 2400\u00d71350 (16:9).' } },

    { type: 'row', fields: [
      { name: 'author', type: 'text', admin: { width: '50%', description: 'Byline (e.g. "Suhaib Chaudhry")' } },
      { name: 'readTime', type: 'number', admin: { width: '25%', description: 'Minutes' } },
      { name: 'category', type: 'select', admin: { width: '25%' }, options: [
        { label: 'Strategy', value: 'strategy' },
        { label: 'Engineering', value: 'engineering' },
        { label: 'SEO', value: 'seo' },
        { label: 'Design', value: 'design' },
        { label: 'Hosting', value: 'hosting' },
        { label: 'Performance', value: 'performance' },
      ] },
    ] },

    { name: 'tags', type: 'array', admin: { description: 'Optional keyword tags' }, fields: [
      { name: 'label', type: 'text', required: true },
    ] },

    { name: 'content', type: 'richText', required: true, admin: { description: 'The article body.' } },

    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Show prominently on the articles page.' } },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },
  ],
}
