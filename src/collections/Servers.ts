import type { CollectionConfig } from 'payload'
import {
  SERVER_BACKUP_OPTIONS,
  SERVER_PROVIDER_OPTIONS,
  SERVER_ROLE_OPTIONS,
  SERVER_STATUS_OPTIONS,
} from '@/lib/hosting-map'

// Infrastructure inventory: one row per droplet / App Platform app / Spaces
// bucket that costs money or hosts something. The "Hosting map" admin view
// (/admin/hosting) renders these with their Hosted Projects, the capacity
// meter for shared client droplets, and the monthly total.
//
// Shared client droplets are named bhc-clients, bhc-clients-2, ... and hold
// up to `capacity` client sites (5 today). See docs/ops/hosting-inventory.md.

const NO_SECRETS = 'Never put passwords, tokens, API keys, or private keys here. Reference where they live instead (e.g. ".env on the box", "1Password").'

export const Servers: CollectionConfig = {
  slug: 'servers',
  labels: { singular: 'Server', plural: 'Servers' },
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    group: 'Infrastructure',
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'provider', 'ip', 'monthlyCost', 'capacity', 'status'],
    description:
      'Every droplet, App Platform app, and Spaces bucket. See the full picture at /admin/hosting. Do not store secrets here.',
    listSearchableFields: ['name', 'ip', 'notes'],
  },
  defaultSort: 'name',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          unique: true,
          admin: { width: '50%', description: 'The provider-side name, e.g. bhc-clients, bhc-clients-2, bhc-web.' },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'active',
          options: [...SERVER_STATUS_OPTIONS],
          admin: { width: '25%' },
        },
        {
          name: 'capacity',
          type: 'number',
          min: 1,
          admin: {
            width: '25%',
            description: 'Max client sites. Set 5 on shared bhc-clients droplets; leave empty otherwise.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'provider', type: 'select', required: true, defaultValue: 'do-droplet', options: [...SERVER_PROVIDER_OPTIONS], admin: { width: '50%' } },
        { name: 'role', type: 'select', required: true, defaultValue: 'shared-client-hosting', options: [...SERVER_ROLE_OPTIONS], admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'ip', type: 'text', label: 'IP address', admin: { width: '33%' } },
        { name: 'region', type: 'text', admin: { width: '33%', placeholder: 'nyc3' } },
        { name: 'size', type: 'text', label: 'Size / plan', admin: { width: '34%', placeholder: 's-2vcpu-4gb' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'monthlyCost',
          type: 'number',
          label: 'Monthly cost (USD)',
          min: 0,
          admin: { width: '33%', description: 'Base price, before backups.' },
        },
        { name: 'backups', type: 'select', defaultValue: 'none', options: [...SERVER_BACKUP_OPTIONS], admin: { width: '33%' } },
        {
          name: 'url',
          type: 'text',
          label: 'URL',
          admin: { width: '34%', description: 'Default URL for App Platform apps or a health check, if any.' },
        },
      ],
    },
    {
      name: 'access',
      type: 'text',
      label: 'Access (SSH user / how to get in)',
      admin: { description: `e.g. "ssh deploy@159.203.90.123". ${NO_SECRETS}` },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: `Stack, paths, snapshots, quirks. ${NO_SECRETS}` },
    },
  ],
}
