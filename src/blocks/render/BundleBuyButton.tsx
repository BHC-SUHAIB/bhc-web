'use client'

import { pushEvent } from '@/lib/analytics'
import { tierSlugFromName } from '@/lib/tiers'

// Client island for the bundle "Buy now" path (Stripe Payment Link) so the
// checkout_click event fires from the server-rendered BundleOffer block.
export function BundleBuyButton({ href, name }: { href: string; name: string }) {
  const sku = `bundle-${tierSlugFromName(name)}`
  return (
    <a
      href={href}
      onClick={() => pushEvent('checkout_click', { sku, path: 'buy' })}
      className="inline-flex items-center justify-center gap-2 font-semibold no-underline w-full tracking-[0.01em] rounded-full select-none whitespace-nowrap transition-[background-color,color,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)] active:translate-y-[1px] h-[52px] px-7 text-[15.5px] bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)] hover:text-[var(--color-ivory)]"
    >
      Buy now
    </a>
  )
}
