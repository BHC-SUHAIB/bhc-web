#!/bin/bash
# Validate that the build-time prerender produced HTML with correct
# Media URLs (i.e. /_next/image source URLs that point at the S3/CDN
# host, NOT at /api/media/file/... — that fallback means S3 wasn't
# configured at build time and the cached HTML is broken in production).
#
# This is the test that would have caught the 2026-05-06 dev rollback.
# Run it as part of every HTML-caching deploy. Expects S3_PUBLIC_URL to
# be set in the environment that ran `npm run build` immediately before.

set -e

OUT="/tmp/bhc-prerender-validation.txt"
ROOT="$(dirname "$0")/.."
HTML_GLOB="$ROOT/.next/server/app"

{
  echo "==== Prerender validation ===="
  echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""

  if [[ ! -d "$HTML_GLOB" ]]; then
    echo "FAIL: $HTML_GLOB doesn't exist. Run 'npm run build' first."
    exit 1
  fi

  echo "Looking for .html files under $HTML_GLOB ..."
  count=$(find "$HTML_GLOB" -name "*.html" -type f | wc -l | tr -d ' ')
  echo "  Found $count prerendered HTML file(s)"

  echo ""
  echo "==== Sampling each prerendered route for image URL shape ===="

  bad_count=0
  total_count=0
  for f in $(find "$HTML_GLOB" -name "*.html" -type f); do
    rel="${f#$HTML_GLOB/}"
    bad=$(grep -oE '/_next/image\?url=%2Fapi%2Fmedia%2Ffile%2F[^"&]*' "$f" 2>/dev/null | wc -l | tr -d ' ')
    s3=$(grep -oE '/_next/image\?url=https%3A%2F%2F[^"&]*' "$f" 2>/dev/null | head -3 | wc -l | tr -d ' ')
    direct_local=$(grep -oE 'src="/api/media/file/[^"]*"' "$f" 2>/dev/null | wc -l | tr -d ' ')

    total_count=$((total_count + 1))
    echo ""
    echo "  $rel"
    echo "    /api/media/file/ refs (BAD):  $bad"
    echo "    direct local <img src=\"/api/media/file/...\":  $direct_local"
    echo "    S3-encoded /_next/image? URLs (GOOD):  $s3"

    if [[ "$bad" -gt 0 ]] || [[ "$direct_local" -gt 0 ]]; then
      bad_count=$((bad_count + 1))
      echo "    -> FAIL: this page has Payload Media URLs that point at local paths."
      echo "       Sample bad URL:"
      grep -oE '/_next/image\?url=%2Fapi%2Fmedia%2Ffile%2F[^"&]*' "$f" 2>/dev/null | head -1 | sed 's/^/         /'
      grep -oE 'src="/api/media/file/[^"]*"' "$f" 2>/dev/null | head -1 | sed 's/^/         /'
    fi
  done

  echo ""
  echo "==== Result ===="
  if [[ "$bad_count" -gt 0 ]]; then
    echo "FAIL: $bad_count of $total_count prerendered files have local /api/media/file paths."
    echo "Likely cause: S3_* env vars not available at build time, so payload.config.ts's"
    echo "s3Storage plugin didn't load and Media records fell back to local-disk URLs."
    echo "Fix: ensure Dockerfile builder stage gets S3_BUCKET, S3_ENDPOINT, S3_PUBLIC_URL,"
    echo "S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY as build args."
    exit 1
  else
    echo "PASS: $total_count prerendered files validated — no local /api/media/file paths."
  fi
} | tee "$OUT"
