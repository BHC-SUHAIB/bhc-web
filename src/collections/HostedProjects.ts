import type { CollectionConfig } from 'payload'
import { PROJECT_KIND_OPTIONS, PROJECT_STATUS_OPTIONS } from '@/lib/hosting-map'

// One row per site/app/backend and the Server it runs on. Client sites on a
// shared bhc-clients droplet count toward that droplet's capacity (see
// takesCapacitySlot in src/lib/hosting-map.ts). When you add a client to a
// bhc-clients droplet, add a row here. See docs/ops/hosting-inventory.md.

const NO_SECRETS = 'Never put passwords, tokens, or keys here.'

export const HostedProjects: CollectionConfig = {
  slug: 'hosted-projects',
  labels: { singular: 'Hosted project', plural: 'Hosted projects' },
  access: {
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    group: 'Infrastructure',
    useAsTitle: 'name',
    defaultColumns: ['name', 'server', 'kind', 'status', 'countsTowardCapacity'],
    description: 'Sites, apps, and backends, and the server each one runs on. See the full picture at /admin/hosting.',
    listSearchableFields: ['name', 'container', 'repo', 'notes'],
  },
  defaultSort: 'name',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'kind', type: 'select', required: true, defaultValue: 'client-site', options: [...PROJECT_KIND_OPTIONS], admin: { width: '25%' } },
        { name: 'status', type: 'select', required: true, defaultValue: 'live', options: [...PROJECT_STATUS_OPTIONS], admin: { width: '25%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'server',
          type: 'relationship',
          relationTo: 'servers',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'client',
          type: 'relationship',
          relationTo: 'clients',
          admin: { width: '50%', description: 'Optional. The billing Client this site belongs to.' },
        },
      ],
    },
    {
      name: 'countsTowardCapacity',
      type: 'checkbox',
      label: 'Counts toward server capacity',
      defaultValue: true,
      admin: {
        // Only client sites take a slot on a shared droplet; the checkbox is
        // an escape hatch for e.g. a parked/redirect-only client domain.
        condition: (data) => data?.kind === 'client-site',
        description: 'Uses one of the shared droplet\'s client slots. Only client sites count; uncheck for a parked or redirect-only site.',
      },
    },
    {
      name: 'domains',
      type: 'array',
      labels: { singular: 'Domain', plural: 'Domains' },
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'hostname', type: 'text', required: true, admin: { width: '60%', placeholder: 'www.example.com' } },
            { name: 'note', type: 'text', admin: { width: '40%', placeholder: 'e.g. redirect, preview' } },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'stack', type: 'text', admin: { width: '50%', placeholder: 'Next 16 + Payload 3 + Postgres' } },
        { name: 'repo', type: 'text', admin: { width: '50%', placeholder: 'BHC-SUHAIB/example' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'container', type: 'text', label: 'Container / service name', admin: { width: '50%' } },
        { name: 'serverPath', type: 'text', label: 'Path on server', admin: { width: '50%', placeholder: '/opt/bhc-clients/clients/<slug>' } },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: NO_SECRETS },
    },
  ],
}
