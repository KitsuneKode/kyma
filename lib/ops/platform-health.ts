import 'server-only'

import { api } from '@/convex/_generated/api'
import { serverEnv } from '@/lib/env/server'
import { clientEnv } from '@/lib/env/client'
import { serverConvexQuery } from '@/lib/convex/server-query'
import { hasLivekitRecordingConfig } from '@/lib/livekit/recording'
import {
  DEFAULT_MODELS,
  providerFromModelId,
} from '@/lib/providers/provider-id'
import { resolveStageModels } from '@/lib/providers/resolve-model'
import { hasPlatformProviderKey } from '@/lib/env/providers'
import { classifyWorkerLiveness } from '@/lib/agent/worker-liveness'

export type HealthCheckStatus = 'ok' | 'warn' | 'error' | 'unknown'

export type HealthCheck = {
  id: string
  label: string
  status: HealthCheckStatus
  detail: string
}

function isSet(value: string | undefined) {
  return Boolean(value?.trim())
}

function processingKeyStatus(): HealthCheck {
  const key = serverEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  const isProd = serverEnv.NODE_ENV === 'production'

  if (!key) {
    return {
      id: 'processing-key',
      label: 'Processing write key',
      status: isProd ? 'error' : 'warn',
      detail: isProd
        ? 'KYMA_PROCESSING_WRITE_KEY is required in production.'
        : 'Not set — dev bypass active. Set before production deploy.',
    }
  }

  if (key === '__dev_preview__') {
    return {
      id: 'processing-key',
      label: 'Processing write key',
      status: isProd ? 'error' : 'warn',
      detail: 'Using dev placeholder key — not safe for production.',
    }
  }

  return {
    id: 'processing-key',
    label: 'Processing write key',
    status: 'ok',
    detail: 'Configured.',
  }
}

function scoringCredentialsStatus(): HealthCheck {
  const scoringModel =
    serverEnv.KYMA_SCORING_MODEL?.trim() || DEFAULT_MODELS.scoring
  const provider = providerFromModelId(scoringModel)
  const isProd = serverEnv.NODE_ENV === 'production'

  if (!provider) {
    return {
      id: 'scoring-credentials',
      label: 'Scoring credentials',
      status: isProd ? 'warn' : 'ok',
      detail: `Scoring model ${scoringModel} does not map to a known BYOK provider. Ensure gateway credentials are configured.`,
    }
  }

  const hasPlatformKey = provider
    ? hasPlatformProviderKey(provider, serverEnv)
    : false

  return {
    id: 'scoring-credentials',
    label: 'Scoring credentials',
    status: hasPlatformKey || !isProd ? 'ok' : 'warn',
    detail: hasPlatformKey
      ? `Platform key available for ${provider} scoring (${scoringModel}).`
      : `No platform ${provider} key detected — scoring needs org BYOK or ${provider.toUpperCase()}_API_KEY in production.`,
  }
}

async function agentWorkerLivenessStatus(): Promise<HealthCheck> {
  const isProd = serverEnv.NODE_ENV === 'production'
  const processingKey = serverEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  const label = 'Agent worker liveness'

  if (!isSet(clientEnv.NEXT_PUBLIC_CONVEX_URL)) {
    return {
      id: 'agent-worker-liveness',
      label,
      status: 'unknown',
      detail: 'Convex URL not set — cannot read agent worker heartbeats.',
    }
  }

  if (!processingKey) {
    return {
      id: 'agent-worker-liveness',
      label,
      status: isProd ? 'error' : 'warn',
      detail:
        'KYMA_PROCESSING_WRITE_KEY not set — agent worker cannot report heartbeats.',
    }
  }

  try {
    const livenessResult = await serverConvexQuery(
      api.agentWorker.getWorkerLiveness,
      {
        processingKey,
      },
      { public: true }
    )
    if (!livenessResult.ok) {
      throw new Error(livenessResult.message)
    }
    const liveness = livenessResult.data
    const { status, detail } = classifyWorkerLiveness({
      mostRecentSeenAt: liveness.mostRecentSeenAt,
      now: Date.now(),
      isProd,
    })
    return { id: 'agent-worker-liveness', label, status, detail }
  } catch {
    return {
      id: 'agent-worker-liveness',
      label,
      status: 'unknown',
      detail: 'Unable to read agent worker heartbeats from Convex.',
    }
  }
}

