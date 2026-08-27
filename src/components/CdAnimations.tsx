// Server-component wrappers for the Claude Design animation handoff
// (2026-08). Each renders its extracted CSS + SVG snippet verbatim: zero JS,
// prefers-reduced-motion complete, colors driven by --anim-* custom
// properties whose defaults target the #14120E dark band, so the section
// animations pin that band rather than inherit a rotating tone.
// See frontDeskHeroMarkup.ts's sibling *Markup.ts files for provenance.

import { BT_CSS, BT_HTML } from './buildTimelineMarkup'
import { WA_CSS, WA_HTML } from './websiteAssemblyMarkup'
import { PL_CSS, PL_HTML } from './processLoopMarkup'
import { AM_CSS, AM_DRAWIN_HTML } from './antlerDrawInMarkup'

/** 7-day website build timeline (services page, under the website tiers). */
export function BuildTimeline() {
  return (
    <section aria-label="The 7-day website build, step by step" style={{ background: '#14120E' }}>
      <style dangerouslySetInnerHTML={{ __html: BT_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: BT_HTML }} />
    </section>
  )
}

/** A website assembling itself in a browser frame (/free-demo-site hero). */
export function WebsiteAssembly() {
  return (
    <section aria-label="A demo website assembling itself" style={{ background: '#14120E' }}>
      <style dangerouslySetInnerHTML={{ __html: WA_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: WA_HTML }} />
    </section>
  )
}

/** "Runs while you work" ambient process loop (automation page). */
export function ProcessLoop() {
  return (
    <section aria-label="An automated process running on its own" style={{ background: '#14120E' }}>
      <style dangerouslySetInnerHTML={{ __html: PL_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: PL_HTML }} />
    </section>
  )
}

/** The antler mark drawing itself in (404 page; plays once on load).
    Inherits currentColor for the fill; size via the className/width of the
    wrapping element. */
export function AntlerDrawIn({ className }: { className?: string }) {
  return (
    <div className={className}>
      <style dangerouslySetInnerHTML={{ __html: AM_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: AM_DRAWIN_HTML }} />
    </div>
  )
}
