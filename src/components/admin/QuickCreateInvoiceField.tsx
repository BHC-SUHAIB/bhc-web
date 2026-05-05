'use client'

import React, { useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'

// Quick-create invoice button on the Project document. Lets the operator
// pick a Client (loaded from /api/clients), enter line items, and create
// a Stripe invoice in one click. The webhook auto-mirrors it into Payload
// — operator then opens the Client doc and clicks "Send email" when ready.
//
// Friend-pricing flow: when the selected Client's priceMode is set to
// "friend_and_family", tier presets show standard price struck-through and
// allow editable overrides. Skip-Stripe checkbox creates a Payload-only
// invoice (Zelle/check/cash) that never touches Stripe.

type ClientOption = {
  id: string | number
  displayName: string
  email: string
  stripeCustomerId?: string | null
  priceMode?: 'standard' | 'friend_and_family' | null
}

type LineItem = {
  description: string
  amountDollars: string
  quantity: string
  // When a tier preset was used to populate this line item, we remember the
  // standard price so friend-mode can show ~~$X~~ next to the editable input.
  standardCents?: number | null
}

type TierPreset = { name: string; amountCents: number }
const TIER_PRESETS: readonly TierPreset[] = [
  { name: 'Single Page', amountCents: 79_500 },
  { name: 'Starter Site', amountCents: 149_500 },
  { name: 'The Pro Site', amountCents: 350_000 },
  { name: 'Care Plan (mo)', amountCents: 14_900 },
  { name: 'Growth Plan (mo)', amountCents: 49_500 },
  { name: 'Scale Plan (mo)', amountCents: 129_500 },
]

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; invoiceNumber: string; totalCents: number; payloadOnly?: boolean }
  | { kind: 'error'; message: string }

