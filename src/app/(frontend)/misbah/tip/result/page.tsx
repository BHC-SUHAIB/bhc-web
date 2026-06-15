import type { Metadata } from 'next'
import { Container } from '@/components/Container'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Thank you — Misbah',
  robots: { index: false, follow: false },
}

// Landing page after the Misbah tip Checkout (success / cancel / error). Reached
// only via Stripe redirect from /misbah/tip; noindex + not linked anywhere.
export default async function MisbahTipResultPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const { ok, error } = await searchParams
  const success = ok === '1'

  return (
    <div className="pb-20">
      <Container size="md" className="py-24 sm:py-32 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--color-fg-muted)] mb-5">
          Misbah
        </p>
        <h1
          className="font-serif font-semibold"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}
        >
          {success ? 'Thank you 🤍' : 'No worries 🤍'}
        </h1>
        <p className="mt-6 text-[17px] leading-[1.6] text-[var(--color-fg-muted)] max-w-prose mx-auto">
          {success
            ? 'Your support means a lot — it helps keep Misbah free, private, and ad-free for everyone. You can close this tab and head back to the app.'
            : error === '1'
              ? 'Something went wrong starting the checkout — no charge was made. Please try again from the app, or just close this tab.'
              : 'No tip was taken — thank you for trying Misbah all the same. You can close this tab and head back to the app.'}
        </p>
      </Container>
    </div>
  )
}
