import { Container } from '@/components/Container'
import { Check } from 'lucide-react'
import {
  IconCompass, IconSearch, IconPhoneRing, IconStack, IconCrown,
  IconGauge, IconShield, IconPen, IconEye,
} from '@/components/BrandIcons'
import { PdfDownloadLink } from './PdfDownloadLink'
import { cn } from '@/lib/utils'
import type { ServicesBlock } from '@/payload-types'

// CMS icon keys mapped onto the animated brand icon set (2026-08) so these
// cards draw in and play their hover gestures like every other icon on the
// site. Closest semantic match per legacy lucide key.
const icons = {
  globe: IconCompass,
  search: IconSearch,
  smartphone: IconPhoneRing,
  server: IconStack,
  sparkles: IconCrown,
  zap: IconGauge,
  shield: IconShield,
  code: IconPen,
  lightbulb: IconEye,
} as const

export function Services(b: ServicesBlock) {
  return (
    <section className="section">
      <Container size="xl">
        <div className="section-head">
          {b.eyebrow ? (
            <span className="eyebrow eyebrow-row">
              <span className="rule" />
              {b.eyebrow}
            </span>
          ) : null}
          <h2>{b.headline}</h2>
          {b.description ? <p className="lede">{b.description}</p> : null}
        </div>

        <div className={cn('svc-grid', b.items?.length === 3 && 'svc-grid--3')}>
          {b.items?.map((item, i) => {
            const Icon = item.icon ? icons[item.icon as keyof typeof icons] : null
            return (
              <div key={i} className="svc group">
                {Icon ? (
                  <div className="ic">
                    <Icon />
                  </div>
                ) : null}
                <h3>{item.title}</h3>
                {item.description ? <p>{item.description}</p> : null}
                {item.bullets && item.bullets.length > 0 ? (
                  <ul>
                    {item.bullets.map((bl, j) => (
                      <li key={j}>
                        <Check />
                        <span>{bl.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {item.downloadHref ? (
                  <div className="mt-auto w-full pt-8">
                    <div className="border-t border-[var(--color-border)] pt-3">
                      <PdfDownloadLink
                        href={item.downloadHref}
                        label={item.downloadLabel ?? 'Download the one-pager'}
                        slug={item.downloadHref.split('/').pop() ?? 'service'}
                        location="services_card"
                        variant="ghost"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
