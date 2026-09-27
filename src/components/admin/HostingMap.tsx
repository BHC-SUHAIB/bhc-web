import React from 'react'
import {
  PROJECT_KIND_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  SERVER_BACKUP_OPTIONS,
  SERVER_PROVIDER_OPTIONS,
  domainHref,
  formatUsd,
  labelFor,
  type CapacityStatus,
  type HostingMapData,
  type HostingProject,
  type HostingServer,
} from '@/lib/hosting-map'

// Presentational pieces for the Hosting map. No hooks, no 'use client':
// rendered from server components (HostingMapView, HostingCapacityPanel)
// with data from loadHostingMap().

const muted = 'var(--theme-elevation-600, #7A7466)'
const border = '1px solid var(--theme-elevation-100, #eee)'
const panelBg = 'var(--theme-elevation-50, #fafaf7)'
const warnInk = '#9A4A3A'
const warnBg = '#fbf3ef'
const brass = 'var(--bhc-brass, #B08D57)'
const brassInk = 'var(--bhc-brass-dark, #8E6E3F)'
const okInk = 'var(--theme-success-500, #2F4A35)'
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export const eyebrow: React.CSSProperties = {
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: muted,
  fontWeight: 600,
}

export function CapacityMeter({ capacity, compact }: { capacity: CapacityStatus; compact?: boolean }) {
  const color = capacity.level === 'full' ? warnInk : capacity.level === 'nearly-full' ? brassInk : okInk
  const cells = Array.from({ length: capacity.capacity }, (_, i) => i < capacity.used)
  const over = Math.max(capacity.used - capacity.capacity, 0)
  const label = capacity.level === 'full' ? 'Full' : capacity.level === 'nearly-full' ? 'Nearly full' : `${capacity.remaining} free`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 3 }} aria-hidden>
        {cells.map((filled, i) => (
          <span
            key={i}
            style={{
              width: compact ? 14 : 20,
              height: compact ? 8 : 10,
              borderRadius: 2,
              background: filled ? color : 'transparent',
              border: `1px solid ${filled ? color : 'var(--theme-elevation-250, #d6cfbd)'}`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: compact ? 12.5 : 13.5, fontWeight: 700, color, fontFeatureSettings: '"tnum"' }}>
        {capacity.used} / {capacity.capacity}
        {over > 0 ? ` (+${over} over)` : ''}
      </span>
      <span style={{ fontSize: 11.5, color, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

export function Alerts({ alerts }: { alerts: HostingMapData['sharedAlerts'] }) {
  if (alerts.length === 0) return null
  return (
    <div style={{ display: 'grid', gap: 8, margin: '0 0 16px' }}>
      {alerts.map((a) => {
        const full = a.level === 'full'
        return (
          <div
            key={String(a.serverId)}
            role="status"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: full ? warnBg : panelBg,
              color: full ? warnInk : brassInk,
              border: `1px solid ${full ? '#e6c9bf' : brass}`,
            }}
          >
            {a.message}
          </div>
        )
      })}
    </div>
  )
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'warn' | 'brass' | 'muted' | 'ok' }) {
  const color = tone === 'warn' ? warnInk : tone === 'brass' ? brassInk : tone === 'ok' ? okInk : muted
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: '1px 7px',
        whiteSpace: 'nowrap',
        opacity: tone === 'muted' ? 0.85 : 1,
      }}
    >
      {children}
    </span>
  )
}

function statusTone(status: string): 'warn' | 'brass' | 'muted' | 'ok' {
  if (status === 'retiring' || status === 'migrating') return 'brass'
  if (status === 'retired') return 'muted'
  return 'ok'
}

function Domains({ domains }: { domains: HostingProject['domains'] }) {
  if (domains.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 4 }}>
      {domains.map((d, i) => {
        const href = domainHref(d.hostname)
        return (
          <span key={`${d.hostname}-${i}`} style={{ fontSize: 12.5 }}>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--theme-text)', textDecorationColor: brass }}>
                {d.hostname}
              </a>
            ) : (
              <span style={{ fontFamily: mono, fontSize: 12 }}>{d.hostname}</span>
            )}
            {d.note ? <span style={{ color: muted }}> ({d.note})</span> : null}
          </span>
        )
      })}
    </div>
  )
}

