/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Payload } from 'payload'

// Initial infrastructure inventory (as of 2026-09-26) for the Servers and
// Hosted Projects collections. Called from seedOnInit on every boot, but each
// collection is only seeded when it is EMPTY, so admin edits are never
// overwritten and deleting a row does not bring it back (as long as at least
// one row remains). After the first boot the admin is the source of truth.
//
// No secrets here: access notes name the SSH user only.

type ServerSeed = {
  name: string
  provider: string
  role: string
  status?: string
  ip?: string
  region?: string
  size?: string
  url?: string
  monthlyCost: number
  backups: string
  capacity?: number
  access?: string
  notes?: string
}

type ProjectSeed = {
  name: string
  server: string // server name, resolved to an id at seed time
  kind: string
  status?: string
  countsTowardCapacity?: boolean
  domains: { hostname: string; note?: string }[]
  stack?: string
  container?: string
  serverPath?: string
  repo?: string
  notes?: string
  clientMatch?: string // best-effort link to an existing Client (company/displayName contains)
}

export const SERVER_SEED: ServerSeed[] = [
  {
    name: 'bhc-web',
    provider: 'do-droplet',
    role: 'bhc-production',
    ip: '104.131.82.31',
    region: 'nyc3',
    size: 's-2vcpu-4gb-120gb-intel',
    monthlyCost: 32,
    backups: 'weekly',
    access: 'ssh deploy@104.131.82.31',
    notes: 'Docker compose at /opt/bhc-web (web + postgres + caddy). Push to main auto-deploys via GitHub Action (scripts/deploy.sh).',
  },
  {
    name: 'blackhart-ops',
    provider: 'do-droplet',
    role: 'bhc-ops',
    ip: '165.227.210.216',
    region: 'nyc3',
    size: 's-4vcpu-8gb',
    monthlyCost: 48,
    backups: 'weekly',
    access: 'ssh root@165.227.210.216',
    notes: 'Coolify. Hosts the Hart Pipeline lead-gen app and *.preview.getblackhart.com previews.',
  },
  {
    name: 'bhc-clients',
    provider: 'do-droplet',
    role: 'shared-client-hosting',
    ip: '159.203.90.123',
    region: 'nyc3',
    size: 's-2vcpu-4gb',
    monthlyCost: 24,
    backups: 'daily',
    capacity: 5,
    url: 'https://clients.getblackhart.com',
    access: 'ssh deploy@159.203.90.123',
    notes:
      'Stack at /opt/bhc-clients: Caddy + Postgres 16 + one container per client (scripts/add-client.sh). ' +
      'Clean base snapshot 245391002 (bhc-clients-base-2026-09-13) for bhc-clients-N. Runbook: docs/ops/bhc-clients-droplet.md.',
  },
  {
    name: 'pm-web-01',
    provider: 'do-droplet',
    role: 'standalone-client',
    status: 'retiring',
    ip: '142.93.72.139',
    region: 'nyc3',
    size: 's-2vcpu-2gb-90gb-intel',
    monthlyCost: 24,
    backups: 'daily',
    access: 'ssh deploy@142.93.72.139',
    notes:
      'Legacy Prometheus stack: Caddy + pm2 node www.prometheusminds.com (:4000) + peq-contact (:4100) for prometheuseq.com. ' +
      'Both sites are being migrated to bhc-clients; destroy (after a final snapshot) once DNS is cut over.',
  },
  {
    name: 'prometheus-app',
    provider: 'do-app-platform',
    role: 'standalone-client',
    size: 'basic apps-s-1vcpu-0.5gb',
    monthlyCost: 5,
    backups: 'none',
    url: 'https://prometheus-app-yfqrq.ondigitalocean.app',
    notes: 'Prometheus Ember coach proxy. The URL is hardcoded in the iOS app, so moving it needs an App Store update.',
  },
  {
    name: 'DO Spaces',
    provider: 'do-spaces',
    role: 'bhc-production',
    region: 'nyc3',
    monthlyCost: 5,
    backups: 'none',
    notes: 'Object storage (flat monthly subscription). Media for blackhartconsulting.com via the Payload S3 adapter + CDN.',
  },
]

