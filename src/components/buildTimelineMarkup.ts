// AUTO-EXTRACTED from the Claude Design handoff bundle
// (design_handoff_bhc_animations/website-build-timeline.html, 2026-08). Zero-JS CSS+SVG
// animation; do not hand-edit, re-extract if the design is revised.

export const BT_CSS = `
.bt-hero{
  --anim-bg:#14120E;
  --anim-fg:#EFE9D9;
  --anim-muted:#ABA290;
  --anim-accent:#C9A36B;
  --anim-border:rgba(239,233,217,.18);
  --ez:cubic-bezier(.22,1,.36,1);
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  max-width:1180px;margin:0 auto;padding:clamp(20px,4vw,48px) clamp(14px,3vw,36px);
}
.bt-hero .bt-d,.bt-hero .bt-m{display:block;width:100%;height:auto}
.bt-hero .ng,.bt-hero .pulse{transform-box:fill-box;transform-origin:50% 50%}
.bt-hero .bt-m{display:none}
@media (max-width:700px){.bt-hero .bt-d{display:none}.bt-hero .bt-m{display:block}}

.bt-hero .track{stroke:var(--anim-border);stroke-width:1.5;fill:none;stroke-linecap:round}
.bt-hero .thot{stroke:var(--anim-accent);stroke-width:1.5;fill:none;stroke-linecap:round}
.bt-hero .disc{fill:var(--anim-bg);stroke:var(--anim-border);stroke-width:1.5}
.bt-hero .ring-hot{fill:none;stroke:var(--anim-accent);stroke-width:1.5}
.bt-hero .icond{stroke:var(--anim-fg);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.bt-hero .pulse{fill:none;stroke:var(--anim-accent);stroke-width:1.5}
.bt-hero .chipr{fill:var(--anim-bg);stroke:var(--anim-accent);stroke-opacity:.8;stroke-width:1.25}
.bt-hero .t-title{fill:var(--anim-fg);font:600 11px var(--mono);letter-spacing:.12em}
.bt-hero .t-desc{fill:var(--anim-muted);font:500 9.5px var(--mono);letter-spacing:.04em}
.bt-hero .t-chip{fill:var(--anim-accent);font:500 9.5px var(--mono);letter-spacing:.06em}
.bt-m .t-title{font-size:10px;letter-spacing:.1em}
.bt-m .t-desc{font-size:9px}
.bt-m .t-chip{font-size:8.5px}

.bt-hero .thot{animation:aTrack 14s linear infinite}
.bt-hero .pulse{animation:aPulse 14s var(--ez) infinite}
.bt-hero .chipg{animation:aChip 14s var(--ez) infinite}
.bt-hero .ng.n1{animation:aNode1 14s var(--ez) infinite}
.bt-hero .ng.n2{animation:aNode2 14s var(--ez) infinite}
.bt-hero .ng.n3{animation:aNode3 14s var(--ez) infinite}
.bt-hero .ng.n4{animation:aNode4 14s var(--ez) infinite}
.bt-hero .ng.n5{animation:aNode5 14s var(--ez) infinite}
.bt-hero .n1 .icond{animation:aIcon1 14s var(--ez) infinite}
.bt-hero .n2 .icond{animation:aIcon2 14s var(--ez) infinite}
.bt-hero .n3 .icond{animation:aIcon3 14s var(--ez) infinite}
.bt-hero .n4 .icond{animation:aIcon4 14s var(--ez) infinite}
.bt-hero .n5 .icond{animation:aIcon5 14s var(--ez) infinite}

/* 14s loop; 1s = 7.143%. Line arrivals: 3.286 / 12 / 20.714 / 29.429 / 38.143 %.
   Hold to 92.143%, fade by 98.571%. */
@keyframes aTrack{
  0%,2.143%{stroke-dashoffset:100;opacity:1}
  39.286%{stroke-dashoffset:0}
  92.143%{opacity:1}
  98.571%{opacity:0}
  99.9%{stroke-dashoffset:0}
  100%{stroke-dashoffset:100;opacity:0}
}
@keyframes aNode1{
  0%,3.286%{opacity:0;transform:scale(.85)}
  4.329%{opacity:1}
  4.786%{transform:scale(1.045)}
  5.786%{transform:scale(1)}
  92.143%{opacity:1}
  98.571%{opacity:0;transform:scale(1)}
  100%{opacity:0;transform:scale(.85)}
}
@keyframes aNode2{
  0%,12%{opacity:0;transform:scale(.85)}
  13.043%{opacity:1}
  13.5%{transform:scale(1.045)}
  14.5%{transform:scale(1)}
  92.143%{opacity:1}
  98.571%{opacity:0;transform:scale(1)}
  100%{opacity:0;transform:scale(.85)}
}
@keyframes aNode3{
  0%,20.714%{opacity:0;transform:scale(.85)}
  21.757%{opacity:1}
  22.214%{transform:scale(1.045)}
  23.214%{transform:scale(1)}
  92.143%{opacity:1}
  98.571%{opacity:0;transform:scale(1)}
  100%{opacity:0;transform:scale(.85)}
}
@keyframes aNode4{
  0%,29.429%{opacity:0;transform:scale(.85)}
  30.471%{opacity:1}
  30.929%{transform:scale(1.045)}
  31.929%{transform:scale(1)}
  92.143%{opacity:1}
  98.571%{opacity:0;transform:scale(1)}
  100%{opacity:0;transform:scale(.85)}
}
@keyframes aNode5{
  0%,38.143%{opacity:0;transform:scale(.85)}
  39.186%{opacity:1}
  39.643%{transform:scale(1.045)}
  40.643%{transform:scale(1)}
  92.143%{opacity:1}
  98.571%{opacity:0;transform:scale(1)}
  100%{opacity:0;transform:scale(.85)}
}
@keyframes aIcon1{0%,4.357%{stroke-dashoffset:40}8.643%,99.9%{stroke-dashoffset:0}100%{stroke-dashoffset:40}}
@keyframes aIcon2{0%,13.071%{stroke-dashoffset:40}17.357%,99.9%{stroke-dashoffset:0}100%{stroke-dashoffset:40}}
@keyframes aIcon3{0%,21.786%{stroke-dashoffset:40}26.071%,99.9%{stroke-dashoffset:0}100%{stroke-dashoffset:40}}
@keyframes aIcon4{0%,34.786%{stroke-dashoffset:40}34.786%,99.9%{stroke-dashoffset:0}100%{stroke-dashoffset:40}}
@keyframes aIcon5{0%,39.214%{stroke-dashoffset:40}43.5%,99.9%{stroke-dashoffset:0}100%{stroke-dashoffset:40}}
@keyframes aPulse{
  0%,40.714%{opacity:0;transform:scale(.7)}
  41.786%{opacity:.85}
  46.429%{opacity:0;transform:scale(1.9)}
  46.714%,100%{opacity:0;transform:scale(.7)}
}
@keyframes aChip{
  0%,42.143%{opacity:0;transform:translate(0,6px)}
  45.714%{opacity:1;transform:translate(0,0)}
  92.143%{opacity:1}
  98.571%,100%{opacity:0;transform:translate(0,0)}
}

/* reduced motion: static finished frame */
@media (prefers-reduced-motion: reduce){
  .bt-hero *{animation:none !important}
  .bt-hero .thot{stroke-dashoffset:0;opacity:1}
  .bt-hero .ng{opacity:1;transform:none}
  .bt-hero .icond{stroke-dashoffset:0}
  .bt-hero .chipg{opacity:1;transform:none}
  .bt-hero .pulse{opacity:0}
}
`

