#!/usr/bin/env bash
# Ensure local Convex + Inngest event sink, sync secrets, run real (non-mock) checks.
#
# Usage:
#   bun run test:convex-integration
#
# What this proves (against a live local Convex deployment, not mocks):
#   - bootstrapInterviewSession mints a real LiveKit JWT
#   - signed LiveKit webhook HTTP mutates session state
#   - signed Clerk webhook HTTP syncs users
#   - requeueInterviewProcessing enqueues to a local Inngest event sink
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="${HOME}/.bun/bin:${PATH}"
export CONVEX_AGENT_MODE=anonymous

TMUX_BIN="${TMUX_BIN:-tmux}"
TMUX_CFG="${TMUX_CFG:-/exec-daemon/tmux.portal.conf}"
if [[ ! -f "$TMUX_CFG" ]]; then
  TMUX_CFG=""
fi

tmux_cmd() {
  if [[ -n "$TMUX_CFG" ]]; then
    "$TMUX_BIN" -f "$TMUX_CFG" "$@"
  else
    "$TMUX_BIN" "$@"
  fi
}

port_open() {
  local port="$1"
  python3 - "$port" <<'PY'
import socket, sys
port = int(sys.argv[1])
s = socket.socket()
s.settimeout(0.5)
try:
    raise SystemExit(0 if s.connect_ex(("127.0.0.1", port)) == 0 else 1)
finally:
    s.close()
PY
}

wait_port() {
  local port="$1"
  local label="$2"
  for _ in $(seq 1 60); do
    if port_open "$port"; then
      echo "  $label ready on :$port"
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $label on :$port" >&2
  return 1
}

LIVEKIT_API_KEY="${LIVEKIT_API_KEY:-devkey}"
LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET:-secretsecretsecretsecretsecretsecre}"
NEXT_PUBLIC_LIVEKIT_URL="${NEXT_PUBLIC_LIVEKIT_URL:-ws://127.0.0.1:7880}"
KYMA_PROCESSING_WRITE_KEY="${KYMA_PROCESSING_WRITE_KEY:-integration-processing-key}"
CLERK_WEBHOOK_SIGNING_SECRET="${CLERK_WEBHOOK_SIGNING_SECRET:-whsec_$(openssl rand -base64 32 | tr -d '\n')}"
INNGEST_EVENT_KEY="${INNGEST_EVENT_KEY:-local-integration-event-key}"
INNGEST_EVENT_API_BASE_URL="${INNGEST_EVENT_API_BASE_URL:-http://127.0.0.1:8799}"

export LIVEKIT_API_KEY LIVEKIT_API_SECRET NEXT_PUBLIC_LIVEKIT_URL
export KYMA_PROCESSING_WRITE_KEY CLERK_WEBHOOK_SIGNING_SECRET
export INNGEST_EVENT_KEY INNGEST_EVENT_API_BASE_URL

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

ensure_tmux() {
  local name="$1"
  tmux_cmd has-session -t "=$name" 2>/dev/null || \
    tmux_cmd new-session -d -s "$name" -c "$ROOT_DIR" -- bash -l
}

echo "==> Ensuring Inngest event sink on ${INNGEST_EVENT_API_BASE_URL}"
ensure_tmux inngest-event-sink
if ! port_open 8799; then
  tmux_cmd send-keys -t "inngest-event-sink:0.0" \
    "export PATH=\"\$HOME/.bun/bin:\$PATH\"; bun -e \"
const server = Bun.serve({
  port: 8799,
  async fetch(req) {
    const body = await req.text()
    console.log('[inngest-sink]', req.method, req.url, body.slice(0, 300))
    return new Response(JSON.stringify({ ids: ['local-sink'] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
console.log('Inngest event sink listening on', server.url)
\"" C-m
fi
wait_port 8799 "Inngest event sink"

echo "==> Ensuring Convex dev is running"
ensure_tmux convex-dev
if ! port_open 3210; then
  tmux_cmd send-keys -t "convex-dev:0.0" \
    "export PATH=\"\$HOME/.bun/bin:\$PATH\"; cd '$ROOT_DIR'; CONVEX_AGENT_MODE=anonymous bunx convex dev" C-m
fi
wait_port 3210 "Convex backend"

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
# Required by lib/assessment/process-session.ts (convex/nextjs bridge) when
# processing runs inside Convex actions / the inline fallback path.
set_env NEXT_PUBLIC_CONVEX_URL "$NEXT_PUBLIC_CONVEX_URL"
set_env LIVEKIT_AGENT_NAME tutor-screener
set_env CLERK_WEBHOOK_SIGNING_SECRET "$CLERK_WEBHOOK_SIGNING_SECRET"
set_env INNGEST_EVENT_KEY "$INNGEST_EVENT_KEY"
set_env INNGEST_EVENT_API_BASE_URL "$INNGEST_EVENT_API_BASE_URL"

export CLERK_WEBHOOK_SIGNING_SECRET

echo "==> Restarting Convex so action runtimes pick up env"
tmux_cmd send-keys -t "convex-dev:0.0" C-c
sleep 2
tmux_cmd send-keys -t "convex-dev:0.0" \
  "export PATH=\"\$HOME/.bun/bin:\$PATH\"; cd '$ROOT_DIR'; CONVEX_AGENT_MODE=anonymous bunx convex dev" C-m
wait_port 3210 "Convex backend (post-restart)"

for _ in $(seq 1 40); do
  if CONVEX_AGENT_MODE=anonymous bunx convex run integrationSeed:seedPublicInvite \
    '{"inviteToken":"ready-check","participantName":"Ready"}' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Running verification against live local Convex"
bun run scripts/verify-convex-integration.ts
