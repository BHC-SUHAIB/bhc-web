import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

// Misbah BETA tip link — opens Stripe Checkout with a customer-chosen amount.
// The app's beta-only "Support the developer" button (gated on isBetaBuild) opens
// /misbah/tip; this creates a one-off Checkout Session against the live
// "Customer chooses price" price and 303-redirects to Stripe's hosted page (which
// shows the editable amount field + a "Donate" button). Reuses STRIPE_SECRET_KEY
// (sk_live_… on prod). Price IDs are not secret, so it's referenced inline.
const MISBAH_TIP_PRICE_ID = 'price_1TidCQRTwwgtrqUJ9gpr91Tu'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const origin = new URL(req.url).origin
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [{ price: MISBAH_TIP_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/misbah/tip/result?ok=1`,
      cancel_url: `${origin}/misbah/tip/result`,
    })
    if (!session.url) throw new Error('Stripe returned a session without a url')
    return NextResponse.redirect(session.url, 303)
  } catch (err) {
    console.error('[misbah/tip] failed to create Checkout session:', err)
    return NextResponse.redirect(`${origin}/misbah/tip/result?error=1`, 303)
  }
}
