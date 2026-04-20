# Email authentication (SPF / DKIM / DMARC)

Current live state for `blackhartconsulting.com`. If anything here drifts from
reality, fix the real thing first (DNS), then update this doc.

## Senders

Two production sources send mail as `@blackhartconsulting.com`:

1. **Resend** — transactional mail from the app (contact-form notifications, Payload admin password resets). Uses DKIM selector `resend` and Resend's managed SPF include.
2. **Google Workspace** — human mail to/from `suhaib@` and `hello@`. Uses Google's SPF include (covered by Resend's managed SPF include, which bundles Google's record).

## DNS records

Query the current state any time:

```bash
dig +short TXT blackhartconsulting.com            # SPF
dig +short TXT resend._domainkey.blackhartconsulting.com  # DKIM (Resend)
dig +short TXT _dmarc.blackhartconsulting.com     # DMARC
```

Expected values:

### SPF (root TXT)
```
v=spf1 include:dc-aa8e722993._spfm.blackhartconsulting.com ~all
```
The include points at Resend's managed SPF macro, which already contains
Google Workspace's SPF include. Don't add a second SPF record — RFC 7208 allows
only one and receivers may permerror.

### DKIM (Resend)
```
resend._domainkey  TXT  p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfgc...
```
Set up during initial Resend domain verification. Rotation would mean a new
selector — don't delete this record until Resend confirms the new one is live.

### DMARC
```
_dmarc  TXT  v=DMARC1; p=none; pct=100; rua=mailto:re+x2ddla6wkcm@dmarc.postmarkapp.com; sp=none; aspf=r;
```

Fields:
- `p=none` — monitoring mode. Nothing is blocked; we're just collecting
  reports. Bump to `quarantine` then `reject` once ~4 weeks of clean reports
  confirm only Resend + Google are sending.
- `pct=100` — policy applies to 100% of mail.
- `rua=mailto:re+x2ddla6wkcm@dmarc.postmarkapp.com` — aggregate reports go
  to Postmark's free DMARC Digests service. They email weekly digests to
  the address registered at `dmarc.postmarkapp.com`.
- `sp=none` — same policy for subdomains (explicit so it doesn't inherit
  stricter behavior by accident).
- `aspf=r` — relaxed SPF alignment. The `From:` domain and `Return-Path`
  domain only need to share an organizational domain. Strict (`s`) would
  require exact match, which breaks some legitimate relays.

## Monitoring (Postmark DMARC Digests, free tier)

- Dashboard / account is at <https://dmarc.postmarkapp.com>
- Registered under `suhaib@blackhartconsulting.com`
- Free tier limits: top 10 mail sources with 5 IPs each, 7-day history,
  weekly email digest (no web dashboard)
- First digest arrives ~7 days after DMARC records start being received
- Archive strategy: apply a Gmail label `DMARC-archive` to each digest so
  we have unlimited history past the 7-day Postmark window

## Upgrade path

After ~4 weeks of digests showing only Resend + Google Workspace with
high pass rates:

1. Change DMARC from `p=none` to `p=quarantine; pct=10` (quarantine 10% of
   failing mail). Watch digests for a week.
2. Bump `pct=10` → `pct=50` → `pct=100` over ~2 weeks.
3. Change `p=quarantine` to `p=reject` once `pct=100 quarantine` shows no
   legitimate mail getting caught.

At `p=reject`, spoofed mail claiming to be from `@blackhartconsulting.com`
gets rejected by all DMARC-aware receivers. That's the real protection.

## When something's wrong

### SPF failures for Resend
Resend's managed SPF include changed IPs. Re-verify the domain in the
Resend dashboard; no DNS change needed on our side (include is a pointer).

### DKIM failures
The `resend._domainkey` record was deleted or rotated. Get the new public
key from Resend dashboard → Domains → blackhartconsulting.com.

### DMARC reports stopped arriving from Postmark
- Check DMARC record still has Postmark's `rua=`
- Log in at dmarc.postmarkapp.com and re-verify DNS
- Confirm `suhaib@` is receiving Postmark's verification emails (not
  filtered to spam)
