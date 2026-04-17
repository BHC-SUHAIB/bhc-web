import { Hero } from './Hero'
import { Services } from './Services'
import { Pricing } from './Pricing'
import { FeaturedProjects } from './FeaturedProjects'
import { Testimonials } from './Testimonials'
import { Stats } from './Stats'
import { CTA } from './CTA'
import { RichText } from './RichText'
import { MediaBlock } from './MediaBlock'
import { Faq } from './Faq'
import type { Page } from '@/payload-types'

type Block = NonNullable<Page['layout']>[number]

export function RenderBlocks({ blocks }: { blocks: Block[] }) {
  if (!blocks?.length) return null

  return (
    <>
      {blocks.map((b, i) => {
        const key = (b as { id?: string }).id ?? String(i)
        switch (b.blockType) {
          case 'hero':            return <Hero key={key} {...b} />
          case 'services':        return <Services key={key} {...b} />
          case 'pricing':         return <Pricing key={key} {...b} />
          case 'featuredProjects': return <FeaturedProjects key={key} {...b} />
          case 'testimonials':    return <Testimonials key={key} {...b} />
          case 'stats':           return <Stats key={key} {...b} />
          case 'cta':             return <CTA key={key} {...b} />
          case 'richText':        return <RichText key={key} {...b} />
          case 'mediaBlock':      return <MediaBlock key={key} {...b} />
          case 'faq':             return <Faq key={key} {...b} />
          default:                return null
        }
      })}
    </>
  )
}
