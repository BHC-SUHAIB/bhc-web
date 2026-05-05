'use client'

import React, { useEffect, useState } from 'react'

// Admin dashboard widget — fetches paid revenue grouped by LP source and
// renders a compact table at the top of the Payload admin home. Lets the
// operator see at-a-glance which LPs are producing real dollars without
// leaving the admin UI.

type Row = {
  sourceLp: string
  label: string
  clientCount: number
  paidCents: number
  refundedCents: number
  netCents: number
}

type Resp = {
  rows: Row[]
  totals: {
    paidCents: number
    refundedCents: number
    netCents: number
    uniqueClients: number
  }
}

const fmt$ = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function RevenueByLpDashboard() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/revenue-by-lp', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Load failed (${r.status})`)
        return r.json() as Promise<Resp>
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null // hide while loading; widget shouldn't disrupt the dashboard
  if (error) return null
  if (!data || data.rows.length === 0) return null

  return (
    <div
      style={{
        margin: '0 0 24px',
        padding: 20,
        background: 'var(--theme-elevation-50, #fafaf7)',
        border: '1px solid var(--theme-elevation-100, #eee)',
        borderRadius: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, gap: 12 }}>
        <h3
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            margin: 0,
            color: 'var(--theme-text)',
          }}
        >
          Revenue by LP source
        </h3>
        <div style={{ fontSize: 13, opacity: 0.7, fontFamily: 'var(--font-mono, monospace)' }}>
          {fmt$(data.totals.netCents)} net &middot; {data.totals.uniqueClients} client{data.totals.uniqueClients === 1 ? '' : 's'}
        </div>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
      >
        <thead>
          <tr style={{ textAlign: 'left', opacity: 0.6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <th style={cellStyle}>Source</th>
            <th style={{ ...cellStyle, textAlign: 'right' }}>Clients</th>
            <th style={{ ...cellStyle, textAlign: 'right' }}>Gross</th>
            <th style={{ ...cellStyle, textAlign: 'right' }}>Refunded</th>
            <th style={{ ...cellStyle, textAlign: 'right' }}>Net</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.sourceLp} style={{ borderTop: '1px solid var(--theme-elevation-100, #eee)' }}>
              <td style={cellStyle}>
                <span title={r.sourceLp !== '(no source)' ? r.sourceLp : undefined}>{r.label}</span>
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {r.clientCount}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {fmt$(r.paidCents)}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: r.refundedCents > 0 ? 1 : 0.4 }}>
                {r.refundedCents > 0 ? `−${fmt$(r.refundedCents)}` : '—'}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {fmt$(r.netCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  padding: '8px 6px',
  verticalAlign: 'top',
}
