'use client'

import { useEffect } from 'react'
import { pushEvent } from '@/lib/analytics'

// Fires booking_completed exactly once after Calendly redirects the visitor
// back to this page. This is the *real* conversion — booking_click only
// tells us they clicked the calendar button, not that they finished
// scheduling. Strict-Mode-safe via the ran ref pattern is overkill for a
// dataLayer push (idempotent in GA4 anyway since each push gets its own
// gtm.uniqueEventId), so we just push on mount.
export function BookedTracker() {
  useEffect(() => {
    pushEvent('booking_completed', {
      source_page: typeof window !== 'undefined' ? window.location.pathname : '',
      offer: 'lp_express_website',
      currency: 'USD',
    })
  }, [])
  return null
}
