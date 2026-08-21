import { fetchMutation, fetchQuery } from 'convex/nextjs'
import type { FunctionReturnType } from 'convex/server'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { runtimeEnv } from '@/lib/env/runtime'
import type { createDiagnosticLogger } from '@/lib/interview/diagnostics'

type Logger = ReturnType<typeof createDiagnosticLogger>

/**
 * The interview agent's full read/write contract with Convex, resolved once.
 *
 * `getInterviewAgentConfig` is the single source of truth for everything the
 * agent needs at runtime (template, models, budget, session state), so its
 * return type is re-exported here for callers that shape behavior from it.
 */
export type AgentSessionConfig = NonNullable<
  FunctionReturnType<typeof api.agentConfig.getInterviewAgentConfig>
>

export type AgentTranscriptSegment = {
  segmentId: string
  speaker: 'agent' | 'candidate' | 'system'
  text: string
  status: 'partial' | 'final'
  startedAt: string
  endedAt?: string
}

/**
 * Thin port that isolates the LiveKit agent from Convex wiring: it owns the
 * processing key, the session id cast, and the swallow-and-log error policy for
 * best-effort writes. The agent depends on this interface, not on `fetch*`
 * calls, which keeps the conversation logic testable and the backend contract
 * in one place.
 */
export interface AgentSessionPort {
  readonly sessionId: string | undefined
  fetchConfig(): Promise<AgentSessionConfig | null>
  appendEvent(type: string, detail: string, state?: 'processing'): Promise<void>
  upsertTranscript(segment: AgentTranscriptSegment): Promise<void>
  recordVisualObservation(observation: string): Promise<void>
  requestProcessing(detail: string): Promise<void>
}

export function createAgentSessionPort(args: {
  sessionId: string | undefined
  logger: Logger
}): AgentSessionPort {
  const { sessionId, logger } = args
  const processingKey = runtimeEnv.KYMA_PROCESSING_WRITE_KEY
  const id = sessionId as Id<'interviewSessions'> | undefined

  /**
   * Best-effort session-event write, shared by the port's own error paths.
   * Hoisted out of the returned object so failure handlers can record an
   * event without depending on `this`.
   */
  async function appendSessionEventSafely(
    type: string,
    detail: string,
    state?: 'processing'
  ) {
    if (!id) {
      return
    }

    await fetchMutation(api.interviews.sessionEvents.appendSessionEvent, {
      processingKey,
      sessionId: id,
      type,
      detail,
      source: 'livekit-agent',
      dedupeKey: `${type}:${sessionId}:${detail.slice(0, 64)}`,
      state,
    }).catch((error) => {
      logger.warn({
        event: 'agent.session-event.persist.failed',
        detail: `Unable to persist session event ${type}.`,
        sessionId,
        error,
      })
    })
  }

  return {
    sessionId,

    async fetchConfig() {
      if (!id) {
        return null
      }

      // A transient failure here previously resolved to `null`, which silently
      // fell back to default prompts, persona and models. For a BYOK org that
      // means interviewing against the wrong template with no operator signal,
      // so this now fails loudly and lets the caller abort the session.
      return await fetchQuery(api.agentConfig.getInterviewAgentConfig, {
        sessionId: id,
        processingKey,
      }).catch((error) => {
        logger.error({
          event: 'agent.config.fetch.failed',
          detail:
            'Unable to load interview config; refusing to run on default prompts.',
          sessionId,
          error,
        })
        throw error instanceof Error
          ? error
          : new Error('Interview config fetch failed.')
      })
    },

    async appendEvent(type, detail, state) {
      await appendSessionEventSafely(type, detail, state)
    },

    async upsertTranscript(segment) {
      if (!id || !segment.text.trim()) {
        return
      }

      await fetchMutation(api.agentConfig.upsertAgentTranscriptSegment, {
        processingKey,
        sessionId: id,
        segmentId: segment.segmentId,
        speaker: segment.speaker,
        text: segment.text,
        status: segment.status,
        startedAt: segment.startedAt,
        endedAt: segment.endedAt,
      }).catch((error) => {
        logger.warn({
          event: 'agent.transcript.persist.failed',
          detail: 'Unable to persist transcript segment from agent session.',
          sessionId,
          error,
        })
      })
    },

    async recordVisualObservation(observation) {
      if (!id) {
        return
      }

      const trimmed = observation.trim()
      if (!trimmed) {
        return
      }

      await fetchMutation(api.visualObservations.recordVisualObservation, {
        processingKey,
        sessionId: id,
        observation: trimmed,
        observedAt: new Date().toISOString(),
        source: 'agent',
      }).catch((error) => {
        logger.warn({
          event: 'agent.visual-observation.persist.failed',
          detail: 'Unable to persist visual observation from agent session.',
          sessionId,
          error,
        })
      })
    },

    /**
     * Requests post-call processing, with bounded retries.
     *
     * This is the call that turns a finished conversation into a report. A
     * swallowed failure here produced the worst outcome in the system: an
     * interview that completes for the candidate, generates nothing, and
     * signals nothing. Retries first; if all attempts fail, records a durable
     * session event so the reaper and the operator health panel can see it.
     */
    async requestProcessing(detail) {
      if (!id) {
        return
      }

      const retryDelaysMs = [0, 1_000, 4_000]
      let lastError: unknown

      for (const delayMs of retryDelaysMs) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }

        try {
          await fetchMutation(api.agentConfig.requestInterviewProcessing, {
            processingKey,
            sessionId: id,
            detail,
          })
          return
        } catch (error) {
          lastError = error
          logger.warn({
            event: 'agent.processing.request.retry',
            detail: 'Processing request failed; will retry.',
            sessionId,
            error,
          })
        }
      }

      logger.error({
        event: 'agent.processing.request.exhausted',
        detail:
          'Processing request failed after every retry; interview would produce no report.',
        sessionId,
        error: lastError,
      })

      await appendSessionEventSafely(
        'processing-request-failed',
        `Agent could not request post-call processing after ${retryDelaysMs.length} attempts: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`
      )
    },
  }
}
