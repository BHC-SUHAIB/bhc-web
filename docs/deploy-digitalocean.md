# Deploying to DigitalOcean

Two paths: **App Platform** (managed, git-push-to-deploy \u2014 recommended) or **Droplet + Docker** (more control).

## Option A: App Platform (recommended)

Prerequisites:
- GitHub repo connected to your DigitalOcean account
- `doctl` CLI installed (`brew install doctl`) and authenticated (`doctl auth init`)

### Steps

1. **Push this repo to GitHub** (see main README).

2. **Update `.do/app.yaml`** \u2014 change `YOUR-GITHUB-USER/bhc-web` to your actual GitHub `owner/repo`.

3. **Create the app:**
   ```bash
   doctl apps create --spec .do/app.yaml
   ```
   Or in the DO dashboard: **Apps \u2192 Create App \u2192 Connect GitHub Repository \u2192 select this repo**. App Platform auto-detects the spec.

4. **Set `PAYLOAD_SECRET`** in **App \u2192 Settings \u2192 Environment Variables**. Generate with:
   ```bash
   openssl rand -hex 32
   ```
   Mark it as encrypted / secret.

5. **First deploy will build the Dockerfile, provision Postgres, run Payload migrations, and boot.** Check the deployment logs until you see `Ready in Xs`.

6. **Create an admin user.** On first boot, the `onInit` seed creates `admin@blackhartconsulting.com / changeme123!`. Log in at `https://your-app.ondigitalocean.app/admin` and **change the password immediately**.

### Scaling

- `instance_size_slug: basic-xxs` gives you a 512MB / 1 vCPU container at the cheapest tier. Bump to `basic-xs` (1GB) once you have traffic.
- `instance_count: 1` is fine for small sites. For zero-downtime deploys at scale, go to 2+ and add a load balancer.
- **Do not** run multiple instances with SQLite. Migrate to Postgres first.

### Database: switching from SQLite to Postgres

DigitalOcean provisions a managed Postgres database (defined in `databases:` in `.do/app.yaml`). After the app deploys:

1. Install the Postgres adapter locally:
   ```bash
   npm install --legacy-peer-deps @payloadcms/db-postgres pg
   npm uninstall @payloadcms/db-sqlite
   ```

2. Swap the adapter in `src/payload.config.ts`:
   ```ts
   import { postgresAdapter } from '@payloadcms/db-postgres'

   db: postgresAdapter({
     pool: { connectionString: process.env.DATABASE_URI },
   }),
   ```

3. Commit + push \u2014 DigitalOcean redeploys automatically. Payload will auto-create tables on boot.

### Media uploads

By default, media goes to local disk at `/app/media`. **App Platform containers are ephemeral** \u2014 this means uploads disappear on redeploy. For production, use external storage:

- **Supabase Storage** (generous free tier)
- **AWS S3 / DigitalOcean Spaces**
- **Cloudflare R2**

Install + configure via a Payload cloud-storage plugin:

```bash
npm install --legacy-peer-deps @payloadcms/storage-s3
```

Then add to `payload.config.ts`:

```ts
import { s3Storage } from '@payloadcms/storage-s3'

plugins: [
  s3Storage({
    collections: { media: true },
    bucket: process.env.S3_BUCKET!,
    config: {
      endpoint: process.env.S3_ENDPOINT, // https://<region>.digitaloceanspaces.com for DO Spaces
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    },
  }),
]
```

### Custom domain

1. In DO dashboard: **App \u2192 Settings \u2192 Domains \u2192 Add Domain**.
2. Point your DNS at the provided CNAME.
3. DO provisions a free TLS cert.
4. Update `NEXT_PUBLIC_SITE_URL` to the new domain.

---

## Option B: Droplet + Docker

Better fit if you want: SSH access, cheaper at scale, your own backups, or non-Docker services (e.g. a Redis you already operate).

1. Provision a **$6/mo Droplet** (basic, Ubuntu 24.04, with Docker pre-installed):
   ```bash
   doctl compute droplet create bhc-web \
     --size s-1vcpu-1gb \
     --image docker-20-04 \
     --region nyc1 \
     --ssh-keys YOUR_SSH_KEY_ID
   ```

2. SSH in, clone the repo, install Caddy for TLS:
   ```bash
   ssh root@<droplet-ip>
   git clone git@github.com:YOUR-GITHUB-USER/bhc-web.git
   cd bhc-web
   cp .env.example .env
   # edit .env, set PAYLOAD_SECRET + DATABASE_URI + NEXT_PUBLIC_SITE_URL
   docker compose up -d --build
   ```

3. Set up Caddy as a reverse proxy with auto-TLS:
   ```
   # /etc/caddy/Caddyfile
   blackhartconsulting.com {
     reverse_proxy localhost:3000
   }
   ```

   ```bash
   systemctl reload caddy
   ```

4. Point your domain\u2019s DNS A record at the Droplet IP. Caddy gets the cert automatically.

---

## Backups

- **Managed Postgres (App Platform):** daily automated backups, 7-day retention on basic tier.
- **Self-hosted Postgres:** set up a daily `pg_dump` cron + upload to Spaces.
- **Media:** always use external object storage \u2014 those providers handle durability.

---

## Monitoring + alerts

DigitalOcean App Platform gives you basic metrics in the dashboard. For more:

- **Uptime monitoring:** [Better Stack](https://betterstack.com) or [UptimeRobot](https://uptimerobot.com) \u2014 hit `/` every 60 seconds.
- **Error tracking:** Sentry (add `@sentry/nextjs` \u2014 low effort, high value).
- **Log aggregation:** the DO dashboard is fine until you have \u003e1M requests/mo, then add Logtail or Papertrail.

---

## Rollback

App Platform keeps the last 5 deployments. In the dashboard, **Deployments \u2192 select previous \u2192 Redeploy**. DNS updates instantly.
