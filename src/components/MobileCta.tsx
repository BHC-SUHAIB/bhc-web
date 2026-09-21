'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquare, Phone } from 'lucide-react'
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

  // Page-aware defaults (2026-09-21): this bar is mounted once in the layout
  // with the audit defaults, so on the ad landing page it pointed paid
  // visitors AWAY from the demo they clicked for. On /free-demo-site the
  // primary action jumps to the demo form and the call icon becomes a
  // tap-to-text: Clarity showed phone visitors sitting on the page for
  // minutes without a tap, and a text is a smaller ask than a call or a form.
  const pathname = usePathname()
  const onDemoPage = pathname === '/free-demo-site'
  const label = onDemoPage ? 'Get my free demo' : primaryLabel
  const href = onDemoPage ? '#demo-request' : primaryHref

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const pHref = phone ? phoneHref(phone) : null
  // sms:+1866...?&body=... is the form iOS and Android both accept.
  const smsHref = pHref
    ? `sms:${pHref.replace(/^tel:/, '')}?&body=${encodeURIComponent('Hi, I would like a free demo site. My business is: ')}`
    : null

  return (
    <div className={`mobile-cta${show ? ' show' : ''}`} aria-hidden={!show}>
      {onDemoPage && smsHref ? (
        <a
          href={smsHref}
          className="btn btn-outline btn-md btn-call"
          aria-label="Text us your business name for a free demo"
          tabIndex={show ? 0 : -1}
          onClick={() => pushEvent('sms_click', { location: 'mobile_bar', source_page: pathname })}
        >
          <MessageSquare className="size-5" aria-hidden />
        </a>
      ) : pHref ? (
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
        href={href}
        className="btn btn-brass btn-md"
        tabIndex={show ? 0 : -1}
        onClick={() => pushEvent('cta_click', { location: 'mobile_bar', label })}
      >
        {label}
      </a>
    </div>
  )
}
