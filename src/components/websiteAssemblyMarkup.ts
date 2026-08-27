// AUTO-EXTRACTED from the Claude Design handoff bundle
// (design_handoff_bhc_animations/website-assembly.html, 2026-08). Zero-JS CSS+SVG
// animation; do not hand-edit, re-extract if the design is revised.

export const WA_CSS = `
.wa-hero{
  --anim-bg:#14120E;
  --anim-fg:#EFE9D9;
  --anim-muted:#ABA290;
  --anim-accent:#C9A36B;
  --anim-border:rgba(239,233,217,.18);
  --ez:cubic-bezier(.22,1,.36,1);
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  max-width:900px;margin:0 auto;padding:clamp(20px,4vw,48px) clamp(14px,3vw,36px);
}
.wa-hero svg.wa-stage{display:block;width:100%;height:auto}
.wa-hero .pillpop,.wa-hero .pulse,.wa-hero .cdot,.wa-hero .cursor{transform-box:fill-box;transform-origin:50% 50%}

.wa-hero .frame{fill:var(--anim-bg);stroke:var(--anim-border);stroke-width:1.5}
.wa-hero .chromeline{stroke:var(--anim-border);stroke-width:1.5}
.wa-hero .dot3{fill:var(--anim-muted);opacity:.7}
.wa-hero .addr{fill:none;stroke:var(--anim-border);stroke-width:1.25}
.wa-hero .t-addr{fill:var(--anim-muted);font:500 11px var(--mono);letter-spacing:.04em}
.wa-hero .page{fill:var(--anim-fg)}
.wa-hero .wire{fill:none;stroke:var(--anim-accent);stroke-width:1.5;stroke-linejoin:round}
.wa-hero .bar{fill:var(--anim-bg)}
.wa-hero .adot{fill:var(--anim-accent)}
.wa-hero .pillr{fill:var(--anim-accent)}
.wa-hero .t-pill{fill:var(--anim-bg);font:600 10.5px var(--mono);letter-spacing:.1em}
.wa-hero .pulse{fill:none;stroke:var(--anim-accent);stroke-width:1.5}
.wa-hero .cur{fill:var(--anim-bg)}
.wa-hero .curring{fill:none;stroke:var(--anim-accent);stroke-width:1.5;opacity:.5}
.wa-hero .chipr{fill:var(--anim-bg);stroke:var(--anim-accent);stroke-opacity:.8;stroke-width:1.25}
.wa-hero .cdot{fill:var(--anim-accent)}
.wa-hero .t-chip{fill:var(--anim-accent);font:500 10px var(--mono);letter-spacing:.06em}

.wa-hero .w1{animation:aW1 14s var(--ez) infinite}
.wa-hero .w2{animation:aW2 14s var(--ez) infinite}
.wa-hero .w3{animation:aW3 14s var(--ez) infinite}
.wa-hero .w4{animation:aW4 14s var(--ez) infinite}
.wa-hero .w5{animation:aW5 14s var(--ez) infinite}
.wa-hero .w6{animation:aW6 14s var(--ez) infinite}
.wa-hero .f1{animation:aF1 14s var(--ez) infinite}
.wa-hero .f2{animation:aF2 14s var(--ez) infinite}
.wa-hero .f3{animation:aF3 14s var(--ez) infinite}
.wa-hero .f4{animation:aF4 14s var(--ez) infinite}
.wa-hero .f5{animation:aF5 14s var(--ez) infinite}
.wa-hero .f6{animation:aF6 14s var(--ez) infinite}
.wa-hero .cursor{animation:aCursor 14s var(--ez) infinite}
.wa-hero .pillpop{animation:aPill 14s var(--ez) infinite}
.wa-hero .pulse{animation:aPulse 14s var(--ez) infinite}
.wa-hero .chipg{animation:aChip 14s var(--ez) infinite}
.wa-hero .cdot{animation:aDot 1.4s ease-in-out infinite}

/* 14s loop; 1s = 7.143%. Wireframes 0.3-2.4s, fills 2.6-4.5s, click 5.9s,
   chip 6.9-7.5s, hold to 11.3s (80.714%), dissolve by 12.6s (90%). */
@keyframes aW1{0%,2.143%{stroke-dashoffset:100}6.429%,99.9%{stroke-dashoffset:0}80.714%{opacity:1}90%{opacity:0}100%{stroke-dashoffset:100;opacity:0}}
@keyframes aW2{0%,5.714%{stroke-dashoffset:100}10.714%,99.9%{stroke-dashoffset:0}80.714%{opacity:1}90%{opacity:0}100%{stroke-dashoffset:100;opacity:0}}
@keyframes aW3{0%,9.286%{stroke-dashoffset:100}14.286%,99.9%{stroke-dashoffset:0}80.714%{opacity:1}90%{opacity:0}100%{stroke-dashoffset:100;opacity:0}}
@keyframes aW4{0%,10.357%{stroke-dashoffset:100}15.357%,99.9%{stroke-dashoffset:0}80.714%{opacity:1}90%{opacity:0}100%{stroke-dashoffset:100;opacity:0}}
@keyframes aW5{0%,11.429%{stroke-dashoffset:100}16.429%,99.9%{stroke-dashoffset:0}80.714%{opacity:1}90%{opacity:0}100%{stroke-dashoffset:100;opacity:0}}
@keyframes aW6{0%,13.571%{stroke-dashoffset:100}17.143%,99.9%{stroke-dashoffset:0}80.714%{opacity:1}90%{opacity:0}100%{stroke-dashoffset:100;opacity:0}}
@keyframes aF1{0%,18.571%{opacity:0;transform:translate(0,4px)}22.143%{opacity:1;transform:translate(0,0)}80.714%{opacity:1}90%,100%{opacity:0;transform:translate(0,0)}}
@keyframes aF2{0%,21.429%{opacity:0;transform:translate(0,4px)}25%{opacity:1;transform:translate(0,0)}80.714%{opacity:1}90%,100%{opacity:0;transform:translate(0,0)}}
@keyframes aF3{0%,24.286%{opacity:0;transform:translate(0,4px)}27.857%{opacity:1;transform:translate(0,0)}80.714%{opacity:1}90%,100%{opacity:0;transform:translate(0,0)}}
@keyframes aF4{0%,25.714%{opacity:0;transform:translate(0,4px)}29.286%{opacity:1;transform:translate(0,0)}80.714%{opacity:1}90%,100%{opacity:0;transform:translate(0,0)}}
@keyframes aF5{0%,27.143%{opacity:0;transform:translate(0,4px)}30.714%{opacity:1;transform:translate(0,0)}80.714%{opacity:1}90%,100%{opacity:0;transform:translate(0,0)}}
@keyframes aF6{0%,28.571%{opacity:0;transform:translate(0,4px)}32.143%{opacity:1;transform:translate(0,0)}80.714%{opacity:1}90%,100%{opacity:0;transform:translate(0,0)}}
@keyframes aCursor{
  0%,34.286%{opacity:0;transform:translate(470px,150px)}
  35%{transform:translate(470px,150px)}
  35.714%{opacity:1}
  37.5%{transform:translate(300px,62px)}
  39.5%{transform:translate(58px,-16px)}
  41%{transform:translate(-13px,7px)}
  42.5%{transform:translate(0,0)}
  43.5%{transform:translate(0,0) scale(.84)}
  44.6%{transform:translate(0,0) scale(1)}
  48%{opacity:1}
  50.7%,100%{opacity:0;transform:translate(0,0)}
}
@keyframes aPill{0%,43.5%{transform:scale(1)}44.5%{transform:scale(1.05)}45.6%,100%{transform:scale(1)}}
@keyframes aPulse{
  0%,43.5%{opacity:0;transform:scale(.92)}
  44.6%{opacity:.75}
  49.3%{opacity:0;transform:scale(1.28)}
  49.6%,100%{opacity:0;transform:scale(.92)}
}
@keyframes aChip{0%,49.286%{opacity:0;transform:translate(0,10px)}53.571%{opacity:1;transform:translate(0,0)}80.714%{opacity:1}90%,100%{opacity:0;transform:translate(0,0)}}
@keyframes aDot{0%,100%{opacity:.9;transform:scale(1)}50%{opacity:.3;transform:scale(1.4)}}

/* reduced motion: static completed page with chip */
@media (prefers-reduced-motion: reduce){
  .wa-hero *{animation:none !important}
  .wa-hero .wire{stroke-dashoffset:0}
  .wa-hero .fillg{opacity:1;transform:none}
  .wa-hero .chipg{opacity:1;transform:none}
  .wa-hero .cursor,.wa-hero .pulse{opacity:0}
}
`

