'use client'

import { Phone } from 'lucide-react'
import { Button } from '@/components/Button'
import { pushEvent } from '@/lib/analytics'

// Phone CTA rendered as a third hero button — sits inline with the existing
// "Book a 30-min discovery call" + "See the offer" CTAs and uses the shared
// Button primitive so heights, padding, focus rings, and hover behavior all
// match. Click fires `phone_click` with `location: 'hero_phone_cta'` so it
// can be split out from header/footer phone clicks in GA4.

type Props = {
  phone: string
  href: string
  onPhoto?: boolean
}

export function HeroPhoneCta({ phone, href, onPhoto }: Props) {
  return (
    <Button
      href={href}
      variant={onPhoto ? 'onPhotoSecondary' : 'secondary'}
      size="lg"
      onClick={() =>
        pushEvent('phone_click', {
          source_page: typeof window !== 'undefined' ? window.location.pathname : '',
          location: 'hero_phone_cta',
        })
      }
    >
      <Phone className="size-4" aria-hidden />
      <span>Call {phone}</span>
    </Button>
  )
}
