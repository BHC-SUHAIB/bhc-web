'use client'

import React, { useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'

// Quick-create invoice button on the Project document. Lets the operator
// pick a Client (loaded from /api/clients), enter line items, and create
// a Stripe invoice in one click. The webhook auto-mirrors it into Payload
// — operator then opens the Client doc and clicks "Send email" when ready.

type ClientOption = { id: string | number; displayName: string; email: string; stripeCustomerId?: string | null }
type LineItem = { description: string; amountDollars: string; quantity: string }

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; invoiceNumber: string; totalCents: number }
  | { kind: 'error'; message: string }

export default function QuickCreateInvoiceField(props: UIFieldClientProps) {
  const { id: projectId } = useDocumentInfo()
  const [clients, setClients] = useState<ClientOption[] | null>(null)
  const [clientId, setClientId] = useState<string | number>('')
  const [description, setDescription] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amountDollars: '', quantity: '1' },
  ])
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded || clients !== null) return
    void fetch('/api/clients?limit=200&depth=0', { credentials: 'include' })
      .then((r) => r.json())
      .then((j: { docs?: ClientOption[] }) => {
        setClients(j.docs ?? [])
      })
      .catch(() => setClients([]))
  }, [expanded, clients])

  if (!projectId) {
    return (
      <div className="field-type">
        <label className="field-label">{(props.field?.label as string) || 'Quick-create invoice'}</label>
        <p style={{ fontSize: 13, opacity: 0.7 }}>Save the project first.</p>
      </div>
    )
  }

  function setLineItem(i: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)))
  }
  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', amountDollars: '', quantity: '1' }])
  }
  function removeLineItem(i: number) {
    setLineItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function totalCents(): number {
    return lineItems.reduce((sum, li) => {
      const amt = parseFloat(li.amountDollars) || 0
      const qty = parseInt(li.quantity, 10) || 1
      return sum + Math.round(amt * 100) * qty
    }, 0)
  }

  async function submit() {
    if (status.kind === 'sending') return
    if (!clientId) {
      setStatus({ kind: 'error', message: 'Pick a client.' })
      return
    }
    const sanitized = lineItems
      .filter((li) => li.description.trim() && parseFloat(li.amountDollars) > 0)
      .map((li) => ({
        description: li.description.trim(),
        amountCents: Math.round(parseFloat(li.amountDollars) * 100),
        quantity: parseInt(li.quantity, 10) || 1,
      }))
    if (sanitized.length === 0) {
      setStatus({ kind: 'error', message: 'Add at least one line item with a description and amount.' })
      return
    }
    setStatus({ kind: 'sending' })
    try {
      const r = await fetch(`/api/projects/${projectId}/create-invoice`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId,
          description: description.trim() || undefined,
          lineItems: sanitized,
        }),
      })
      const json = (await r.json()) as { ok?: boolean; invoiceNumber?: string; totalCents?: number; error?: string }
      if (!r.ok) throw new Error(json.error ?? `Create failed (${r.status}).`)
      setStatus({
        kind: 'sent',
        invoiceNumber: json.invoiceNumber ?? '?',
        totalCents: json.totalCents ?? totalCents(),
      })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Create failed.' })
    }
  }

  if (!expanded) {
    return (
      <div className="field-type">
        <label className="field-label">{(props.field?.label as string) || 'Quick-create invoice'}</label>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            background: 'var(--theme-text)',
            color: 'var(--theme-bg)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          + Create Stripe invoice from this project
        </button>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
          Pre-fills with the project context, lets you pick the client and add line items, then
          finalizes a Stripe invoice in one click. The mirror in Payload fills in via webhook.
        </p>
      </div>
    )
  }

  return (
    <div className="field-type">
      <label className="field-label">{(props.field?.label as string) || 'Quick-create invoice'}</label>
      <div
        style={{
          padding: 16,
          border: '1px solid var(--theme-elevation-150, #ddd)',
          borderRadius: 8,
          background: 'var(--theme-elevation-50, #fafafa)',
          marginTop: 4,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7 }}>Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={!clients}
            style={{ padding: '8px 10px', borderRadius: 6, width: '100%' }}
          >
            <option value="">{clients ? '— select a client —' : 'Loading…'}</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName} ({c.email})
                {!c.stripeCustomerId ? ' [no Stripe link]' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7 }}>
            Invoice description (shown on the invoice header)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Joe's Coffee — Heights Starter site rebuild"
            style={{ padding: '8px 10px', borderRadius: 6, width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7 }}>Line items</label>
          {lineItems.map((li, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                type="text"
                placeholder="Description"
                value={li.description}
                onChange={(e) => setLineItem(i, { description: e.target.value })}
                style={{ padding: '6px 8px', borderRadius: 4, flex: 2 }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount $"
                value={li.amountDollars}
                onChange={(e) => setLineItem(i, { amountDollars: e.target.value })}
                style={{ padding: '6px 8px', borderRadius: 4, flex: 1 }}
              />
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Qty"
                value={li.quantity}
                onChange={(e) => setLineItem(i, { quantity: e.target.value })}
                style={{ padding: '6px 8px', borderRadius: 4, width: 60 }}
              />
              {lineItems.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeLineItem(i)}
                  style={{ padding: '6px 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'crimson' }}
                  aria-label="Remove line item"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={addLineItem}
            style={{ padding: '4px 10px', fontSize: 12, background: 'transparent', border: '1px solid var(--theme-elevation-150)', borderRadius: 4, cursor: 'pointer' }}
          >
            + Add line item
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--theme-elevation-100)' }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>
            ${(totalCents() / 100).toFixed(2)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={submit}
            disabled={status.kind === 'sending'}
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              background: 'var(--theme-text)',
              color: 'var(--theme-bg)',
              border: 'none',
              cursor: status.kind === 'sending' ? 'wait' : 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            {status.kind === 'sending' ? 'Creating…' : 'Create + finalize invoice'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            style={{ padding: '10px 16px', borderRadius: 999, background: 'transparent', border: '1px solid var(--theme-elevation-200)', cursor: 'pointer', fontSize: 13 }}
          >
            Cancel
          </button>
        </div>

        {status.kind === 'sent' ? (
          <p style={{ marginTop: 10, fontSize: 13, color: 'green' }}>
            ✓ Created invoice {status.invoiceNumber} for ${(status.totalCents / 100).toFixed(2)}.
            Open the client&rsquo;s page to send the branded email.
          </p>
        ) : null}
        {status.kind === 'error' ? (
          <p style={{ marginTop: 10, fontSize: 13, color: 'crimson' }}>{status.message}</p>
        ) : null}
      </div>
    </div>
  )
}
