'use client'

import React, { useEffect, useState } from 'react'

type Row = {
  id: string | number
  action: string
  actor: string
  summary: string
  subjectType?: string | null
  subjectId?: string | null
  createdAt: string
}

type Resp = { rows: Row[] }

// Color-codes by action category. Forest = money-in, rose = failure/refund,
// brass = operator action, lichen = system/automated.
const dotColor = (action: string): string => {
  if (action === 'invoice.paid' || action === 'subscription.created') return 'var(--theme-success-500, #2F4A35)'
  if (action.includes('failed') || action.includes('refund')) return '#9A4A3A'
  if (action.startsWith('invoice.email_sent') || action.startsWith('care_plan.') || action === 'client.created') return 'var(--bhc-brass, #B08D57)'
  return '#8A9A7B'
}

const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const subjectHref = (row: Row): string | null => {
  if (!row.subjectType || !row.subjectId) return null
  const map: Record<string, string> = {
    invoice: 'invoices',
    subscription: 'subscriptions',
    client: 'clients',
  }
  const slug = map[row.subjectType]
  return slug ? `/admin/collections/${slug}/${row.subjectId}` : null
}

export default function RecentActivityPanel() {
  const [data, setData] = useState<Resp | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/recent-activity?limit=6', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Load failed (${r.status})`)
        return r.json() as Promise<Resp>
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  if (error || !data || data.rows.length === 0) return null

  return (
    <div
      style={{
        background: 'var(--theme-elevation-50, #fafaf7)',
        border: '1px solid var(--theme-elevation-100, #eee)',
        borderRadius: 10,
        margin: '0 0 16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '11px 16px',
          borderBottom: '1px solid var(--theme-elevation-100, #eee)',
        }}
      >
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>
          Recent activity
        </span>
        <a
          href="/admin/collections/audit-events"
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--bhc-brass-dark, #8E6E3F)',
            textDecoration: 'none',
          }}
        >
          All audit events →
        </a>
      </div>

      <div>
        {data.rows.map((row) => {
          const href = subjectHref(row)
          const inner = (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'flex-start', gap: 10, padding: '9px 16px' }}>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: dotColor(row.action),
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600 }}>{row.actor}</span> {row.summary}
              </div>
              <span style={{ fontSize: 11, color: 'var(--theme-elevation-600, #7A7466)', whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"' }}>
                {formatRelative(row.createdAt)}
              </span>
            </div>
          )
          return href ? (
            <a
              key={row.id}
              href={href}
              style={{ display: 'block', color: 'inherit', textDecoration: 'none', borderTop: '1px solid var(--theme-elevation-100, #eee)' }}
            >
              {inner}
            </a>
          ) : (
            <div key={row.id} style={{ borderTop: '1px solid var(--theme-elevation-100, #eee)' }}>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
