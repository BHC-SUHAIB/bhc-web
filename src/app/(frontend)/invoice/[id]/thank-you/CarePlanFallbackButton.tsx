'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'

type Props = {
  carePlanSlug: string
  invoiceToken: string
  payloadInvoiceId: string
  consentText: string
}

// The "Add a card to activate" button shown on the post-payment thank-you
// page when BNPL was used for the invoice. POSTs JSON to the setup
// endpoint and redirects the browser to Stripe's hosted setup checkout.

export function CarePlanFallbackButton(props: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/care-plan/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          carePlan: props.carePlanSlug,
          invoiceToken: props.invoiceToken,
          payloadInvoiceId: props.payloadInvoiceId,
          consentText: props.consentText,
        }),
      })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? `Setup failed (${res.status}).`)
      }
      window.location.href = json.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-5">
      <Button variant="brass" size="lg" onClick={handleClick} disabled={submitting}>
        {submitting ? 'Loading checkout…' : 'Add a card to activate'}
      </Button>
      {error ? (
        <p className="mt-3 text-[13px] text-red-600 leading-[1.5]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
