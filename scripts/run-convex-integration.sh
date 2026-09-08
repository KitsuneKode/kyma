#!/usr/bin/env bash
# Start owned local dependencies, sync secrets, and run real Convex checks.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export CONVEX_AGENT_MODE=anonymous

RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kyma-convex-integration.XXXXXX")"
SINK_LOG="$RUN_DIR/inngest-event-sink.log"
CONVEX_LOG="$RUN_DIR/convex-dev.log"
SINK_PID=""
CONVEX_PID=""
SINK_PROCESS_GROUP="false"
CONVEX_PROCESS_GROUP="false"

stop_process_group() {
  local pid="$1"
  local owns_group="$2"
  if [[ -z "$pid" ]]; then
    return
  fi
  if [[ "$owns_group" == "true" ]]; then
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  else
    kill "$pid" 2>/dev/null || true
  fi
  wait "$pid" 2>/dev/null || true
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  set +e
  stop_process_group "$CONVEX_PID" "$CONVEX_PROCESS_GROUP"
  stop_process_group "$SINK_PID" "$SINK_PROCESS_GROUP"
  if [[ "$exit_code" -eq 0 ]]; then
    rm -r "$RUN_DIR"
  else
    echo "Integration logs preserved at $RUN_DIR" >&2
  fi
  exit "$exit_code"
}

handle_signal() {
  exit 130
}

trap cleanup EXIT
trap handle_signal INT TERM

port_open() {
  local port="$1"
  python3 - "$port" <<'PY'
import socket, sys
port = int(sys.argv[1])
sock = socket.socket()
sock.settimeout(0.5)
try:
    raise SystemExit(0 if sock.connect_ex(("127.0.0.1", port)) == 0 else 1)
finally:
    sock.close()
PY
}

wait_port() {
  local port="$1"
  local label="$2"
  local pid="$3"
  local log_file="$4"
  for _ in $(seq 1 60); do
    if port_open "$port"; then
      echo "  $label ready on :$port"
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$label exited before opening :$port" >&2
      tail -80 "$log_file" >&2 || true
      return 1
    fi
    sleep 1
  done
  echo "Timed out waiting for $label on :$port" >&2
  tail -80 "$log_file" >&2 || true
  return 1
}

assert_port_available() {
  local port="$1"
  local label="$2"
  if port_open "$port"; then
    echo "$label port :$port is already in use; stop the existing process first." >&2
    exit 1
  fi
}

start_sink() {
  if command -v setsid >/dev/null 2>&1; then
    setsid bun run scripts/inngest-event-sink.ts 8799 >"$SINK_LOG" 2>&1 &
    SINK_PROCESS_GROUP="true"
  else
    bun run scripts/inngest-event-sink.ts 8799 >"$SINK_LOG" 2>&1 &
    SINK_PROCESS_GROUP="false"
  fi
  SINK_PID=$!
  wait_port 8799 "Inngest event sink" "$SINK_PID" "$SINK_LOG"
}

start_convex() {
  if command -v setsid >/dev/null 2>&1; then
    setsid env CONVEX_AGENT_MODE=anonymous \
      bunx convex dev >"$CONVEX_LOG" 2>&1 &
    CONVEX_PROCESS_GROUP="true"
  else
    env CONVEX_AGENT_MODE=anonymous \
      bunx convex dev >"$CONVEX_LOG" 2>&1 &
    CONVEX_PROCESS_GROUP="false"
  fi
  CONVEX_PID=$!
  wait_port 3210 "Convex backend" "$CONVEX_PID" "$CONVEX_LOG"
}

echo "==> Ensuring local Convex is configured"
if [[ ! -f .env.local ]] || ! grep -q 'CONVEX_DEPLOYMENT=' .env.local 2>/dev/null; then
  bunx convex init
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a
export NEXT_PUBLIC_CONVEX_URL="${NEXT_PUBLIC_CONVEX_URL:-http://127.0.0.1:3210}"
export NEXT_PUBLIC_CONVEX_SITE_URL="${NEXT_PUBLIC_CONVEX_SITE_URL:-http://127.0.0.1:3211}"

# This harness must never target a cloud deployment or reuse provider secrets.
# `convex init` creates an anonymous local deployment whose URLs bind loopback.
if [[ "${CONVEX_DEPLOYMENT:-}" != anonymous:* ]]; then
  echo "Refusing integration run: CONVEX_DEPLOYMENT is not anonymous/local." >&2
  exit 1
