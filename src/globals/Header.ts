import type { GlobalConfig } from 'payload'
import { revalidateContent } from '../lib/cms-revalidate'

export const Header: GlobalConfig = {
  slug: 'header',
  access: { read: () => true },
  admin: { group: 'Site', description: 'Site header / top navigation' },
  hooks: {
    // Header renders on every page. A header edit needs to flush the
    // global tag (so getCachedHeader pulls fresh data) AND every cached
    // page render — but since we're not caching HTML at the page level
    // yet, the global tag is enough. The layout calls getCachedHeader
    // and that goes through unstable_cache, so the next request after
    // the tag is invalidated picks up the new value.
    afterChange: [
      async ({ doc }) => {
        revalidateContent({ tag: 'globalHeader' })
        revalidateContent({ tag: 'globals' })
        return doc
      },
    ],
  },
  fields: [
    { name: 'nav', type: 'array', minRows: 0, maxRows: 8, fields: [
      { name: 'label', type: 'text', required: true },
      { name: 'href', type: 'text', required: true },
      { name: 'openInNewTab', type: 'checkbox', defaultValue: false },
    ] },
    { name: 'cta', type: 'group', admin: { description: 'Optional button on the right side of the header' }, fields: [
      { name: 'show', type: 'checkbox', defaultValue: true },
      { name: 'label', type: 'text', defaultValue: 'Start a project' },
      { name: 'href', type: 'text', defaultValue: '/contact' },
    ] },
  ],
}
