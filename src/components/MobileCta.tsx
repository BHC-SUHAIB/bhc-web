'use client'

import { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'
import { pushEvent } from '@/lib/analytics'
import { phoneHref } from '@/lib/contact'

// Sticky mobile conversion bar. Slides up after the visitor scrolls past the
// hero (~520px) and stays pinned to the bottom of the viewport. Hidden at
// >=760px via the `.mobile-cta` CSS media query, so desktop never sees it.
// Directly targets the two highest-value mobile actions: the lead magnet CTA
// and a tap-to-call. Most of Black Hart's traffic is mobile, so this is a
// high-leverage placement.

type MobileCtaProps = {
  primaryLabel?: string
  primaryHref?: string
  phone?: string | null
}

export function MobileCta({
  primaryLabel = 'Get my free audit',
  primaryHref = '/lp/express-website',
  phone,
}: MobileCtaProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const pHref = phone ? phoneHref(phone) : null

  return (
    <div className={`mobile-cta${show ? ' show' : ''}`} aria-hidden={!show}>
      {pHref ? (
        <a
          href={pHref}
          className="btn btn-outline btn-md btn-call"
          aria-label={`Call ${phone}`}
          tabIndex={show ? 0 : -1}
          onClick={() => pushEvent('phone_click', { location: 'mobile_bar' })}
        >
          <Phone className="size-5" aria-hidden />
        </a>
      ) : null}
      <a
        href={primaryHref}
        className="btn btn-brass btn-md"
        tabIndex={show ? 0 : -1}
        onClick={() => pushEvent('cta_click', { location: 'mobile_bar', label: primaryLabel })}
      >
        {primaryLabel}
      </a>
    </div>
  )
}
