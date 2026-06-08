'use client'

import { useState } from 'react'
import { BundleConfigurator, type Opt } from './BundleConfigurator'
import { ContactForm } from './ContactForm'

// CMS-driven version of the Express bundle section: the interactive
// configurator + a lead form that captures the chosen package. The selection
// flows into the form submission so Suhaib is notified exactly what a visitor
// bundled. Options + copy come from the bundleConfigurator block; contactEmail /
// contactPhone are injected by RenderBlocks (SiteSettings + LP phone override).

export type BundleConfiguratorBlockProps = {
  eyebrow?: string | null
  headline?: string | null
  description?: string | null
  options?: Array<{
    name?: string | null
    description?: string | null
    cost?: string | null
    once?: number | null
    monthly?: number | null
    save?: number | null
    required?: boolean | null
    defaultOn?: boolean | null
  }> | null
  formId?: string | null
  formHeading?: string | null
  formDescription?: string | null
  submitLabel?: string | null
  successMessage?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
}

export function BundleConfiguratorBlock(b: BundleConfiguratorBlockProps) {
  const [summary, setSummary] = useState<string>('')
  const formId = b.formId || 'lp-start'

  const opts: Opt[] = (b.options ?? [])
    .filter((o) => o?.name && o?.cost)
    .map((o, i) => ({
      id: String(i),
      name: String(o.name),
      desc: o.description ?? '',
      cost: String(o.cost),
      once: o.once ?? undefined,
      monthly: o.monthly ?? undefined,
      save: o.save ?? undefined,
      required: !!o.required,
      defaultOn: !!o.defaultOn,
    }))

  return (
    <>
      <BundleConfigurator
        onSummaryChange={setSummary}
        ctaTargetId={formId}
        options={opts.length > 0 ? opts : undefined}
        eyebrow={b.eyebrow ?? undefined}
        headline={b.headline ?? undefined}
        description={b.description ?? undefined}
      />
      <ContactForm
        {...({
          blockType: 'contactForm',
          eyebrow: 'Start your project',
          headline: b.formHeading || 'Tell us what you need.',
          description:
            b.formDescription ||
            'Build a package above if you like, then send a note. We reply within one business day with next steps.',
          showCompanyField: true,
          showProjectTypeField: true,
          showBudgetField: false,
          submitLabel: b.submitLabel || 'Send my request',
          successMessage: b.successMessage || "Thanks — we've got your request. We'll reply within one business day.",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)}
        contactEmail={b.contactEmail ?? null}
        contactPhone={b.contactPhone ?? null}
        anchorId={formId}
        bundleSummary={summary || null}
      />
    </>
  )
}
