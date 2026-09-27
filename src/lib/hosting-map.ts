/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Payload } from 'payload'

// Shared vocabulary + data loader for the "Hosting map" admin view and the
// dashboard capacity panel. The option lists live here (not in the
// collection files) so the admin components and the collections agree on
// labels without importing collection configs into React.

export const SERVER_PROVIDER_OPTIONS = [
  { label: 'DigitalOcean Droplet', value: 'do-droplet' },
  { label: 'DO App Platform', value: 'do-app-platform' },
  { label: 'DO Spaces', value: 'do-spaces' },
  { label: 'Other', value: 'other' },
] as const

// Order here is the order groups render in the hosting map.
export const SERVER_ROLE_OPTIONS = [
  { label: 'Shared client hosting', value: 'shared-client-hosting' },
  { label: 'BHC production', value: 'bhc-production' },
  { label: 'BHC ops / internal', value: 'bhc-ops' },
  { label: 'Standalone client', value: 'standalone-client' },
  { label: 'Other', value: 'other' },
] as const

export const SERVER_BACKUP_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Daily', value: 'daily' },
] as const

export const SERVER_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Retiring', value: 'retiring' },
  { label: 'Retired', value: 'retired' },
] as const

export const PROJECT_KIND_OPTIONS = [
  { label: 'Client site', value: 'client-site' },
  { label: 'BHC site / app', value: 'bhc-site' },
  { label: 'Internal tool', value: 'internal-tool' },
  { label: 'API / backend', value: 'api-backend' },
] as const

export const PROJECT_STATUS_OPTIONS = [
  { label: 'Live', value: 'live' },
  { label: 'Migrating', value: 'migrating' },
  { label: 'Retired', value: 'retired' },
] as const

// DigitalOcean droplet backup pricing, as a share of the droplet's base
// price. Used only for the "est. backups" line in the totals, never stored.
export const BACKUP_COST_RATE: Record<string, number> = { none: 0, weekly: 0.2, daily: 0.3 }

export const SHARED_DROPLET_PREFIX = 'bhc-clients'

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in hosting-map.test.ts)
// ---------------------------------------------------------------------------

export type CapacityLevel = 'ok' | 'nearly-full' | 'full'

export type CapacityStatus = {
  used: number
  capacity: number
  remaining: number
  level: CapacityLevel
}

/** A slot is "nearly full" when one or fewer remain, or 80%+ is used. */
export function capacityStatus(used: number, capacity: number): CapacityStatus {
  const remaining = Math.max(capacity - used, 0)
  let level: CapacityLevel = 'ok'
  if (used >= capacity) level = 'full'
  else if (remaining <= 1 || used / capacity >= 0.8) level = 'nearly-full'
  return { used, capacity, remaining, level }
}

/**
 * Next free shared-droplet name. `bhc-clients` counts as #1, so with only
 * `bhc-clients` in the table this returns `bhc-clients-2`.
 */
export function nextSharedDropletName(existingNames: string[]): string {
  let max = 0
  const re = new RegExp(`^${SHARED_DROPLET_PREFIX}(?:-(\\d+))?$`)
  for (const name of existingNames) {
    const m = re.exec(name.trim())
    if (!m) continue
    const n = m[1] ? Number(m[1]) : 1
    if (n > max) max = n
  }
  return max === 0 ? SHARED_DROPLET_PREFIX : `${SHARED_DROPLET_PREFIX}-${max + 1}`
}

type ProjectLike = { kind?: string | null; countsTowardCapacity?: boolean | null; status?: string | null }

/** Only live/migrating client sites that have not opted out take a slot. */
export function takesCapacitySlot(p: ProjectLike): boolean {
  return p.kind === 'client-site' && p.countsTowardCapacity !== false && p.status !== 'retired'
}

