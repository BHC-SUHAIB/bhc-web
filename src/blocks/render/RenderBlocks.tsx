import React from 'react'
import { Hero } from './Hero'
import { BundleOffer } from './BundleOffer'
import { CalendlyBooking } from './CalendlyBooking'
import { Services } from './Services'
import { Pricing } from './Pricing'
import { FeaturedProjects } from './FeaturedProjects'
import { Testimonials } from './Testimonials'
import { Stats } from './Stats'
import { CTA } from './CTA'
import { LeadMagnet } from './LeadMagnet'
import { RichText } from './RichText'
import { MediaBlock } from './MediaBlock'
import { Faq } from './Faq'
import { ContactForm } from './ContactForm'
import { SiteAuditTool } from './SiteAuditTool'
import { HeroPhoto, type HeroPhotoProps } from './HeroPhoto'
import { GuaranteeStrip, type GuaranteeStripProps } from './GuaranteeStrip'
import { ProcessSteps, type ProcessStepsProps } from './ProcessSteps'
import { AnimatedStats, type AnimatedStatsProps } from './AnimatedStats'
import { BundleConfiguratorBlock, type BundleConfiguratorBlockProps } from './BundleConfiguratorBlock'
import { OutcomeCards, type OutcomeCardsProps } from './OutcomeCards'
import { PhoneDemo, type PhoneDemoProps } from './PhoneDemo'
import { Guarantees, type GuaranteesProps } from './Guarantees'
import { DemoRequestForm, type DemoRequestFormProps } from './DemoRequestForm'
import { MobileCta } from '@/components/MobileCta'

// Sentinel eyebrow that flips a contactForm block over to the interactive
// PageSpeed audit tool.
const PAGESPEED_AUDIT_EYEBROW = 'PageSpeed audit'
import { getCachedSiteSettings } from '@/lib/payload-cache'
import type { Page, SiteSetting } from '@/payload-types'

export type RenderBlock = NonNullable<Page['layout']>[number]

const PRICING_MENU_RE = /full pricing menu/i

