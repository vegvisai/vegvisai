#!/usr/bin/env bash
# Manual review of registrations (P46). The token lives in ~/.config/vegvis/admin.env, never in the repo.
#   scripts/review.sh pending                      list entries waiting for review
#   scripts/review.sh <orgnr> list|reject|remove [reason]
# Reasons are neutral codes, for example: reviewed, request, no_card, domain_mismatch.
set -euo pipefail
BASE="${VEGVIS_BASE:-https://veiviser-test.testplattform.workers.dev}"
. "$HOME/.config/vegvis/admin.env"
AUTH="Authorization: Bearer $VEGVIS_ADMIN_TOKEN"
if [ "${1:-}" = "pending" ]; then
  curl -s -H "$AUTH" "$BASE/api/admin/pending" | python3 -m json.tool
else
  curl -s -X POST -H "$AUTH" -H "Content-Type: application/json" "$BASE/api/admin/review" \
    -d "{\"orgnr\":\"$1\",\"decision\":\"$2\",\"reason\":\"${3:-}\"}"
  echo
fi
