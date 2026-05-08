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
  { slug: 'custom', label: 'Custom · enter price' },
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
  // Custom-tier extras (only shown / used when tier === 'custom').
  const [customLabel, setCustomLabel] = useState('Hosting Friend Plan')
  const [customDollars, setCustomDollars] = useState('200')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const isCustom = tier === 'custom'

  // Reset send state if the client/tier/custom inputs change.
  useEffect(() => {
    setStatus({ kind: 'idle' })
  }, [clientId, tier, customLabel, customDollars])

  // Validate the custom amount field — must parse to a positive number.
  // Re-used to gate the button.
  const customAmountCents = (() => {
    const n = Number(customDollars)
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.round(n * 100)
  })()
  const customLabelTrimmed = customLabel.trim()
  const customIsValid = !isCustom || (customLabelTrimmed.length > 0 && customLabelTrimmed.length <= 80 && customAmountCents !== null && customAmountCents >= 100)

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
      const body = isCustom
        ? { tier: 'custom', label: customLabelTrimmed, monthlyAmountCents: customAmountCents }
        : { tier }
      const res = await fetch(`/api/clients/${clientId}/send-care-plan-signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
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
          disabled={sending || !customIsValid}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            background: 'var(--theme-text)',
            color: 'var(--theme-bg)',
            cursor: sending || !customIsValid ? 'not-allowed' : 'pointer',
            opacity: sending || !customIsValid ? 0.6 : 1,
            fontFamily: 'inherit',
            fontSize: 13,
            border: 'none',
          }}
        >
          {sending ? 'Sending…' : 'Send signup email'}
        </button>
      </div>
      {isCustom ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 8, maxWidth: 520 }}>
          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Plan label (shown in the email + on the setup page)
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value.slice(0, 80))}
              placeholder="Hosting Friend Plan"
              disabled={sending}
              maxLength={80}
              style={{
                marginTop: 4,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--theme-elevation-150, #ccc)',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            />
          </label>
          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Monthly amount in dollars (e.g. 200 for $200/mo)
            <input
              type="number"
              min="1"
              step="1"
              value={customDollars}
              onChange={(e) => setCustomDollars(e.target.value)}
              disabled={sending}
              style={{
                marginTop: 4,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--theme-elevation-150, #ccc)',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            />
          </label>
          {!customIsValid && (customLabel || customDollars) ? (
            <p style={{ fontSize: 12, color: 'var(--theme-error-500, crimson)', margin: 0 }}>
              Enter a non-empty label (≤80 chars) and a positive dollar amount (≥$1).
            </p>
          ) : null}
        </div>
      ) : null}
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
        Sends a branded BHC email with a one-click link to the setup page. The link is signed
        and pre-resolves the client&rsquo;s Stripe customer ID, so they only enter a card.
        {isCustom ? (
          <>
            {' '}For custom plans, the displayed price is informational only — the actual
            subscription is created in Stripe Dashboard with whatever recurring price you set
            after the card is captured.
          </>
        ) : null}
      </p>
    </div>
  )
}
