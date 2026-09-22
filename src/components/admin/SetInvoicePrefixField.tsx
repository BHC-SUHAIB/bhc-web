'use client'

import React, { useState } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'

// Sidebar action on the Client document — "Set invoice prefix".
//
// Stripe numbers a customer's invoices PREFIX-0001, PREFIX-0002… . New
// customers get a branded `BHC…` prefix automatically at create time; this
// button is for the ones that already exist with a random Stripe prefix.
//
// Two-step on purpose: the first click PREVIEWS (reads the current prefix from
// Stripe + computes the branded one), and only the explicit confirm writes.
// Changing a prefix affects future invoices only and leaves
// next_invoice_sequence alone, so this is never done automatically.

type Preview = {
  current: string | null
  suggested: string | null
  nextInvoiceSequence: number | null
  unchanged: boolean
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'confirm'; preview: Preview }
  | { kind: 'saving'; preview: Preview }
  | { kind: 'done'; prefix: string | null; unchanged: boolean }
  | { kind: 'error'; message: string }

const hint = { fontSize: 12, opacity: 0.65, lineHeight: 1.5, marginTop: 8 } as const
const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' } as const

export default function SetInvoicePrefixField(props: UIFieldClientProps) {
  const { id: clientId } = useDocumentInfo()
  const stripeCustomerId = useFormFields(
    ([fields]) => fields?.stripeCustomerId?.value as string | undefined,
  )
  const savedPrefix = useFormFields(
    ([fields]) => fields?.stripeInvoicePrefix?.value as string | undefined,
  )
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const label = (props.field?.label as string) || 'Invoice prefix'

  if (!clientId || !stripeCustomerId) {
    return (
      <div className="field-type">
        <label className="field-label">{label}</label>
        <p style={hint}>
          Available once the client has a Stripe Customer (save the record so the auto-create hook
          runs).
        </p>
      </div>
    )
  }

  async function call(mode: 'preview' | 'apply', prefix?: string | null) {
    const res = await fetch(`/api/clients/${clientId}/set-invoice-prefix`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode, ...(prefix ? { prefix } : {}) }),
    })
    const json = (await res.json()) as Record<string, unknown> & { error?: string }
    if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status}).`)
    return json
  }

  async function startPreview() {
    setStatus({ kind: 'loading' })
    try {
      const json = await call('preview')
      setStatus({
        kind: 'confirm',
        preview: {
          current: (json.current as string | null) ?? null,
          suggested: (json.suggested as string | null) ?? null,
          nextInvoiceSequence: (json.nextInvoiceSequence as number | null) ?? null,
          unchanged: Boolean(json.unchanged),
        },
      })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Preview failed.' })
    }
  }

  async function apply(preview: Preview) {
    setStatus({ kind: 'saving', preview })
    try {
      const json = await call('apply', preview.suggested)
      setStatus({
        kind: 'done',
        prefix: (json.prefix as string | null) ?? preview.suggested,
        unchanged: Boolean(json.unchanged),
      })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Update failed.' })
    }
  }

  const busy = status.kind === 'loading' || status.kind === 'saving'

  return (
    <div className="field-type">
      <label className="field-label">{label}</label>

      {status.kind === 'confirm' || status.kind === 'saving' ? (
        <div
          style={{
            border: '1px solid var(--theme-elevation-150, #ccc)',
            borderRadius: 8,
            padding: 12,
            display: 'grid',
            gap: 8,
            fontSize: 13,
          }}
        >
          <div>
            Current prefix in Stripe:{' '}
            <strong style={mono}>{status.preview.current ?? '— none —'}</strong>
          </div>
          <div>
            New prefix: <strong style={mono}>{status.preview.suggested ?? '— none —'}</strong>
          </div>
          {status.preview.nextInvoiceSequence != null ? (
            <div style={{ opacity: 0.7 }}>
              Next invoice number will be{' '}
              <span style={mono}>
                {status.preview.suggested}-
                {String(status.preview.nextInvoiceSequence).padStart(4, '0')}
              </span>{' '}
              (sequence is left untouched).
            </div>
          ) : null}
          {status.preview.unchanged ? (
            <div style={{ opacity: 0.7 }}>This is already the prefix in Stripe — nothing to change.</div>
          ) : (
            <div style={{ opacity: 0.7 }}>
              Past invoices keep their existing numbers; only future ones use the new prefix.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => apply(status.preview)}
              disabled={busy || !status.preview.suggested}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--theme-text)',
                color: 'var(--theme-bg)',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy || !status.preview.suggested ? 0.6 : 1,
              }}
            >
              {status.kind === 'saving' ? 'Saving…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setStatus({ kind: 'idle' })}
              disabled={busy}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: '1px solid var(--theme-elevation-150, #ccc)',
                background: 'transparent',
                color: 'inherit',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startPreview}
          disabled={busy}
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            border: '1px solid var(--theme-elevation-150, #ccc)',
            background: 'transparent',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: 13,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {status.kind === 'loading' ? 'Checking Stripe…' : 'Set invoice prefix'}
        </button>
      )}

      {status.kind === 'done' ? (
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--theme-success-500, green)' }}>
          {status.unchanged
            ? 'Already up to date.'
            : `✓ Stripe invoice prefix set to ${status.prefix}. Reload the doc to refresh the field.`}
        </p>
      ) : null}
      {status.kind === 'error' ? (
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--theme-error-500, crimson)' }}>
          {status.message}
        </p>
      ) : null}

      <p style={hint}>
        {savedPrefix ? (
          <>
            Recorded prefix: <span style={mono}>{savedPrefix}</span>.{' '}
          </>
        ) : null}
        Stripe numbers this client&rsquo;s invoices <span style={mono}>PREFIX-0001</span>,{' '}
        <span style={mono}>PREFIX-0002</span>… New clients get a branded prefix automatically; use
        this only to fix an existing client&rsquo;s random Stripe prefix. Applies to future invoices
        only.
      </p>
    </div>
  )
}
