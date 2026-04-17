# Deploying to DigitalOcean (Droplet + Docker Compose)

End-to-end guide to deploy Black Hart Consulting on a DigitalOcean droplet
using Docker Compose, Caddy for auto-TLS, and managed Postgres inside a
container.

**Total first-month cost:** $12 (just the droplet).

---

## Architecture

```
Internet ── 443/TCP ──▶ Caddy ── 3000 ──▶ Next.js (web)
                          │                    │
                          │                    └── local volume: /app/media
                          └── Let's Encrypt (auto)
                                               │
                                               │
                              Postgres (container) ─── volume: /var/lib/postgresql/data
```

All three services (Caddy, web, Postgres) run on the same droplet. Simple,
cheap, reliable for \< 10k requests/day. Scales vertically (bigger droplet)
comfortably until \~100k requests/day.

---

## Prerequisites

- DigitalOcean account with a payment method
- SSH key in DO: **Account \u2192 Settings \u2192 Security \u2192 Add SSH Key**
  - If you don't have one: `ssh-keygen -t ed25519 -C "you@example.com"` then copy `~/.ssh/id_ed25519.pub`
- Domain name (optional for Day 1 \u2014 you can use the droplet IP)
- This repo pushed to GitHub (already done)

---

## Step 1 \u2014 Create the droplet

### Via the DigitalOcean web dashboard

1. **Create \u2192 Droplet**
2. **Region:** NYC3 (or whichever is closest to your users)
3. **Choose an image:**
   - **Marketplace** tab \u2192 search **"Docker"** \u2192 pick **"Docker on Ubuntu 24.04"**
   - Docker + Compose are pre-installed, saving \~10 minutes of setup
4. **Size:**
   - **Basic \u2192 Regular \u2192 s-1vcpu-2gb \u2014 $12/mo**
   - Why not $6: Next.js build needs \~900MB; the 1GB droplet OOMs during `next build`
   - You can resize up later if traffic demands
5. **Additional options:** enable **IPv6** and **Monitoring**
6. **Authentication:** **SSH Key** \u2014 select the key you uploaded above
7. **Hostname:** `bhc-web` (or anything you like)
8. Click **Create Droplet**

Wait \~45 seconds. Copy the droplet's IPv4 address.

### Via `doctl` (optional alternative)

```bash
doctl compute droplet create bhc-web \
  --size s-1vcpu-2gb \
  --image docker-20-04 \
  --region nyc3 \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
  --enable-monitoring \
  --enable-ipv6 \
  --wait
```

---

## Step 2 \u2014 Point your domain (if you have one)

In your DNS provider:

| Type | Name | Value |
|---|---|---|
| A | `@` | `<droplet-ip>` |
| A | `www` | `<droplet-ip>` |

TTL 300s is fine. Wait for propagation (check with `dig +short blackhartconsulting.com`).

**No domain yet?** Skip this step and use the IP address through Step 5. You
can add the domain later without redeploying.

---

## Step 3 \u2014 Add a GitHub deploy key to the droplet

The droplet needs to pull from your **private** GitHub repo. Two options;
deploy key is the cleaner approach.

```bash
# SSH in
ssh root@<droplet-ip>

# Generate a key for this droplet
ssh-keygen -t ed25519 -C "bhc-droplet-deploy" -N "" -f /root/.ssh/id_ed25519

# Print the public key (copy this)
cat /root/.ssh/id_ed25519.pub
```

In GitHub:
1. Go to **BHC-SUHAIB/bhc-web \u2192 Settings \u2192 Deploy keys \u2192 Add deploy key**
2. Paste the public key, leave "Allow write access" **unchecked**
3. Save

Back on the droplet, accept GitHub's host key:

```bash
ssh-keyscan -t ed25519,rsa github.com >> /root/.ssh/known_hosts
```

---

## Step 4 \u2014 Run the one-time droplet setup

Still on the droplet:

