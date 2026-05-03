'use client'

import { Download } from 'lucide-react'
import { pushEventThenNavigate } from '@/lib/analytics'

// "Download the one-pager" button used in Services cards (one per service) and
// any other lead-magnet hookpoint. Click fires a `pdf_download` dataLayer event
// tagged with the source page + the slug of the PDF, so GA4 can attribute
// downloads back to the section/page that surfaced them.

type Props = {
  href: string
  label?: string
  /** Pass a short identifier for the PDF, e.g. "service-website" or "website-checklist". */
  slug: string
  /** Where on the page this download button lives, e.g. "homepage_services" or "homepage_lead_magnet". */
  location: string
  /** Visual style — primary (filled brass) for high-priority lead magnets, ghost (text-only) for inline service-card downloads. */
  variant?: 'primary' | 'ghost'
}

export function PdfDownloadLink({ href, label, slug, location, variant = 'ghost' }: Props) {
  const cls =
    variant === 'primary'
      ? 'inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] px-6 py-3 font-semibold text-[14px] hover:bg-[var(--color-brass-dark)] transition-colors'
      : 'inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--color-brass)] hover:text-[var(--color-brass-dark)] transition-colors'
  return (
    <a
      href={href}
      onClick={(e) =>
        pushEventThenNavigate(
          'pdf_download',
          href,
          {
            source_page: typeof window !== 'undefined' ? window.location.pathname : '',
            location,
            pdf_slug: slug,
          },
          e,
        )
      }
      className={cls}
      // download attribute kept so the browser uses the URL filename hint
      // when Content-Disposition is missing or ignored (defense in depth).
      download
    >
      <Download className="size-4" aria-hidden />
      <span>{label ?? 'Download the one-pager'}</span>
    </a>
  )
}
