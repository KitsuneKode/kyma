import { z } from 'zod'

export const deploymentEnvSchema = z.enum(['development', 'production'])

export const serverSchema = {
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  KYMA_DEPLOYMENT_ENV: deploymentEnvSchema.optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
  CLERK_FRONTEND_API_URL: z.url().optional(),
  CLERK_JWT_ISSUER_DOMAIN: z.url().optional(),
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
  KYMA_AGENT_REALTIME_PROVIDER: z
    .enum(['gemini', 'openai', 'cascade'])
    .optional(),
  KYMA_AGENT_VIDEO_INPUT: z.enum(['0', '1']).optional(),
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
  KYMA_SCORING_MODEL: z.string().min(1).optional(),
  KYMA_PROCESSING_WRITE_KEY: z.string().min(1).optional(),
  KYMA_ADMIN_EMAILS: z.string().min(1).optional(),
  KYMA_AUTH_DEBUG: z.enum(['0', '1']).optional(),
  KYMA_ENCRYPTION_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  INNGEST_APP_ID: z.string().min(1).optional(),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  PLAYWRIGHT_BASE_URL: z.url().optional(),
  PLAYWRIGHT_SKIP_WEBSERVER: z.string().min(1).optional(),
  CI: z.string().min(1).optional(),
  VERCEL_URL: z.string().min(1).optional(),
} as const

export const clientSchema = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_CONVEX_URL: z.url().optional(),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  NEXT_PUBLIC_ENABLE_DEV_TRACE: z.enum(['0', '1']).optional(),
} as const

export const convexServerSchema = {
  NODE_ENV: serverSchema.NODE_ENV,
  KYMA_DEPLOYMENT_ENV: serverSchema.KYMA_DEPLOYMENT_ENV,
  KYMA_PROCESSING_WRITE_KEY: serverSchema.KYMA_PROCESSING_WRITE_KEY,
  KYMA_ENCRYPTION_KEY: serverSchema.KYMA_ENCRYPTION_KEY,
  KYMA_ADMIN_EMAILS: serverSchema.KYMA_ADMIN_EMAILS,
  KYMA_ENABLE_DEMO_INVITE: serverSchema.KYMA_ENABLE_DEMO_INVITE,
  CLERK_SECRET_KEY: serverSchema.CLERK_SECRET_KEY,
  CLERK_FRONTEND_API_URL: serverSchema.CLERK_FRONTEND_API_URL,
  CLERK_JWT_ISSUER_DOMAIN: serverSchema.CLERK_JWT_ISSUER_DOMAIN,
} as const

export const convexClientSchema = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    clientSchema.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
} as const

export const clientRuntimeEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ENABLE_DEV_TRACE: process.env.NEXT_PUBLIC_ENABLE_DEV_TRACE,
} as const

export const toolingEnvKeys = [
  'CONVEX_DEPLOYMENT',
  'NEXT_PUBLIC_CONVEX_SITE_URL',
  'npm_package_version',
] as const