```bash
# Clone the repo (pulls via SSH using the deploy key)
git clone git@github.com:BHC-SUHAIB/bhc-web.git /opt/bhc-web
cd /opt/bhc-web

# Run the setup script: firewall, system updates, fail2ban, app dir
bash scripts/setup-droplet.sh
```

The script:
- Updates apt + enables unattended security upgrades
- Installs `git`, `ufw`, `fail2ban`
- Enables UFW firewall (allows 22, 80, 443 only)
- Makes sure Docker is enabled at boot
- Copies `.env.production.example` to `.env` for you to edit

---

## Step 5 \u2014 Configure secrets

Edit `.env` on the droplet:

```bash
nano /opt/bhc-web/.env
```

Required values:

```bash
# 1. PAYLOAD_SECRET \u2014 generate locally and paste
#    openssl rand -hex 32
PAYLOAD_SECRET=<PASTE_RANDOM_HEX>

# 2. Postgres password \u2014 use openssl rand -base64 24 or pwgen
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>

# 3. Public URL. Day 1 = droplet IP. Change to your domain when ready.
NEXT_PUBLIC_SITE_URL=http://<droplet-ip>

# 4. SITE_DOMAIN \u2014 LEAVE BLANK for now (Caddy will serve plain HTTP on :80)
#    Once DNS points here, change to "blackhartconsulting.com" and redeploy
#    Caddy to get auto-TLS.
SITE_DOMAIN=

# 5. Seed admin (only used on first boot when DB is empty)
SEED_ADMIN_EMAIL=you@yourdomain.com
SEED_ADMIN_PASSWORD=<STRONG_TEMP_PASSWORD>
```

Save (Ctrl+O, Enter, Ctrl+X).

---

## Step 6 \u2014 First deploy

```bash
cd /opt/bhc-web
bash scripts/deploy.sh
```

What this does:
1. Builds the Next.js production image (\~3\u20135 minutes first time)
2. Starts Postgres, waits for it to be healthy
3. Starts the Next.js app container (seed hook creates the admin user + all pages on first boot)
4. Starts Caddy on :80

Watch the logs until you see `Ready in Xms` from the web container:

```bash
docker compose logs -f web
```

Press Ctrl+C when you see:
```
[seed] admin user created: you@yourdomain.com / <password>
[seed] home page created
...
- Ready in 245ms
```

---

## Step 7 \u2014 Verify

From your laptop:

```bash
# Public site
curl -I http://<droplet-ip>

# Should return 200 OK
```

Then in a browser:

- **http://\<droplet-ip\>** \u2014 the public site
- **http://\<droplet-ip\>/admin** \u2014 log in with your seed credentials
- **Change your admin password immediately** under your user profile

---

## Step 8 \u2014 Enable HTTPS (once DNS is pointing)

After `dig +short blackhartconsulting.com` shows your droplet IP, enable TLS:

```bash
nano /opt/bhc-web/.env
```

Change:
```diff
- SITE_DOMAIN=
+ SITE_DOMAIN=blackhartconsulting.com
- NEXT_PUBLIC_SITE_URL=http://<droplet-ip>
+ NEXT_PUBLIC_SITE_URL=https://blackhartconsulting.com
```

Restart Caddy + web so they pick up the new values:

```bash
docker compose up -d caddy web
```

Caddy automatically requests a Let's Encrypt cert. First request to your
domain will be a bit slow (cert negotiation); subsequent requests are
millisecond-fast.

Verify:
```bash
curl -I https://blackhartconsulting.com
# HTTP/2 200
```

---

## Step 9 \u2014 Schedule daily backups

```bash
sudo crontab -e
```

Add:
```cron
0 3 * * * /opt/bhc-web/scripts/backup.sh >> /var/log/bhc-backup.log 2>&1
```

Backups land in `/opt/bhc-web/backups/` and rotate after 7 days. See the
**Off-site backups** section below if you want them shipped to DO Spaces.

---

## Ongoing: updates and deploys

From your laptop, push a change to `main`:

```bash
git add -A
git commit -m "Update hero copy"
git push
```

On the droplet:

