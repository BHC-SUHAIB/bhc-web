'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'
import { carePlanBySlug, formatUSD } from '@/lib/care-plans'
import { deriveHostingMode, hostingModeInPlainWords } from '@/lib/invoice-hosting'

// Custom admin field on the Invoice document. Two operator actions that used
// to require curl:
//
//   "Push to Stripe"    → POST /api/invoices/[id]/sync
//                         (creates + finalizes the Stripe invoice, returns the
//                          signed branded URL). Draft invoices only.
//   "Finalize and send" → confirmation, then sync (if still a draft) followed
//                         by POST /api/invoices/[id]/send-email (branded email
//                         with the branded PDF attached).
//
// Both surface the resulting branded link with a copy button, and print the
// server's error message verbatim when something fails. Audit rows are
// written by the routes themselves.

type Phase =
  | { kind: 'idle' }
  | { kind: 'confirm' }
  | { kind: 'working'; step: string }
  | { kind: 'done'; brandedUrl?: string | null; sentTo?: string | null }
  | { kind: 'error'; message: string }

type ClientSummary = { displayName?: string | null; email?: string | null }

export default function InvoiceWorkflowField(_props: UIFieldClientProps) {
  const { id: invoiceId } = useDocumentInfo()

  const status = useFormFields(([fields]) => fields?.status?.value as string | undefined)
  const stripeInvoiceId = useFormFields(([fields]) => fields?.stripeInvoiceId?.value as string | undefined)
  const skipStripePush = useFormFields(([fields]) => fields?.skipStripePush?.value as boolean | undefined)
  const totalCents = useFormFields(([fields]) => fields?.totalCents?.value as number | undefined)
  const hostingMode = useFormFields(([fields]) => fields?.hostingMode?.value as string | undefined)
  const allowCarePlanUpsell = useFormFields(
    ([fields]) => fields?.allowCarePlanUpsell?.value as boolean | undefined,
  )
  const suggestedCarePlan = useFormFields(
    ([fields]) => fields?.suggestedCarePlan?.value as string | undefined,
  )
  const clientId = useFormFields(([fields]) => fields?.client?.value as string | number | undefined)

  const [client, setClient] = useState<ClientSummary | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [copied, setCopied] = useState(false)

  // Pull the client's name + email so the confirmation can say exactly who is
  // about to be emailed.
  useEffect(() => {
    let cancelled = false
    if (!clientId) {
      setClient(null)
      return
    }
    void (async () => {
      try {
        const r = await fetch(`/api/clients/${clientId}?depth=0`, { credentials: 'include' })
        if (!r.ok) return
        const json = (await r.json()) as ClientSummary
        if (!cancelled) setClient({ displayName: json.displayName, email: json.email })
      } catch {
        // Non-fatal: the confirmation just shows the id-less fallback.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clientId])

  // Any form edit invalidates a previous result.
  useEffect(() => {
    setPhase((p) => (p.kind === 'done' || p.kind === 'error' ? { kind: 'idle' } : p))
  }, [status, stripeInvoiceId, hostingMode, suggestedCarePlan, totalCents])

  const isDraft = status === 'draft'
  const hasStripeId = Boolean(stripeInvoiceId)
  const offPlatform = Boolean(skipStripePush)

  const mode = deriveHostingMode({ hostingMode, allowCarePlanUpsell })
  const plan = carePlanBySlug(suggestedCarePlan ?? null)
  const modeWords = hostingModeInPlainWords(mode, plan ? `${plan.name} hosting` : null)

  const post = useCallback(async (url: string) => {
    const r = await fetch(url, { method: 'POST', credentials: 'include' })
    let json: Record<string, unknown> = {}
    try {
      json = (await r.json()) as Record<string, unknown>
    } catch {
      json = {}
    }
    if (!r.ok) {
      throw new Error(
        (typeof json.error === 'string' ? json.error : null) ?? `Request failed (${r.status}).`,
      )
    }
    return json
  }, [])

  const pushToStripe = useCallback(async () => {
    setPhase({ kind: 'working', step: 'Pushing to Stripe…' })
    try {
      const json = await post(`/api/invoices/${invoiceId}/sync`)
      setPhase({ kind: 'done', brandedUrl: (json.brandedUrl as string) ?? null })
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Push failed.' })
    }
  }, [invoiceId, post])

  const finalizeAndSend = useCallback(async () => {
    setPhase({ kind: 'working', step: 'Pushing to Stripe…' })
    try {
      let brandedUrl: string | null = null
      if (!hasStripeId) {
        const sync = await post(`/api/invoices/${invoiceId}/sync`)
        brandedUrl = (sync.brandedUrl as string) ?? null
      }
      setPhase({ kind: 'working', step: 'Sending the branded email…' })
      const sent = await post(`/api/invoices/${invoiceId}/send-email`)
      setPhase({
        kind: 'done',
        brandedUrl,
        sentTo: (sent.sentTo as string) ?? client?.email ?? null,
      })
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Send failed.' })
    }
  }, [client?.email, hasStripeId, invoiceId, post])

  if (!invoiceId) {
    return (
      <Wrap>
        <p style={{ fontSize: 13, opacity: 0.7 }}>Save the invoice first to enable these actions.</p>
      </Wrap>
    )
  }

  if (offPlatform) {
    return (
      <Wrap>
        <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
          This is an off-platform invoice (<code>Skip Stripe push</code> is checked). Nothing is
          pushed to Stripe and no branded email is sent from here — set Status and Paid With by hand
          once the money lands.
        </p>
      </Wrap>
    )
  }

  const working = phase.kind === 'working'

  return (
    <Wrap>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {isDraft && !hasStripeId ? (
          <Btn onClick={pushToStripe} disabled={working}>
            {working && phase.step.startsWith('Pushing') ? 'Pushing…' : 'Push to Stripe'}
          </Btn>
        ) : null}
        <Btn onClick={() => setPhase({ kind: 'confirm' })} disabled={working} primary>
          Finalize and send
        </Btn>
      </div>

      <p style={{ fontSize: 12, opacity: 0.65, marginTop: 8, lineHeight: 1.5 }}>
        {hasStripeId
          ? 'Already in Stripe. “Finalize and send” re-sends the branded email with the branded PDF.'
          : '“Push to Stripe” finalizes the invoice and mints the branded link without emailing anyone. “Finalize and send” does both.'}
      </p>

      {phase.kind === 'confirm' ? (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 8,
            border: '1px solid var(--theme-elevation-200, #ccc)',
            background: 'var(--theme-elevation-50, #fafafa)',
            maxWidth: 560,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>
            Send this invoice now?
          </p>
          <ul style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 10px', paddingLeft: 18 }}>
            <li>
              <strong>{client?.displayName ?? 'Client'}</strong>
              {client?.email ? <> · {client.email}</> : <> · no email on file</>}
            </li>
            <li>
              Total <strong>{formatUSD(Number(totalCents) || 0)}</strong>
              {mode === 'included' && plan ? (
                <> plus {formatUSD(plan.monthlyAmountCents)}/month after the free first month</>
              ) : null}
            </li>
            <li>{modeWords}</li>
          </ul>
          <p style={{ fontSize: 13, margin: '0 0 12px' }}>
            {hasStripeId
              ? 'This emails the client now.'
              : 'This finalizes the invoice in Stripe and emails the client now.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={finalizeAndSend} primary>
              Yes, send it
            </Btn>
            <Btn onClick={() => setPhase({ kind: 'idle' })}>Cancel</Btn>
          </div>
        </div>
      ) : null}

      {working ? (
        <p style={{ fontSize: 13, marginTop: 10, opacity: 0.8 }}>{phase.step}</p>
      ) : null}

      {phase.kind === 'done' ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--theme-success-500, green)', margin: '0 0 8px' }}>
            ✓ {phase.sentTo ? `Sent to ${phase.sentTo}.` : 'Pushed to Stripe.'} Reload the document
            to see the updated status and Stripe fields.
          </p>
          {phase.brandedUrl ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <code
                style={{
                  fontSize: 11,
                  padding: '6px 8px',
                  borderRadius: 4,
                  background: 'var(--theme-elevation-100, #eee)',
                  wordBreak: 'break-all',
                  maxWidth: 420,
                }}
              >
                {phase.brandedUrl}
              </code>
              <Btn
                onClick={() => {
                  void navigator.clipboard?.writeText(phase.brandedUrl ?? '')
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Btn>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase.kind === 'error' ? (
        <p
          style={{
            fontSize: 13,
            marginTop: 10,
            color: 'var(--theme-error-500, crimson)',
            lineHeight: 1.5,
            maxWidth: 560,
          }}
        >
          {phase.message}
        </p>
      ) : null}
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="field-type" style={{ marginTop: 12 }}>
      <label className="field-label" style={{ marginBottom: 8 }}>
        Send this invoice
      </label>
      {children}
    </div>
  )
}

function Btn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        fontSize: 13,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        border: primary ? 'none' : '1px solid var(--theme-elevation-200, #ccc)',
        background: primary ? 'var(--theme-text)' : 'transparent',
        color: primary ? 'var(--theme-bg)' : 'inherit',
      }}
    >
      {children}
    </button>
  )
}
