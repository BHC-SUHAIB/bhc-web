'use client'

import React, { useEffect, useState } from 'react'

type DraftRow = {
  id: string | number
  invoiceNumber: string
  totalCents: number
  clientName: string
  createdAt: string
}
type AtRiskRow = {
  id: string | number
  clientName: string
  delinquentAt?: string | null
}
type LeadRow = {
  id: string | number
  name: string
  email: string
  source?: string | null
  message?: string | null
  createdAt: string
}
type Resp = { drafts: DraftRow[]; atRisk: AtRiskRow[]; leads: LeadRow[] }

const fmt$ = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
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

export default function ActionQueue() {
  const [data, setData] = useState<Resp | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/action-queue', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Load failed (${r.status})`)
        return r.json() as Promise<Resp>
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  if (error || !data) return null
  const totalCount = data.drafts.length + data.atRisk.length + data.leads.length
  if (totalCount === 0) return null

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
          padding: '11px 16px',
          borderBottom: '1px solid var(--theme-elevation-100, #eee)',
        }}
      >
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>
          Today's actions
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--theme-elevation-600, #7A7466)' }}>
          {totalCount} item{totalCount === 1 ? '' : 's'}
        </span>
      </div>

      {data.drafts.length > 0 && (
        <Section label="Drafts to send" count={data.drafts.length} variant="ink">
          {data.drafts.map((d) => (
            <Row
              key={d.id}
              title={`${d.clientName} — ${d.invoiceNumber}`}
              sub={`Drafted ${formatRelative(d.createdAt)}`}
              amount={fmt$(d.totalCents)}
              cta={{ label: 'Open', href: `/admin/collections/invoices/${d.id}` }}
              ctaPrimary
            />
          ))}
        </Section>
      )}

      {data.atRisk.length > 0 && (
        <Section label="At-risk subscriptions" count={data.atRisk.length} variant="warn">
          {data.atRisk.map((r) => (
            <Row
              key={r.id}
              title={r.clientName}
              sub={r.delinquentAt ? `Flagged ${formatRelative(r.delinquentAt)}` : 'Flagged delinquent'}
              cta={{ label: 'Open', href: `/admin/collections/clients/${r.id}` }}
            />
          ))}
        </Section>
      )}

      {data.leads.length > 0 && (
        <Section label="New leads · awaiting reply" count={data.leads.length} variant="brass">
          {data.leads.map((l) => (
            <Row
              key={l.id}
              title={`${l.name} · ${l.email}`}
              sub={l.message ? clip(l.message, 80) : (l.source || 'no message')}
              cta={{ label: 'Open', href: `/admin/collections/contact-submissions/${l.id}` }}
              ctaBrass
            />
          ))}
        </Section>
      )}
    </div>
  )
}

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function Section({
  label,
  count,
  variant,
  children,
}: {
  label: string
  count: number
  variant: 'ink' | 'warn' | 'brass'
  children: React.ReactNode
}) {
  const badgeBg =
    variant === 'warn' ? '#9A4A3A' : variant === 'brass' ? 'var(--bhc-brass, #B08D57)' : 'var(--theme-text)'
  return (
    <div style={{ borderTop: '1px solid var(--theme-elevation-100, #eee)' }}>
      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-600, #7A7466)', fontWeight: 600 }}>
          {label}
        </span>
        <span
          style={{
            background: badgeBg,
            color: variant === 'ink' ? 'var(--theme-bg)' : '#fff',
            fontSize: 10.5,
            fontWeight: 600,
            padding: '1px 7px',
            borderRadius: 8,
            fontFeatureSettings: '"tnum"',
          }}
        >
          {count}
        </span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Row({
  title,
  sub,
  amount,
  cta,
  ctaPrimary,
  ctaBrass,
}: {
  title: string
  sub: string
  amount?: string
  cta: { label: string; href: string }
  ctaPrimary?: boolean
  ctaBrass?: boolean
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: '8px 16px' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--theme-elevation-600, #7A7466)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13, fontWeight: 600, fontFeatureSettings: '"tnum"', minWidth: 60, textAlign: 'right' }}>
        {amount ?? ''}
      </div>
      <a
        href={cta.href}
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 6,
          textDecoration: 'none',
          border: '1px solid',
          ...(ctaPrimary
            ? { background: 'var(--theme-text)', color: 'var(--theme-bg)', borderColor: 'var(--theme-text)' }
            : ctaBrass
              ? { background: 'transparent', color: 'var(--bhc-brass-dark, #8E6E3F)', borderColor: 'var(--bhc-brass, #B08D57)' }
              : { background: 'transparent', color: 'var(--theme-text)', borderColor: 'var(--theme-text)' }),
        }}
      >
        {cta.label}
      </a>
    </div>
  )
}
