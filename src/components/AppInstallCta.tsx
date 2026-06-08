import QRCode from 'qrcode'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { ArrowUpRight } from 'lucide-react'

export type AppInstallData = {
  status?: 'none' | 'beta' | 'live' | null
  appName?: string | null
  testFlightUrl?: string | null
  appStoreUrl?: string | null
  platformNote?: string | null
}

// "Try it" install CTA for mobile-app case studies.
//   beta → TestFlight (brass CTA + QR + collapsible install steps)
//   live → App Store (brass CTA + QR)
// Renders nothing unless a usable status + URL are set, so it's safe to drop on
// every project page. Server component: the QR is rendered to inline SVG at
// request time — no client JS, no external image request. Warm Mono theming via
// the global semantic tokens (--color-fg/-muted/-surface/-border/-brass).
export async function AppInstallCta({
  data,
  projectTitle,
}: {
  data?: AppInstallData | null
  projectTitle: string
}) {
  const status = data?.status ?? 'none'
  if (status !== 'beta' && status !== 'live') return null

  const url = (status === 'beta' ? data?.testFlightUrl : data?.appStoreUrl)?.trim()
  if (!url) return null

  const appName = data?.appName?.trim() || projectTitle
  const platformNote = data?.platformNote?.trim() || 'iPhone & iPad · iOS 17+'
  const isBeta = status === 'beta'

  const qrSvg = await QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    color: { dark: '#1A1713', light: '#ffffff' },
  })

  const eyebrow = isBeta ? 'Beta · TestFlight' : 'Available now'
  const heading = isBeta ? `Try ${appName} on your iPhone` : `Get ${appName}`
  const ctaLabel = isBeta ? 'Open in TestFlight' : 'Download on the App Store'

  return (
    <section className="section-tight">
      <Container size="lg">
        <div className="ai-card rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-9">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.2em] uppercase text-[var(--color-brass)]">
              <span aria-hidden className="inline-block h-px w-6 bg-[var(--color-brass)] opacity-70" />
              {eyebrow}
            </span>
            <h3
              className="font-serif font-semibold mt-3"
              style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', lineHeight: 1.14, letterSpacing: '-0.015em' }}
            >
              {heading}
            </h3>
            <p className="mt-2 text-[14px] text-[var(--color-fg-muted)]">{platformNote}</p>

            <div className="mt-5">
              <Button variant="brass" size="lg" href={url} openInNewTab>
                {ctaLabel}
                <ArrowUpRight className="size-4" />
              </Button>
            </div>

            {isBeta ? (
              <details className="ai-steps mt-5">
                <summary className="cursor-pointer select-none inline-flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.13em] uppercase text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors">
                  <span aria-hidden className="chev text-[0.95em] leading-none">&rsaquo;</span>
                  How do I install this?
                </summary>
                <ol className="ai-list mt-3 text-[14px] leading-[1.65] text-[var(--color-fg-muted)]">
                  <li>On your iPhone, install <strong>TestFlight</strong> from the App Store (free, one-time).</li>
                  <li>Tap <strong>Open in TestFlight</strong> above &mdash; or scan the QR with your iPhone camera.</li>
                  <li>Tap <strong>Install</strong>. {appName} lands on your Home Screen like any other app.</li>
                </ol>
                <p className="mt-2 text-[12.5px] text-[var(--color-fg-muted)] opacity-80">
                  Free, and you can delete it anytime. Beta builds are refreshed periodically.
                </p>
              </details>
            ) : null}
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2 self-center sm:self-start">
            <div
              className="ai-qr"
              style={{ background: '#fff', padding: 10, borderRadius: 10, border: '1px solid var(--color-border)' }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <span className="font-mono text-[0.56rem] tracking-[0.16em] uppercase text-[var(--color-fg-muted)]">
              Scan to install
            </span>
          </div>

          <style>{`
            .ai-qr svg { width: 116px; height: 116px; display: block; }
            .ai-steps summary { list-style: none; }
            .ai-steps summary::-webkit-details-marker { display: none; }
            .ai-steps .chev { display: inline-block; transition: transform 0.2s ease; }
            .ai-steps[open] summary .chev { transform: rotate(90deg); }
            .ai-list { list-style: decimal; padding-left: 1.25em; }
            .ai-list li { margin: 0.35em 0; }
            .ai-list strong { color: var(--color-fg); font-weight: 600; }
          `}</style>
        </div>
      </Container>
    </section>
  )
}
