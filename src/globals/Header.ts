import type { GlobalConfig } from 'payload'

export const Header: GlobalConfig = {
  slug: 'header',
  access: { read: () => true },
  admin: { description: 'Site header / top navigation' },
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
