'use client'

import { useState } from 'react'
import { BundleConfigurator } from './BundleConfigurator'
import { ContactForm } from './ContactForm'

// Express LP: the interactive bundle configurator + a lead form that captures
// the chosen package. The bundle selection flows into the form submission so
// Suhaib is notified exactly what a visitor bundled.
export function ExpressLeadSection({ contactEmail, contactPhone }: { contactEmail?: string | null; contactPhone?: string | null }) {
  const [summary, setSummary] = useState<string>('')

  return (
    <>
      <BundleConfigurator onSummaryChange={setSummary} ctaTargetId="lp-start" />
      <ContactForm
        {...({
          blockType: 'contactForm',
          eyebrow: 'Start your project',
          headline: 'Tell us what you need.',
          description:
            'Build a package above if you like, then send a note. We reply within one business day with next steps.',
          showCompanyField: true,
          showProjectTypeField: false,
          showBudgetField: false,
          submitLabel: 'Send my request',
          successMessage:
            "Thanks — we've got your request" +
            (summary ? ' and your selected package' : '') +
            ". We'll reply within one business day.",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        anchorId="lp-start"
        bundleSummary={summary || null}
      />
    </>
  )
}
