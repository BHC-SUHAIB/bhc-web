import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  admin: { group: 'Library' },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*', 'video/*'],
    // Cap the ORIGINAL upload at 2400px wide. Sharp resizes during upload
    // (preserving aspect ratio + format). `withoutEnlargement` means images
    // smaller than 2400px aren't upscaled. Source files like the homepage
    // hero PNGs were uploaded at 4000px+ and 1MB+, which made every
    // first-hit Next.js image transform slow. Caps storage too.
    resizeOptions: { width: 2400, withoutEnlargement: true, fit: 'inside' },
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
