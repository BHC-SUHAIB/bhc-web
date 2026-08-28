import type { CollectionConfig } from 'payload'

// Only mark auth cookies as Secure when we're actually serving over HTTPS.
// In production Payload defaults Secure=true, which causes browsers to drop
// the login cookie on plain HTTP (e.g., IP-based access pre-DNS). Result:
// the login form silently resets after submit. Flip Secure based on the
// public site URL so HTTP logins work before TLS is live.
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('https://')

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // API keys let trusted internal services (hart-pipeline) push won leads
    // into the CRM without a browser session. Enable the key per-user in the
    // admin; requests authenticate with `Authorization: users API-Key <key>`.
    useAPIKey: true,
    cookies: {
      secure: isHttps,
      sameSite: 'Lax',
    },
  },
  admin: {
    group: 'System',
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'createdAt'],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media' as const,
      admin: {
        description: 'Profile picture shown in the admin header. Square or circular crops work best (e.g. 256×256).',
      },
    },
  ],
}
