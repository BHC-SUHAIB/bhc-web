'use client'

import React, { useState } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'

// Tier change button on the Subscriptions document. POSTs to
// /api/subscriptions/[id]/change-tier — Stripe handles proration, the
// webhook syncs the change back to Payload within seconds.

const TIERS = [
  { slug: 'care', label: 'Care · $149/mo' },
  { slug: 'growth', label: 'Growth · $495/mo' },
  { slug: 'scale', label: 'Scale · $1,295/mo' },
] as const

const PRORATION_OPTIONS = [
  { value: 'create_prorations', label: 'Create prorations (default — apply diff to next invoice)' },
  { value: 'always_invoice', label: 'Always invoice (charge/credit immediately)' },
  { value: 'none', label: 'No proration (effective next billing cycle)' },
] as const

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; tier: string }
  | { kind: 'error'; message: string }

export default function ChangeTierField(props: UIFieldClientProps) {
  const { id: subId } = useDocumentInfo()
  const currentTier = useFormFields(([fields]) => fields?.tier?.value as string | undefined)
  const subStatus = useFormFields(([fields]) => fields?.status?.value as string | undefined)
  const [tier, setTier] = useState<(typeof TIERS)[number]['slug']>('growth')
  const [proration, setProration] = useState<(typeof PRORATION_OPTIONS)[number]['value']>('create_prorations')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  if (!subId) {
    return (
      <div className="field-type">
        <label className="field-label">{(props.field?.label as string) || 'Change tier'}</label>
        <p style={{ fontSize: 13, opacity: 0.7 }}>Save the subscription first.</p>
      </div>
    )
  }

  // Disable tier change if the subscription is canceled or unpaid.
  const cantChange = subStatus === 'canceled' || subStatus === 'incomplete' || subStatus === 'incomplete_expired'

  if (cantChange) {
    return (
      <div className="field-type">
        <label className="field-label">{(props.field?.label as string) || 'Change tier'}</label>
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          Tier change disabled for subscriptions in <code>{subStatus}</code> state.
        </p>
      </div>
    )
  }

  async function changeTier() {
    if (status.kind === 'sending') return
    setStatus({ kind: 'sending' })
    try {
      const r = await fetch(`/api/subscriptions/${subId}/change-tier`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier, prorationBehavior: proration }),
      })
      const json = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok) throw new Error(json.error ?? `Tier change failed (${r.status}).`)
      setStatus({ kind: 'sent', tier })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Tier change failed.' })
    }
  }

  const sending = status.kind === 'sending'
  const sameAsCurrent = currentTier === tier

  return (
    <div className="field-type">
      <label className="field-label">{(props.field?.label as string) || 'Change tier'}</label>
      <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 10 }}>
        Currently on <strong>{currentTier}</strong>. Pick the new tier and proration behavior.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as typeof tier)}
          disabled={sending}
          style={{ padding: '8px 10px', borderRadius: 6, minWidth: 220 }}
        >
          {TIERS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
              {t.slug === currentTier ? ' · current' : ''}
            </option>
          ))}
        </select>
        <select
          value={proration}
          onChange={(e) => setProration(e.target.value as typeof proration)}
          disabled={sending}
          style={{ padding: '8px 10px', borderRadius: 6, minWidth: 280 }}
        >
          {PRORATION_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={changeTier}
        disabled={sending || sameAsCurrent}
        title={sameAsCurrent ? 'Pick a different tier than the current one.' : ''}
        style={{
          padding: '8px 16px',
          borderRadius: 999,
          background: 'var(--theme-text)',
          color: 'var(--theme-bg)',
          border: 'none',
          cursor: sending || sameAsCurrent ? 'not-allowed' : 'pointer',
          opacity: sending || sameAsCurrent ? 0.5 : 1,
          fontSize: 13,
          fontFamily: 'inherit',
        }}
      >
        {sending ? 'Applying…' : 'Change tier'}
      </button>
      {status.kind === 'sent' ? (
        <p style={{ marginTop: 10, fontSize: 13, color: 'green' }}>
          ✓ Changed to {status.tier}. The webhook will sync the new tier in this record within ~3 seconds &mdash; refresh to see.
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p style={{ marginTop: 10, fontSize: 13, color: 'crimson' }}>{status.message}</p>
      ) : null}
    </div>
  )
}
