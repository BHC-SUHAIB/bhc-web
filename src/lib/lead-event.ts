// Gate for the primary conversion event.
//
// Background (2026-09-21 weekly review): all three form submissions that week
// were spam (two Tor-exit bots with the honeypot filled, one VA pitch) and GA4
// logged one of them as a `generate_lead` key event. None arrived through a
// paid click, so Google Ads stayed clean, but a single bot landing with a
// gclid would record a fake conversion and teach the bidder the wrong thing.
//
// The collection never rejects a suspected-spam submission (it used to, and
// silently dropped real people; see ContactSubmissions.ts). It saves it with
// `suspectedSpam: true` and skips the notification email. Payload's create
// response returns that doc, so the client can see the flag and simply not
// count the submission as a lead. The visitor still sees the normal success
// state either way: a false positive costs one analytics event, not a lead.

import { pushEvent } from './analytics'

type LeadParams = Record<string, unknown>

/** True when the saved submission was flagged by the server-side spam checks. */
export function isFlaggedSpam(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const doc = (body as { doc?: unknown }).doc
  if (!doc || typeof doc !== 'object') return false
  return (doc as { suspectedSpam?: unknown }).suspectedSpam === true
}

/** Reads a fetch Response body as JSON without ever throwing. */
export async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Fires `generate_lead` for a clean submission, or the non-conversion
 * `lead_flagged_spam` event for one the server flagged. Returns which fired.
 */
export function pushLeadEvent(body: unknown, params: LeadParams): 'generate_lead' | 'lead_flagged_spam' {
  if (isFlaggedSpam(body)) {
    pushEvent('lead_flagged_spam', {
      source_page: typeof params.source_page === 'string' ? params.source_page : undefined,
      source: params.source,
    })
    return 'lead_flagged_spam'
  }
  pushEvent('generate_lead', params)
  return 'generate_lead'
}
