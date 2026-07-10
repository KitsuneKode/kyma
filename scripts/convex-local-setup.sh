#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env.local}"
CONVEX_DEPLOY_FLAG=""

if [[ "${1:-}" == "--prod" ]]; then
  CONVEX_DEPLOY_FLAG="--prod"
  ENV_FILE="${2:-$ROOT_DIR/.env.local}"
elif [[ "${2:-}" == "--prod" ]]; then
  CONVEX_DEPLOY_FLAG="--prod"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

derive_clerk_issuer_from_publishable_key() {
  local pk="${1:-}"
  if [[ -z "${pk// /}" ]]; then
    return 0
  fi

  local encoded="${pk#pk_test_}"
  if [[ "$encoded" == "$pk" ]]; then
    encoded="${pk#pk_live_}"
  fi
  if [[ -z "$encoded" || "$encoded" == "$pk" ]]; then
    return 0
  fi

  local host
  host="$(printf '%s' "$encoded" | { base64 -d 2>/dev/null || base64 -D 2>/dev/null; } | tr -d '$')"
  if [[ -n "$host" ]]; then
    echo "https://$host"
  fi
}

if [[ -z "${CLERK_FRONTEND_API_URL:-}" && -z "${CLERK_JWT_ISSUER_DOMAIN:-}" ]]; then
  derived="$(derive_clerk_issuer_from_publishable_key "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}")"
  if [[ -n "$derived" ]]; then
    echo "Derived Clerk issuer from publishable key: $derived"
    export CLERK_FRONTEND_API_URL="$derived"
    export CLERK_JWT_ISSUER_DOMAIN="$derived"
  fi
fi

issuer="${CLERK_FRONTEND_API_URL:-${CLERK_JWT_ISSUER_DOMAIN:-}}"
if [[ -z "${issuer// /}" ]]; then
  echo "ERROR: Set CLERK_FRONTEND_API_URL or CLERK_JWT_ISSUER_DOMAIN (or provide NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to derive it)." >&2
  exit 1
fi

missing_required=()
for key in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY; do
  value="${!key-}"
  if [[ -z "${value// /}" ]]; then
    missing_required+=("$key")
  fi
done

if [[ "${#missing_required[@]}" -gt 0 ]]; then
  echo "ERROR: Missing required Clerk env: ${missing_required[*]}" >&2
  echo "Add these to $ENV_FILE before syncing Convex auth." >&2
  exit 1
fi

if [[ -z "${KYMA_PROCESSING_WRITE_KEY:-}" ]]; then
  echo "WARNING: KYMA_PROCESSING_WRITE_KEY is missing. Login can work, but report/webhook writes will fail until it is set." >&2
fi

pushd "$ROOT_DIR" >/dev/null

sync_var() {
  local key="$1"
  local value="${!key-}"
  if [[ -n "${value// /}" ]]; then
    echo "Setting Convex env: $key${CONVEX_DEPLOY_FLAG:+ (prod)}"
    bunx convex env set "$key" "$value" $CONVEX_DEPLOY_FLAG
  fi
}

for key in \
  KYMA_DEPLOYMENT_ENV \
  KYMA_PROCESSING_WRITE_KEY \
  KYMA_ENCRYPTION_KEY \
  KYMA_ADMIN_EMAILS \
  KYMA_ORG_PLAN_OVERRIDE \
  KYMA_REVIEW_CHAT_MODEL \
  CLERK_SECRET_KEY \
  CLERK_FRONTEND_API_URL \
  CLERK_JWT_ISSUER_DOMAIN \
  CLERK_WEBHOOK_SIGNING_SECRET \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
  NEXT_PUBLIC_LIVEKIT_URL \
  NEXT_PUBLIC_CONVEX_URL \
  LIVEKIT_API_KEY \
  LIVEKIT_API_SECRET \
  LIVEKIT_AGENT_NAME \
  LIVEKIT_WEBHOOK_API_KEY \
  LIVEKIT_WEBHOOK_API_SECRET \
  INNGEST_EVENT_KEY \
  INNGEST_EVENT_API_BASE_URL
do
  sync_var "$key"
done

popd >/dev/null

echo "Convex env sync complete."
echo "Next: bun run clerk:setup-auth  (paste session token JSON into Clerk Dashboard)"
echo "Then: sign out and sign in once to refresh JWT claims."
