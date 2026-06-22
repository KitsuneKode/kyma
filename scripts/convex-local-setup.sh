#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

pushd "$ROOT_DIR" >/dev/null

sync_var() {
  local key="$1"
  local value="${!key-}"
  if [[ -n "${value// /}" ]]; then
    echo "Setting Convex env: $key"
    bunx convex env set "$key" "$value"
  fi
}

for key in \
  KYMA_DEPLOYMENT_ENV \
  KYMA_PROCESSING_WRITE_KEY \
  KYMA_ENCRYPTION_KEY \
  KYMA_ADMIN_EMAILS \
  KYMA_ENABLE_DEMO_INVITE \
  CLERK_SECRET_KEY \
  CLERK_FRONTEND_API_URL \
  CLERK_JWT_ISSUER_DOMAIN \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
do
  sync_var "$key"
done

popd >/dev/null

echo "Convex env sync complete."
