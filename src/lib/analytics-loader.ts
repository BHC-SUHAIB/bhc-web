// Deferred analytics bootstrap, shared by the (frontend) and (lp) layouts.
//
// GTM (which carries GA4 + the Google Ads pixel) and Clarity together cost
// ~600ms of main-thread script on load — ~2.4s under Lighthouse's 4x mobile
// throttle — and that work is what was delaying the hero's paint (mobile
// perf 64, LCP 11.7s, while desktop sat at 96). Neither tag needs to run
// before the visitor does anything: every conversion event (generate_lead,
// checkout_click, purchase) requires an interaction first, and the tag is
// loaded long before any of them can fire.
//
// So: arm cheap listeners immediately (this snippet is inlined in <head>),
// and load GTM on the FIRST interaction — pointer, key, touch, scroll, or
// mouse move — with a 4s timeout as the fallback so idle readers still get
// counted. Clarity (session replay, least essential) follows 1.5s later.
// The only traffic this loses is visitors who bounce within 4 seconds
// without ever touching the page.
//
// Keeps the bhc_skip_analytics localStorage opt-out from the old inline
// snippets, and still no-ops in dev/preview when the env vars are unset.
export const delayedAnalyticsSnippet = (
  gtmId: string | undefined,
  clarityId: string | undefined,
): string => `(function(w,d){
try{if(w.localStorage&&w.localStorage.getItem('bhc_skip_analytics')==='true')return;}catch(e){}
var fired=false;var evs=['pointerdown','keydown','touchstart','scroll','mousemove'];
function inject(src){var j=d.createElement('script');j.async=true;j.src=src;var f=d.getElementsByTagName('script')[0];f.parentNode.insertBefore(j,f);}
function loadGtm(){${
    gtmId
      ? `w.dataLayer=w.dataLayer||[];w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});inject('https://www.googletagmanager.com/gtm.js?id=${gtmId}');`
      : ''
  }}
function loadClarity(){${
    clarityId
      ? `w.clarity=w.clarity||function(){(w.clarity.q=w.clarity.q||[]).push(arguments)};inject('https://www.clarity.ms/tag/${clarityId}');`
      : ''
  }}
function go(){if(fired)return;fired=true;for(var i=0;i<evs.length;i++)w.removeEventListener(evs[i],go);loadGtm();w.setTimeout(loadClarity,1500);}
for(var i=0;i<evs.length;i++)w.addEventListener(evs[i],go,{passive:true});
w.setTimeout(go,4000);
})(window,document);`