export const PROJECT_SEED: ProjectSeed[] = [
  {
    name: 'Black Hart Consulting website',
    server: 'bhc-web',
    kind: 'bhc-site',
    countsTowardCapacity: false,
    domains: [
      { hostname: 'blackhartconsulting.com' },
      { hostname: 'www.blackhartconsulting.com' },
      { hostname: 'blackhart.consulting', note: 'redirect' },
    ],
    stack: 'Next 16 + Payload 3 + Postgres',
    container: 'bhc-web',
    serverPath: '/opt/bhc-web',
    repo: 'BHC-SUHAIB/bhc-web',
    notes: 'Also serves password-gated prospect previews at /p/<slug>.',
  },
  {
    name: 'Job Hunt cockpit',
    server: 'bhc-web',
    kind: 'internal-tool',
    countsTowardCapacity: false,
    domains: [{ hostname: 'jobhunt.blackhartconsulting.com' }],
    container: 'bhc-jobhunt',
  },
  {
    name: 'Sorenori',
    server: 'bhc-web',
    kind: 'bhc-site',
    countsTowardCapacity: false,
    domains: [{ hostname: 'sorenori.blackhartconsulting.com' }],
  },
  {
    name: 'Hart Pipeline (lead-gen app)',
    server: 'blackhart-ops',
    kind: 'internal-tool',
    countsTowardCapacity: false,
    domains: [{ hostname: 'getblackhart.com' }, { hostname: '*.preview.getblackhart.com', note: 'previews' }],
    repo: 'hart-pipeline',
    notes: 'Deployed via Coolify.',
  },
  {
    name: 'Grants Within Reach',
    server: 'bhc-clients',
    kind: 'client-site',
    countsTowardCapacity: true,
    domains: [{ hostname: 'grantswithinreach.com' }],
    container: 'bhc-client-grants-within-reach',
    serverPath: '/opt/bhc-clients/clients/grants-within-reach',
    repo: 'BHC-SUHAIB/grantswithinreach',
    clientMatch: 'Grants Within Reach',
  },
  {
    name: 'Prometheus Minds website',
    server: 'bhc-clients',
    kind: 'client-site',
    status: 'migrating',
    countsTowardCapacity: true,
    domains: [{ hostname: 'www.prometheusminds.com' }],
    notes: 'Moving from pm-web-01.',
  },
  {
    name: 'Prometheus EQ website',
    server: 'bhc-clients',
    kind: 'client-site',
    status: 'migrating',
    countsTowardCapacity: true,
    domains: [{ hostname: 'prometheuseq.com' }],
    notes: 'Moving from pm-web-01.',
  },
  {
    name: 'Prometheus Ember coach proxy (iOS app backend)',
    server: 'prometheus-app',
    kind: 'api-backend',
    countsTowardCapacity: false,
    domains: [{ hostname: 'prometheus-app-yfqrq.ondigitalocean.app' }],
    repo: 'BHC-SUHAIB/prometheus-coach-proxy',
  },
]

async function findClientId(payload: Payload, match: string): Promise<string | number | null> {
  try {
    const res = await payload.find({
      collection: 'clients',
      where: { or: [{ company: { like: match } }, { displayName: { like: match } }] },
      limit: 2,
      depth: 0,
      overrideAccess: true,
    })
    // Only link on an unambiguous match.
    return res.totalDocs === 1 ? (res.docs[0].id as string | number) : null
  } catch {
    return null
  }
}

export async function seedHostingInventory(payload: Payload): Promise<void> {
  const serverCount = await payload.count({ collection: 'servers' as any, overrideAccess: true })
  if (serverCount.totalDocs === 0) {
    for (const s of SERVER_SEED) {
      await payload.create({ collection: 'servers' as any, data: { status: 'active', ...s } as any, overrideAccess: true })
    }
    payload.logger.info(`[seed] hosting: created ${SERVER_SEED.length} servers`)
  }

  const projectCount = await payload.count({ collection: 'hosted-projects' as any, overrideAccess: true })
  if (projectCount.totalDocs > 0) return

  const servers = await payload.find({ collection: 'servers' as any, limit: 500, depth: 0, overrideAccess: true })
  const idByName = new Map<string, string | number>()
  for (const d of servers.docs as any[]) idByName.set(d.name, d.id)

  let created = 0
  for (const p of PROJECT_SEED) {
    const serverId = idByName.get(p.server)
    if (serverId == null) {
      payload.logger.warn(`[seed] hosting: server "${p.server}" not found, skipping project "${p.name}"`)
      continue
    }
    const { clientMatch, server: _server, ...rest } = p
    const clientId = clientMatch ? await findClientId(payload, clientMatch) : null
    await payload.create({
      collection: 'hosted-projects' as any,
      data: { status: 'live', ...rest, server: serverId, ...(clientId != null ? { client: clientId } : {}) } as any,
      overrideAccess: true,
    })
    created++
  }
  payload.logger.info(`[seed] hosting: created ${created} hosted projects`)
}
