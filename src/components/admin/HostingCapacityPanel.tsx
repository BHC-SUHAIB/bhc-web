import React from 'react'
import type { Payload } from 'payload'
import { formatUsd, loadHostingMap, type HostingMapData } from '@/lib/hosting-map'
import { Alerts, CapacityMeter, eyebrow } from './HostingMap'

// Dashboard strip (beforeDashboard): shared-droplet capacity + monthly infra
// cost, with a link to the full /admin/hosting view. Server component: the
// dashboard passes `payload` as a server prop, so no API route is needed.

export default async function HostingCapacityPanel({ payload }: { payload: Payload }) {
  let data: HostingMapData
  try {
    data = await loadHostingMap(payload)
  } catch {
    return null // tables missing (fresh DB before schema push) or similar
  }
  const capacityServers = data.groups
    .flatMap((g) => g.servers)
    .filter((s) => s.capacity && s.status !== 'retired')

  return (
    <div
      style={{
        background: 'var(--theme-elevation-50, #fafaf7)',
        border: '1px solid var(--theme-elevation-100, #eee)',
        borderRadius: 10,
        margin: '0 0 18px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '11px 16px',
          borderBottom: '1px solid var(--theme-elevation-100, #eee)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>Hosting</span>
        <span style={{ fontSize: 12, color: 'var(--theme-elevation-600, #7A7466)' }}>
          {data.totals.serverCount} servers · {data.totals.projectCount} projects · {formatUsd(data.totals.baseMonthly)}/mo
          {' · '}
          <a href="/admin/hosting" style={{ color: 'var(--theme-text)', fontWeight: 600 }}>
            Open hosting map
          </a>
        </span>
      </div>
      <div style={{ padding: '12px 16px 4px' }}>
        <Alerts alerts={data.sharedAlerts} />
        {capacityServers.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--theme-elevation-600, #7A7466)', margin: '0 0 10px' }}>
            No shared client droplets yet. <a href="/admin/collections/servers/create">Add a server</a> with a capacity to track slots.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10, margin: '0 0 12px' }}>
            {capacityServers.map((s) => (
              <div key={String(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <a
                  href={`/admin/collections/servers/${s.id}`}
                  style={{ ...eyebrow, color: 'var(--theme-text)', minWidth: 120, textDecoration: 'none' }}
                >
                  {s.name}
                </a>
                {s.capacity ? <CapacityMeter capacity={s.capacity} compact /> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
