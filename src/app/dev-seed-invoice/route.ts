/**
 * Dev-only: creates a test Client + Invoice and prints the signed branded URL.
 *
 *   curl -X POST http://localhost:3000/dev-seed-invoice
 *
 * Returns 403 in production. Delete before merging.
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'
import { signInvoiceToken } from '@/lib/invoice-token'

export const dynamic = 'force-dynamic'

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })

  // Idempotent: same email + same invoice number = single record.
  const testEmail = 'dev-test-client@example.com'
  let clientId: string | number
  const existingClient = await payload.find({
    collection: 'clients',
    where: { email: { equals: testEmail } },
    limit: 1,
  })
  if (existingClient.totalDocs > 0) {
    clientId = existingClient.docs[0].id
  } else {
    const created = await payload.create({
      collection: 'clients',
      data: {
        displayName: "Joe's Coffee (Test)",
        email: testEmail,
        company: "Joe's Coffee",
      } as never,
    })
    clientId = created.id
  }

  const testInvoiceNumber = 'DEV-TEST-0001'
  const existingInv = await payload.find({
    collection: 'invoices',
    where: { invoiceNumber: { equals: testInvoiceNumber } },
    limit: 1,
  })
  let invoiceId: string | number
  if (existingInv.totalDocs > 0) {
    invoiceId = existingInv.docs[0].id
  } else {
    const created = await payload.create({
      collection: 'invoices',
      data: {
        invoiceNumber: testInvoiceNumber,
        client: clientId,
        description: 'Custom landing page redesign + logo refresh.',
        lineItems: [
          { description: 'Custom landing page redesign', amountCents: 240_000, quantity: 1 },
          { description: 'Logo refresh', amountCents: 40_000, quantity: 1 },
          { description: 'Photography', amountCents: 20_000, quantity: 1 },
        ],
        status: 'open',
        allowCarePlanUpsell: true,
        suggestedCarePlan: 'growth',
      } as never,
    })
    invoiceId = created.id
  }

  const token = signInvoiceToken(String(invoiceId))
  const url = `/invoice/${invoiceId}?token=${encodeURIComponent(token)}`

  return NextResponse.json({ ok: true, invoiceId, clientId, brandedUrl: url, token })
}
