'use client'

import React, { useState, useEffect } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'

// Custom admin field on the Client document — renders a tier picker and
// "Send Care Plan signup email" button. POSTs to
// /api/clients/[id]/send-care-plan-signup with the selected tier.
//
// Replaces the need to drop into the terminal + curl. Visible only on
// existing clients (the doc must be saved first so we have an ID and a
// Stripe Customer ID populated by the afterChange hook).

const TIERS = [
  { slug: 'care', label: 'Care · $149/mo' },
  { slug: 'growth', label: 'Growth · $495/mo' },
  { slug: 'scale', label: 'Scale · $1,295/mo' },
] as const

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; to: string }
  | { kind: 'error'; message: string }

export default function SendCarePlanSignupField(props: UIFieldClientProps) {
  const { id: clientId } = useDocumentInfo()
  // (#20) Watch the live stripeCustomerId field on the form so the button
  // disables itself when the Stripe customer hasn't been created yet
  // (e.g., right after creating the client and before the afterChange
  // hook ran, or if Stripe was unconfigured at the time).
  const stripeCustomerId = useFormFields(([fields]) => fields?.stripeCustomerId?.value as string | undefined)
  const [tier, setTier] = useState<(typeof TIERS)[number]['slug']>('care')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  // Reset send state if the client/tier changes.
  useEffect(() => {
    setStatus({ kind: 'idle' })
  }, [clientId, tier])

  if (!clientId) {
    return (
      <div className="field-type">
        <label className="field-label">{(props.field?.label as string) || 'Send Care Plan signup'}</label>
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          Save the client first to enable this action.
        </p>
      </div>
    )
  }

  // (#20) If the client has no Stripe Customer link, sending a signup email
  // would 400 server-side. Disable + explain instead of letting the click fail.
  if (!stripeCustomerId) {
    return (
      <div className="field-type">
        <label className="field-label">{(props.field?.label as string) || 'Send Care Plan signup'}</label>
        <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
          This client doesn&rsquo;t have a Stripe Customer linked yet. Save the client to trigger
          the auto-create hook (or add a <code>stripeCustomerId</code> manually if it exists in
          Stripe), then refresh.
        </p>
      </div>
    )
  }

  async function send() {
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch(`/api/clients/${clientId}/send-care-plan-signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const json = (await res.json()) as { ok?: boolean; sentTo?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? `Send failed (${res.status}).`)
      setStatus({ kind: 'sent', to: json.sentTo ?? '' })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Send failed.' })
    }
  }

  const sending = status.kind === 'sending'

  return (
    <div className="field-type">
      <label className="field-label">{(props.field?.label as string) || 'Send Care Plan signup email'}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as typeof tier)}
          disabled={sending}
          style={{ padding: '8px 10px', borderRadius: 6, minWidth: 200 }}
        >
          {TIERS.map((t) => (
            <option key={t.slug} value={t.slug}>{t.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            background: 'var(--theme-text)',
            color: 'var(--theme-bg)',
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.6 : 1,
            fontFamily: 'inherit',
            fontSize: 13,
            border: 'none',
          }}
        >
          {sending ? 'Sending…' : 'Send signup email'}
        </button>
      </div>
      {status.kind === 'sent' ? (
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--theme-success-500, green)' }}>
          ✓ Sent to {status.to || 'client'}.
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--theme-error-500, crimson)' }}>
          {status.message}
        </p>
      ) : null}
      <p style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
        Sends a branded BHC email with a one-click link to the Care Plan setup page. The link
        is signed and pre-resolves the client&rsquo;s Stripe customer ID, so the client only
        has to enter a card.
      </p>
    </div>
  )
}
