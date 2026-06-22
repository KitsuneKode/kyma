import 'server-only'

import { serverEnv } from '@/lib/env/server'
import { clientEnv } from '@/lib/env/client'
import {
  getLivekitWebhookCredentials,
  hasLivekitCredentials,
  sliceLivekitEnv,
  type LivekitEnvSlice,
} from '@/lib/livekit/env'

export function getLivekitServerEnv(): LivekitEnvSlice {
  return sliceLivekitEnv({
    NEXT_PUBLIC_LIVEKIT_URL: clientEnv.NEXT_PUBLIC_LIVEKIT_URL,
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
  })
}

export function hasLivekitServerCredentials(
  env: LivekitEnvSlice = getLivekitServerEnv()
) {
  return hasLivekitCredentials(env)
}

export function getLivekitWebhookSigningCredentials(
  env: LivekitEnvSlice = getLivekitServerEnv()
) {
  return getLivekitWebhookCredentials(env)
}
