'use client'

import { Button } from '@/components/Button'
import { pushEvent } from '@/lib/analytics'

type Variant = 'primary' | 'secondary' | 'ghost' | 'brass'

type Props = {
  href: string
  label: string
  variant?: Variant | null
  position: number
}

// Wraps the shared Button so we can fire hero_cta_click without making the
// whole Hero block a client component.
export function HeroCta({ href, label, variant, position }: Props) {
  return (
    <Button
      href={href}
      variant={variant ?? 'primary'}
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
