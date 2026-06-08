import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { AppInstallCta } from '@/components/AppInstallCta'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'App install CTA — preview',
  robots: { index: false, follow: false },
}

// TEMP review-only route (dev). Renders <AppInstallCta> in both states with
// sample data so it can be reviewed on dev.blackhartconsulting.com without CMS
// content — the dev DB is overwritten by the prod snapshot every ~15 min, so a
// code-driven preview is the durable way to see it. DELETE this route at the
// dev→prod push; the real CTA renders on case studies via the Projects
// `appInstall` group, not here.
export default function AppCtaPreviewPage() {
  return (
    <div className="lp-pad-bottom">
      <section className="section-tight">
        <Container size="lg">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-[var(--color-brass)]">
            Review preview · not indexed · remove before prod
          </p>
          <h1
            className="font-serif font-semibold mt-2"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', letterSpacing: '-0.02em' }}
          >
            App install CTA
          </h1>
          <p className="mt-3 text-[15px] text-[var(--color-fg-muted)] max-w-prose">
            How the &ldquo;try it&rdquo; block looks on a mobile-app case study. First: a beta build
            (TestFlight, with QR + install steps). Second: a shipped build (App Store). On real case
            studies this is driven by each project&rsquo;s{' '}
            <span className="font-mono text-[13px]">App install CTA</span> fields.
          </p>
        </Container>
      </section>

      <AppInstallCta
        projectTitle="Misbah"
        data={{
          status: 'beta',
          appName: 'Misbah',
          testFlightUrl: 'https://testflight.apple.com/join/XXXXXXXX',
          platformNote: 'iPhone & iPad · iOS 17+',
        }}
      />

      <AppInstallCta
        projectTitle="Misbah"
        data={{
          status: 'live',
          appName: 'Misbah',
          appStoreUrl: 'https://apps.apple.com/app/id0000000000',
        }}
      />
    </div>
  )
}
