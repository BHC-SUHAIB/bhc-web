/**
 * Dev-only schema fix. Adds new columns + tables for the rework branch
 * idempotently via ALTER TABLE — no destructive resets, no DROP.
 *
 *   curl -X POST http://localhost:3000/dev-schema-fix
 *
 * Returns 403 in production. Delete after the rework branch ships.
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { denyIfProductionLocked } from '@/lib/dev-route-guard'

export const dynamic = 'force-dynamic'

const ALTER_STATEMENTS: string[] = [
  // Hero (already added in prior session — repeat anyway in case the DB was
  // never migrated locally).
  `ALTER TABLE pages_blocks_hero ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE pages_blocks_hero ADD COLUMN overlay_strength TEXT DEFAULT 'heavy'`,
  `ALTER TABLE landing_pages_blocks_hero ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE landing_pages_blocks_hero ADD COLUMN overlay_strength TEXT DEFAULT 'heavy'`,

  // Pricing — new layoutVariant flag.
  `ALTER TABLE pages_blocks_pricing ADD COLUMN layout_variant TEXT DEFAULT 'grid'`,
  `ALTER TABLE landing_pages_blocks_pricing ADD COLUMN layout_variant TEXT DEFAULT 'grid'`,

  // Stats — faint background image.
  `ALTER TABLE pages_blocks_stats ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE landing_pages_blocks_stats ADD COLUMN background_image_url TEXT`,

  // CTA — faint background image.
  `ALTER TABLE pages_blocks_cta ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE landing_pages_blocks_cta ADD COLUMN background_image_url TEXT`,

  // BundleOffer — faint background image. Table name uses block slug as suffix.
  `ALTER TABLE pages_blocks_bundle_offer ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE landing_pages_blocks_bundle_offer ADD COLUMN background_image_url TEXT`,

  // RichText — external image URL field for CDN-hosted portraits without
  // requiring a Media upload. Used on About to point at the Suhaib headshot
  // hosted on the production DigitalOcean Space.
  `ALTER TABLE pages_blocks_rich_text ADD COLUMN image_url TEXT`,
  `ALTER TABLE landing_pages_blocks_rich_text ADD COLUMN image_url TEXT`,
  `ALTER TABLE _pages_v_blocks_rich_text ADD COLUMN image_url TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_rich_text ADD COLUMN image_url TEXT`,

  // RichText — eyebrow label above content (e.g. "Who you'll work with").
  `ALTER TABLE pages_blocks_rich_text ADD COLUMN eyebrow TEXT`,
  `ALTER TABLE landing_pages_blocks_rich_text ADD COLUMN eyebrow TEXT`,
  `ALTER TABLE _pages_v_blocks_rich_text ADD COLUMN eyebrow TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_rich_text ADD COLUMN eyebrow TEXT`,

  // Pricing tiers — original_price for strikethrough discount display.
  `ALTER TABLE pages_blocks_pricing_tiers ADD COLUMN original_price TEXT`,
  `ALTER TABLE landing_pages_blocks_pricing_tiers ADD COLUMN original_price TEXT`,
  `ALTER TABLE _pages_v_blocks_pricing_tiers ADD COLUMN original_price TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_pricing_tiers ADD COLUMN original_price TEXT`,

  // Pricing tiers — enterprise_badge for the brass-tinted "Custom Build" tier.
  `ALTER TABLE pages_blocks_pricing_tiers ADD COLUMN enterprise_badge INTEGER DEFAULT 0`,
  `ALTER TABLE landing_pages_blocks_pricing_tiers ADD COLUMN enterprise_badge INTEGER DEFAULT 0`,
  `ALTER TABLE _pages_v_blocks_pricing_tiers ADD COLUMN enterprise_badge INTEGER DEFAULT 0`,
  `ALTER TABLE _landing_pages_v_blocks_pricing_tiers ADD COLUMN enterprise_badge INTEGER DEFAULT 0`,

  // Hero — show_phone_cta opt-in flag for "Or call: <number>" line under CTAs.
  `ALTER TABLE pages_blocks_hero ADD COLUMN show_phone_cta INTEGER DEFAULT 0`,
  `ALTER TABLE landing_pages_blocks_hero ADD COLUMN show_phone_cta INTEGER DEFAULT 0`,
  `ALTER TABLE _pages_v_blocks_hero ADD COLUMN show_phone_cta INTEGER DEFAULT 0`,
  `ALTER TABLE _landing_pages_v_blocks_hero ADD COLUMN show_phone_cta INTEGER DEFAULT 0`,

  // Services items — download_href + download_label for per-card one-pager
  // PDF buttons. Wires to /downloads/<slug> from src/lib/pdfs/content.ts.
  `ALTER TABLE pages_blocks_services_items ADD COLUMN download_href TEXT`,
  `ALTER TABLE pages_blocks_services_items ADD COLUMN download_label TEXT`,
  `ALTER TABLE landing_pages_blocks_services_items ADD COLUMN download_href TEXT`,
  `ALTER TABLE landing_pages_blocks_services_items ADD COLUMN download_label TEXT`,
  `ALTER TABLE _pages_v_blocks_services_items ADD COLUMN download_href TEXT`,
  `ALTER TABLE _pages_v_blocks_services_items ADD COLUMN download_label TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_services_items ADD COLUMN download_href TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_services_items ADD COLUMN download_label TEXT`,

  // SiteSettings — founding spots counters (admin-editable, live on the
  // global so all FoundingClient banners stay in sync without a re-seed).
  `ALTER TABLE site_settings ADD COLUMN founding_spots_total INTEGER DEFAULT 5`,
  `ALTER TABLE site_settings ADD COLUMN founding_spots_remaining INTEGER DEFAULT 5`,

  // FeaturedProjects — linked + compact flags for the LP screenshots-only variant.
  `ALTER TABLE pages_blocks_featured_projects ADD COLUMN linked INTEGER DEFAULT 1`,
  `ALTER TABLE landing_pages_blocks_featured_projects ADD COLUMN linked INTEGER DEFAULT 1`,
  `ALTER TABLE _pages_v_blocks_featured_projects ADD COLUMN linked INTEGER DEFAULT 1`,
  `ALTER TABLE _landing_pages_v_blocks_featured_projects ADD COLUMN linked INTEGER DEFAULT 1`,
  `ALTER TABLE pages_blocks_featured_projects ADD COLUMN compact INTEGER DEFAULT 0`,
  `ALTER TABLE landing_pages_blocks_featured_projects ADD COLUMN compact INTEGER DEFAULT 0`,
  `ALTER TABLE _pages_v_blocks_featured_projects ADD COLUMN compact INTEGER DEFAULT 0`,
  `ALTER TABLE _landing_pages_v_blocks_featured_projects ADD COLUMN compact INTEGER DEFAULT 0`,

  // CalendlyBooking — email fallback CTA next to the booking button.
  `ALTER TABLE pages_blocks_calendly_booking ADD COLUMN show_email_fallback INTEGER DEFAULT 0`,
  `ALTER TABLE pages_blocks_calendly_booking ADD COLUMN email_label TEXT`,
  `ALTER TABLE landing_pages_blocks_calendly_booking ADD COLUMN show_email_fallback INTEGER DEFAULT 0`,
  `ALTER TABLE landing_pages_blocks_calendly_booking ADD COLUMN email_label TEXT`,
  `ALTER TABLE _pages_v_blocks_calendly_booking ADD COLUMN show_email_fallback INTEGER DEFAULT 0`,
  `ALTER TABLE _pages_v_blocks_calendly_booking ADD COLUMN email_label TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_calendly_booking ADD COLUMN show_email_fallback INTEGER DEFAULT 0`,
  `ALTER TABLE _landing_pages_v_blocks_calendly_booking ADD COLUMN email_label TEXT`,

  // ── Draft-version tables (_pages_v_blocks_* / _landing_pages_v_blocks_*) ──
  // Payload mirrors every block table into a versioned shadow used by the
  // drafts system. The same column additions need to land there or version
  // queries break.
  `ALTER TABLE _pages_v_blocks_hero ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE _pages_v_blocks_hero ADD COLUMN overlay_strength TEXT DEFAULT 'heavy'`,
  `ALTER TABLE _landing_pages_v_blocks_hero ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_hero ADD COLUMN overlay_strength TEXT DEFAULT 'heavy'`,

  `ALTER TABLE _pages_v_blocks_pricing ADD COLUMN layout_variant TEXT DEFAULT 'grid'`,
  `ALTER TABLE _landing_pages_v_blocks_pricing ADD COLUMN layout_variant TEXT DEFAULT 'grid'`,

  `ALTER TABLE _pages_v_blocks_stats ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_stats ADD COLUMN background_image_url TEXT`,

  `ALTER TABLE _pages_v_blocks_cta ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_cta ADD COLUMN background_image_url TEXT`,

  `ALTER TABLE _pages_v_blocks_bundle_offer ADD COLUMN background_image_url TEXT`,
  `ALTER TABLE _landing_pages_v_blocks_bundle_offer ADD COLUMN background_image_url TEXT`,
]

const CREATE_STATEMENTS: string[] = [
  // Calendly Booking block — new tables on both pages + landingPages.
  `CREATE TABLE IF NOT EXISTS pages_blocks_calendly_booking (
    _order INTEGER NOT NULL,
    _parent_id INTEGER NOT NULL,
    _path TEXT NOT NULL,
    id TEXT PRIMARY KEY NOT NULL,
    eyebrow TEXT DEFAULT 'Book a call',
    headline TEXT NOT NULL DEFAULT 'Pick a time that works for you.',
    description TEXT,
    calendly_url TEXT NOT NULL,
    display_mode TEXT DEFAULT 'inline',
    popup_button_label TEXT DEFAULT 'Book a 30-min call',
    inline_height INTEGER DEFAULT 720,
    background_image_url TEXT,
    block_name TEXT,
    FOREIGN KEY (_parent_id) REFERENCES pages(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS pages_blocks_calendly_booking_order_idx ON pages_blocks_calendly_booking (_order)`,
  `CREATE INDEX IF NOT EXISTS pages_blocks_calendly_booking_parent_id_idx ON pages_blocks_calendly_booking (_parent_id)`,
  `CREATE INDEX IF NOT EXISTS pages_blocks_calendly_booking_path_idx ON pages_blocks_calendly_booking (_path)`,

  `CREATE TABLE IF NOT EXISTS landing_pages_blocks_calendly_booking (
    _order INTEGER NOT NULL,
    _parent_id INTEGER NOT NULL,
    _path TEXT NOT NULL,
    id TEXT PRIMARY KEY NOT NULL,
    eyebrow TEXT DEFAULT 'Book a call',
    headline TEXT NOT NULL DEFAULT 'Pick a time that works for you.',
    description TEXT,
    calendly_url TEXT NOT NULL,
    display_mode TEXT DEFAULT 'inline',
    popup_button_label TEXT DEFAULT 'Book a 30-min call',
    inline_height INTEGER DEFAULT 720,
    background_image_url TEXT,
    block_name TEXT,
    FOREIGN KEY (_parent_id) REFERENCES landing_pages(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS landing_pages_blocks_calendly_booking_order_idx ON landing_pages_blocks_calendly_booking (_order)`,
  `CREATE INDEX IF NOT EXISTS landing_pages_blocks_calendly_booking_parent_id_idx ON landing_pages_blocks_calendly_booking (_parent_id)`,
  `CREATE INDEX IF NOT EXISTS landing_pages_blocks_calendly_booking_path_idx ON landing_pages_blocks_calendly_booking (_path)`,

  // Draft-version mirrors of CalendlyBooking
  `CREATE TABLE IF NOT EXISTS _pages_v_blocks_calendly_booking (
    _order INTEGER NOT NULL,
    _parent_id INTEGER NOT NULL,
    _path TEXT NOT NULL,
    id TEXT PRIMARY KEY NOT NULL,
    eyebrow TEXT,
    headline TEXT,
    description TEXT,
    calendly_url TEXT,
    display_mode TEXT,
    popup_button_label TEXT,
    inline_height INTEGER,
    background_image_url TEXT,
    _uuid TEXT,
    block_name TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS _pages_v_blocks_calendly_booking_order_idx ON _pages_v_blocks_calendly_booking (_order)`,
  `CREATE INDEX IF NOT EXISTS _pages_v_blocks_calendly_booking_parent_id_idx ON _pages_v_blocks_calendly_booking (_parent_id)`,
  `CREATE INDEX IF NOT EXISTS _pages_v_blocks_calendly_booking_path_idx ON _pages_v_blocks_calendly_booking (_path)`,

  `CREATE TABLE IF NOT EXISTS _landing_pages_v_blocks_calendly_booking (
    _order INTEGER NOT NULL,
    _parent_id INTEGER NOT NULL,
    _path TEXT NOT NULL,
    id TEXT PRIMARY KEY NOT NULL,
    eyebrow TEXT,
    headline TEXT,
    description TEXT,
    calendly_url TEXT,
    display_mode TEXT,
    popup_button_label TEXT,
    inline_height INTEGER,
    background_image_url TEXT,
    _uuid TEXT,
    block_name TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS _landing_pages_v_blocks_calendly_booking_order_idx ON _landing_pages_v_blocks_calendly_booking (_order)`,
  `CREATE INDEX IF NOT EXISTS _landing_pages_v_blocks_calendly_booking_parent_id_idx ON _landing_pages_v_blocks_calendly_booking (_parent_id)`,
  `CREATE INDEX IF NOT EXISTS _landing_pages_v_blocks_calendly_booking_path_idx ON _landing_pages_v_blocks_calendly_booking (_path)`,

  // ── LeadMagnet block — new tables on both pages + landingPages ──────
  `CREATE TABLE IF NOT EXISTS pages_blocks_lead_magnet (
    _order INTEGER NOT NULL,
    _parent_id INTEGER NOT NULL,
    _path TEXT NOT NULL,
    id TEXT PRIMARY KEY NOT NULL,
    eyebrow TEXT,
    headline TEXT NOT NULL,
    description TEXT,
    download_href TEXT NOT NULL,
    download_label TEXT DEFAULT 'Download the free checklist',
    fineprint TEXT,
    block_name TEXT,
    FOREIGN KEY (_parent_id) REFERENCES pages(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS pages_blocks_lead_magnet_order_idx ON pages_blocks_lead_magnet (_order)`,
  `CREATE INDEX IF NOT EXISTS pages_blocks_lead_magnet_parent_id_idx ON pages_blocks_lead_magnet (_parent_id)`,
  `CREATE INDEX IF NOT EXISTS pages_blocks_lead_magnet_path_idx ON pages_blocks_lead_magnet (_path)`,

  `CREATE TABLE IF NOT EXISTS landing_pages_blocks_lead_magnet (
    _order INTEGER NOT NULL,
    _parent_id INTEGER NOT NULL,
    _path TEXT NOT NULL,
    id TEXT PRIMARY KEY NOT NULL,
    eyebrow TEXT,
    headline TEXT NOT NULL,
    description TEXT,
    download_href TEXT NOT NULL,
    download_label TEXT DEFAULT 'Download the free checklist',
    fineprint TEXT,
    block_name TEXT,
    FOREIGN KEY (_parent_id) REFERENCES landing_pages(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS landing_pages_blocks_lead_magnet_order_idx ON landing_pages_blocks_lead_magnet (_order)`,
  `CREATE INDEX IF NOT EXISTS landing_pages_blocks_lead_magnet_parent_id_idx ON landing_pages_blocks_lead_magnet (_parent_id)`,
  `CREATE INDEX IF NOT EXISTS landing_pages_blocks_lead_magnet_path_idx ON landing_pages_blocks_lead_magnet (_path)`,

  `CREATE TABLE IF NOT EXISTS _pages_v_blocks_lead_magnet (
    _order INTEGER NOT NULL,
    _parent_id INTEGER NOT NULL,
    _path TEXT NOT NULL,
    id TEXT PRIMARY KEY NOT NULL,
    eyebrow TEXT,
    headline TEXT,
    description TEXT,
    download_href TEXT,
    download_label TEXT,
    fineprint TEXT,
    _uuid TEXT,
    block_name TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS _pages_v_blocks_lead_magnet_order_idx ON _pages_v_blocks_lead_magnet (_order)`,
  `CREATE INDEX IF NOT EXISTS _pages_v_blocks_lead_magnet_parent_id_idx ON _pages_v_blocks_lead_magnet (_parent_id)`,
  `CREATE INDEX IF NOT EXISTS _pages_v_blocks_lead_magnet_path_idx ON _pages_v_blocks_lead_magnet (_path)`,

  `CREATE TABLE IF NOT EXISTS _landing_pages_v_blocks_lead_magnet (
    _order INTEGER NOT NULL,
    _parent_id INTEGER NOT NULL,
    _path TEXT NOT NULL,
    id TEXT PRIMARY KEY NOT NULL,
    eyebrow TEXT,
    headline TEXT,
    description TEXT,
    download_href TEXT,
    download_label TEXT,
    fineprint TEXT,
    _uuid TEXT,
    block_name TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS _landing_pages_v_blocks_lead_magnet_order_idx ON _landing_pages_v_blocks_lead_magnet (_order)`,
  `CREATE INDEX IF NOT EXISTS _landing_pages_v_blocks_lead_magnet_parent_id_idx ON _landing_pages_v_blocks_lead_magnet (_parent_id)`,
  `CREATE INDEX IF NOT EXISTS _landing_pages_v_blocks_lead_magnet_path_idx ON _landing_pages_v_blocks_lead_magnet (_path)`,
]

export async function POST() {
  const denied = denyIfProductionLocked()
  if (denied) return denied

  const payload = await getPayload({ config })
  const db = (payload.db as unknown as { drizzle?: { run: (sql: string) => Promise<unknown> }; client?: { execute: (sql: string) => Promise<unknown> } })
  const results: Array<{ stmt: string; status: 'ok' | 'noop' | 'error'; error?: string }> = []

  // Use the underlying libsql client via Payload's drizzle wrapper.
  const exec = async (sql: string): Promise<void> => {
    if (db.drizzle?.run) {
      await db.drizzle.run(sql)
    } else if (db.client?.execute) {
      await db.client.execute(sql)
    } else {
      // Fallback: use Payload's raw execute method if exposed.
      const dbAny = payload.db as unknown as { execute?: (args: { sql: string }) => Promise<unknown> }
      if (dbAny.execute) {
        await dbAny.execute({ sql })
      } else {
        throw new Error('No raw SQL execution path found on payload.db')
      }
    }
  }

  for (const stmt of [...ALTER_STATEMENTS, ...CREATE_STATEMENTS]) {
    try {
      await exec(stmt)
      results.push({ stmt: stmt.slice(0, 80) + '...', status: 'ok' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // duplicate column / table-already-exists / etc are expected on re-run
      if (
        msg.includes('duplicate column') ||
        msg.includes('already exists') ||
        msg.includes('no such table')
      ) {
        results.push({ stmt: stmt.slice(0, 80) + '...', status: 'noop', error: msg })
      } else {
        results.push({ stmt: stmt.slice(0, 80) + '...', status: 'error', error: msg })
      }
    }
  }

  return NextResponse.json({
    ok: true,
    counts: {
      ok: results.filter((r) => r.status === 'ok').length,
      noop: results.filter((r) => r.status === 'noop').length,
      error: results.filter((r) => r.status === 'error').length,
    },
    results,
  })
}
