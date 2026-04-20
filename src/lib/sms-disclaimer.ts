/**
 * Canonical SMS opt-in disclaimer. Used BOTH on the standalone /sms page
 * and on the contact form's SMS checkbox so wording is identical and the
 * snapshot we store in SmsConsents.disclaimerText matches what the
 * submitter actually saw. Carrier audits require this exact traceability.
 *
 * If you change this string, existing consent records keep the old text
 * (the snapshot in SmsConsents is frozen at submit time) — which is
 * exactly what compliance wants.
 */
export const SMS_DISCLAIMER_TEXT =
  'I confirm the phone number above belongs to me and not someone else, ' +
  'and I consent to receive recurring text messages from Black Hart Consulting ' +
  '(appointment confirmations, consulting-call scheduling, service updates, and ' +
  'occasional promotions). Message frequency: up to 10 per month. Message and ' +
  'data rates may apply. Reply STOP to unsubscribe, HELP for help. Consent is ' +
  'not a condition of purchase. See our Privacy Policy.'

export const SMS_CHECKBOX_LABEL =
  'I agree to receive text messages from Black Hart Consulting'
