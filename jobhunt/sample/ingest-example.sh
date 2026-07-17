#!/usr/bin/env bash
# Reference for the daily agent: how to POST a recommendation and attach the
# tailored resume + cover letter. Nothing here submits a job application — it
# only stores files and data for the human to review and act on.
#
# Usage:
#   BASE=https://jobhunt.blackhartconsulting.com \
#   INGEST_TOKEN=xxxxxxxx \
#   ./ingest-example.sh /path/to/resume.pdf /path/to/resume.docx /path/to/cover.pdf /path/to/cover.docx
set -euo pipefail

BASE="${BASE:-https://jobhunt.blackhartconsulting.com}"
: "${INGEST_TOKEN:?set INGEST_TOKEN}"

RESUME_PDF="${1:-}"
RESUME_DOCX="${2:-}"
COVER_PDF="${3:-}"
COVER_DOCX="${4:-}"

# 1) Create (or idempotently update) the recommendation. Idempotency key is
#    source_url; falls back to company + role_title. green_flags / red_flags
#    accept a JSON array or newline-separated string.
REC_ID="$(curl -sS -X POST "$BASE/api/ingest/recommendations" \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "date_surfaced": "2026-07-15",
    "company": "Acme Corp",
    "role_title": "Director of Operations",
    "source": "LinkedIn",
    "source_url": "https://www.linkedin.com/jobs/view/1234567890/",
    "location_type": "Remote",
    "comp": "$140K–$165K + bonus",
    "engagement_type": "W-2",
    "chosen_track": "Operations",
    "fit_score": 86,
    "rationale": "Ops leadership scope matches your COO track; comp above target.",
    "green_flags": ["Fully remote", "Comp above target", "Reports to CEO"],
    "red_flags": ["Series B — some runway risk"],
    "brief": "Optional deep-dive company brief (markdown or plain text). Shows as an expandable section on the dashboard card and carries into the application notes on Mark applied."
  }' | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')"

echo "recommendation id: $REC_ID"

# 2) Attach documents (any subset; cover letter optional). Field names must be
#    exactly: resume_pdf, resume_docx, cover_pdf, cover_docx.
ARGS=()
[[ -n "$RESUME_PDF"  ]] && ARGS+=(-F "resume_pdf=@$RESUME_PDF")
[[ -n "$RESUME_DOCX" ]] && ARGS+=(-F "resume_docx=@$RESUME_DOCX")
[[ -n "$COVER_PDF"   ]] && ARGS+=(-F "cover_pdf=@$COVER_PDF")
[[ -n "$COVER_DOCX"  ]] && ARGS+=(-F "cover_docx=@$COVER_DOCX")

if [[ ${#ARGS[@]} -gt 0 ]]; then
  curl -sS -X POST "$BASE/api/ingest/recommendations/$REC_ID/files" \
    -H "Authorization: Bearer $INGEST_TOKEN" \
    "${ARGS[@]}" | python3 -m json.tool
fi

echo "done — the card will appear at the top of the dashboard."
