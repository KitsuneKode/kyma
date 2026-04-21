import { z } from "zod"

const livekitEnvSchema = z.object({
  NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1).optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
  LIVEKIT_AGENT_NAME: z.string().min(1).optional(),
  LIVEKIT_WEBHOOK_API_KEY: z.string().min(1).optional(),
  LIVEKIT_WEBHOOK_API_SECRET: z.string().min(1).optional(),
  LIVEKIT_RECORDING_ENABLED: z.enum(["0", "1"]).optional(),
  LIVEKIT_RECORDING_AUDIO_ONLY: z.enum(["0", "1"]).optional(),
  LIVEKIT_RECORDING_TEMPLATE_URL: z.string().min(1).optional(),
  LIVEKIT_RECORDING_STORAGE_BUCKET: z.string().min(1).optional(),
  LIVEKIT_RECORDING_STORAGE_REGION: z.string().min(1).optional(),
  LIVEKIT_RECORDING_STORAGE_ACCESS_KEY: z.string().min(1).optional(),
  LIVEKIT_RECORDING_STORAGE_SECRET_KEY: z.string().min(1).optional(),
})

export function getLivekitEnv() {
  return livekitEnvSchema.parse({
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    LIVEKIT_AGENT_NAME: process.env.LIVEKIT_AGENT_NAME,
    LIVEKIT_WEBHOOK_API_KEY: process.env.LIVEKIT_WEBHOOK_API_KEY,
    LIVEKIT_WEBHOOK_API_SECRET: process.env.LIVEKIT_WEBHOOK_API_SECRET,
    LIVEKIT_RECORDING_ENABLED: process.env.LIVEKIT_RECORDING_ENABLED,
    LIVEKIT_RECORDING_AUDIO_ONLY: process.env.LIVEKIT_RECORDING_AUDIO_ONLY,
    LIVEKIT_RECORDING_TEMPLATE_URL: process.env.LIVEKIT_RECORDING_TEMPLATE_URL,
    LIVEKIT_RECORDING_STORAGE_BUCKET:
      process.env.LIVEKIT_RECORDING_STORAGE_BUCKET,
    LIVEKIT_RECORDING_STORAGE_REGION:
      process.env.LIVEKIT_RECORDING_STORAGE_REGION,
    LIVEKIT_RECORDING_STORAGE_ACCESS_KEY:
      process.env.LIVEKIT_RECORDING_STORAGE_ACCESS_KEY,
    LIVEKIT_RECORDING_STORAGE_SECRET_KEY:
      process.env.LIVEKIT_RECORDING_STORAGE_SECRET_KEY,
  })
}

export function hasLivekitServerCredentials() {
  const env = getLivekitEnv()

  return Boolean(
    env.NEXT_PUBLIC_LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET
  )
}

export function getLivekitWebhookSigningCredentials() {
  const env = getLivekitEnv()

  return {
    apiKey: env.LIVEKIT_WEBHOOK_API_KEY ?? env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_WEBHOOK_API_SECRET ?? env.LIVEKIT_API_SECRET,
  }
}
