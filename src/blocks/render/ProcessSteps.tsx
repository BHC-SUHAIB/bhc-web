import { Container } from '@/components/Container'

// Numbered "how it works" steps. Renders the exact .steps markup from
// app/components.css (5-up on wide screens), now CMS-driven. If a step's number
// is blank it auto-numbers by position ("01", "02", …).

export type ProcessStepsProps = {
  eyebrow?: string | null
  headline?: string | null
  steps?: Array<{ number?: string | null; title?: string | null; description?: string | null }> | null
}

export function ProcessSteps(b: ProcessStepsProps) {
  const steps = (b.steps ?? []).filter((s) => s?.title)
  if (steps.length === 0) return null

  return (
    <section className="section surface">
      <Container size="xl">
        {b.eyebrow || b.headline ? (
          <div className="section-head reveal-up">
            {b.eyebrow ? (
              <span className="eyebrow eyebrow-row">
                <span className="rule" />
                {b.eyebrow}
              </span>
            ) : null}
            {b.headline ? <h2>{b.headline}</h2> : null}
          </div>
        ) : null}
        <div className={`steps ${steps.length === 5 ? 'cols-5' : ''} reveal-up reveal-d1`} data-reveal-stagger>
          {steps.map((s, i) => (
            <div key={i} className="step">
              <div className="num">{s.number || String(i + 1).padStart(2, '0')}</div>
              <h4>{s.title}</h4>
              {s.description ? <p>{s.description}</p> : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
