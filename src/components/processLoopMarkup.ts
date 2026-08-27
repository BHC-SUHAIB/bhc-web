// AUTO-EXTRACTED from the Claude Design handoff bundle
// (design_handoff_bhc_animations/process-loop.html, 2026-08). Zero-JS CSS+SVG
// animation; do not hand-edit, re-extract if the design is revised.

export const PL_CSS = `
.pl-hero{
  --anim-bg:#14120E;
  --anim-fg:#EFE9D9;
  --anim-muted:#ABA290;
  --anim-accent:#C9A36B;
  --anim-border:rgba(239,233,217,.18);
  --ez:cubic-bezier(.22,1,.36,1);
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  max-width:720px;margin:0 auto;padding:clamp(20px,4vw,48px) clamp(14px,3vw,36px);
}
.pl-hero svg{display:block;width:100%;height:auto}

.pl-hero .track{fill:none;stroke:var(--anim-border);stroke-width:1.5}
.pl-hero .orbit{fill:none;stroke:var(--anim-accent);stroke-width:2.5;stroke-linecap:round}
.pl-hero .orbit-glow{fill:none;stroke:var(--anim-accent);stroke-width:5.5;stroke-linecap:round;opacity:.15}
.pl-hero .disc{fill:var(--anim-bg);stroke:var(--anim-border);stroke-width:1.5}
.pl-hero .stR{fill:none;stroke:var(--anim-accent);stroke-width:1.5}
.pl-hero .stI{fill:none;stroke:var(--anim-fg);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.pl-hero .chipr{fill:var(--anim-bg);stroke:var(--anim-accent);stroke-opacity:.8;stroke-width:1.25}
.pl-hero .t-lbl{fill:var(--anim-muted);font:500 11px var(--mono);letter-spacing:.16em}
.pl-hero .t-chip{fill:var(--anim-accent);font:500 9.5px var(--mono);letter-spacing:.06em}
.pl-hero .t-center{fill:var(--anim-fg);font:600 13px var(--mono);letter-spacing:.18em}

.pl-hero .orbit,.pl-hero .orbit-glow{animation:plOrbit 10s linear infinite}
.pl-hero .stR{animation:plRing 10s var(--ez) infinite}
.pl-hero .stI{animation:plIcon 10s var(--ez) infinite}
.pl-hero .stchip{animation:plChip 10s var(--ez) infinite}
.pl-hero .t-center{animation:plBreath 3.333s ease-in-out infinite}
.pl-hero .dN,.pl-hero .dN .stI{animation-delay:0s}
.pl-hero .dE,.pl-hero .dE .stI{animation-delay:-7.5s}
.pl-hero .dS,.pl-hero .dS .stI{animation-delay:-5s}
.pl-hero .dW,.pl-hero .dW .stI{animation-delay:-2.5s}

/* 10s lap; 1s = 10%. Station cycle: light on pass, hold, quiet by 78%. */
@keyframes plOrbit{from{stroke-dashoffset:0}to{stroke-dashoffset:-100}}
@keyframes plRing{0%{opacity:0}3%{opacity:1}62%{opacity:1}78%,100%{opacity:0}}
@keyframes plIcon{
  0%{stroke-dashoffset:40;opacity:1}
  5%{stroke-dashoffset:40}
  11%{stroke-dashoffset:0}
  62%{opacity:1}
  78%{opacity:0}
  99.9%{stroke-dashoffset:0}
  100%{stroke-dashoffset:40;opacity:0}
}
@keyframes plChip{
  0%,6%{opacity:0;transform:translate(0,3px)}
  7%{opacity:1;transform:translate(0,0)}
  8%{opacity:.35}
  9.5%{opacity:1}
  62%{opacity:1}
  78%,100%{opacity:0;transform:translate(0,0)}
}
@keyframes plBreath{0%,100%{opacity:1}50%{opacity:.55}}

/* reduced motion: all stations lit, chips visible, nothing moves */
@media (prefers-reduced-motion: reduce){
  .pl-hero *{animation:none !important}
  .pl-hero .orbit,.pl-hero .orbit-glow{opacity:0}
  .pl-hero .stR{opacity:1}
  .pl-hero .stI{stroke-dashoffset:0;opacity:1}
  .pl-hero .stchip{opacity:1;transform:none}
  .pl-hero .t-center{opacity:1}
}
`

