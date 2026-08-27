import { FD_HERO_CSS, FD_HERO_HTML } from './frontDeskHeroMarkup'

// The AI Front Desk "living diagram" hero, delivered by Claude Design
// (2026-08): an ambient switchboard with three featured call scenarios
// (booking / text quote / emergency handoff) and a typed transcript strip,
// looping seamlessly over 36s. Pure CSS + SVG, zero JS, honors
// prefers-reduced-motion, and compacts to a vertical layout under 700px.
//
// The markup is our own trusted design-handoff content rendered verbatim
// (see frontDeskHeroMarkup.ts); converting ~24KB of hand-tuned SVG to JSX
// would only invite transcription bugs. Server component: ships no JS.
//
// The animation styles itself via --anim-* custom properties whose defaults
// target the #14120E dark band, so the section pins that band color rather
// than inheriting a tone that might rotate light.

export function FrontDeskHero() {
  return (
    <section aria-label="How the AI Front Desk routes calls" style={{ background: '#14120E' }}>
      <style dangerouslySetInnerHTML={{ __html: FD_HERO_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: FD_HERO_HTML }} />
    </section>
  )
}
