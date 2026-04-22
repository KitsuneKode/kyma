import { publicEnv } from '@/lib/env/public'
import { serverEnv } from '@/lib/env/server'

export function getLivekitEnv() {
  return {
    NEXT_PUBLIC_LIVEKIT_URL: publicEnv.NEXT_PUBLIC_LIVEKIT_URL,
    LIVEKIT_API_KEY: serverEnv.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: serverEnv.LIVEKIT_API_SECRET,
    LIVEKIT_AGENT_NAME: serverEnv.LIVEKIT_AGENT_NAME,
    LIVEKIT_WEBHOOK_API_KEY: serverEnv.LIVEKIT_WEBHOOK_API_KEY,
    LIVEKIT_WEBHOOK_API_SECRET: serverEnv.LIVEKIT_WEBHOOK_API_SECRET,
    LIVEKIT_RECORDING_ENABLED: serverEnv.LIVEKIT_RECORDING_ENABLED,
    LIVEKIT_RECORDING_AUDIO_ONLY: serverEnv.LIVEKIT_RECORDING_AUDIO_ONLY,
    LIVEKIT_RECORDING_TEMPLATE_URL: serverEnv.LIVEKIT_RECORDING_TEMPLATE_URL,
    LIVEKIT_RECORDING_STORAGE_BUCKET:
      serverEnv.LIVEKIT_RECORDING_STORAGE_BUCKET,
    LIVEKIT_RECORDING_STORAGE_REGION:
      serverEnv.LIVEKIT_RECORDING_STORAGE_REGION,
    LIVEKIT_RECORDING_STORAGE_ACCESS_KEY:
      serverEnv.LIVEKIT_RECORDING_STORAGE_ACCESS_KEY,
    LIVEKIT_RECORDING_STORAGE_SECRET_KEY:
      serverEnv.LIVEKIT_RECORDING_STORAGE_SECRET_KEY,
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
