# syntax=docker/dockerfile:1.7

# ---------- deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
# BuildKit cache mount persists npm's tarball cache across builds so
# warm installs skip the network round-trip when package-lock.json is
# unchanged. Combined with the separate `deps` stage, this layer is
# reused unless package-lock.json actually changes.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm install --legacy-peer-deps --include=dev --prefer-offline --no-audit --no-fund

# ---------- build ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the client bundle by `next build`,
# so they must be present at build time, not just runtime. docker-compose
# passes these in via `args`, which become ARGs here, which then promote
# to ENV so Next picks them up.
ARG NEXT_PUBLIC_GTM_ID
ENV NEXT_PUBLIC_GTM_ID=${NEXT_PUBLIC_GTM_ID}
ARG NEXT_PUBLIC_CLARITY_PROJECT_ID
ENV NEXT_PUBLIC_CLARITY_PROJECT_ID=${NEXT_PUBLIC_CLARITY_PROJECT_ID}
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
# Build-time Payload connection. PAYLOAD_SECRET is needed for Payload init,
# DATABASE_URI for the prerender phase to read content from Postgres. The
# runtime DATABASE_URI uses host "postgres" (the docker-compose service
# name), unreachable from this build container — rewrite to 127.0.0.1
# (which is the host's localhost since web.build sets `network: host`).
# Runtime container's `environment:` block restores the docker-network URI
# at startup, so production traffic still uses the docker DNS name.
ARG DATABASE_URI
ARG PAYLOAD_SECRET
ENV PAYLOAD_SECRET=${PAYLOAD_SECRET}
# S3 / Spaces credentials. WITHOUT these, payload.config.ts evaluates
# s3Configured = false and Media records get local /api/media/file/...
# URLs baked into the prerendered HTML, which 404 at runtime because the
# actual files are on Spaces. WITH them, s3Storage plugin loads and Media
# urls resolve to the CDN base (e.g. https://bhc-media.nyc3.cdn...).
# Verified live 2026-05-06: the missing-S3-at-build was the root cause of
# the dev rollback after PR #54.
ARG S3_BUCKET
ENV S3_BUCKET=${S3_BUCKET}
ARG S3_ENDPOINT
ENV S3_ENDPOINT=${S3_ENDPOINT}
ARG S3_REGION
ENV S3_REGION=${S3_REGION}
ARG S3_ACCESS_KEY_ID
ENV S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
ARG S3_SECRET_ACCESS_KEY
ENV S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
ARG S3_PUBLIC_URL
ENV S3_PUBLIC_URL=${S3_PUBLIC_URL}
# Explicitly disable seed-on-init during the build phase. Without this,
# Payload's onInit could attempt to upsert seed records during the
# prerender phase, hitting the live database and potentially overwriting
# customised content. Runtime SEED_ON_BOOT is controlled by the env block
# in docker-compose.yml and is independent.
ENV SEED_ON_BOOT=false
# Persist Next.js / Turbopack compilation cache across builds. The
# `.next/cache` directory is where Turbopack memoises its module graph
# and webpack module outputs; mounting it as a BuildKit cache cuts warm
# rebuild times from 4-5 min down to ~30-90 s when only a few source
# files changed.
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    --mount=type=cache,target=/root/.npm,sharing=locked \
    DATABASE_URI=$(echo "${DATABASE_URI}" | sed 's|@postgres:|@127.0.0.1:|') \
    npm run build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
RUN mkdir -p /app/media && chown -R nextjs:nodejs /app/media
# Pre-create the image-optimization cache path with nextjs ownership BEFORE
# the named volume in docker-compose.yml mounts here. When Docker initializes
# an empty named volume against an existing path, it copies the path's
# content + ownership into the volume. Without this, the volume mount point
# defaults to root:root, the nextjs (UID 1001) process can't write to it,
# and Sharp re-encodes every image transform from scratch on every request
# (~1.3s TTFB instead of ~80ms cached). Verified live 2026-05-06: identical
# /_next/image requests returned `x-nextjs-cache: MISS` with different etags
# back-to-back, proving no transform output was being persisted.
#
# IMPORTANT — for an EXISTING deployment with a broken (root-owned)
# next_image_cache volume, this Dockerfile change alone is NOT enough.
# Docker will not re-initialize ownership on a volume that already has
# content. You must one-shot delete the volume on the next deploy:
#   docker compose down web    # detach the volume
#   docker volume rm bhc-web_next_image_cache
#   docker compose up -d web   # fresh init picks up nextjs ownership
# scripts/deploy.sh has been updated to do this once when an env flag is
# set; remove the flag after the next successful deploy.
RUN mkdir -p /app/.next/cache/images && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