```bash
ssh root@<droplet-ip>
cd /opt/bhc-web
bash scripts/deploy.sh
```

The script pulls latest, rebuilds the web image, rotates the container. Takes
\~45 seconds on a warm cache.

**Optional: GitHub Actions auto-deploy.** Add a workflow that SSHes in and
runs `deploy.sh` on every push to `main`. Ask me to wire this up when you're
ready \u2014 takes about 5 minutes with an SSH key stored as a repo secret.

---

## Off-site backups (optional, \$5/mo)

Local backups survive a container crash but NOT a droplet failure. For
real durability:

1. Create a **DO Spaces** bucket: **Spaces \u2192 Create a Space** (\$5/mo, 250GB + 1TB transfer)
2. Generate Spaces access key: **API \u2192 Spaces Keys \u2192 Generate**
3. Install `s3cmd` on the droplet:
   ```bash
   apt-get install -y s3cmd
   s3cmd --configure
   ```
4. Extend `scripts/backup.sh` with an upload step:
   ```bash
   s3cmd put "$DIR/db-$STAMP.sql.gz" s3://your-bucket/bhc/db/
   s3cmd put "$DIR/media-$STAMP.tar.gz" s3://your-bucket/bhc/media/
   ```
5. Spaces has built-in 90-day retention for versioned objects.

---

## Troubleshooting

### The build OOMs during `deploy.sh`

Symptom: the web container fails to build, logs mention "killed" or exit 137.
- You're on a 1GB droplet. Resize to 2GB (**Power Off \u2192 Resize \u2192 CPU & RAM only**).
- Or build on your laptop and push the image: contact me to set up a registry flow.

### `docker compose logs web` shows ECONNREFUSED to postgres

- Postgres is still starting up. Wait 10s and try again.
- If persistent: `docker compose ps` \u2014 confirm postgres health; `docker compose logs postgres` for errors.

### Caddy can't get a cert

- Verify DNS: `dig +short your-domain.com` must return your droplet IP
- Verify ports 80/443 open: `sudo ufw status` (should show 80/tcp, 443/tcp allowed)
- Check Caddy logs: `docker compose logs caddy | tail -50`
- Most common cause: DNS hasn't propagated yet. Wait 5\u201315 min after updating DNS.

### Media uploads disappear after redeploy

- Should not happen \u2014 media is on a named Docker volume (`media`).
- If it does: `docker volume ls | grep media` \u2014 verify the volume exists. `docker compose config` \u2014 verify the mount.

### Admin login says "Invalid credentials"

- Seed only creates the admin on an EMPTY database. If you changed
  SEED_ADMIN_EMAIL after the first boot, the new email didn't apply.
- Fix via psql:
  ```bash
  docker compose exec postgres psql -U bhc -d bhc \
    -c "UPDATE users SET email='you@new.com' WHERE id=1;"
  ```
- Or reset password: log in as the original seed user \u2192 change in profile.

### Site is slow (first request after idle)

- SQLite-backed dev is different from Postgres-backed prod. First request
  wakes connection pool; subsequent requests are snappy.
- If consistently slow: check `docker stats` for CPU/memory pressure. Resize
  droplet or add an external Redis cache (we haven't wired Redis yet).

---

## Rollback a bad deploy

```bash
cd /opt/bhc-web
git log --oneline -5             # find the good commit
git checkout <good-sha>
bash scripts/deploy.sh
```

Note: content changes (CMS edits made in `/admin`) are stored in Postgres,
so they persist across code rollbacks.

---

## Hardening (nice to do, not required for Day 1)

- Create a non-root deploy user (`adduser deploy`; `usermod -aG docker deploy`; `usermod -aG sudo deploy`; move keys; disable root SSH in `/etc/ssh/sshd_config`).
- Add Fail2ban jail for the web service.
- Set up Cloudflare or DO Cloud Firewall in front for DDoS protection.
- Wire Sentry (`@sentry/nextjs`) for error tracking.
- Add an uptime monitor (UptimeRobot free tier is fine).

Ask me and I'll do any of these.
