import { runtimeEnv } from '@/lib/env/runtime'

export function getLivekitEnv() {
  return {
    NEXT_PUBLIC_LIVEKIT_URL: runtimeEnv.NEXT_PUBLIC_LIVEKIT_URL,
    LIVEKIT_API_KEY: runtimeEnv.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: runtimeEnv.LIVEKIT_API_SECRET,
    LIVEKIT_AGENT_NAME: runtimeEnv.LIVEKIT_AGENT_NAME,
    LIVEKIT_WEBHOOK_API_KEY: runtimeEnv.LIVEKIT_WEBHOOK_API_KEY,
    LIVEKIT_WEBHOOK_API_SECRET: runtimeEnv.LIVEKIT_WEBHOOK_API_SECRET,
    LIVEKIT_RECORDING_ENABLED: runtimeEnv.LIVEKIT_RECORDING_ENABLED,
    LIVEKIT_RECORDING_AUDIO_ONLY: runtimeEnv.LIVEKIT_RECORDING_AUDIO_ONLY,
    LIVEKIT_RECORDING_TEMPLATE_URL: runtimeEnv.LIVEKIT_RECORDING_TEMPLATE_URL,
    LIVEKIT_RECORDING_STORAGE_BUCKET:
      runtimeEnv.LIVEKIT_RECORDING_STORAGE_BUCKET,
    LIVEKIT_RECORDING_STORAGE_REGION:
      runtimeEnv.LIVEKIT_RECORDING_STORAGE_REGION,
    LIVEKIT_RECORDING_STORAGE_ACCESS_KEY:
      runtimeEnv.LIVEKIT_RECORDING_STORAGE_ACCESS_KEY,
    LIVEKIT_RECORDING_STORAGE_SECRET_KEY:
      runtimeEnv.LIVEKIT_RECORDING_STORAGE_SECRET_KEY,
  }
}

export function hasLivekitServerCredentials() {
  const livekitEnv = getLivekitEnv()

  return Boolean(
    livekitEnv.NEXT_PUBLIC_LIVEKIT_URL &&
    livekitEnv.LIVEKIT_API_KEY &&
    livekitEnv.LIVEKIT_API_SECRET
  )
}

export function getLivekitWebhookSigningCredentials() {
  const livekitEnv = getLivekitEnv()

  return {
    apiKey: livekitEnv.LIVEKIT_WEBHOOK_API_KEY ?? livekitEnv.LIVEKIT_API_KEY,
    apiSecret:
      livekitEnv.LIVEKIT_WEBHOOK_API_SECRET ?? livekitEnv.LIVEKIT_API_SECRET,
  }
}
