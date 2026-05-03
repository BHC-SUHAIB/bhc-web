'use client'

import { Button } from '@/components/Button'
import { pushEvent } from '@/lib/analytics'

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
// whole Hero block a client component.
export function HeroCta({ href, label, variant, position, onPhoto }: Props) {
  const v = variant ?? 'primary'
  // Primary stays as configured. Brass also stays — both are already
  // high-contrast on a dark photo. Only the dark-text variants need to be
  // swapped for their on-photo siblings when over a darkened hero image.
  const resolved =
    onPhoto && v === 'ghost'
      ? 'onPhotoGhost'
      : onPhoto && v === 'secondary'
        ? 'onPhotoSecondary'
        : v
  return (
    <Button
      href={href}
      variant={resolved as Variant}
      size="lg"
      onClick={() =>
        pushEvent('hero_cta_click', {
          source_page: typeof window !== 'undefined' ? window.location.pathname : '',
          cta_label: label,
          cta_position: position,
        })
      }
    >
      {label}
    </Button>
  )
}
