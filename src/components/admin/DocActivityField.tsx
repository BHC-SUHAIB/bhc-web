'use client'

import React, { useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

// Embedded activity timeline for a Client / Invoice / Subscription doc.
// Replaces the workflow of "open WebhookEvents → search by stripe id → swap to AuditEvents → search again". Now you open the doc, the events are right there.
//
// Type-safe via a `subjectType` prop set on the field's clientProps when registered in each collection. For Clients the column we filter on is `subjectType=client subjectId=<doc.id>`, similarly for invoice / subscription.

type Row = {
  id: string | number
  kind: 'audit' | 'webhook'
  action: string
  actor: string
  summary: string
  stripeId?: string | null
  createdAt: string
}

type Resp = { rows: Row[] }

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

const iconForAction = (action: string): { glyph: string; bg: string; fg: string } => {
  if (action === 'invoice.paid') return { glyph: '$', bg: '#2F4A35', fg: '#fff' }
  if (action.includes('refund')) return { glyph: '−', bg: '#9A4A3A', fg: '#fff' }
  if (action.includes('failed')) return { glyph: '!', bg: '#9A4A3A', fg: '#fff' }
  if (action.startsWith('subscription.')) return { glyph: '↻', bg: '#B08D57', fg: '#fff' }
  if (action.startsWith('invoice.email_sent') || action.startsWith('care_plan.')) return { glyph: '✉', bg: '#1A1713', fg: '#fff' }
  return { glyph: '●', bg: '#8A9A7B', fg: '#1A1713' }
}

type Props = {
  subjectType: 'client' | 'invoice' | 'subscription'
}

export default function DocActivityField(props: Partial<Props>) {
  const { id } = useDocumentInfo()
  const subjectType = props.subjectType
  const [data, setData] = useState<Resp | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !subjectType) return
    const url = `/api/admin/doc-activity?subjectType=${encodeURIComponent(subjectType)}&subjectId=${encodeURIComponent(String(id))}`
    fetch(url, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Load failed (${r.status})`)
        return r.json() as Promise<Resp>
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [id, subjectType])

  if (!id) return null
  if (error) return null

  const rows = data?.rows ?? []
  const audits = rows.filter((r) => r.kind === 'audit')
  const webhooks = rows.filter((r) => r.kind === 'webhook')

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          background: 'var(--theme-elevation-50, #fafaf7)',
          border: '1px solid var(--theme-elevation-100, #eee)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--theme-elevation-100, #eee)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>
              Activity
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--theme-elevation-600, #7A7466)', marginTop: 2 }}>
              Audit events + Stripe webhooks scoped to this {subjectType}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--theme-elevation-600, #7A7466)' }}>
            {audits.length} audit · {webhooks.length} webhook
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--theme-elevation-600, #7A7466)', fontStyle: 'italic' }}>
            No activity recorded for this {subjectType} yet.
          </div>
        ) : (
          <div>
            {rows.slice(0, 30).map((row) => {
              const ic = iconForAction(row.action)
              return (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 12,
                    padding: '10px 16px',
                    borderTop: '1px solid var(--theme-elevation-100, #eee)',
                    alignItems: 'center',
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: ic.bg,
                      color: ic.fg,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {ic.glyph}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.4, minWidth: 0 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{row.actor}</span> {row.summary}
                    </div>
                    {row.stripeId && (
                      <div style={{ fontSize: 11.5, color: 'var(--theme-elevation-600, #7A7466)', marginTop: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                        {row.stripeId}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--theme-elevation-600, #7A7466)', whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"' }}>
                    {formatRelative(row.createdAt)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