export default function QuickCreateInvoiceField(props: UIFieldClientProps) {
  const { id: projectId } = useDocumentInfo()
  const [clients, setClients] = useState<ClientOption[] | null>(null)
  const [clientId, setClientId] = useState<string | number>('')
  const [description, setDescription] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amountDollars: '', quantity: '1', standardCents: null },
  ])
  const [skipStripePush, setSkipStripePush] = useState(false)
  const [paymentChannel, setPaymentChannel] = useState<
    'stripe' | 'zelle' | 'check' | 'cash' | 'wire' | 'other'
  >('zelle')
  const [markPaid, setMarkPaid] = useState(true)
  const [paidAtIso, setPaidAtIso] = useState(() => new Date().toISOString().slice(0, 10))
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

  const selectedClient = clients?.find((c) => String(c.id) === String(clientId)) ?? null
  const friendMode = selectedClient?.priceMode === 'friend_and_family'

  function setLineItem(i: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)))
  }
  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', amountDollars: '', quantity: '1', standardCents: null }])
  }
  function addPresetLine(preset: TierPreset) {
    setLineItems((prev) => {
      const empty = prev.findIndex((li) => !li.description.trim() && !li.amountDollars.trim())
      const newLine: LineItem = {
        description: preset.name,
        amountDollars: (preset.amountCents / 100).toFixed(2),
        quantity: '1',
        standardCents: preset.amountCents,
      }
      if (empty >= 0) {
        return prev.map((li, idx) => (idx === empty ? newLine : li))
      }
      return [...prev, newLine]
    })
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
          skipStripePush,
          paymentChannel: skipStripePush ? paymentChannel : 'stripe',
          markPaid: skipStripePush ? markPaid : false,
          paidAtIso:
            skipStripePush && markPaid
              ? new Date(`${paidAtIso}T12:00:00Z`).toISOString()
              : undefined,
        }),
      })
      const json = (await r.json()) as {
        ok?: boolean
        invoiceNumber?: string
        totalCents?: number
        payloadOnly?: boolean
        error?: string
      }
      if (!r.ok) throw new Error(json.error ?? `Create failed (${r.status}).`)
      setStatus({
        kind: 'sent',
        invoiceNumber: json.invoiceNumber ?? '?',
        totalCents: json.totalCents ?? totalCents(),
        payloadOnly: json.payloadOnly,
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
          + Create invoice from this project
        </button>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
          Pre-fills with the project context, lets you pick the client and add line items, then
          finalizes a Stripe invoice in one click. Toggle &ldquo;Skip Stripe push&rdquo; for
          Zelle/check/cash transactions to keep the invoice Payload-only.
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
                {c.priceMode === 'friend_and_family' ? ' [friend pricing]' : ''}
                {!c.stripeCustomerId ? ' [no Stripe link]' : ''}
              </option>
            ))}
          </select>
        </div>

        {friendMode ? (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: 12,
              border: '1px solid #d4a017',
              borderRadius: 6,
              background: '#fffbe6',
              color: '#7a5a00',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <strong>Friend pricing.</strong> Tier presets fill in the standard price; edit the amount
            for your friend rate. The standard price stays visible (struck-through) for context.
          </div>
        ) : null}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7 }}>
            Invoice description (shown on the invoice header)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Joe's Coffee — Starter Site rebuild"
            style={{ padding: '8px 10px', borderRadius: 6, width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7 }}>Tier shortcuts</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TIER_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => addPresetLine(p)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  background: 'transparent',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                + {p.name} <span style={{ opacity: 0.6 }}>${(p.amountCents / 100).toFixed(0)}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7 }}>Line items</label>
          {lineItems.map((li, i) => {
            const showStrikethrough =
              friendMode &&
              li.standardCents != null &&
              Math.round((parseFloat(li.amountDollars) || 0) * 100) !== li.standardCents
            return (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Description"
                  value={li.description}
                  onChange={(e) => setLineItem(i, { description: e.target.value })}
                  style={{ padding: '6px 8px', borderRadius: 4, flex: 2 }}
                />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showStrikethrough ? (
                    <span
                      style={{
                        fontSize: 11,
                        textDecoration: 'line-through',
                        opacity: 0.55,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ${((li.standardCents ?? 0) / 100).toFixed(0)}
                    </span>
                  ) : null}
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount $"
                    value={li.amountDollars}
                    onChange={(e) => setLineItem(i, { amountDollars: e.target.value })}
                    style={{ padding: '6px 8px', borderRadius: 4, flex: 1, width: '100%' }}
                  />
                </div>
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
            )
          })}
          <button
            type="button"
            onClick={addLineItem}
            style={{ padding: '4px 10px', fontSize: 12, background: 'transparent', border: '1px solid var(--theme-elevation-150)', borderRadius: 4, cursor: 'pointer' }}
          >
            + Add line item
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderTop: '1px solid var(--theme-elevation-100)',
          }}
        >
          <span style={{ fontSize: 13, opacity: 0.7 }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>
            ${(totalCents() / 100).toFixed(2)}
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 10,
            border: '1px solid var(--theme-elevation-100)',
            borderRadius: 6,
            background: skipStripePush ? '#fffbe6' : 'transparent',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={skipStripePush}
              onChange={(e) => setSkipStripePush(e.target.checked)}
            />
            <span>
              <strong>Skip Stripe push</strong> — Zelle / check / cash invoices stay Payload-only.
            </span>
          </label>
          {skipStripePush ? (
            <div style={{ marginTop: 8, paddingLeft: 24 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Payment channel:</label>
                <select
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value as typeof paymentChannel)}
                  style={{ padding: '4px 8px', borderRadius: 4, fontSize: 12 }}
                >
                  <option value="zelle">Zelle</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="wire">Wire transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  marginTop: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={markPaid}
                  onChange={(e) => setMarkPaid(e.target.checked)}
                />
                <span>
                  <strong>Already paid</strong> — mark as paid now (counts toward MTD revenue
                  immediately).
                </span>
              </label>
              {markPaid ? (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 12, opacity: 0.7 }}>Paid on:</label>
                  <input
                    type="date"
                    value={paidAtIso}
                    onChange={(e) => setPaidAtIso(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 4, fontSize: 12 }}
                  />
                </div>
              ) : null}
              <p style={{ marginTop: 8, fontSize: 11, opacity: 0.7, lineHeight: 1.4 }}>
                {markPaid
                  ? 'Invoice will save as Paid with the date above. It will appear in the MTD revenue tile and revenue-by-LP dashboard right away.'
                  : 'Invoice will save as a draft. Open it later and set Status = Paid + paidAt manually when payment lands.'}
              </p>
            </div>
          ) : null}
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
            {status.kind === 'sending'
              ? 'Creating…'
              : skipStripePush
                ? 'Create Payload-only invoice'
                : 'Create + finalize Stripe invoice'}
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
            {status.payloadOnly
              ? ' Payload-only — set Status to Paid once you confirm receipt.'
              : ' Open the client’s page to send the branded email.'}
          </p>
        ) : null}
        {status.kind === 'error' ? (
          <p style={{ marginTop: 10, fontSize: 13, color: 'crimson' }}>{status.message}</p>
        ) : null}
      </div>
    </div>
  )
}
