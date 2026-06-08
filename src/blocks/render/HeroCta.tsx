'use client'

import { Button } from '@/components/Button'
import { pushEvent, pushEventThenNavigate } from '@/lib/analytics'
import { toContactAnchor, relabelDiscount } from '@/lib/redesign'

type Variant = 'primary' | 'secondary' | 'ghost' | 'brass'

type Props = {
  href: string
  label: string
  variant?: Variant | null
  position: number
  /** When true, dark-text variants ("ghost" + "secondary") are remapped to
   *  white-text on-photo variants so the CTAs stay legible against a darkened
   *  hero photo. The primary CTA stays brass-on-ink (already legible). */
  onPhoto?: boolean
}

// Wraps the shared Button so we can fire hero_cta_click without making the
// whole Hero block a client component. Applies the revision transforms:
// /contact CTAs route to the contact-form anchor, "Founding" → "Discounted".
export function HeroCta({ href, label, variant, position, onPhoto }: Props) {
  const v = variant ?? 'primary'
  const resolved =
    onPhoto && v === 'ghost'
      ? 'onPhotoGhost'
      : onPhoto && v === 'secondary'
        ? 'onPhotoSecondary'
        : v
  const finalHref = toContactAnchor(href)
  const finalLabel = relabelDiscount(label)
  const isBookingHref = /calendly\.com|cal\.com/i.test(href)
  const isPhoneHref = /^tel:/i.test(href)

  return (
    <Button
      href={finalHref}
      variant={resolved as Variant}
      size="lg"
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        const params = {
          source_page: typeof window !== 'undefined' ? window.location.pathname : '',
          cta_label: finalLabel,
          cta_position: position,
        }
        if (isBookingHref) {
          pushEvent('hero_cta_click', params)
          pushEventThenNavigate(
            'booking_click',
            finalHref,
            { source_page: params.source_page, location: 'hero_cta' },
            e,
          )
        } else if (isPhoneHref) {
          pushEvent('hero_cta_click', params)
          pushEvent('phone_click', { source_page: params.source_page, location: 'hero_cta' })
        } else {
          pushEventThenNavigate('hero_cta_click', finalHref, params, e)
        }
      }}
    >
      {finalLabel}
    </Button>
  )
}
