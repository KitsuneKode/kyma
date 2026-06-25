#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env.local}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

missing=()
for key in \
  NEXT_PUBLIC_CONVEX_URL \
  KYMA_PROCESSING_WRITE_KEY \
  NEXT_PUBLIC_LIVEKIT_URL \
  LIVEKIT_API_KEY \
  LIVEKIT_API_SECRET
do
  value="${!key-}"
  if [[ -z "${value// /}" ]]; then
    missing+=("$key")
  fi
done

if [[ "${#missing[@]}" -gt 0 ]]; then
  echo "Missing required env for live path preflight: ${missing[*]}" >&2
  exit 1
fi

echo "Env preflight OK."
echo "Next manual steps (owner-run):"
echo "  1. bun run agent:start   # separate terminal"
echo "  2. Open /recruiter/health and confirm LiveKit + agent worker checks"
echo "  3. Run .docs/backend-verification-runbook.md items 3–4 with a real invite"
echo "  4. Record pass/fail in .docs/verification-pending.md"
