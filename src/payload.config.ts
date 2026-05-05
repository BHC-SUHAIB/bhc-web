import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { resendAdapter } from '@payloadcms/email-resend'
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { LandingPages } from './collections/LandingPages'
import { Projects } from './collections/Projects'
import { Articles } from './collections/Articles'
import { Testimonials } from './collections/Testimonials'
import { Faqs } from './collections/Faqs'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { SmsConsents } from './collections/SmsConsents'
import { Clients } from './collections/Clients'
import { Invoices } from './collections/Invoices'
import { Subscriptions } from './collections/Subscriptions'
import { WebhookEvents } from './collections/WebhookEvents'
import { AuditEvents } from './collections/AuditEvents'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import { SiteSettings } from './globals/SiteSettings'
import { seedOnInit } from './seed/onInit'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const dbUri = process.env.DATABASE_URI || 'file:./payload.db'
const isPostgres = /^postgres(ql)?:\/\//.test(dbUri)

// Trusted origins for Payload's CSRF check. Covers the public site URL,
// the droplet IP (during pre-DNS HTTP access), and both production domains
// so admin logins succeed from any of them.
const csrfOrigins = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'http://104.131.82.31',
  'https://blackhartconsulting.com',
  'https://www.blackhartconsulting.com',
  'http://localhost:3000',
].filter(Boolean) as string[]

// S3-compatible media storage (DigitalOcean Spaces in production).
// When any required env var is missing we fall back to local disk storage,
// which keeps local dev working without the Spaces creds in place.
const s3Configured = Boolean(
  process.env.S3_BUCKET &&
  process.env.S3_ENDPOINT &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY,
)

// Optional CDN base URL for public file access. When set, Media records
// return e.g. https://bhc-media.nyc3.cdn.digitaloceanspaces.com/<file>
// \u2014 delivered from the CDN edge, bypassing the droplet. If unset we fall
// back to the Spaces origin URL derived from bucket + endpoint.
const s3PublicBase =
  process.env.S3_PUBLIC_URL ||
  (process.env.S3_BUCKET && process.env.S3_ENDPOINT
    ? `${process.env.S3_ENDPOINT.replace(/\/$/, '').replace('https://', `https://${process.env.S3_BUCKET}.`)}`
    : undefined)

const plugins = s3Configured
  ? [
      s3Storage({
        collections: {
          media: {
            // Serve files directly from Spaces/CDN instead of proxying
            // through Payload's /api/media/file/* route. Public website
            // images bypass the droplet entirely.
            disablePayloadAccessControl: true,
            generateFileURL: ({ filename, prefix }) => {
              const base = s3PublicBase || ''
              const joined = [base.replace(/\/$/, ''), prefix, filename].filter(Boolean).join('/')
              return joined
            },
          },
        },
        bucket: process.env.S3_BUCKET as string,
        config: {
          endpoint: process.env.S3_ENDPOINT,
          region: process.env.S3_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
          },
          // DigitalOcean Spaces supports virtual-hosted-style URLs.
          forcePathStyle: false,
        },
        // Uploads land with public-read ACL so the <img src="..."> served
        // from the CDN works without signed URLs.
        acl: 'public-read',
      }),
    ]
  : []

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  secret: process.env.PAYLOAD_SECRET || '',

  csrf: csrfOrigins,
  cors: csrfOrigins,

  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' \u00b7 Black Hart CMS',
      icons: [
        { rel: 'icon', type: 'image/png', sizes: '512x512', url: '/brand/black-hart-avatar-512.png' },
        { rel: 'shortcut icon', type: 'image/png', url: '/brand/black-hart-avatar-512.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', url: '/brand/black-hart-avatar-512.png' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // Custom avatar component for the top-right account button. Reads the
    // logged-in user's `avatar` upload field. Falls back to initials.
    avatar: {
      Component: '/components/admin/UserAvatar#default',
    },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#default',
        Icon: '/components/admin/Icon#default',
      },
      // Top-of-dashboard widgets, in render order.
      beforeDashboard: [
        '/components/admin/DashboardQuickActions#default',
        '/components/admin/KpiStrip#default',
        '/components/admin/ActionQueue#default',
        '/components/admin/RecentActivityPanel#default',
        '/components/admin/RevenueByLpDashboard#default',
      ],
      // Sidebar — runs a one-shot seed that default-collapses System + Site
      // groups for new users. After first run, the user's toggles persist.
      afterNavLinks: ['/components/admin/InitNavPrefs#default'],
    },
  },

  editor: lexicalEditor({}),

  // Real transactional email via Resend. When RESEND_API_KEY is unset we
  // omit the adapter entirely and Payload's default "console log" sink
  // fires \u2014 keeps local dev frictionless.
  ...(process.env.RESEND_API_KEY
    ? {
        email: resendAdapter({
          apiKey: process.env.RESEND_API_KEY,
          defaultFromName: 'Black Hart Consulting',
          defaultFromAddress: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        }),
      }
    : {}),

  onInit: seedOnInit,

  collections: [
    // Billing
    Clients, Invoices, Subscriptions,
    // Leads
    ContactSubmissions, SmsConsents,
    // Content
    Pages, LandingPages, Projects, Articles,
    // Library
    Media, Testimonials, Faqs,
    // System
    Users, WebhookEvents, AuditEvents,
  ],
  globals: [SiteSettings, Header, Footer],

  plugins,

  db: isPostgres
    ? postgresAdapter({
        pool: { connectionString: dbUri },
        // Schema push on boot instead of requiring pre-generated migrations.
        // Safe at this stage (no real data yet). For established sites, flip
        // to false and run `payload migrate:create` / `payload migrate` in CI.
        push: true,
      })
    : sqliteAdapter({ client: { url: dbUri } }),

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  sharp,
})
