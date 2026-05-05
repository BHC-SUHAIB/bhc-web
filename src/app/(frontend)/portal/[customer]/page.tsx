import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { verifyInvoiceToken } from '@/lib/invoice-token'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Manage your account',
  description: 'Manage your payment methods and subscriptions.',
  robots: { index: false, follow: false },
}

type RouteProps = {
  params: Promise<{ customer: string }>
  searchParams: Promise<{ token?: string; return_to?: string }>
}

// Server component: validates the signed token, mints a Stripe Customer
// Portal session, and 302-redirects the client straight into the portal.
// No interstitial UI — the redirect is instant. If anything fails, we
// fall through to a minimal error page rendered via notFound().
export default async function CustomerPortalPage({ params, searchParams }: RouteProps) {
  const { customer } = await params
  const { token, return_to } = await searchParams

  if (!token) notFound()
  const verified = verifyInvoiceToken(token, customer)
  if (!verified.ok) notFound()
  if (!isStripeConfigured()) notFound()

  const stripe = getStripe()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const returnUrl = return_to && /^https?:\/\//.test(return_to) ? return_to : `${siteUrl}/`

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: returnUrl,
    })
    redirect(session.url)
  } catch (err) {
    if (err instanceof Error && err.message?.includes('NEXT_REDIRECT')) {
      // Next.js uses thrown redirects — let them bubble.
      throw err
    }
    // Any other error → notFound for now. Operator-facing diagnostics
    // live in the server logs.
    notFound()
  }
}
