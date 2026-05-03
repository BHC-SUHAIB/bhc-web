'use client'

import { useEffect } from 'react'
import { pushEvent } from '@/lib/analytics'

// Fires booking_completed once when Calendly redirects the visitor back to
// this thank-you page. This is the *real* conversion — booking_click only
// tells us they clicked the calendar button, not that they finished
// scheduling. The `offer` field tags it `main_site` (vs `lp_*`) so GA4 can
// segment LP bookings vs main-site bookings without a separate event.
export function BookedTracker() {
  useEffect(() => {
    pushEvent('booking_completed', {
      source_page: typeof window !== 'undefined' ? window.location.pathname : '',
      offer: 'main_site',
      currency: 'USD',
    })
  }, [])
  return null
}
