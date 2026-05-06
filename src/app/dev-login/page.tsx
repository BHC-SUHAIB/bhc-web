import { Container } from '@/components/Container'
import { Logo } from '@/components/Logo'
import { DevLoginForm } from './DevLoginForm'

export const dynamic = 'force-dynamic'

type SearchParams = { error?: string; next?: string }

export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { error, next } = await searchParams
  const errorMessage = error === 'invalid' ? 'Incorrect password.' : null

  return (
    <main className="flex-1 flex items-center justify-center py-16 px-6">
      <Container size="sm">
        <div className="max-w-[420px] mx-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10 shadow-[0_24px_60px_-30px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]">
          <div className="flex flex-col items-center text-center mb-8">
            <span aria-label="Black Hart Consulting" className="inline-flex items-center text-[var(--color-fg)] mb-6">
              <Logo variant="primary" height={48} />
            </span>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-brass-text)] mb-3 font-semibold">
              Dev environment
            </p>
            <h1 className="font-serif font-semibold text-[clamp(1.5rem,2.4vw,1.85rem)] leading-[1.15] tracking-[-0.02em]">
              Restricted preview.
            </h1>
            <p className="mt-3 text-[14px] leading-[1.5] text-[var(--color-fg-muted)] max-w-[36ch]">
              This is the staging environment. Enter the access password to
              continue, or visit{' '}
              <a
                href="https://blackhartconsulting.com"
                className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-brass)]"
              >
                blackhartconsulting.com
              </a>{' '}
              for the live site.
            </p>
          </div>

          <DevLoginForm next={next} initialError={errorMessage} />
        </div>
      </Container>
    </main>
  )
}
