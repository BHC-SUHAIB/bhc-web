'use client'

import { useEffect } from 'react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[frontend] boundary error', error)
  }, [error])

  return (
    <div className="flex-1 flex items-center">
      <Container size="xl" className="py-24 sm:py-32">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
            Something broke
          </p>
          <h1 className="font-serif font-semibold text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em]">
            We hit a snag.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.55] text-[var(--color-fg-muted)]">
            The page didn&rsquo;t render. This has been logged on our side. You can try again, or
            head back to the home page.
          </p>
          {error.digest ? (
            <p className="mt-4 font-mono text-[11px] tracking-[0.1em] text-[var(--color-fg-muted)]">
              Ref: {error.digest}
            </p>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-3">
            <Button onClick={reset} variant="primary" size="md">Try again</Button>
            <Button href="/" variant="ghost" size="md">Home</Button>
          </div>
        </div>
      </Container>
    </div>
  )
}
