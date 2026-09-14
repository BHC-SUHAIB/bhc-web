// First-touch attribution, captured client-side and sent with every lead form.
//
// Why: the lead notification email used to say only "Submitted from /contact",
// so working out WHICH ad / keyword / referrer produced a lead meant stitching
// GA4 + Clarity sessions together by hand. Capturing gclid + utm_* + referrer
// + landing path on the visitor's FIRST page load, and sending it along with
// the form, puts the answer straight into the submission record and the email.
//
// Storage: localStorage key `bhc_first_touch` (first-party, never sent to a
// third party). The inline snippet below runs in <head> of both the (frontend)
// and (lp) layouts before any navigation can strip the query string.
//
// Overwrite rule: a stored record survives unless it carries NO campaign data
// (no click id, no utm_source, no external referrer) and the current visit
// does. That way "found us organically, came back via an ad" records the ad,
// while a genuine ad first-touch is never clobbered by a later direct visit.

export const FIRST_TOUCH_STORAGE_KEY = 'bhc_first_touch'

/** Shape stored in localStorage (snake_case keeps the inline snippet tiny). */
type StoredFirstTouch = Partial<Record<
  | 'gclid' | 'gbraid' | 'wbraid' | 'msclkid' | 'fbclid'
  | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content'
  | 'referrer' | 'landing_path' | 'first_touch_at',
  string
>>

/** Shape sent to /api/contact-submissions and stored on the record. */
export type Attribution = {
  gclid?: string
  gbraid?: string
  wbraid?: string
  msclkid?: string
  fbclid?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  referrer?: string
  landingPath?: string
  firstTouchAt?: string
}

const PARAMS = ['gclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

// Inlined via <Script strategy="beforeInteractive"> in the root layouts.
// Keep it dependency-free and defensive: every storage access can throw in
// Safari Private Browsing, and the page must never break because of it.
export const firstTouchSnippet = `(function(w,d){try{
var k='${FIRST_TOUCH_STORAGE_KEY}',s=w.localStorage,q=new URLSearchParams(w.location.search);
var p=${JSON.stringify(PARAMS)},c={},has=false,i,v;
for(i=0;i<p.length;i++){v=q.get(p[i]);if(v){c[p[i]]=v.slice(0,200);has=true;}}
var r=d.referrer||'',ext=false;try{ext=!!r&&new URL(r).host!==w.location.host;}catch(e){}
if(ext){c.referrer=r.slice(0,500);}
var prev=null;try{prev=JSON.parse(s.getItem(k)||'null');}catch(e){}
var prevHas=!!(prev&&(prev.gclid||prev.gbraid||prev.wbraid||prev.msclkid||prev.fbclid||prev.utm_source||prev.referrer));
if(prev&&(prevHas||!(has||ext)))return;
c.landing_path=(w.location.pathname+w.location.search).slice(0,500);
c.first_touch_at=new Date().toISOString();
s.setItem(k,JSON.stringify(c));
}catch(e){}})(window,document);`

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().slice(0, max)
  return v ? v : undefined
}

function fromStored(s: StoredFirstTouch): Attribution {
  const out: Attribution = {
    gclid: clean(s.gclid, 200),
    gbraid: clean(s.gbraid, 200),
    wbraid: clean(s.wbraid, 200),
    msclkid: clean(s.msclkid, 200),
    fbclid: clean(s.fbclid, 200),
    utmSource: clean(s.utm_source, 200),
    utmMedium: clean(s.utm_medium, 200),
    utmCampaign: clean(s.utm_campaign, 200),
    utmTerm: clean(s.utm_term, 200),
    utmContent: clean(s.utm_content, 200),
    referrer: clean(s.referrer, 500),
    landingPath: clean(s.landing_path, 500),
    firstTouchAt: clean(s.first_touch_at, 40),
  }
  // Drop undefined keys so the JSON body stays small and Payload never sees
  // explicit nulls for fields we simply don't know.
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as Attribution
}

/**
 * Read the stored first touch. Falls back to the CURRENT page's params +
 * referrer when storage is empty or unreadable (Private Browsing), so a
 * visitor who lands on an ad and converts in the same view is still
 * attributed even without localStorage.
 */
export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredFirstTouch
      if (parsed && typeof parsed === 'object') return fromStored(parsed)
    }
  } catch { /* storage unavailable — fall through */ }
  try {
    const q = new URLSearchParams(window.location.search)
    const s: StoredFirstTouch = {}
    for (const p of PARAMS) {
      const v = q.get(p)
      if (v) s[p] = v
    }
    const ref = document.referrer || ''
    try {
      if (ref && new URL(ref).host !== window.location.host) s.referrer = ref
    } catch { /* malformed referrer */ }
    s.landing_path = window.location.pathname + window.location.search
    s.first_touch_at = new Date().toISOString()
    return fromStored(s)
  } catch {
    return {}
  }
}
