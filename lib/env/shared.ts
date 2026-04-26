import { z } from 'zod'

export const serverSchema = {
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
  CLERK_FRONTEND_API_URL: z.string().url().optional(),
  CLERK_JWT_ISSUER_DOMAIN: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
  LIVEKIT_AGENT_NAME: z.string().min(1).optional(),
  LIVEKIT_AGENT_STT_MODEL: z.string().min(1).optional(),
  LIVEKIT_AGENT_LLM_MODEL: z.string().min(1).optional(),
  LIVEKIT_AGENT_TTS_MODEL: z.string().min(1).optional(),
  LIVEKIT_AGENT_CHILD_TTS_MODEL: z.string().min(1).optional(),
  LIVEKIT_AGENT_WRAP_TTS_MODEL: z.string().min(1).optional(),
  LIVEKIT_AGENT_INSTRUCTIONS: z.string().min(1).optional(),
  LIVEKIT_AGENT_CHILD_INSTRUCTIONS: z.string().min(1).optional(),
  LIVEKIT_AGENT_WRAP_UP_INSTRUCTIONS: z.string().min(1).optional(),
  LIVEKIT_AGENT_LOG_LEVEL: z.string().min(1).optional(),
  LIVEKIT_WEBHOOK_API_KEY: z.string().min(1).optional(),
  LIVEKIT_WEBHOOK_API_SECRET: z.string().min(1).optional(),
  LIVEKIT_RECORDING_ENABLED: z.enum(['0', '1']).optional(),
  LIVEKIT_RECORDING_AUDIO_ONLY: z.enum(['0', '1']).optional(),
  LIVEKIT_RECORDING_TEMPLATE_URL: z.string().min(1).optional(),
  LIVEKIT_RECORDING_STORAGE_BUCKET: z.string().min(1).optional(),
  LIVEKIT_RECORDING_STORAGE_REGION: z.string().min(1).optional(),
  LIVEKIT_RECORDING_STORAGE_ACCESS_KEY: z.string().min(1).optional(),
  LIVEKIT_RECORDING_STORAGE_SECRET_KEY: z.string().min(1).optional(),
  KYMA_ENABLE_DEMO_INVITE: z.enum(['0', '1']).optional(),
  KYMA_REVIEW_CHAT_MODEL: z.string().min(1).optional(),
  KYMA_PROCESSING_WRITE_KEY: z.string().min(1).optional(),
  KYMA_ADMIN_EMAILS: z.string().min(1).optional(),
  KYMA_ENCRYPTION_KEY: z.string().min(1).optional(),
  INNGEST_APP_ID: z.string().min(1).optional(),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  PLAYWRIGHT_BASE_URL: z.string().url().optional(),
  PLAYWRIGHT_SKIP_WEBSERVER: z.string().min(1).optional(),
  CI: z.string().min(1).optional(),
} as const

export const clientSchema = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_DEV_TRACE: z.enum(['0', '1']).optional(),
} as const

export const clientRuntimeEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_ENABLE_DEV_TRACE: process.env.NEXT_PUBLIC_ENABLE_DEV_TRACE,
} as const