export const BT_HTML = `<section class="bt-hero" role="img" aria-label="Animated timeline of the 7-day website build: day 1 kickoff, days 2-3 build, days 4-5 review, day 6 fixes, day 7 live, with a 90+ Lighthouse or the fix is free guarantee.">

  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <defs>
      <path id="bt-ic1" fill="none" stroke="var(--anim-fg)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pathLength="40" d="M-6 -8 h12 v16 h-12 z M-3 -4 h6 M-3 0 h6 M-3 4 h4"/>
      <path id="bt-ic2" fill="none" stroke="var(--anim-fg)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pathLength="40" d="M-7 1 h6 v6 h-6 z M1 1 h6 v6 h-6 z M-3 -7 h6 v6 h-6 z"/>
      <path id="bt-ic3" fill="none" stroke="var(--anim-fg)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pathLength="40" d="M-2 -2 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M2 2 L7 7"/>
      <path id="bt-ic4" fill="none" stroke="var(--anim-fg)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pathLength="40" d="M-7 -3 H0 M4 -3 H7 M-7 3 H-4 M0 3 H7 M2 -3 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M-2 3 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0"/>
      <path id="bt-ic5" fill="none" stroke="var(--anim-fg)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pathLength="40" d="M-4 9 V-8 M-4 -7.5 H5 V-1.5 H-4"/>
    </defs>
  </svg>

  
  <svg class="bt-d" viewBox="0 0 1160 290" width="1160" height="290" aria-hidden="true" focusable="false">
    <path class="track" d="M90 130 H1070"/>
    <path class="thot" d="M90 130 H1070" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/>
    <circle class="disc" cx="120" cy="130" r="22"/>
    <circle class="disc" cx="350" cy="130" r="22"/>
    <circle class="disc" cx="580" cy="130" r="22"/>
    <circle class="disc" cx="810" cy="130" r="22"/>
    <circle class="disc" cx="1040" cy="130" r="22"/>
    <g class="ng n1" opacity="0">
      <circle class="ring-hot" cx="120" cy="130" r="22"/>
      <g transform="translate(120 130)"><use class="icond" href="#bt-ic1" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="120" y="180" text-anchor="middle">DAY 1: KICKOFF</text>
      <text class="t-desc" x="120" y="200" text-anchor="middle">Your services, photos,</text>
      <text class="t-desc" x="120" y="214" text-anchor="middle">and Google profile</text>
    </g>
    <g class="ng n2" opacity="0">
      <circle class="ring-hot" cx="350" cy="130" r="22"/>
      <g transform="translate(350 130)"><use class="icond" href="#bt-ic2" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="350" y="180" text-anchor="middle">DAY 2-3: BUILD</text>
      <text class="t-desc" x="350" y="200" text-anchor="middle">Pages assembled,</text>
      <text class="t-desc" x="350" y="214" text-anchor="middle">copy drafted</text>
    </g>
    <g class="ng n3" opacity="0">
      <circle class="ring-hot" cx="580" cy="130" r="22"/>
      <g transform="translate(580 130)"><use class="icond" href="#bt-ic3" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="580" y="180" text-anchor="middle">DAY 4-5: REVIEW</text>
      <text class="t-desc" x="580" y="200" text-anchor="middle">You click through</text>
      <text class="t-desc" x="580" y="214" text-anchor="middle">a live preview</text>
    </g>
    <g class="ng n4" opacity="0">
      <circle class="ring-hot" cx="810" cy="130" r="22"/>
      <g transform="translate(810 130)"><use class="icond" href="#bt-ic4" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="810" y="180" text-anchor="middle">DAY 6: FIXES</text>
      <text class="t-desc" x="810" y="200" text-anchor="middle">Your edits,</text>
      <text class="t-desc" x="810" y="214" text-anchor="middle">same day</text>
    </g>
    <g class="ng n5" opacity="0">
      <circle class="ring-hot" cx="1040" cy="130" r="22"/>
      <g transform="translate(1040 130)"><use class="icond" href="#bt-ic5" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="1040" y="180" text-anchor="middle">DAY 7: LIVE</text>
      <text class="t-desc" x="1040" y="200" text-anchor="middle">Launch, in writing</text>
    </g>
    <circle class="pulse" opacity="0" cx="1040" cy="130" r="22"/>
    <g class="chipg" opacity="0">
      <rect class="chipr" x="928" y="228" width="224" height="22" rx="11"/>
      <text class="t-chip" x="1040" y="242.5" text-anchor="middle">90+ LIGHTHOUSE OR THE FIX IS FREE</text>
    </g>
  </svg>

  
  <svg class="bt-m" viewBox="0 0 380 472" width="380" height="472" aria-hidden="true" focusable="false">
    <path class="track" d="M60 48.1 V431.9"/>
    <path class="thot" d="M60 48.1 V431.9" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="100"/>
    <circle class="disc" cx="60" cy="60" r="18"/>
    <circle class="disc" cx="60" cy="150" r="18"/>
    <circle class="disc" cx="60" cy="240" r="18"/>
    <circle class="disc" cx="60" cy="330" r="18"/>
    <circle class="disc" cx="60" cy="420" r="18"/>
    <g class="ng n1" opacity="0">
      <circle class="ring-hot" cx="60" cy="60" r="18"/>
      <g transform="translate(60 60) scale(0.8)"><use class="icond" href="#bt-ic1" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="96" y="57">DAY 1: KICKOFF</text>
      <text class="t-desc" x="96" y="71">Your services, photos,</text>
      <text class="t-desc" x="96" y="83">and Google profile</text>
    </g>
    <g class="ng n2" opacity="0">
      <circle class="ring-hot" cx="60" cy="150" r="18"/>
      <g transform="translate(60 150) scale(0.8)"><use class="icond" href="#bt-ic2" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="96" y="147">DAY 2-3: BUILD</text>
      <text class="t-desc" x="96" y="161">Pages assembled,</text>
      <text class="t-desc" x="96" y="173">copy drafted</text>
    </g>
    <g class="ng n3" opacity="0">
      <circle class="ring-hot" cx="60" cy="240" r="18"/>
      <g transform="translate(60 240) scale(0.8)"><use class="icond" href="#bt-ic3" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="96" y="237">DAY 4-5: REVIEW</text>
      <text class="t-desc" x="96" y="251">You click through</text>
      <text class="t-desc" x="96" y="263">a live preview</text>
    </g>
    <g class="ng n4" opacity="0">
      <circle class="ring-hot" cx="60" cy="330" r="18"/>
      <g transform="translate(60 330) scale(0.8)"><use class="icond" href="#bt-ic4" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="96" y="327">DAY 6: FIXES</text>
      <text class="t-desc" x="96" y="341">Your edits,</text>
      <text class="t-desc" x="96" y="353">same day</text>
    </g>
    <g class="ng n5" opacity="0">
      <circle class="ring-hot" cx="60" cy="420" r="18"/>
      <g transform="translate(60 420) scale(0.8)"><use class="icond" href="#bt-ic5" stroke-dasharray="40 40" stroke-dashoffset="40"/></g>
      <text class="t-title" x="96" y="417">DAY 7: LIVE</text>
      <text class="t-desc" x="96" y="431">Launch, in writing</text>
    </g>
    <circle class="pulse" opacity="0" cx="60" cy="420" r="18"/>
    <g class="chipg" opacity="0">
      <rect class="chipr" x="96" y="441" width="212" height="20" rx="10"/>
      <text class="t-chip" x="202" y="454" text-anchor="middle">90+ LIGHTHOUSE OR THE FIX IS FREE</text>
    </g>
  </svg>
</section>`
