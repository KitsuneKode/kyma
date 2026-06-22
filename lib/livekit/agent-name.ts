export const DEFAULT_LIVEKIT_AGENT_NAME = 'tutor-screener'

export function resolveLivekitAgentName(
  configuredName?: string | null
): string {
  const trimmed = configuredName?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_LIVEKIT_AGENT_NAME
}