export const WA_HTML = `<section class="wa-hero" role="img" aria-label="Animated diagram: a small business website assembles itself in a browser, a cursor clicks the CALL NOW button, and a chip confirms the call was answered.">
  <svg class="wa-stage" viewBox="0 0 900 620" width="900" height="620" aria-hidden="true" focusable="false">
    
    <rect class="frame" x="70" y="40" width="760" height="540" rx="16"/>
    <line class="chromeline" x1="70" y1="88" x2="830" y2="88"/>
    <circle class="dot3" cx="100" cy="64" r="4.5"/>
    <circle class="dot3" cx="120" cy="64" r="4.5"/>
    <circle class="dot3" cx="140" cy="64" r="4.5"/>
    <rect class="addr" x="170" y="51" width="280" height="26" rx="13"/>
    <text class="t-addr" x="190" y="68">yourbusiness.com</text>
    
    <rect class="page" x="92" y="108" width="716" height="450" rx="10"/>

    
    <rect class="wire w1" x="120" y="136" width="660" height="44" rx="8"  pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/>
    <rect class="wire w2" x="120" y="204" width="660" height="150" rx="10" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/>
    <rect class="wire w3" x="120" y="378" width="204" height="110" rx="10" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/>
    <rect class="wire w4" x="348" y="378" width="204" height="110" rx="10" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/>
    <rect class="wire w5" x="576" y="378" width="204" height="110" rx="10" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/>
    <rect class="wire w6" x="120" y="512" width="660" height="24" rx="6"  pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/>

    
    <g class="fillg f1" opacity="0">
      <circle class="adot" cx="146" cy="158" r="6"/>
      <rect class="bar" opacity=".25" x="600" y="155" width="34" height="5" rx="2.5"/>
      <rect class="bar" opacity=".25" x="650" y="155" width="34" height="5" rx="2.5"/>
      <rect class="bar" opacity=".25" x="700" y="155" width="34" height="5" rx="2.5"/>
    </g>
    <g class="fillg f2" opacity="0">
      <rect class="bar" opacity=".3"  x="156" y="238" width="330" height="14" rx="7"/>
      <rect class="bar" opacity=".18" x="156" y="264" width="250" height="14" rx="7"/>
      <g class="pillpop">
        <rect class="pillr" x="156" y="298" width="120" height="32" rx="16"/>
        <text class="t-pill" x="216" y="318.5" text-anchor="middle">CALL NOW</text>
      </g>
    </g>
    <g class="fillg f3" opacity="0">
      <circle class="adot" cx="154" cy="412" r="7"/>
      <rect class="bar" opacity=".28" x="144" y="436" width="150" height="9" rx="4.5"/>
      <rect class="bar" opacity=".16" x="144" y="454" width="110" height="9" rx="4.5"/>
    </g>
    <g class="fillg f4" opacity="0">
      <circle class="adot" cx="382" cy="412" r="7"/>
      <rect class="bar" opacity=".28" x="372" y="436" width="150" height="9" rx="4.5"/>
      <rect class="bar" opacity=".16" x="372" y="454" width="110" height="9" rx="4.5"/>
    </g>
    <g class="fillg f5" opacity="0">
      <circle class="adot" cx="610" cy="412" r="7"/>
      <rect class="bar" opacity=".28" x="600" y="436" width="150" height="9" rx="4.5"/>
      <rect class="bar" opacity=".16" x="600" y="454" width="110" height="9" rx="4.5"/>
    </g>
    <g class="fillg f6" opacity="0">
      <rect class="bar" opacity=".12" x="120" y="512" width="660" height="24" rx="6"/>
      <rect class="bar" opacity=".3"  x="136" y="521" width="60" height="6" rx="3"/>
    </g>

    
    <rect class="pulse" opacity="0" x="150" y="292" width="132" height="44" rx="22"/>

    
    <g class="cursor" opacity="0">
      <circle class="curring" cx="216" cy="316" r="9"/>
      <circle class="cur" cx="216" cy="316" r="5.5"/>
    </g>

    
    <g class="chipg" opacity="0">
      <rect class="chipr" x="660" y="565" width="200" height="30" rx="15"/>
      <circle class="cdot" cx="676" cy="580" r="3"/>
      <text class="t-chip" x="688" y="584">(XXX) XXX-XXXX ANSWERED</text>
    </g>
  </svg>
</section>`
