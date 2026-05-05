'use client'

import React, { useEffect, useState } from 'react'

// Admin dashboard widget — fetches paid revenue grouped by LP source and
// renders a compact, collapsible KPI strip at the top of the Payload admin
// home. Collapsed state shows the headline totals as a single-line eyebrow;
// expand to see the per-LP breakdown table.

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

const STORAGE_KEY = 'bhc:revenueWidget:expanded'

export default function RevenueByLpDashboard() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === '1') setExpanded(true)
    } catch {}
    fetch('/api/admin/revenue-by-lp', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Load failed (${r.status})`)
        return r.json() as Promise<Resp>
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  if (loading) return null
  if (error) return null
  if (!data || data.rows.length === 0) return null

  return (
    <div
      style={{
        margin: '0 0 16px',
        background: 'var(--theme-elevation-50, #fafaf7)',
        border: '1px solid var(--theme-elevation-100, #eee)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 14px',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          color: 'var(--theme-text)',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 120ms ease',
              fontSize: 11,
              opacity: 0.5,
            }}
          >
            ▶
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55 }}>
            Revenue by LP
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>
            {fmt$(data.totals.netCents)}
          </span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            net · {data.totals.uniqueClients} client{data.totals.uniqueClients === 1 ? '' : 's'} · {data.rows.length} source{data.rows.length === 1 ? '' : 's'}
          </span>
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 12px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.55, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
      )}
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  padding: '6px 6px',
  verticalAlign: 'top',
}
