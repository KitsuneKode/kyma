export type LivekitEnvSlice = {
  NEXT_PUBLIC_LIVEKIT_URL?: string
  LIVEKIT_API_KEY?: string
  LIVEKIT_API_SECRET?: string
  LIVEKIT_AGENT_NAME?: string
  LIVEKIT_WEBHOOK_API_KEY?: string
  LIVEKIT_WEBHOOK_API_SECRET?: string
  LIVEKIT_RECORDING_ENABLED?: '0' | '1'
  LIVEKIT_RECORDING_AUDIO_ONLY?: '0' | '1'
  LIVEKIT_RECORDING_TEMPLATE_URL?: string
  LIVEKIT_RECORDING_STORAGE_BUCKET?: string
  LIVEKIT_RECORDING_STORAGE_REGION?: string
  LIVEKIT_RECORDING_STORAGE_ACCESS_KEY?: string
  LIVEKIT_RECORDING_STORAGE_SECRET_KEY?: string
}

export function hasLivekitCredentials(env: LivekitEnvSlice) {
  return Boolean(
    env.NEXT_PUBLIC_LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET
  )
}

export function getLivekitWebhookCredentials(env: LivekitEnvSlice) {
  return {
    apiKey: env.LIVEKIT_WEBHOOK_API_KEY ?? env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_WEBHOOK_API_SECRET ?? env.LIVEKIT_API_SECRET,
  }
}
