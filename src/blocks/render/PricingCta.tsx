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

// Drop-in replacement for the Button component on pricing tiers — a client
// island so it can fire pricing_cta_click.
export function PricingCta({ href, label, tierName, blockEyebrow, highlighted, className }: Props) {
  const finalHref = href
  const finalLabel = label
  const variantCls = highlighted
    ? 'bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)]'
    : 'bg-transparent text-[var(--color-fg)] border border-[var(--color-border-strong)] hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] hover:border-[var(--color-fg)]'

  return (
    <Link
      href={finalHref}
      onClick={() =>
        pushEvent('pricing_cta_click', {
          source_page: typeof window !== 'undefined' ? window.location.pathname : '',
          tier_name: tierName,
          pricing_block: blockEyebrow,
          cta_label: finalLabel,
        })
      }
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold no-underline w-full',
        'tracking-[0.01em] rounded-full select-none',
        'transition-[background-color,color,border-color,transform] duration-200 ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
        'active:translate-y-[1px] whitespace-nowrap',
        'h-[52px] px-7 text-[15.5px]',
        variantCls,
        className ?? '',
      ].join(' ')}
    >
      {finalLabel}
    </Link>
  )
}
