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
//   2. Restart the web container so the env var loads:
//        docker compose restart web
//   3. POST the route(s) you need:
//        curl -X POST https://blackhartconsulting.com/dev-schema-fix
//        curl -X POST https://blackhartconsulting.com/dev-seed-rework
//   4. Remove the env var from .env, restart again:
//        docker compose restart web
//
// Returns NextResponse.json(403) if blocked, otherwise null (caller proceeds).
export function denyIfProductionLocked(): NextResponse | null {
  const isProd = process.env.NODE_ENV === 'production'
  const bypass = process.env.ALLOW_DEV_SEED === 'one-time-yes'
  if (isProd && !bypass) {
    return NextResponse.json(
      { error: 'Disabled in production. Set ALLOW_DEV_SEED=one-time-yes + restart container to unlock for one-shot use.' },
      { status: 403 },
    )
  }
  return null
}