fi
if [[ "$NEXT_PUBLIC_CONVEX_URL" != http://127.0.0.1:* && "$NEXT_PUBLIC_CONVEX_URL" != http://localhost:* ]]; then
  echo "Refusing integration run: Convex URL is not loopback." >&2
  exit 1
fi
if [[ "$NEXT_PUBLIC_CONVEX_SITE_URL" != http://127.0.0.1:* && "$NEXT_PUBLIC_CONVEX_SITE_URL" != http://localhost:* ]]; then
  echo "Refusing integration run: Convex site URL is not loopback." >&2
  exit 1
fi

# Use synthetic integration-only values unconditionally. Never inherit real
# provider, webhook, auth, or processing credentials from the caller.
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secretsecretsecretsecretsecretsecre"
NEXT_PUBLIC_LIVEKIT_URL="ws://127.0.0.1:7880"
KYMA_PROCESSING_WRITE_KEY="integration-processing-key"
CLERK_WEBHOOK_SIGNING_SECRET="whsec_$(openssl rand -base64 32 | tr -d '\n')"
CLERK_FRONTEND_API_URL="https://placeholder.clerk.accounts.dev"
CLERK_SECRET_KEY="sk_test_integration_placeholder"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_integration_placeholder"
INNGEST_EVENT_KEY="local-integration-event-key"
INNGEST_EVENT_API_BASE_URL="http://127.0.0.1:8799"

export LIVEKIT_API_KEY LIVEKIT_API_SECRET NEXT_PUBLIC_LIVEKIT_URL
export KYMA_PROCESSING_WRITE_KEY CLERK_WEBHOOK_SIGNING_SECRET
export CLERK_FRONTEND_API_URL CLERK_SECRET_KEY NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
export INNGEST_EVENT_KEY INNGEST_EVENT_API_BASE_URL

assert_port_available 8799 "Inngest event sink"
assert_port_available 3210 "Convex backend"
assert_port_available 3211 "Convex HTTP actions"

echo "==> Starting owned Inngest event sink"
start_sink

echo "==> Starting owned Convex backend"
start_convex

echo "==> Syncing integration env into Convex deployment"
set_env() {
  local key="$1"
  local value="$2"
  echo "  set $key"
  bunx convex env set "$key" "$value" >/dev/null
}

set_env KYMA_PROCESSING_WRITE_KEY "$KYMA_PROCESSING_WRITE_KEY"
set_env KYMA_DEPLOYMENT_ENV development
set_env LIVEKIT_API_KEY "$LIVEKIT_API_KEY"
set_env LIVEKIT_API_SECRET "$LIVEKIT_API_SECRET"
set_env NEXT_PUBLIC_LIVEKIT_URL "$NEXT_PUBLIC_LIVEKIT_URL"
set_env NEXT_PUBLIC_CONVEX_URL "$NEXT_PUBLIC_CONVEX_URL"
set_env LIVEKIT_AGENT_NAME tutor-screener
set_env CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"
set_env CLERK_SECRET_KEY "$CLERK_SECRET_KEY"
set_env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
set_env CLERK_WEBHOOK_SIGNING_SECRET "$CLERK_WEBHOOK_SIGNING_SECRET"
set_env INNGEST_EVENT_KEY "$INNGEST_EVENT_KEY"
set_env INNGEST_EVENT_API_BASE_URL "$INNGEST_EVENT_API_BASE_URL"

echo "==> Restarting owned Convex backend with synced env"
stop_process_group "$CONVEX_PID" "$CONVEX_PROCESS_GROUP"
CONVEX_PID=""
start_convex

functions_ready=0
for _ in $(seq 1 40); do
  if bunx convex run integrationSeed:seedPublicInvite \
    '{"inviteToken":"ready-check","participantName":"Ready"}' >/dev/null 2>&1; then
    functions_ready=1
    break
  fi
  sleep 1
done
if [[ "$functions_ready" -ne 1 ]]; then
  echo "Timed out waiting for Convex functions to deploy." >&2
  tail -80 "$CONVEX_LOG" >&2 || true
  exit 1
fi

echo "==> Running verification against live local Convex"
bun run scripts/verify-convex-integration.ts
