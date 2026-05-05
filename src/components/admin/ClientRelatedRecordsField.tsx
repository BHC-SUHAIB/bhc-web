'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'

// Operator dashboard rendered inside the Client document. Lists every
// invoice + subscription that belongs to the client and surfaces inline
// "Send invoice email" buttons next to anything unpaid or still requiring
// the client to enter a payment method.
//
// Data comes from /api/clients/[id]/related (which composes Payload
// queries + Stripe lookups for each subscription's latest unpaid invoice).
// Send actions hit /api/invoices/[id]/send-email (operator-triggered
// branded email).

type Invoice = {
  id: string | number
  invoiceNumber: string
  totalCents: number
  status: string
  paidAt?: string | null
  issuedAt?: string | null
  stripeInvoiceId?: string | null
}

type Subscription = {
  id: string | number
  stripeSubscriptionId: string
  displayLabel: string
  tier: string
  status: string
  monthlyAmountCents: number
  latestUnpaidInvoice: Invoice | null
}

type Related = {
  invoices: Invoice[]
  subscriptions: Subscription[]
}

const fmt$ = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Renders dates in America/Chicago (BHC's home tz). The SiteSettings global
// has a configurable displayTimezone but we don't fetch globals from a
// client-rendered admin field for performance reasons — CT is the right
// answer 95% of the time.
const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

const isInactiveSub = (status: string) =>
  ['past_due', 'unpaid', 'incomplete', 'canceled', 'paused'].includes(status)

export default function ClientRelatedRecordsField(_props: UIFieldClientProps) {
  const { id: clientId } = useDocumentInfo()
  const [data, setData] = useState<Related | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [sendStatus, setSendStatus] = useState<Record<string, { state: 'sending' | 'sent' | 'error'; message?: string }>>({})

  const refresh = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const qs = showArchived ? '?archived=1' : ''
      const r = await fetch(`/api/clients/${clientId}/related${qs}`, { credentials: 'include' })
      if (!r.ok) throw new Error(`Load failed (${r.status}).`)
      setData((await r.json()) as Related)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load related records.')
    } finally {
      setLoading(false)
    }
  }, [clientId, showArchived])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!clientId) {
    return (
      <div className="field-type">
        <label className="field-label">Invoices &amp; subscriptions</label>
        <p style={{ fontSize: 13, opacity: 0.7 }}>Save the client first.</p>
      </div>
    )
  }

  async function sendInvoiceEmail(invoiceId: string | number, key: string) {
    setSendStatus((s) => ({ ...s, [key]: { state: 'sending' } }))
    try {
      const r = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok) throw new Error(json.error ?? `Send failed (${r.status}).`)
      setSendStatus((s) => ({ ...s, [key]: { state: 'sent' } }))
    } catch (err) {
      // (#18) Surface the actual error message to the operator instead of a
      // generic "Failed". Click the cell to retry.
      const message = err instanceof Error ? err.message : 'Send failed.'
      setSendStatus((s) => ({ ...s, [key]: { state: 'error', message } }))
    }
  }

  return (
    <div className="field-type" style={{ marginTop: 12 }}>
      <label className="field-label" style={{ marginBottom: 8 }}>Invoices &amp; subscriptions</label>

      <Section title="Invoices">
        {loading && !data ? (
          <p style={{ fontSize: 13, opacity: 0.7 }}>Loading…</p>
        ) : data && data.invoices.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.7 }}>No invoices yet.</p>
        ) : data ? (
          <Table
            head={['#', 'Issued', 'Total', 'Status', '']}
            rows={data.invoices.map((inv) => {
              const k = `inv-${inv.id}`
              const sent = sendStatus[k]
              const unpaid = inv.status === 'open' || inv.status === 'overdue'
              return [
                <Mono key="num">{inv.invoiceNumber}</Mono>,
                <span key="iss">{fmtDate(inv.issuedAt)}</span>,
                <Mono key="tot">{fmt$(inv.totalCents)}</Mono>,
                <Pill key="st" tone={inv.status === 'paid' ? 'good' : unpaid ? 'warn' : 'mute'}>
                  {inv.status}
                </Pill>,
                unpaid ? (
                  <ActionButton
                    key="act"
                    onClick={() => sendInvoiceEmail(inv.id, k)}
                    state={sent}
                  />
                ) : (
                  <span key="act" style={{ opacity: 0.4, fontSize: 12 }}>—</span>
                ),
              ]
            })}
          />
        ) : null}
      </Section>

      <Section title="Subscriptions">
        {loading && !data ? (
          <p style={{ fontSize: 13, opacity: 0.7 }}>Loading…</p>
        ) : data && data.subscriptions.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.7 }}>No subscriptions yet.</p>
        ) : data ? (
          <Table
            head={['Plan', 'Monthly', 'Status', 'Action']}
            rows={data.subscriptions.map((sub) => {
              const k = `sub-${sub.id}`
              const sent = sendStatus[k]
              const inactive = isInactiveSub(sub.status)
              return [
                <span key="plan">{sub.displayLabel}</span>,
                <Mono key="m">{fmt$(sub.monthlyAmountCents)}/mo</Mono>,
                <Pill key="st" tone={sub.status === 'active' ? 'good' : inactive ? 'warn' : 'mute'}>
                  {sub.status}
                </Pill>,
                sub.latestUnpaidInvoice ? (
                  <ActionButton
                    key="act"
                    label="Send invoice"
                    onClick={() =>
                      sendInvoiceEmail(sub.latestUnpaidInvoice!.id, k)
                    }
                    state={sent}
                  />
                ) : inactive ? (
                  <span key="act" style={{ fontSize: 12, opacity: 0.6 }}>No open invoice</span>
                ) : (
                  <span key="act" style={{ opacity: 0.4, fontSize: 12 }}>—</span>
                ),
              ]
            })}
          />
        ) : null}
      </Section>

      {error ? (
        <p style={{ fontSize: 13, color: 'crimson' }}>{error}</p>
      ) : null}

      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            background: 'transparent',
            border: '1px solid var(--theme-elevation-200, #ccc)',
            borderRadius: 4,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <label style={{ fontSize: 12, opacity: 0.7, display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show canceled subs (&gt;90 days)
        </label>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.65, margin: '0 0 6px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={i}
              style={{
                textAlign: i === head.length - 1 ? 'right' : 'left',
                padding: '6px 8px',
                fontSize: 11,
                fontWeight: 500,
                opacity: 0.6,
                borderBottom: '1px solid var(--theme-elevation-100, #e0e0e0)',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td
                key={j}
                style={{
                  padding: '8px 8px',
                  borderBottom: '1px solid var(--theme-elevation-50, #f0f0f0)',
                  textAlign: j === r.length - 1 ? 'right' : 'left',
                  verticalAlign: 'middle',
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>{children}</span>
}

function Pill({ tone, children }: { tone: 'good' | 'warn' | 'mute'; children: React.ReactNode }) {
  const colors = {
    good: { bg: 'rgba(60, 160, 80, 0.15)', fg: 'rgb(40, 110, 60)' },
    warn: { bg: 'rgba(200, 120, 0, 0.15)', fg: 'rgb(160, 90, 0)' },
    mute: { bg: 'rgba(120, 120, 120, 0.12)', fg: 'rgb(80, 80, 80)' },
  }[tone]
  return (
    <span
      style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '2px 8px',
        borderRadius: 999,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      {children}
    </span>
  )
}

function ActionButton({
  label = 'Send email',
  onClick,
  state,
}: {
  label?: string
  onClick: () => void
  state?: { state: 'sending' | 'sent' | 'error'; message?: string }
}) {
  if (state?.state === 'sent') return <span style={{ fontSize: 12, color: 'green' }}>✓ Sent</span>
  if (state?.state === 'error') {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <button
          type="button"
          onClick={onClick}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            background: 'crimson',
            color: 'white',
            border: 'none',
            borderRadius: 999,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
        <span
          style={{ fontSize: 11, color: 'crimson', maxWidth: 220, textAlign: 'right', whiteSpace: 'normal' }}
          title={state.message}
        >
          {state.message ?? 'Send failed.'}
        </span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state?.state === 'sending'}
      style={{
        padding: '4px 10px',
        fontSize: 12,
        background: 'var(--theme-text)',
        color: 'var(--theme-bg)',
        border: 'none',
        borderRadius: 999,
        cursor: state?.state === 'sending' ? 'wait' : 'pointer',
      }}
    >
      {state?.state === 'sending' ? 'Sending…' : label}
    </button>
  )
}
