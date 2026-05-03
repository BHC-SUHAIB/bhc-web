import { Container } from '@/components/Container'
import { FileText } from 'lucide-react'
import { PdfDownloadLink } from './PdfDownloadLink'
import type { LeadMagnetBlock } from '@/payload-types'

// Lead-magnet card — surfaces a downloadable PDF (typically the
// "small business website checklist") on conversion pages. Designed as a
// low-friction CTA: visitor doesn't have to book a call or fill a form —
// they just download something useful, and the click fires a `pdf_download`
// event we can target as a soft conversion in Google Ads.

export function LeadMagnet(b: LeadMagnetBlock) {
  const slug = b.downloadHref?.split('/').pop() ?? 'lead-magnet'
  return (
    <section className="py-12 sm:py-16">
      <Container size="lg">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-brass)] bg-[color-mix(in_srgb,var(--color-brass)_8%,var(--color-bg))] p-8 sm:p-10 md:flex md:items-center md:gap-10">
          <div className="md:flex-1">
            {b.eyebrow ? (
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-brass)] mb-3 font-semibold">
                {b.eyebrow}
              </p>
            ) : null}
            <h2 className="font-serif font-semibold text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.15] tracking-[-0.02em] flex items-center gap-3">
              <FileText className="size-6 text-[var(--color-brass)] shrink-0" aria-hidden />
              <span>{b.headline}</span>
            </h2>
            {b.description ? (
              <p className="mt-3 text-[15px] leading-[1.55] text-[var(--color-fg-muted)] max-w-xl">
                {b.description}
              </p>
            ) : null}
          </div>
          <div className="mt-6 md:mt-0 md:shrink-0 flex flex-col items-start md:items-center gap-2">
            <PdfDownloadLink
              href={b.downloadHref ?? '#'}
              label={b.downloadLabel ?? 'Download the free checklist'}
              slug={slug}
              location="lead_magnet_block"
              variant="primary"
            />
            {b.fineprint ? (
              <span className="text-[12px] text-[var(--color-fg-muted)]">{b.fineprint}</span>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  )
}
