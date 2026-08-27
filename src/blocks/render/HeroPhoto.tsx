import { ParallaxBackground } from './ParallaxBackground'
import { ShieldCheck, Check, Zap } from 'lucide-react'
import { Container } from '@/components/Container'
import { stripUnsplashFixedWidth } from '@/lib/unsplash'

// Full-bleed photo hero for landing pages (the "Express" mockup hero). Renders
// the exact .hero-photo markup from app/components.css, now CMS-driven: eyebrow,
// headline, lede, background photo, up to two buttons, and a small trust row.

const DEFAULT_HERO_BG = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80'

const ICONS = { shield: ShieldCheck, check: Check, zap: Zap } as const

export type HeroPhotoProps = {
  eyebrow?: string | null
  headline?: string | null
  subheadline?: string | null
  backgroundImageUrl?: string | null
  ctas?: Array<{ label?: string | null; href?: string | null; style?: 'brass' | 'onphoto' | null }> | null
  trustItems?: Array<{ icon?: 'shield' | 'check' | 'zap' | null; label?: string | null }> | null
}

export function HeroPhoto(b: HeroPhotoProps) {
  const heroBg = stripUnsplashFixedWidth(String(b.backgroundImageUrl || DEFAULT_HERO_BG))
  const ctas = (b.ctas ?? []).filter((c) => c?.label && c?.href)
  const trust = (b.trustItems ?? []).filter((t) => t?.label)

  return (
    <section className="hero-photo" aria-label="Offer">
      <div className="hp-bg">
        <ParallaxBackground src={heroBg} sizes="100vw" priority />
      </div>
      <Container size="xl" className="hp-inner">
        {b.eyebrow ? (
          <span className="eyebrow eyebrow-row">
            <span className="rule" />
            {b.eyebrow}
          </span>
        ) : null}
        {b.headline ? <h1>{b.headline}</h1> : null}
        {b.subheadline ? <p className="lede">{String(b.subheadline)}</p> : null}
        {ctas.length > 0 ? (
          <div className="cta-row">
            {ctas.map((c, i) => {
              const onPhoto = c.style === 'onphoto'
              return (
                <a key={i} className={`btn ${onPhoto ? 'btn-onphoto' : 'btn-brass'} btn-lg`} href={c.href as string}>
                  {c.label}
                  {onPhoto ? null : (
                    <>
                      {' '}
                      <span aria-hidden>→</span>
                    </>
                  )}
                </a>
              )
            })}
          </div>
        ) : null}
        {trust.length > 0 ? (
          <div className="trust-row">
            {trust.map((t, i) => {
              const Icon = ICONS[(t.icon ?? 'check') as keyof typeof ICONS] ?? Check
              return (
                <span key={i} className="trust-item">
                  <Icon aria-hidden /> {t.label}
                </span>
              )
            })}
          </div>
        ) : null}
      </Container>
    </section>
  )
}
