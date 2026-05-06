import type { CollectionConfig } from 'payload'
import { allBlocks } from '../blocks/schema'
import { revalidateContent } from '../lib/cms-revalidate'

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { read: () => true },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'publishedAt', 'updatedAt'],
    description: 'Content pages with drag-and-drop blocks. The home page must have slug "home".',
  },
  versions: { drafts: true },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc }) => {
        // Invalidate cached page queries the moment an editor publishes a
        // change. Without this hook, edits would only show up after the
        // 1-hour data-cache TTL expired (see src/lib/payload-cache.ts).
        // Also revalidates the slug's URL so the rendered HTML refreshes
        // (relevant once page-level revalidate caching is enabled).
        const slug = (doc?.slug as string) ?? null
        const prevSlug = (previousDoc?.slug as string) ?? null
        revalidateContent({ tag: 'pages', paths: ['/'] })
        if (slug) {
          // Home is mapped to '/'; everything else is '/<slug>'.
          const path = slug === 'home' ? '/' : `/${slug}`
          revalidateContent({ tag: 'pages', paths: [path] })
        }
        if (prevSlug && prevSlug !== slug) {
          // Slug rename — also flush the OLD URL so its now-404 state
          // takes effect immediately rather than serving cached HTML
          // from the previous slug.
          const prevPath = prevSlug === 'home' ? '/' : `/${prevSlug}`
          revalidateContent({ tag: 'pages', paths: [prevPath] })
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        const slug = (doc?.slug as string) ?? null
        revalidateContent({ tag: 'pages', paths: ['/'] })
        if (slug) {
          const path = slug === 'home' ? '/' : `/${slug}`
          revalidateContent({ tag: 'pages', paths: [path] })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'URL path (e.g. "home", "about", "services"). Home page = "home".' } },
    { name: 'seo', type: 'group', fields: [
      { name: 'metaTitle', type: 'text', admin: { description: 'Falls back to page title if empty' } },
      { name: 'metaDescription', type: 'textarea' },
      { name: 'ogImage', type: 'upload', relationTo: 'media' as const },
      { name: 'noIndex', type: 'checkbox', defaultValue: false },
    ] },
    {
      name: 'layout',
      type: 'blocks',
      required: true,
      admin: { description: 'Drag to reorder. Click + to add a new section.' },
      blocks: allBlocks,
    },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },
  ],
}
