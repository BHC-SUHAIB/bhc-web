import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { Logo } from '@/components/Logo'
import { getProspect } from '@/lib/prospects'
import { PreviewLoginForm } from './PreviewLoginForm'

// Server-rendered gate page for a single prospect. Reads the slug from the
// URL, looks the prospect up in the manifest, renders a branded password
// form. The form posts to /api/prospects/<slug>/login which sets the
// HMAC-signed cookie and bounces the visitor to ?next= or the default tier.

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ next?: string; error?: string }>
}

function isSafeNext(slug: string, next?: string): string | undefined {
  if (!next) return undefined
  if (!next.startsWith(`/p/${slug}/`)) return undefined
  // Block protocol-relative or off-host shenanigans
  if (next.startsWith('//')) return undefined
  return next
}

export default async function ProspectGatePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { next, error } = await searchParams

  const prospect = getProspect(slug)
  if (!prospect) notFound()

  const errorMessage = error === 'invalid' ? 'Incorrect password.' : null
  const safeNext = isSafeNext(slug, next)

  return (
    <main className="flex-1 flex items-center justify-center py-16 px-6">
      <Container size="sm">
        <div className="max-w-[420px] mx-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10 shadow-[0_24px_60px_-30px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]">
          <div className="flex flex-col items-center text-center mb-8">
            <span aria-label="Black Hart Consulting" className="inline-flex items-center text-[var(--color-fg)] mb-6">
              <Logo variant="primary" height={48} />
            </span>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-brass-text)] mb-3 font-semibold">
              {prospect.label}
            </p>
            <h1 className="font-serif font-semibold text-[clamp(1.5rem,2.4vw,1.85rem)] leading-[1.15] tracking-[-0.02em]">
              Concept preview.
            </h1>
            <p className="mt-3 text-[14px] leading-[1.5] text-[var(--color-fg-muted)] max-w-[36ch]">
              A private preview prepared for {prospect.label}. Enter the
              access password to continue.
            </p>
          </div>

          <PreviewLoginForm slug={slug} next={safeNext} initialError={errorMessage} />
        </div>
      </Container>
    </main>
  )
}
