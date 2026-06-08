// Horizontal strip of headline guarantees (e.g. "14 days · kickoff to launch").
// Renders the exact .guarantee-strip markup from app/components.css, now driven
// by an editable array of value/label pairs.

export type GuaranteeStripProps = {
  items?: Array<{ value?: string | null; label?: string | null }> | null
}

export function GuaranteeStrip(b: GuaranteeStripProps) {
  const items = (b.items ?? []).filter((i) => i?.value || i?.label)
  if (items.length === 0) return null

  return (
    <div className="guarantee-strip reveal-up">
      {items.map((g, i) => (
        <div key={i} className="g">
          <b>{g.value}</b>
          <span>{g.label}</span>
        </div>
      ))}
    </div>
  )
}
