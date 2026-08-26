'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { pushEvent } from '@/lib/analytics'
import { getTier } from '@/lib/tiers'

// Fires the purchase event when a Stripe Payment Link redirects back to
// /thanks?sku=<slug>. Value comes from the tier map so Google Ads can bid on
// revenue, not just clicks. Rendered only on the thanks page.

function Tracker() {
  const searchParams = useSearchParams()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    const sku = searchParams.get('sku')
    if (!sku) return
    fired.current = true
    const tier = getTier(sku)
    pushEvent('purchase', {
      sku,
      value: tier?.value,
      currency: 'USD',
      tier_name: tier?.label ?? sku,
    })
  }, [searchParams])

  return null
}

export function ThanksTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  )
}
