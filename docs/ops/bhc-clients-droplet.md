# bhc-clients droplet — shared client-hosting server (runbook)

**Status (2026-09-21):** live. Hosts one **paying client**, `grantswithinreach.com`, so every
change on this box is a change to production: nothing here may take the site down. Off-box
backups to DO Spaces are now wired (§4), and the GWR clone pulls from GitHub through its own
read-only deploy key (§3) — the git-bundle stopgap is retired.

| Item | Value |
|---|---|
| Snapshot name (latest) | `bhc-clients-gwr-live-2026-09-21` — taken live, with the client site up |
| Snapshot ID (latest) | `246510152` (29.77 GiB, nyc3) |
| Snapshot name (base) | `bhc-clients-base-2026-09-13` — clean box, no clients. Keep it. |
| Snapshot ID (base) | `245391002` |
| Snapshot cost | USD 0.06 / GB / month: base 4.99 GiB ≈ USD 0.30/mo, GWR-live 29.77 GiB ≈ USD 1.79/mo |
| Droplet (when running) | `s-2vcpu-4gb`, nyc3, USD 24/mo, ~USD 0.036/hr |
| Droplet ID / IP | **600246126 / 159.203.90.123** (live). A droplet restored from the snapshot gets a NEW IP. |
| Health URL | `https://clients.getblackhart.com` returns `200` + `bhc-clients ok` |
| DNS | Cloudflare zone `getblackhart.com`, A record `clients` → 159.203.90.123 (DNS only / grey cloud). Edit it if the droplet is ever rebuilt. |
| SSH | `ssh deploy@<ip>` with the `suhaib-mbpro` key (`~/.ssh/id_rsa`). Root login and password auth are off. |
| GitHub access from the box | None by default. Each client clone pulls through its own read-only deploy key (`~/.ssh/github-deploy-<slug>`, alias `github.com-<slug>`), see [Deploy key](#deploy-key-one-per-client). No token, no gh CLI. |
| Templates in this repo | [`docs/ops/bhc-clients/`](bhc-clients/) (compose, Caddyfile, scripts, backup) |

Source of the design: `docs/ops/BHC-Service-Implementation-Playbook-2026-09.pdf`, Part 2
("Where the sites live: a shared clients droplet") and Part 5 (Host plan, line by line).

### Snapshot cadence

**Take a fresh snapshot before every client add and every cutover** — i.e. before any
`add-client.sh` run, before repointing a live domain, and before a Postgres or Docker
upgrade. A snapshot on a running droplet is safe: no power-off, no downtime, and the live
site keeps serving throughout (the 2026-09-21 one took ~5 minutes with GWR up).

```bash
doctl compute droplet-action snapshot 600246126 \
  --snapshot-name bhc-clients-<what-changed>-$(date +%F) --wait
doctl compute snapshot list --resource droplet        # confirm it landed
```

Keep the base image and the newest pre-change snapshot; delete older ones by hand once a
newer good one exists, since each costs USD 0.06/GB/month. A snapshot is a whole-box
rollback, **not** a data backup — for per-client data use §4.

---

## 1. Architecture

One droplet, one Docker Compose project at `/opt/bhc-clients`:

```
Internet ──80/443──▶ caddy (bhc-clients-caddy)
                       │  routes by hostname, Let's Encrypt per site
                       │  Caddyfile + caddy/sites/<slug>.caddy (one file per client)
                       ├──▶ <slug>:3000   (bhc-client-<slug>, Next.js + Payload, one per client)
                       ├──▶ <slug2>:3000
                       └──▶ clients.getblackhart.com  → "bhc-clients ok" (health)

postgres (bhc-clients-postgres, postgres:16-alpine, NOT published on any host port)
   ├── database <slug>   owned by role <slug>    (slug with hyphens → underscores)
   └── database <slug2>  owned by role <slug2>

/opt/bhc-clients/
├── docker-compose.yml        caddy + postgres (+ one appended service per client)
├── Caddyfile                 health site + `import /etc/caddy/sites/*.caddy`
├── caddy/sites/<slug>.caddy  per-client vhost (www→apex 308, cache headers, security headers)
├── clients/<slug>/           git clone of the client's repo (has a Dockerfile serving :3000); origin = git@github.com-<slug>:...
│   ├── .env                  DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_SITE_URL, seed admin, Resend
│   └── media/                bind-mounted to /app/media (uid 1001 = nextjs)
├── .env                      POSTGRES_USER / POSTGRES_PASSWORD (mode 600, never committed)
└── scripts/
    ├── add-client.sh         <slug> <hostname>   → DB + role, .env, compose service, Caddy site, DNS hints
    ├── add-deploy-key.sh     <slug> <owner/repo> [--check] → read-only GitHub deploy key + ssh alias for the clone
    ├── remove-client.sh      <slug> [--purge] [--yes]
    └── restore-client.sh     <slug> <dumpfile> [--yes]   (run with sudo)

/root/db-backups/
├── backup.sh                 nightly: pg_dump -F c per DB + media tar, 14-day rotation
├── backup.log
└── <db>/<db>-YYYY-MM-DD_HHMMSS.dump  (+ <db>-media-<stamp>.tar.gz, pre-restore-<stamp>.dump)
```

Mirrors `/opt/bhc-web` on the production droplet (same Caddy image, same Postgres
image, same header set, same `restart: unless-stopped`), with two deliberate differences:
Caddy vhosts are split into one file per client so a script can add/remove them, and
`volumes:` sits above `services:` in the compose file so `add-client.sh` can append to
the end safely.

Host hardening (all done, all in the snapshot):

- `deploy` user, in `sudo` + `docker` groups, `NOPASSWD: ALL` (the user has no password,
  so passworded sudo would be unusable over SSH). Key: `suhaib-mbpro`.
- sshd: `PasswordAuthentication no`, `PermitRootLogin no`, `MaxAuthTries 4`
  (`/etc/ssh/sshd_config.d/10-bhc-hardening.conf`).
- ufw: default deny in; allow 22/tcp, 80/tcp, 443/tcp, 443/udp (HTTP/3). IPv4 + IPv6.
- fail2ban `sshd` jail (5 tries / 10 min → 1 h ban), `/etc/fail2ban/jail.local`.
- unattended-upgrades on (daily), with unused-dependency cleanup.
- Timezone `America/Chicago`; 2 GB `/swapfile`, `vm.swappiness=10`.
- Docker CE 29 + Compose v5 from Docker's apt repo (DO has no "Docker on Ubuntu 24.04"
  marketplace image; the marketplace one is 22.04).

Capacity: 4 GB RAM is comfortable for ~5 Starter Sites. Each client container is
capped at 768 MB (`deploy.resources.limits.memory` in its service block); a Next.js +
Payload site idles around 150-300 MB. `next build` inside `docker compose build` is the
memory spike (1-2 GB) — build one client at a time. Resize when `free -h` shows swap
in steady use (see [Resize](#5-resize-up-or-down)).

---

## 2. Exact commands that were run (2026-09-13)

Local Mac (doctl 1.168.0 via Homebrew, `doctl auth init` done by Suhaib):

```bash
doctl account get
doctl compute ssh-key list                     # suhaib-mbpro = 40649348 (~/.ssh/id_rsa.pub)
doctl compute droplet create bhc-clients \
  --region nyc3 --image ubuntu-24-04-x64 --size s-2vcpu-4gb \
  --ssh-keys 40649348 --enable-monitoring --enable-ipv6 \
  --tag-names bhc-clients --wait
# → ID 600246126, 159.203.90.123, 2604:a880:800:14:0:3:80eb:b000
```

On the droplet as root, one script (`harden.sh`, reproduced by the bullet list in
section 1; cloud-init holds the apt lock for ~1 min after boot, so
`cloud-init status --wait` first). Then, after confirming `ssh deploy@<ip> sudo -n true`
works, `PermitRootLogin no` was appended and sshd reloaded.

Stack install (as `deploy`):

```bash
sudo install -d -o deploy -g deploy /opt/bhc-clients
rsync -az docs/ops/bhc-clients/ deploy@<ip>:/opt/bhc-clients/    # minus .env.example/.gitignore/backup/
cd /opt/bhc-clients
umask 077; printf 'POSTGRES_USER=bhc_admin\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env
sudo install -d -m 700 /root/db-backups
sudo install -m 700 backup.sh /root/db-backups/backup.sh
echo '30 3 * * * /root/db-backups/backup.sh >/dev/null 2>&1' | sudo crontab -
docker compose up -d
```

Verification that was done and passed (outputs in the PR that added this file):

- `add-client.sh smoketest smoketest.preview.getblackhart.com` → role + DB + .env +
  compose service + Caddy site created, `docker compose config -q` valid, Caddy reloaded.
- `backup.sh` → `/root/db-backups/smoketest/smoketest-<stamp>.dump` written, logged.
- `restore-client.sh smoketest <dump> --yes` → 3 rows deleted, restored from the dump, 3 rows back.
- `remove-client.sh smoketest --purge --yes` → everything gone, compose valid, only `postgres` DB left.
- Cloudflare A record `clients` → 159.203.90.123 (DNS only), then
  `curl -I https://clients.getblackhart.com` → `HTTP/2 200`, body `bhc-clients ok`,
  cert `CN=clients.getblackhart.com` issued by Let's Encrypt.
- `docker compose ps` → caddy healthy, postgres healthy.
- `ufw status verbose` → only 22/80/443 (tcp) + 443/udp. `ss -tlnp` → sshd :22,
  docker-proxy :80/:443, plus systemd-resolved on 127.0.0.x:53 only.

Gotchas hit during the build (so nobody repeats them):

1. **Let's Encrypt rate limit.** Caddy started asking for the `clients.getblackhart.com`
   cert as soon as it booted, ~15 minutes before the DNS record existed, and burned the
   5-failed-authorizations-per-hour limit. Fix was to wait for the window to lapse and
   `docker compose restart caddy`. **Always create the DNS record before Caddy sees a
   hostname** (add-client.sh, restore-from-snapshot). ZeroSSL fallback is automatic but slow.
2. `sshd -t` on 24.04 needs `mkdir -p /run/sshd` first (socket-activated sshd).
3. Caddy's admin API binds `127.0.0.1:2019`; a healthcheck against `localhost` hits `::1`
   and fails. The compose file uses `127.0.0.1`.
4. `sudo` + a `read -p` prompt fed from a pipe fails silently; the scripts take `--yes`
   and read from `/dev/tty` otherwise.
5. `preview.getblackhart.com` already points at the Coolify box (165.227.210.216), so the
   playbook's `<slug>.preview.getblackhart.com` scheme collides. Use
   `<slug>.clients.getblackhart.com` for previews instead (add an A record per preview, or
   one wildcard `*.clients` A record → this droplet).

---

## 3. Add a client

Prereqs: the client's repo has a `Dockerfile` that serves on `:3000` and reads
`DATABASE_URI` / `PAYLOAD_SECRET` / `NEXT_PUBLIC_SITE_URL` (the bhc-web Dockerfile does).

```bash
ssh deploy@<ip>
cd /opt/bhc-clients
GTM_ID=GTM-XXXXXXX CLARITY_ID=abcdefghij \
  bash scripts/add-client.sh acme-plumbing acme-plumbing.com "Acme Plumbing"
```

The 3rd argument (public site name) and the two analytics env vars are optional; the name
defaults to the title-cased slug and empty IDs simply render no tags.

**`NEXT_PUBLIC_*` must be compose build args, not just `env_file` entries.** Next.js inlines
anything `NEXT_PUBLIC_*` at `next build`, so a value that only exists in `.env` at runtime
never reaches the browser bundle — that is why GWR's service block had to be hand-edited on
2026-09-21 to add GTM and Clarity. `add-client.sh` now writes the `args:` block itself for
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_GTM_ID` and
`NEXT_PUBLIC_CLARITY_PROJECT_ID`, and writes the same four keys into `clients/<slug>/.env`.
To change one later, edit **both** copies and `docker compose up -d --build <slug>` — a
`--force-recreate` will not re-inline it. `SEED_ADMIN_EMAIL` is
`suhaib@blackhartconsulting.com`; `hello@` is a forwarding alias only and must never be a login.

The script (idempotent) creates role + database `acme_plumbing` (and revokes CONNECT on it from
PUBLIC, so only that role can open it), writes
`clients/acme-plumbing/.env` (DATABASE_URI with a generated password, PAYLOAD_SECRET, site
URL, a seed admin password, empty Resend keys), appends the `acme-plumbing` service to
`docker-compose.yml`, writes `caddy/sites/acme-plumbing.caddy`, reloads Caddy, and prints:

```
DNS records for acme-plumbing.com (Cloudflare: DNS only / grey cloud, or the registrar):
  A     @      <droplet ip>
  A     www    <droplet ip>
```

### Deploy key (one per client)

Client repos are private and the droplet has no GitHub token and no `gh` CLI, so a plain
`https://github.com/...` origin cannot be pulled unattended (`could not read Username for
'https://github.com'`). Each client gets its own **read-only deploy key** instead:

```bash
bash scripts/add-deploy-key.sh acme-plumbing BHC-SUHAIB/acme-plumbing
```

The script (idempotent) generates `~/.ssh/github-deploy-acme-plumbing` (ed25519, no
passphrase), pins github.com's host key, adds a `Host github.com-acme-plumbing` alias to
`~/.ssh/config` that uses only that key, repoints `clients/acme-plumbing` at
`git@github.com-acme-plumbing:BHC-SUHAIB/acme-plumbing.git` if the clone already exists,
and prints the public key.

The generated key does nothing until it is **registered on the repo**. From the Mac, where
`gh` is authenticated as `BHC-SUHAIB`, that is one command (no browser, no control panel):

```bash
scp deploy@159.203.90.123:~/.ssh/github-deploy-acme-plumbing.pub /tmp/
gh repo deploy-key add /tmp/github-deploy-acme-plumbing.pub \
  --repo BHC-SUHAIB/acme-plumbing --title "bhc-clients droplet (read-only)"
gh repo deploy-key list --repo BHC-SUHAIB/acme-plumbing      # must show "read-only"
```

`gh repo deploy-key add` without `--allow-write` is read-only, which is what we want: the
droplet can pull and can never push. Equivalent by hand:
**github.com/BHC-SUHAIB/acme-plumbing → Settings → Deploy keys → Add deploy key**, title
`bhc-clients droplet (read-only)`, **Allow write access unchecked**. Confirm with

```bash
bash scripts/add-deploy-key.sh acme-plumbing BHC-SUHAIB/acme-plumbing --check
```

**Every new client needs its own key + its own `Host` alias.** One key per repo because
GitHub allows a deploy key on exactly one repository, and the `IdentitiesOnly` alias means a
clone can never reach another client's repo. Skipping this is what forced the git-bundle
workaround for GWR through 2026-09-18.

Gotcha seen on 2026-09-21: GWR's key had existed on the droplet since 2026-09-17 but had
**never been added to the repo**, so every pull failed with
`git@github.com: Permission denied (publickey)` and looked like a broken key. Before
regenerating anything, check `gh repo deploy-key list` — an empty list is the usual cause.
Also allow ~1 minute after `deploy-key add` before the first fetch succeeds.

Verify from the droplet:

```bash
cd /opt/bhc-clients/clients/acme-plumbing
git remote -v                 # must be git@github.com-acme-plumbing:...
git fetch origin && git status -sb     # want "## main...origin/main" with no ahead/behind
```

The bundle stopgap (only if a key genuinely cannot be added): on the Mac
`git bundle create /tmp/<slug>.bundle main`, `scp` it up, then
`git -C clients/<slug> pull --ff-only /tmp/<slug>.bundle main`.

Current state: `grants-within-reach` uses key `~/.ssh/github-deploy-grants-within-reach`,
alias `github.com-grants-within-reach`, registered on `BHC-SUHAIB/grantswithinreach` as
deploy key **164031225** (read-only). `git fetch` works; the clone sits at `origin/main`.

### Clone and build

```bash
git clone git@github.com-acme-plumbing:BHC-SUHAIB/acme-plumbing.git clients/acme-plumbing   # the alias, not github.com
# fill RESEND_API_KEY / EMAIL_FROM / CONTACT_NOTIFY_EMAIL in clients/acme-plumbing/.env
docker compose up -d --build acme-plumbing
docker compose logs -f acme-plumbing        # wait for "Ready"
```

Point the client's DNS at the droplet **before** the hostname goes into Caddy if the
domain is already live elsewhere (see gotcha 1). For a pre-launch preview run
`add-client.sh acme-plumbing acme-plumbing.clients.getblackhart.com` first, add that A
record, and at cutover edit `caddy/sites/acme-plumbing.caddy` + `NEXT_PUBLIC_SITE_URL`
in the client `.env`, then:

```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
docker compose up -d --force-recreate acme-plumbing
```

Redeploy after a push to the client repo's `main`:

```bash
git -C clients/acme-plumbing pull --ff-only && docker compose up -d --build acme-plumbing
```

This only works once the deploy key is on GitHub (above). The clone is read-only from the
droplet's side; commits happen on the Mac and go up through GitHub.

Remove a client (keeps DB + files unless `--purge`):

```bash
sudo /root/db-backups/backup.sh                     # final backup first
bash scripts/remove-client.sh acme-plumbing          # or: acme-plumbing --purge
```

---

## 4. Backups and restore

- Cron (root): `30 3 * * *` America/Chicago → `/root/db-backups/backup.sh`.
- Per client DB: `pg_dump -F c` → `/root/db-backups/<db>/<db>-<stamp>.dump`; if
  `clients/<slug>/media` is non-empty, also `<db>-media-<stamp>.tar.gz`.
- Rotation: anything under `/root/db-backups` older than 14 days is deleted.
- Log: `/root/db-backups/backup.log` (one `ok`/`FAIL` line per DB, one `done:` line per run,
  then one `ok`/`FAIL`/`WARN offsite:` line for the Spaces sync).
- Off-box: every run also syncs the tree to `s3://bhc-client-backups/bhc-clients/` (below).
- Run by hand: `sudo /root/db-backups/backup.sh`.
- Templates in this repo: [`bhc-clients/backup/backup.sh`](bhc-clients/backup/backup.sh),
  [`crontab.txt`](bhc-clients/backup/crontab.txt),
  [`s3cfg.example`](bhc-clients/backup/s3cfg.example) (Spaces credentials).

Restore one client:

```bash
sudo ls /root/db-backups/acme_plumbing/
sudo bash /opt/bhc-clients/scripts/restore-client.sh acme-plumbing \
  /root/db-backups/acme_plumbing/acme_plumbing-2026-10-01_033001.dump
```

It stops the container, takes a safety dump (`pre-restore-<stamp>.dump`), drops and
recreates the DB, `pg_restore`s with `--no-owner --role=<db>`, starts the container.
Media: `sudo tar -xzf <db>-media-<stamp>.tar.gz -C /opt/bhc-clients/clients/<slug>/media`.

### Off-box copy to DO Spaces (wired 2026-09-21)

`backup.sh` now ends with an `s3cmd sync` of the whole `/root/db-backups` tree to Spaces, so
a droplet loss no longer loses the backups.

| Item | Value |
|---|---|
| Bucket | `s3://bhc-client-backups`, nyc3, **private** (no public policy, owner-only ACL) |
| Prefix | `bhc-clients/` — one prefix per droplet, so a second box can share the bucket |
| Credentials | `/root/.config/bhc-backups/s3cfg`, mode `600`, root-only. DO key name `bhc-clients-backup-droplet`, scoped **readwrite to `bhc-client-backups` only** — it cannot touch `bhc-media` or any other Space. |
| Tool | `s3cmd` 2.4.0 from Ubuntu `apt` (no pip, no snap) |
| Encryption | uploaded with `--server-side-encryption`; Spaces also encrypts at rest by default |
| Remote retention | bucket lifecycle rule, `Expiration > Days = 30` (local rotation is 14 days, so Spaces keeps roughly twice the history) |
| Cost | Spaces base USD 5/mo for 250 GB; current usage ~36 MB |

Why `s3cmd` and not `rclone` (the earlier plan): one apt package covers bucket creation,
sync, SSE **and** the lifecycle rule (`s3cmd expire`), where rclone cannot set lifecycle.

Design notes, both load-bearing:

- The sync is **additive** (`--no-delete-removed`). The 14-day local rotation must never
  propagate deletions to the bucket, or the off-box copy would be no older than the local one.
- Remote expiry is the bucket's own lifecycle rule, not the script's job.
- A missing config or missing `s3cmd` logs `WARN offsite: ... skipping` and still lets the
  local backup count as a success; a *failed* sync logs `FAIL offsite` and makes the script
  exit non-zero, so cron mails about it.

Useful commands (all as root):

```bash
sudo s3cmd --config=/root/.config/bhc-backups/s3cfg ls -r s3://bhc-client-backups/
sudo s3cmd --config=/root/.config/bhc-backups/s3cfg du s3://bhc-client-backups/
sudo s3cmd --config=/root/.config/bhc-backups/s3cfg getlifecycle s3://bhc-client-backups
sudo /root/db-backups/backup.sh            # dumps + syncs; safe to run any time
```

Rotating the Spaces key (it is scoped, so this is low-risk):

```bash
# on the Mac
doctl spaces keys create bhc-clients-backup-droplet-2 \
  --grants 'bucket=bhc-client-backups;permission=readwrite' -o json
# put access_key/secret_key into /root/.config/bhc-backups/s3cfg on the droplet (mode 600),
# run backup.sh once to confirm, then:
doctl spaces keys delete <OLD-ACCESS-KEY>
```

Bucket creation needed a temporary `fullaccess` key (`doctl spaces keys create ... 'bucket=;permission=fullaccess'`)
because a bucket-scoped key cannot create its own bucket; that temp key was deleted
immediately after. `doctl` cannot create Spaces buckets directly — use `s3cmd mb` as above.

### Restore drill

Prove the dumps are restorable **without** touching the live database: `pg_restore --list`
parses the archive and prints its table of contents, and writes nothing.

```bash
F=/root/db-backups/grants_within_reach/grants_within_reach-$(date +%F)_033001.dump
sudo file "$F"                                    # want: PostgreSQL custom database dump
sudo cat "$F" | docker exec -i bhc-clients-postgres pg_restore --list | head -12
```

Last drill **2026-09-21**: `grants_within_reach-2026-09-21_033001.dump`, 527,535 bytes,
mtime `2026-09-21 03:30:02 -0500`, custom format v1.15-0, **1167 TOC entries**, parsed clean.
Do this once a quarter (next: 2026-12) and add a line here. A full restore into a scratch
database is the stronger drill; `scripts/restore-client.sh` is the live-DB path and must not
be pointed at a client in service.

---

## 5. Resize up or down

Both directions work as long as the **disk is never resized** (DO cannot shrink a disk;
`--resize-disk` is one-way). All sizes below keep the 80 GB disk that `s-2vcpu-4gb` ships
with, so you can move freely among them:

| Slug | RAM / vCPU | USD/mo | Use |
|---|---|---|---|
| `s-2vcpu-2gb` | 2 GB / 2 | 18 | 1-2 small sites (swap will be busy) |
| `s-2vcpu-4gb` | 4 GB / 2 | 24 | **default**, ~5 Starter Sites |
| `s-4vcpu-8gb` | 8 GB / 4 | 48 | 10+ sites or Pro sites with heavy admin use |

```bash
ID=$(doctl compute droplet list --format ID,Name --no-header | awk '$2=="bhc-clients"{print $1}')
doctl compute droplet-action power-off $ID --wait
doctl compute droplet-action resize $ID --size s-4vcpu-8gb --wait     # NO --resize-disk
doctl compute droplet-action power-on $ID --wait
ssh deploy@<ip> 'cd /opt/bhc-clients && docker compose ps'             # restart: unless-stopped brings all up
```

Downtime is 1-3 minutes; the IP does not change. Do it in a maintenance window.

---

## 6. Restore from snapshot

Only if the droplet was destroyed (dry spell) or needs a clean rebuild:

```bash
SNAP=245391002      # bhc-clients-base-2026-09-13 (doctl compute snapshot list)
doctl compute droplet create bhc-clients \
  --region nyc3 --image "$SNAP" --size s-2vcpu-4gb \
  --ssh-keys 40649348 --enable-monitoring --enable-ipv6 \
  --tag-names bhc-clients --wait
```

Then:

1. Note the NEW public IP from the output.
2. Cloudflare → `getblackhart.com` → DNS → edit the `clients` A record to the new IP
   (DNS only). Do this **first**, before the next step, to avoid the Let's Encrypt rate limit.
3. `ssh deploy@<new-ip>` (host key will be new; the `deploy` user, key, sudo, ufw,
   fail2ban, swap, cron and `/opt/bhc-clients` incl. `.env` are all in the snapshot).
4. Containers come up on their own (`restart: unless-stopped`). Check
   `cd /opt/bhc-clients && docker compose ps` and
   `curl -I https://clients.getblackhart.com` (cert for the health host is already in the
   `caddy_data` volume, so it should be instant; a new one is issued if it expired).
5. `sudo apt-get update && sudo apt-get upgrade -y && sudo reboot` if the snapshot is
   more than a month old.
6. Add the client: section 3.

To re-snapshot later (e.g. after adding clients, before a risky change):

```bash
doctl compute droplet-action power-off $ID --wait
doctl compute droplet-action snapshot $ID --snapshot-name bhc-clients-$(date +%F) --wait
doctl compute droplet-action power-on $ID --wait
```

Remember: a **powered-off droplet still bills at full price**. Only destroying it stops
the charge; only the snapshot survives a destroy. To mothball during a dry spell:
`doctl compute droplet delete 600246126` after confirming a fresh snapshot exists.

---

## 7. Day-to-day

```bash
ssh deploy@<ip>
cd /opt/bhc-clients
docker compose ps                          # health
docker compose logs -f caddy               # TLS + access logs (json)
docker compose logs -f <slug>              # a client's app
git -C clients/<slug> pull --ff-only && docker compose up -d --build <slug>   # redeploy one client
sudo tail -20 /root/db-backups/backup.log
sudo ufw status; sudo fail2ban-client status sshd
sudo apt-get update && sudo apt-get upgrade -y   # monthly patch window (Host plan promise)
```

Uptime monitoring (Host plan): add each client hostname to Better Stack / UptimeRobot
with a keyword check; not part of this box.