export function labelFor(options: readonly { label: string; value: string }[], value?: string | null): string {
  if (!value) return ''
  return options.find((o) => o.value === value)?.label ?? value
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export type HostingProject = {
  id: string | number
  name: string
  kind: string
  status: string
  domains: { hostname: string; note?: string | null }[]
  countsTowardCapacity: boolean
  stack?: string | null
  container?: string | null
  serverPath?: string | null
  repo?: string | null
  clientName?: string | null
  clientId?: string | number | null
}

export type HostingServer = {
  id: string | number
  name: string
  provider: string
  role: string
  status: string
  ip?: string | null
  region?: string | null
  size?: string | null
  url?: string | null
  monthlyCost: number
  backups: string
  access?: string | null
  notes?: string | null
  capacity: CapacityStatus | null
  projects: HostingProject[]
}

export type HostingMapData = {
  groups: { role: string; label: string; servers: HostingServer[] }[]
  totals: { baseMonthly: number; backupsMonthlyEst: number; serverCount: number; projectCount: number }
  sharedAlerts: { serverId: string | number; serverName: string; level: CapacityLevel; message: string }[]
  nextSharedName: string
  unassignedProjects: HostingProject[]
}

export async function loadHostingMap(payload: Payload): Promise<HostingMapData> {
  const [serversRes, projectsRes] = await Promise.all([
    payload.find({ collection: 'servers' as any, limit: 500, depth: 0, sort: 'name', overrideAccess: true }),
    payload.find({ collection: 'hosted-projects' as any, limit: 1000, depth: 1, sort: 'name', overrideAccess: true }),
  ])

  const servers = serversRes.docs as any[]
  const projects = projectsRes.docs as any[]

  const byServer = new Map<string, HostingProject[]>()
  const unassignedProjects: HostingProject[] = []
  for (const p of projects) {
    const serverId = p.server && typeof p.server === 'object' ? p.server.id : p.server
    const client = p.client && typeof p.client === 'object' ? p.client : null
    const row: HostingProject = {
      id: p.id,
      name: p.name,
      kind: p.kind,
      status: p.status || 'live',
      domains: Array.isArray(p.domains) ? p.domains.filter((d: any) => d?.hostname) : [],
      countsTowardCapacity: takesCapacitySlot(p),
      stack: p.stack,
      container: p.container,
      serverPath: p.serverPath,
      repo: p.repo,
      clientName: client ? client.displayName || client.company || client.email : null,
      clientId: client ? client.id : (p.client ?? null),
    }
    if (serverId == null) {
      unassignedProjects.push(row)
      continue
    }
    const key = String(serverId)
    if (!byServer.has(key)) byServer.set(key, [])
    byServer.get(key)!.push(row)
  }

  const nextSharedName = nextSharedDropletName(servers.map((s) => s.name || ''))
  const sharedAlerts: HostingMapData['sharedAlerts'] = []
  let baseMonthly = 0
  let backupsMonthlyEst = 0

  const hostingServers: HostingServer[] = servers.map((s) => {
    const projs = byServer.get(String(s.id)) ?? []
    const cost = typeof s.monthlyCost === 'number' ? s.monthlyCost : 0
    const status = s.status || 'active'
    if (status !== 'retired') {
      baseMonthly += cost
      backupsMonthlyEst += cost * (BACKUP_COST_RATE[s.backups || 'none'] ?? 0)
    }
    const hasCapacity = typeof s.capacity === 'number' && s.capacity > 0
    const capacity = hasCapacity ? capacityStatus(projs.filter((p) => p.countsTowardCapacity).length, s.capacity) : null
    return {
      id: s.id,
      name: s.name,
      provider: s.provider,
      role: s.role || 'other',
      status,
      ip: s.ip,
      region: s.region,
      size: s.size,
      url: s.url,
      monthlyCost: cost,
      backups: s.backups || 'none',
      access: s.access,
      notes: s.notes,
      capacity,
      projects: projs,
    }
  })

  // Capacity alerts. "Provision the next droplet" is only the advice when no
  // active droplet with a capacity still has room; otherwise new clients go on
  // the one that does.
  const roomElsewhere = (self: HostingServer) =>
    hostingServers.find((s) => s !== self && s.status === 'active' && s.capacity && s.capacity.level !== 'full')
  for (const s of hostingServers) {
    const c = s.capacity
    if (!c || s.status !== 'active' || c.level === 'ok') continue
    const withRoom = roomElsewhere(s)
    const ratio = `${c.used} / ${c.capacity}`
    let message: string
    if (c.level === 'full') {
      message = withRoom
        ? `${s.name} is full (${ratio}). New clients go on ${withRoom.name}.`
        : `${s.name} is full (${ratio}). Provision ${nextSharedName} from the bhc-clients snapshot before the next client.`
    } else {
      const slots = `${c.remaining} slot${c.remaining === 1 ? '' : 's'} left`
      message = withRoom
        ? `${s.name} is nearly full (${ratio}, ${slots}). ${withRoom.name} still has room.`
        : `${s.name} is nearly full (${ratio}, ${slots}). Plan ${nextSharedName}.`
    }
    sharedAlerts.push({ serverId: s.id, serverName: s.name, level: c.level, message })
  }

  const roleOrder = SERVER_ROLE_OPTIONS.map((o) => o.value as string)
  const groups = SERVER_ROLE_OPTIONS.map((o) => ({
    role: o.value as string,
    label: o.label as string,
    servers: hostingServers
      .filter((s) => (roleOrder.includes(s.role) ? s.role : 'other') === o.value)
      .sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name, undefined, { numeric: true })),
  })).filter((g) => g.servers.length > 0)

  return {
    groups,
    totals: {
      baseMonthly,
      backupsMonthlyEst: Math.round(backupsMonthlyEst * 100) / 100,
      serverCount: hostingServers.filter((s) => s.status !== 'retired').length,
      projectCount: projects.filter((p) => p.status !== 'retired').length,
    },
    sharedAlerts,
    nextSharedName,
    unassignedProjects,
  }
}

function statusRank(status: string): number {
  return status === 'active' ? 0 : status === 'retiring' ? 1 : 2
}

export function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 === 0 ? 0 : 2 })
}

/** Wildcards and non-hostnames render as plain text; everything else links. */
export function domainHref(hostname: string): string | null {
  const h = hostname.trim()
  if (!h || h.includes('*') || h.includes(' ')) return null
  if (/^https?:\/\//i.test(h)) return h
  return `https://${h}`
}
