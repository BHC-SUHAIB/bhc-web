import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*', 'video/*'],
    imageSizes: [
      { name: 'thumb', width: 320 },
      { name: 'card',  width: 768 },
      { name: 'hero',  width: 1600 },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, admin: { description: 'Describe the image for accessibility & SEO' } },
    { name: 'caption', type: 'text' },
    { name: 'credit', type: 'text', admin: { description: 'Photographer / source credit (if any)' } },
  ],
}
