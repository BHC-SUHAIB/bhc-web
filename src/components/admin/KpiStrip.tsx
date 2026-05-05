'use client'

import React, { useEffect, useState } from 'react'

type Resp = {
  mtdNetCents: number
  lastMonthNetCents: number
  deltaPct: number | null
  mrrCents: number
  activeSubCount: number
  atRiskCount: number
}

const fmt$ = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function KpiStrip() {
  const [data, setData] = useState<Resp | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/kpi', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Load failed (${r.status})`)
        return r.json() as Promise<Resp>
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  if (error || !data) return null

  const deltaLabel = data.deltaPct == null
    ? null
    : `${data.deltaPct >= 0 ? '▲' : '▼'} ${Math.abs(data.deltaPct)}%`
  const deltaUp = (data.deltaPct ?? 0) >= 0

  return (
    <div className="bhc-kpi">
      <Tile
        label="Net revenue · MTD"
        value={fmt$(data.mtdNetCents)}
        sub={deltaLabel ? <><span style={{ color: deltaUp ? 'var(--theme-success-500, #2F4A35)' : 'var(--theme-error-500, #9A4A3A)', fontWeight: 600 }}>{deltaLabel}</span> vs. last month</> : <>vs. last month: {fmt$(data.lastMonthNetCents)}</>}
      />
      <Tile
        label="Recurring (MRR)"
        value={fmt$(data.mrrCents)}
        sub={<>{data.activeSubCount} active sub{data.activeSubCount === 1 ? '' : 's'}</>}
      />
      <Tile
        label="At risk"
        value={String(data.atRiskCount)}
        alert={data.atRiskCount > 0}
        sub={data.atRiskCount === 0 ? 'all current' : `${data.atRiskCount === 1 ? 'client' : 'clients'} delinquent`}
      />
    </div>
  )
}

function Tile({ label, value, sub, alert }: { label: string; value: string; sub: React.ReactNode; alert?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        background: alert ? '#fbf3ef' : 'var(--theme-elevation-50, #fafaf7)',
        border: '1px solid var(--theme-elevation-100, #eee)',
        borderRadius: 10,
        padding: '14px 16px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--theme-elevation-600, #7A7466)', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif, Georgia, serif)',
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: alert ? '#9A4A3A' : 'var(--theme-text)',
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--theme-elevation-600, #7A7466)', marginTop: 4 }}>
        {sub}
      </div>
    </div>
  )
}
