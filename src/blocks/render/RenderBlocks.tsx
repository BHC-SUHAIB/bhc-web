import { Hero } from './Hero'
import { FoundingClient } from './FoundingClient'
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
import { getCachedSiteSettings } from '@/lib/payload-cache'
import type { Page, SiteSetting } from '@/payload-types'

// Block union derived from Pages — LandingPages uses the same allBlocks set,
// so its layout is structurally identical at runtime. We accept either via a
// shared block type and let the discriminated `blockType` switch dispatch.
export type RenderBlock = NonNullable<Page['layout']>[number]

export async function RenderBlocks({ blocks }: { blocks: RenderBlock[] }) {
  if (!blocks?.length) return null

  // Only fetch siteSettings if a block on the page actually needs it.
  // Keeps simple pages from paying for a DB read they don't use.
  const needsSiteSettings = blocks.some((b) => b.blockType === 'contactForm')
  const siteSettings: SiteSetting | null = needsSiteSettings ? await getCachedSiteSettings() : null

  return (
    <>
      {blocks.map((b, i) => {
        const key = (b as { id?: string }).id ?? String(i)
        switch (b.blockType) {
          case 'hero':            return <Hero key={key} {...b} />
          case 'foundingClient':  return <FoundingClient key={key} {...b} />
          case 'bundleOffer':     return <BundleOffer key={key} {...b} />
          case 'calendlyBooking': return <CalendlyBooking key={key} {...b} />
          case 'services':        return <Services key={key} {...b} />
          case 'pricing':         return <Pricing key={key} {...b} />
          case 'featuredProjects': return <FeaturedProjects key={key} {...b} />
          case 'testimonials':    return <Testimonials key={key} {...b} />
          case 'stats':           return <Stats key={key} {...b} />
          case 'cta':             return <CTA key={key} {...b} />
          case 'leadMagnet':      return <LeadMagnet key={key} {...b} />
          case 'richText':        return <RichText key={key} {...b} />
          case 'mediaBlock':      return <MediaBlock key={key} {...b} />
          case 'faq':             return <Faq key={key} {...b} />
          case 'contactForm':     return (
            <ContactForm
              key={key}
              {...b}
              contactEmail={siteSettings?.contactEmail ?? null}
              contactPhone={siteSettings?.contactPhone ?? null}
            />
          )
          default:                return null
        }
      })}
    </>
  )
}