export async function collectPlatformHealthChecks(): Promise<HealthCheck[]> {
  const isProd = serverEnv.NODE_ENV === 'production'
  const clerkConfigured =
    isSet(serverEnv.CLERK_SECRET_KEY) &&
    isSet(clientEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const clerkJwtConfigured =
    isSet(serverEnv.CLERK_FRONTEND_API_URL) ||
    isSet(serverEnv.CLERK_JWT_ISSUER_DOMAIN)

  const agentWorkerLiveness = await agentWorkerLivenessStatus()

  return [
    {
      id: 'convex',
      label: 'Convex',
      status: isSet(clientEnv.NEXT_PUBLIC_CONVEX_URL) ? 'ok' : 'error',
      detail: isSet(clientEnv.NEXT_PUBLIC_CONVEX_URL)
        ? 'NEXT_PUBLIC_CONVEX_URL is set.'
        : 'Missing NEXT_PUBLIC_CONVEX_URL — run bun run convex:once.',
    },
    {
      id: 'clerk',
      label: 'Clerk auth',
      status: clerkConfigured ? 'ok' : isProd ? 'error' : 'warn',
      detail: clerkConfigured
        ? 'Clerk keys configured.'
        : 'Clerk keys missing — recruiter auth disabled.',
    },
    {
      id: 'clerk-jwt',
      label: 'Clerk convex JWT template',
      status: clerkJwtConfigured ? 'ok' : clerkConfigured ? 'warn' : 'unknown',
      detail: clerkJwtConfigured
        ? 'JWT issuer configured for Convex.'
        : 'Set CLERK_FRONTEND_API_URL or CLERK_JWT_ISSUER_DOMAIN. Run bun run clerk:setup-auth.',
    },
    {
      id: 'livekit',
      label: 'LiveKit',
      status:
        isSet(clientEnv.NEXT_PUBLIC_LIVEKIT_URL) &&
        isSet(serverEnv.LIVEKIT_API_KEY) &&
        isSet(serverEnv.LIVEKIT_API_SECRET)
          ? 'ok'
          : 'warn',
      detail:
        isSet(clientEnv.NEXT_PUBLIC_LIVEKIT_URL) &&
        isSet(serverEnv.LIVEKIT_API_KEY) &&
        isSet(serverEnv.LIVEKIT_API_SECRET)
          ? `Agent dispatch: ${isSet(serverEnv.LIVEKIT_AGENT_NAME) ? serverEnv.LIVEKIT_AGENT_NAME : 'not set (auto dispatch)'}`
          : 'LiveKit env incomplete — interviews will not connect.',
    },
    {
      id: 'livekit-webhook',
      label: 'LiveKit webhooks',
      status:
        isSet(serverEnv.LIVEKIT_WEBHOOK_API_KEY) ||
        isSet(serverEnv.LIVEKIT_API_KEY)
          ? 'ok'
          : 'warn',
      detail:
        'Webhook signing uses LIVEKIT_WEBHOOK_* or falls back to LIVEKIT_API_*.',
    },
    {
      id: 'inngest',
      label: 'Inngest',
      status:
        isProd && !isSet(serverEnv.INNGEST_EVENT_KEY)
          ? 'warn'
          : serverEnv.NODE_ENV !== 'production'
            ? 'ok'
            : isSet(serverEnv.INNGEST_EVENT_KEY)
              ? 'ok'
              : 'warn',
      detail:
        serverEnv.NODE_ENV !== 'production'
          ? 'Dev mode — inline processing fallback available.'
          : isSet(serverEnv.INNGEST_EVENT_KEY)
            ? 'Cloud event key configured.'
            : 'INNGEST_EVENT_KEY missing — processing uses inline fallback.',
    },
    processingKeyStatus(),
    {
      id: 'encryption',
      label: 'BYOK encryption',
      status: isSet(serverEnv.KYMA_ENCRYPTION_KEY) ? 'ok' : 'warn',
      detail: isSet(serverEnv.KYMA_ENCRYPTION_KEY)
        ? 'KYMA_ENCRYPTION_KEY configured for provider keys.'
        : 'Required before storing org provider keys.',
    },
    (() => {
      const resolved = resolveStageModels({
        envFallbacks: {
          stt: serverEnv.LIVEKIT_AGENT_STT_MODEL,
          llm: serverEnv.LIVEKIT_AGENT_LLM_MODEL,
          tts: serverEnv.LIVEKIT_AGENT_TTS_MODEL,
          reviewChat: serverEnv.KYMA_REVIEW_CHAT_MODEL,
          scoring: serverEnv.KYMA_SCORING_MODEL,
        },
      })
      return {
        id: 'agent-models',
        label: 'Agent models',
        status:
          isSet(serverEnv.LIVEKIT_AGENT_LLM_MODEL) ||
          isSet(serverEnv.LIVEKIT_AGENT_STT_MODEL)
            ? 'ok'
            : 'warn',
        detail: `STT: ${resolved.stt} · LLM: ${resolved.llm} · TTS: ${resolved.tts} · Scoring: ${resolved.scoring} · Review: ${resolved.reviewChat} · Realtime: ${serverEnv.KYMA_AGENT_REALTIME_PROVIDER ?? 'cascade'}`,
      }
    })(),
    {
      id: 'agent-dispatch',
      label: 'Agent dispatch',
      status: isSet(serverEnv.LIVEKIT_AGENT_NAME) ? 'ok' : 'warn',
      detail: isSet(serverEnv.LIVEKIT_AGENT_NAME)
        ? `Dispatching agent "${serverEnv.LIVEKIT_AGENT_NAME}". Run bun run agent:start in production.`
        : 'LIVEKIT_AGENT_NAME not set — token dispatch may not start the interviewer worker.',
    },
    agentWorkerLiveness,
    {
      id: 'recording-playback',
      label: 'Recording playback',
      status: hasLivekitRecordingConfig() ? 'ok' : 'warn',
      detail: hasLivekitRecordingConfig()
        ? 'S3 recording storage configured for recruiter playback presigning.'
        : 'Recording env incomplete — review audio playback may be unavailable.',
    },
    scoringCredentialsStatus(),
  ]
}

export function summarizeHealth(checks: HealthCheck[]) {
  const errors = checks.filter((c) => c.status === 'error').length
  const warnings = checks.filter((c) => c.status === 'warn').length
  return { errors, warnings, ready: errors === 0 }
}