function ProjectRow({ p }: { p: HostingProject }) {
  const details = [
    p.container ? `container ${p.container}` : null,
    p.serverPath ? p.serverPath : null,
    p.repo ? `repo ${p.repo}` : null,
    p.stack ? p.stack : null,
  ].filter(Boolean) as string[]
  return (
    <li style={{ padding: '10px 0', borderTop: border, listStyle: 'none', opacity: p.status === 'retired' ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <a href={`/admin/collections/hosted-projects/${p.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--theme-text)', textDecoration: 'none' }}>
          {p.name}
        </a>
        <Tag tone="muted">{labelFor(PROJECT_KIND_OPTIONS, p.kind)}</Tag>
        {p.status !== 'live' ? <Tag tone={statusTone(p.status)}>{labelFor(PROJECT_STATUS_OPTIONS, p.status)}</Tag> : null}
        {p.countsTowardCapacity ? <Tag tone="brass">Uses a slot</Tag> : null}
        {p.clientName && p.clientId != null ? (
          <a href={`/admin/collections/clients/${p.clientId}`} style={{ fontSize: 12, color: muted }}>
            Client: {p.clientName}
          </a>
        ) : null}
      </div>
      <Domains domains={p.domains} />
      {details.length > 0 ? (
        <div style={{ fontSize: 11.5, color: muted, marginTop: 4, fontFamily: mono, overflowWrap: 'anywhere' }}>{details.join('  ·  ')}</div>
      ) : null}
    </li>
  )
}

function ServerCard({ s }: { s: HostingServer }) {
  const meta = [
    labelFor(SERVER_PROVIDER_OPTIONS, s.provider),
    s.size,
    s.region,
    s.ip,
  ].filter(Boolean) as string[]
  const backups = s.backups && s.backups !== 'none'
    ? `${labelFor(SERVER_BACKUP_OPTIONS, s.backups).toLowerCase()} backups` : s.provider === 'do-droplet' ? 'no backups' : null
  return (
    <div
      style={{
        background: panelBg,
        border: s.capacity?.level === 'full' && s.status === 'active' ? `1px solid ${warnInk}` : border,
        borderRadius: 10,
        padding: '14px 16px',
        opacity: s.status === 'retired' ? 0.65 : 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={`/admin/collections/servers/${s.id}`}
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 19, fontWeight: 600, color: 'var(--theme-text)', textDecoration: 'none' }}
            >
              {s.name}
            </a>
            {s.status !== 'active' ? <Tag tone={statusTone(s.status)}>{s.status}</Tag> : null}
          </div>
          <div style={{ fontSize: 12.5, color: muted, marginTop: 3, fontFamily: mono, overflowWrap: 'anywhere' }}>{meta.join('  ·  ')}</div>
          {s.url ? (
            <div style={{ fontSize: 12.5, marginTop: 3 }}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--theme-text)', textDecorationColor: brass }}>
                {s.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          ) : null}
        </div>
        <div style={{ textAlign: 'right', marginLeft: 'auto', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 19, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
            {formatUsd(s.monthlyCost)}
            <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>/mo</span>
          </div>
          {backups ? <div style={{ fontSize: 11.5, color: muted }}>{backups}</div> : null}
        </div>
      </div>

      {s.capacity ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ ...eyebrow, marginBottom: 5 }}>Client capacity</div>
          <CapacityMeter capacity={s.capacity} />
        </div>
      ) : null}

      {s.access ? (
        <div style={{ fontSize: 12, marginTop: 10, fontFamily: mono, color: 'var(--theme-text)' }}>{s.access}</div>
      ) : null}
      {s.notes ? <div style={{ fontSize: 12.5, color: muted, marginTop: 6, whiteSpace: 'pre-wrap' }}>{s.notes}</div> : null}

      <ul style={{ margin: '10px 0 0', padding: 0 }}>
        {s.projects.length === 0 ? (
          <li style={{ listStyle: 'none', padding: '10px 0 0', borderTop: border, fontSize: 12.5, color: muted }}>No hosted projects.</li>
        ) : (
          s.projects.map((p) => <ProjectRow key={String(p.id)} p={p} />)
        )}
      </ul>
    </div>
  )
}

export function Totals({ totals }: { totals: HostingMapData['totals'] }) {
  const tiles: { label: string; value: string; sub: string }[] = [
    { label: 'Monthly infrastructure', value: formatUsd(totals.baseMonthly), sub: 'base prices, excl. retired' },
    { label: 'Backups (est.)', value: formatUsd(totals.backupsMonthlyEst), sub: 'DO: weekly 20%, daily 30%' },
    { label: 'All-in (est.)', value: formatUsd(totals.baseMonthly + totals.backupsMonthlyEst), sub: 'per month' },
    { label: 'Footprint', value: `${totals.serverCount} / ${totals.projectCount}`, sub: 'servers / projects' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, margin: '0 0 22px' }}>
      {tiles.map((t) => (
        <div key={t.label} style={{ background: panelBg, border, borderRadius: 10, padding: '12px 14px', minWidth: 0 }}>
          <div style={{ ...eyebrow, marginBottom: 5 }}>{t.label}</div>
          <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>
            {t.value}
          </div>
          <div style={{ fontSize: 11.5, color: muted, marginTop: 3 }}>{t.sub}</div>
        </div>
      ))}
    </div>
  )
}

export function HostingMap({ data }: { data: HostingMapData }) {
  return (
    <div>
      <Alerts alerts={data.sharedAlerts} />
      <Totals totals={data.totals} />
      {data.groups.length === 0 ? (
        <p style={{ color: muted }}>
          No servers yet. <a href="/admin/collections/servers/create">Add the first one</a>.
        </p>
      ) : null}
      {data.groups.map((g) => (
        <section key={g.role} style={{ margin: '0 0 24px' }}>
          <h2 style={{ ...eyebrow, fontSize: 11.5, margin: '0 0 10px', color: 'var(--theme-text)' }}>
            {g.label} <span style={{ color: muted, fontWeight: 500 }}>· {g.servers.length}</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 460px), 1fr))', gap: 12 }}>
            {g.servers.map((s) => (
              <ServerCard key={String(s.id)} s={s} />
            ))}
          </div>
        </section>
      ))}
      {data.unassignedProjects.length > 0 ? (
        <section style={{ margin: '0 0 24px' }}>
          <h2 style={{ ...eyebrow, fontSize: 11.5, margin: '0 0 10px', color: warnInk }}>Projects without a server</h2>
          <ul style={{ margin: 0, padding: 0 }}>
            {data.unassignedProjects.map((p) => (
              <ProjectRow key={String(p.id)} p={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
