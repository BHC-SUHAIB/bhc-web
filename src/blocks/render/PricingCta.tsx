'use client'

import Link from 'next/link'
import { pushEvent } from '@/lib/analytics'

type Props = {
  href: string
  label: string
  tierName: string
  blockEyebrow: string
  highlighted: boolean
  className?: string
}

// Drop-in replacement for the Button component on pricing tiers — needs to
// be a client island so it can fire pricing_cta_click. Visual styles match
// the Button component (variant=brass when highlighted, secondary otherwise)
// because we can't render <Button onClick={...}> from a server component.
export function PricingCta({ href, label, tierName, blockEyebrow, highlighted, className }: Props) {
  const variantCls = highlighted
    ? 'bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)]'
    : 'bg-transparent text-[var(--color-fg)] border border-[var(--color-border-strong)] hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] hover:border-[var(--color-fg)]'

  return (
    <Link
      href={href}
      onClick={() =>
        pushEvent('pricing_cta_click', {
          source_page: typeof window !== 'undefined' ? window.location.pathname : '',
          tier_name: tierName,
          pricing_block: blockEyebrow,
          cta_label: label,
        })
      }
      className={[
        'inline-flex items-center justify-center gap-2 font-medium no-underline w-full',
        'tracking-[0.01em] rounded-full select-none',
        'transition-[background-color,color,border-color,transform] duration-150 ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
        'active:translate-y-[1px]',
        'h-[52px] px-7 text-[15.5px]',
        variantCls,
        className ?? '',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}
