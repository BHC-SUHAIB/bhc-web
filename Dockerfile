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
# Persist Next.js / Turbopack compilation cache across builds. The
# `.next/cache` directory is where Turbopack memoises its module graph
# and webpack module outputs; mounting it as a BuildKit cache cuts warm
# rebuild times from 4-5 min down to ~30-90 s when only a few source
# files changed.
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    --mount=type=cache,target=/root/.npm,sharing=locked \
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

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
