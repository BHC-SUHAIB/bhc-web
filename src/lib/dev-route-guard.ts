import { NextResponse } from 'next/server'

// Shared guard for the /dev-* one-shot routes (seeds, schema fixes, filler
// testimonial generators, PDF checkers). These are permanently locked in
// production unless an explicit one-time bypass env var is set on the
// container, then unset after use.
//
// Why an env-var override and not a NODE_ENV check alone: production needs
// these endpoints exactly ONCE to migrate fresh data after a major rework
// merge (new collections, new blocks, new seed copy). Setting + unsetting an
// env var around that one usage gives us controlled access without leaving a
// permanent backdoor.
//
// Usage on the droplet (one-shot prod seed):
//   1. SSH in, edit .env, add: ALLOW_DEV_SEED=one-time-yes
//   2. Recreate the web container so the env var loads. NOTE: must be
//      `up -d --force-recreate` (which re-reads .env), NOT `restart`.
//      `docker compose restart` keeps the existing container's environment
//      and will silently leave the bypass off — which cost us an hour on
//      2026-05-22 chasing a 500-with-empty-body before we realized the
//      flag wasn't actually in the running process:
//        docker compose up -d --force-recreate web
//   3. POST the route(s) you need:
//        curl -X POST https://blackhartconsulting.com/dev-schema-fix
//        curl -X POST https://blackhartconsulting.com/dev-seed-rework
//   4. Remove the env var from .env, recreate again:
//        docker compose up -d --force-recreate web
//
// Returns NextResponse.json(403) if blocked, otherwise null (caller proceeds).
export function denyIfProductionLocked(): NextResponse | null {
  const isProd = process.env.NODE_ENV === 'production'
  const bypass = process.env.ALLOW_DEV_SEED === 'one-time-yes'
  if (isProd && !bypass) {
    return NextResponse.json(
      { error: 'Disabled in production. Set ALLOW_DEV_SEED=one-time-yes + `docker compose up -d --force-recreate web` to unlock for one-shot use (NOT `restart` — that does not re-read .env).' },
      { status: 403 },
    )
  }
  return null
}
