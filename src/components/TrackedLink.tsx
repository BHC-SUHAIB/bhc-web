'use client'

import { pushEvent } from '@/lib/analytics'

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  trackEvent: 'phone_click' | 'email_click' | 'booking_click'
  trackLocation: string
}

export function TrackedLink({ trackEvent, trackLocation, onClick, children, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(ev) => {
        pushEvent(trackEvent, {
          source_page: typeof window !== 'undefined' ? window.location.pathname : '',
          location: trackLocation,
        })
        onClick?.(ev)
      }}
    >
      {children}
    </a>
  )
}
