import { cli, ServerOptions, WorkerPermissions } from '@livekit/agents'
import { fileURLToPath } from 'node:url'
import { hostname } from 'node:os'
import { fetchMutation } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { createDiagnosticLogger } from '@/lib/interview/diagnostics'
import type { DiagnosticLogger } from '@/lib/interview/diagnostics'
import { resolveLivekitAgentName } from '@/lib/livekit/agent-name'
import { runtimeEnv } from '@/lib/env/runtime'
import { WORKER_HEARTBEAT_INTERVAL_MS } from '@/lib/agent/worker-liveness'

const workerFile = fileURLToPath(import.meta.url)
const agentFile = fileURLToPath(new URL('./interviewer.ts', import.meta.url))

function createWorkerId() {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now()}`
  return `${hostname()}-${process.pid}-${random}`
}

/**
 * Periodically reports worker liveness to Convex so the operator health panel
 * can detect a downed agent worker. Best-effort: heartbeat failures are logged
 * but never crash the worker.
 */
function startWorkerHeartbeat(logger: DiagnosticLogger) {
  const workerId = createWorkerId()
  const agentName = resolveLivekitAgentName(runtimeEnv.LIVEKIT_AGENT_NAME)
  const version = process.env.npm_package_version
  let stopped = false

  async function send(status: 'running' | 'draining' | 'stopped') {
    try {
      await fetchMutation(api.agentWorker.recordWorkerHeartbeat, {
        processingKey: runtimeEnv.KYMA_PROCESSING_WRITE_KEY,
        workerId,
        agentName,
        status,
        version,
      })
    } catch (error) {
      logger.warn({
        event: 'worker.heartbeat.failed',
        detail: 'Unable to record agent worker heartbeat in Convex.',
        error,
      })
    }
  }

  void send('running')
  const interval = setInterval(() => {
    if (!stopped) void send('running')
  }, WORKER_HEARTBEAT_INTERVAL_MS)
  if (typeof interval.unref === 'function') {
    interval.unref()
  }

  const shutdown = () => {
    if (stopped) return
    stopped = true
    clearInterval(interval)
    void send('stopped')
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  process.once('beforeExit', shutdown)
}

function createServerOptions() {
  const logger = createDiagnosticLogger('agent-worker', {
    actor: 'agent',
  })
  logger.info({
    event: 'worker.options.created',
    detail: 'Preparing LiveKit worker server options.',
    meta: {
      agentName: resolveLivekitAgentName(runtimeEnv.LIVEKIT_AGENT_NAME),
      wsUrlConfigured: Boolean(runtimeEnv.NEXT_PUBLIC_LIVEKIT_URL),
      apiKeyConfigured: Boolean(runtimeEnv.LIVEKIT_API_KEY),
      apiSecretConfigured: Boolean(runtimeEnv.LIVEKIT_API_SECRET),
    },
  })
  return new ServerOptions({
    agent: agentFile,
    agentName: resolveLivekitAgentName(runtimeEnv.LIVEKIT_AGENT_NAME),
    wsURL: runtimeEnv.NEXT_PUBLIC_LIVEKIT_URL,
    apiKey: runtimeEnv.LIVEKIT_API_KEY,
    apiSecret: runtimeEnv.LIVEKIT_API_SECRET,
    logLevel: runtimeEnv.LIVEKIT_AGENT_LOG_LEVEL ?? 'info',
    permissions: new WorkerPermissions(true, true, true, true),
  })
}

if (process.argv[1] === workerFile) {
  const runLogger = createDiagnosticLogger('agent-worker', {
    actor: 'agent',
  })
  runLogger.info({
    event: 'worker.run.start',
    detail: 'Starting LiveKit agent worker.',
  })
  startWorkerHeartbeat(runLogger)
  cli.runApp(createServerOptions())
}