export const PL_HTML = `<section class="pl-hero" role="img" aria-label="Ambient diagram: a pulse laps a circular track through four stations, quote sent, follow-up, job booked, review request, showing the process running while you work.">
  <svg viewBox="0 0 640 560" width="640" height="560" aria-hidden="true" focusable="false">
    <circle class="track" cx="320" cy="280" r="140"/>
    <path class="orbit-glow" d="M320 140 A140 140 0 1 1 320 420 A140 140 0 1 1 320 140" pathLength="100" stroke-dasharray="5 95" stroke-dashoffset="0"/>
    <path class="orbit" d="M320 140 A140 140 0 1 1 320 420 A140 140 0 1 1 320 140" pathLength="100" stroke-dasharray="5 95" stroke-dashoffset="0"/>
    <text class="t-center" x="320" y="285" text-anchor="middle">RUNS WHILE YOU WORK</text>

    
    <g>
      <circle class="disc" cx="320" cy="140" r="20"/>
      <circle class="stR dN" opacity="0" cx="320" cy="140" r="20"/>
      <g class="dN"><path class="stI" pathLength="40" stroke-dasharray="40 40" stroke-dashoffset="40" transform="translate(320 140)" d="M-5.5 5.5 L5.5 -5.5 M5.5 -5.5 h-4.5 M5.5 -5.5 v4.5"/></g>
      <text class="t-lbl" x="320" y="88" text-anchor="middle">QUOTE SENT</text>
      <g class="stchip dN" opacity="0">
        <rect class="chipr" x="296" y="94" width="48" height="20" rx="10"/>
        <text class="t-chip" x="320" y="107.5" text-anchor="middle">SENT</text>
      </g>
    </g>

    
    <g>
      <circle class="disc" cx="460" cy="280" r="20"/>
      <circle class="stR dE" opacity="0" cx="460" cy="280" r="20"/>
      <g class="dE"><path class="stI" pathLength="40" stroke-dasharray="40 40" stroke-dashoffset="40" transform="translate(460 280)" d="M-4.5 2.5a4.5 5 0 0 1 9 0l1.5 2.5h-12z M-1.3 7a1.4 1.4 0 0 0 2.6 0"/></g>
      <text class="t-lbl" x="492" y="270">FOLLOW-UP</text>
      <g class="stchip dE" opacity="0">
        <rect class="chipr" x="492" y="278" width="54" height="20" rx="10"/>
        <text class="t-chip" x="519" y="291.5" text-anchor="middle">DAY 3</text>
      </g>
    </g>

    
    <g>
      <circle class="disc" cx="320" cy="420" r="20"/>
      <circle class="stR dS" opacity="0" cx="320" cy="420" r="20"/>
      <g class="dS"><path class="stI" pathLength="40" stroke-dasharray="40 40" stroke-dashoffset="40" transform="translate(320 420)" d="M-6 -4.5h12v10h-12z M-3 -7v2.5 M3 -7v2.5 M-2.6 1l2 2 3.4-3.4"/></g>
      <text class="t-lbl" x="320" y="464" text-anchor="middle">JOB BOOKED</text>
      <g class="stchip dS" opacity="0">
        <rect class="chipr" x="286" y="472" width="68" height="20" rx="10"/>
        <text class="t-chip" x="320" y="485.5" text-anchor="middle">TUE 9AM</text>
      </g>
    </g>

    
    <g>
      <circle class="disc" cx="180" cy="280" r="20"/>
      <circle class="stR dW" opacity="0" cx="180" cy="280" r="20"/>
      <g class="dW"><path class="stI" pathLength="40" stroke-dasharray="40 40" stroke-dashoffset="40" transform="translate(180 280)" d="M0 -6.2L1.8 -1.9 6.4 -1.5 2.9 1.5 4 6 0 3.5 -4 6 -2.9 1.5 -6.4 -1.5 -1.8 -1.9z"/></g>
      <text class="t-lbl" x="148" y="270" text-anchor="end">REVIEW REQUEST</text>
      <g class="stchip dW" opacity="0">
        <rect class="chipr" x="80" y="278" width="68" height="20" rx="10"/>
        <text class="t-chip" x="114" y="291.5" text-anchor="middle">5 STARS</text>
      </g>
    </g>
  </svg>
</section>`
