# Hosting inventory (admin: Infrastructure → Servers / Hosted projects)

The Payload admin keeps the list of everything we host and where it runs:

- **Servers**: one row per droplet, App Platform app, or Spaces subscription (name, IP,
  region, size, monthly cost, backups, access, and a **capacity** for shared client droplets).
- **Hosted projects**: one row per site/app/backend, linked to its Server (and optionally to
  the billing Client), with domains, container, path, and repo.
- **Hosting map** at `/admin/hosting` (sidebar link "Hosting map", and a panel on the
  dashboard): servers grouped by role, their projects, domains, monthly total, and a
  capacity meter per shared droplet ("3 / 5"). It warns when a shared droplet is nearly
  full (1 slot left) or full.

No secrets in these rows: SSH user and "where the secret lives" only. Never passwords,
tokens, or keys.

## Keeping it current

**Adding a client to a bhc-clients droplet** (after `scripts/add-client.sh`, see the
[bhc-clients runbook](bhc-clients-droplet.md#3-add-a-client)): add a **Hosted project** row
with Server = that droplet, Kind = Client site, "Counts toward server capacity" ticked, the
domain(s), container `bhc-client-<slug>`, and path `/opt/bhc-clients/clients/<slug>`.
Removing a client: set its row to **Retired** (retired rows do not use a slot).

**When a bhc-clients droplet reaches 5 client sites**, the Hosting map shows
"bhc-clients is full (5 / 5). Provision bhc-clients-N ...". Then:

1. Create `bhc-clients-N` from the clean base snapshot **245391002**
   (`bhc-clients-base-2026-09-13`), same size and region, following the runbook
   ([Restore from snapshot](bhc-clients-droplet.md#6-restore-from-snapshot)). It gets a new
   IP: set up its DNS before Caddy boots.
2. Add a **Server** row: name `bhc-clients-N`, provider DigitalOcean Droplet, role Shared
   client hosting, capacity 5, IP, size, monthly cost, backups.
3. New clients go on the new droplet; their Hosted project rows point at it.

Other changes (new droplet, resize, price change, retiring a box) are a quick edit of the
Server row so the monthly total stays right. Retired servers drop out of the total.

## How the data got there

`src/seed/hosting-inventory.ts` holds the inventory as of 2026-09-26. On boot,
`seedOnInit` inserts it **only while each collection is empty**, so admin edits are never
overwritten. After the first production boot, the admin is the source of truth.
