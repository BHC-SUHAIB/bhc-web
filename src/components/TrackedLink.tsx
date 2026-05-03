'use client'

import { pushEventThenNavigate } from '@/lib/analytics'

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  trackEvent: 'phone_click' | 'email_click' | 'booking_click'
  trackLocation: string
}

export function TrackedLink({ trackEvent, trackLocation, onClick, href, children, ...rest }: Props) {
  return (
    <a
      {...rest}
      href={href}
      onClick={(ev) => {
        pushEventThenNavigate(
          trackEvent,
          href ?? '',
          {
            source_page: typeof window !== 'undefined' ? window.location.pathname : '',
            location: trackLocation,
          },
          ev,
        )
        onClick?.(ev)
      }}
    >
      {children}
    </a>
  )
}
