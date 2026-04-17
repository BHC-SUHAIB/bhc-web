import type { CollectionConfig } from 'payload'
import { allBlocks } from '../blocks/schema'

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'publishedAt', 'updatedAt'],
    description: 'Content pages with drag-and-drop blocks. The home page must have slug "home".',
  },
  versions: { drafts: true },
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