// phoneOverride lets the LP route group display a different phone number than
// SiteSettings.contactPhone. pageSlug enables page-aware behavior:
//   - home    → alternating dark/light section tones; fold the "full pricing
//               menu" CTA into the Pricing section; keep the PageSpeed audit.
//   - contact → render a real contact form (anchor #contact-form) in place of
//               the audit sentinel; repoint the hero's now-dead #audit CTA.
export async function RenderBlocks({
  blocks,
  phoneOverride,
  pageSlug,
}: {
  blocks: RenderBlock[]
  phoneOverride?: string
  pageSlug?: string
}) {
  if (!blocks?.length) return null

  const isHome = pageSlug === 'home'
  const isContact = pageSlug === 'contact'

  const needsSiteSettings = blocks.some(
    (b) => b.blockType === 'contactForm' || b.blockType === 'hero' || b.blockType === 'bundleConfigurator',
  )
  const siteSettings: SiteSetting | null = needsSiteSettings ? await getCachedSiteSettings() : null
  const effectivePhone = phoneOverride ?? siteSettings?.contactPhone ?? null

  // Home: fold the standalone "Want the full pricing menu?" CTA into Pricing.
  let list = isHome
    ? blocks.filter(
        (b) => !(b.blockType === 'cta' && typeof (b as { headline?: unknown }).headline === 'string' && PRICING_MENU_RE.test((b as { headline: string }).headline)),
      )
    : blocks

  if (isHome) {
    // Move the "Free Resource" lead magnet up to just after "What we do"
    // (Services) so it no longer sits right next to the Calendly band — the
    // two stacked together read too similarly.
    const arr = [...list]
    const lmIdx = arr.findIndex((b) => b.blockType === 'leadMagnet')
    const svcIdx = arr.findIndex((b) => b.blockType === 'services')
    if (lmIdx > -1 && svcIdx > -1 && lmIdx > svcIdx) {
      const [lm] = arr.splice(lmIdx, 1)
      arr.splice(svcIdx + 1, 0, lm)
      list = arr
    }
  }

  function renderOne(b: RenderBlock): React.ReactNode {
    switch (b.blockType) {
      case 'hero': {
        // Contact page no longer has an #audit section — repoint that hero CTA
        // to the on-page contact form so it doesn't dead-link.
        let hb = b
        if (isContact && Array.isArray(b.ctas)) {
          hb = {
            ...b,
            ctas: b.ctas.map((c) =>
              c?.href === '#audit' ? { ...c, href: '#contact-form', label: 'Send a message' } : c,
            ),
          }
        }
        return <Hero {...hb} phoneOverride={phoneOverride} />
      }
      case 'bundleOffer': return <BundleOffer {...b} />
      case 'calendlyBooking': return <CalendlyBooking {...b} />
      case 'services': return <Services {...b} />
      case 'pricing':
        return (
          <Pricing
            {...b}
            {...(isHome && b.eyebrow === 'Pricing'
              ? { seeAllHref: '/services#website-packages', seeAllLabel: 'See all packages & pricing' }
              : {})}
          />
        )
      case 'featuredProjects': return <FeaturedProjects {...b} />
      case 'testimonials': return <Testimonials {...b} />
      case 'stats': return <Stats {...b} />
      case 'cta': return <CTA {...b} />
      case 'leadMagnet': return <LeadMagnet {...b} />
      case 'richText': return <RichText {...b} />
      case 'mediaBlock': return <MediaBlock {...b} />
      case 'faq': return <Faq {...b} />
      case 'contactForm': {
        const isAudit = b.eyebrow === PAGESPEED_AUDIT_EYEBROW
        // Non-contact pages (home, LPs) keep the audit tool for the sentinel.
        if (isAudit && !isContact) {
          return <SiteAuditTool eyebrow={b.eyebrow} headline={b.headline} description={b.description} />
        }
        // Contact page: render a real inquiry form. If it was the audit sentinel,
        // swap in form-appropriate copy and force the #contact-form anchor.
        const overridden =
          isAudit && isContact
            ? {
                ...b,
                eyebrow: 'Project inquiry',
                headline: 'Tell us about your project.',
                description:
                  'Name and email are all we need — the more you share, the sharper our first reply.',
                showCompanyField: true,
                showProjectTypeField: true,
                showBudgetField: false,
              }
            : b
        return (
          <ContactForm
            {...overridden}
            contactEmail={siteSettings?.contactEmail ?? null}
            contactPhone={effectivePhone}
            anchorId={isContact ? 'contact-form' : undefined}
          />
        )
      }
      // ── Pricing-reset blocks (2026-08) ──────────────────────────────────
      case 'outcomeCards':
        return <OutcomeCards {...(b as unknown as OutcomeCardsProps)} />
      case 'phoneDemo':
        return <PhoneDemo {...(b as unknown as PhoneDemoProps)} />
      case 'guarantees':
        return <Guarantees {...(b as unknown as GuaranteesProps)} />
      case 'demoRequestForm':
        return <DemoRequestForm {...(b as unknown as DemoRequestFormProps)} />
      // ── Express landing-page blocks ─────────────────────────────────────
      case 'heroPhoto':
        return <HeroPhoto {...(b as unknown as HeroPhotoProps)} />
      case 'guaranteeStrip':
        return <GuaranteeStrip {...(b as unknown as GuaranteeStripProps)} />
      case 'processSteps':
        return <ProcessSteps {...(b as unknown as ProcessStepsProps)} />
      case 'animatedStats':
        return <AnimatedStats {...(b as unknown as AnimatedStatsProps)} />
      case 'siteAuditTool': {
        const s = b as unknown as { eyebrow?: string | null; headline?: string | null; description?: string | null }
        return <SiteAuditTool eyebrow={s.eyebrow} headline={s.headline} description={s.description} />
      }
      case 'bundleConfigurator':
        return (
          <BundleConfiguratorBlock
            {...(b as unknown as BundleConfiguratorBlockProps)}
            contactEmail={siteSettings?.contactEmail ?? null}
            contactPhone={effectivePhone ?? undefined}
          />
        )
      case 'mobileCta': {
        const m = b as unknown as { primaryLabel?: string | null; primaryHref?: string | null; phone?: string | null }
        return (
          <MobileCta
            primaryLabel={m.primaryLabel ?? undefined}
            primaryHref={m.primaryHref ?? undefined}
            phone={m.phone || effectivePhone || null}
          />
        )
      }
      default: return null
    }
  }

  return (
    <>
      {list.map((b, i) => {
        const key = (b as { id?: string }).id ?? String(i)
        const node = renderOne(b)
        if (node == null) return null
        if (isHome) {
          // Alternate section tones down the homepage.
          return (
            <div key={key} className={i % 2 === 0 ? 'tone-a' : 'tone-b'}>
              {node}
            </div>
          )
        }
        return <React.Fragment key={key}>{node}</React.Fragment>
      })}
    </>
  )
}
