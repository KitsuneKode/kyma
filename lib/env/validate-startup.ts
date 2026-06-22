import 'server-only'

import { clientEnv } from '@/lib/env/client'
import { serverEnv } from '@/lib/env/server'
import { hasLivekitCredentials } from '@/lib/livekit/env'
import { isProductionDeployment } from '@/lib/env/deployment-mode'

export type StartupValidationIssue = {
  id: string
  message: string
  severity: 'error' | 'warn'
}

type StartupServerEnv = {
  NODE_ENV?: string
  CI?: string
  KYMA_DEPLOYMENT_ENV?: string
  KYMA_PROCESSING_WRITE_KEY?: string
  CLERK_SECRET_KEY?: string
  CLERK_WEBHOOK_SIGNING_SECRET?: string
  CLERK_FRONTEND_API_URL?: string
  CLERK_JWT_ISSUER_DOMAIN?: string
  LIVEKIT_API_KEY?: string
  LIVEKIT_API_SECRET?: string
  LIVEKIT_AGENT_NAME?: string
  LIVEKIT_RECORDING_ENABLED?: '0' | '1'
  LIVEKIT_RECORDING_STORAGE_BUCKET?: string
  LIVEKIT_RECORDING_STORAGE_REGION?: string
  LIVEKIT_RECORDING_STORAGE_ACCESS_KEY?: string
  LIVEKIT_RECORDING_STORAGE_SECRET_KEY?: string
  INNGEST_APP_ID?: string
  INNGEST_EVENT_KEY?: string
  INNGEST_SIGNING_KEY?: string
}

type StartupClientEnv = {
  NEXT_PUBLIC_CONVEX_URL?: string
  NEXT_PUBLIC_LIVEKIT_URL?: string
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string
}

type StartupEnvInput = {
  server: StartupServerEnv
  client: StartupClientEnv
}

function isTruthyEnv(value: string | undefined) {
  return Boolean(value && value !== '0' && value !== 'false')
}

function isSet(value: string | undefined) {
  return Boolean(value?.trim())
}

function pushMissing(
  issues: StartupValidationIssue[],
  input: {
    id: string
    label: string
    keys: string[]
    env: Record<string, string | undefined>
    severity: 'error' | 'warn'
  }
) {
  const missing = input.keys.filter((key) => !isSet(input.env[key]))
  if (missing.length === 0) {
    return
  }

  issues.push({
    id: input.id,
    message: `${input.label} missing required env: ${missing.join(', ')}.`,
    severity: input.severity,
  })
}

export function validateNextStartupEnvForEnv(
  env: StartupEnvInput
): StartupValidationIssue[] {
  const issues: StartupValidationIssue[] = []
  const isProd = isProductionDeployment({
    deploymentEnv: env.server.KYMA_DEPLOYMENT_ENV,
    nodeEnv: env.server.NODE_ENV,
  })
  const isCi = isTruthyEnv(env.server.CI)
  const failFast = isProd || isCi
  const requiredSeverity = failFast ? 'error' : 'warn'

  if (!env.client.NEXT_PUBLIC_CONVEX_URL?.trim()) {
    issues.push({
      id: 'convex-url',
      message:
        'NEXT_PUBLIC_CONVEX_URL is required for the core interview stack.',
      severity: requiredSeverity,
    })
  }

  if (
    !hasLivekitCredentials({
      NEXT_PUBLIC_LIVEKIT_URL: env.client.NEXT_PUBLIC_LIVEKIT_URL,
      LIVEKIT_API_KEY: env.server.LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET: env.server.LIVEKIT_API_SECRET,
    })
  ) {
    issues.push({
      id: 'livekit-credentials',
      message:
        'LiveKit URL/API credentials are required for the core interview stack.',
      severity: requiredSeverity,
    })
  }

  pushMissing(issues, {
    id: 'clerk-admin-auth',
    label: 'Clerk admin auth',
    keys: [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'CLERK_WEBHOOK_SIGNING_SECRET',
    ],
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        env.client.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: env.server.CLERK_SECRET_KEY,
      CLERK_WEBHOOK_SIGNING_SECRET: env.server.CLERK_WEBHOOK_SIGNING_SECRET,
    },
    severity: requiredSeverity,
  })

  const hasClerkIssuer =
    env.server.CLERK_FRONTEND_API_URL?.trim() ||
    env.server.CLERK_JWT_ISSUER_DOMAIN?.trim()
  if (!hasClerkIssuer) {
    issues.push({
      id: 'clerk-issuer',
      message:
        'Set CLERK_FRONTEND_API_URL or CLERK_JWT_ISSUER_DOMAIN for Clerk + Convex auth.',
      severity: requiredSeverity,
    })
  }

  if (!env.server.KYMA_PROCESSING_WRITE_KEY?.trim()) {
    issues.push({
      id: 'processing-key',
      message: 'KYMA_PROCESSING_WRITE_KEY is required for report writes.',
      severity: requiredSeverity,
    })
  } else if (env.server.KYMA_PROCESSING_WRITE_KEY === '__dev_preview__') {
    issues.push({
      id: 'processing-key-placeholder',
      message:
        'KYMA_PROCESSING_WRITE_KEY must not use the __dev_preview__ placeholder.',
      severity: isProd ? 'error' : 'warn',
    })
  }

  if (env.server.LIVEKIT_RECORDING_ENABLED === '1') {
    pushMissing(issues, {
      id: 'recording-storage',
      label: 'LiveKit recording',
      keys: [
        'LIVEKIT_RECORDING_STORAGE_BUCKET',
        'LIVEKIT_RECORDING_STORAGE_REGION',
        'LIVEKIT_RECORDING_STORAGE_ACCESS_KEY',
        'LIVEKIT_RECORDING_STORAGE_SECRET_KEY',
      ],
      env: {
        LIVEKIT_RECORDING_STORAGE_BUCKET:
          env.server.LIVEKIT_RECORDING_STORAGE_BUCKET,
        LIVEKIT_RECORDING_STORAGE_REGION:
          env.server.LIVEKIT_RECORDING_STORAGE_REGION,
        LIVEKIT_RECORDING_STORAGE_ACCESS_KEY:
          env.server.LIVEKIT_RECORDING_STORAGE_ACCESS_KEY,
        LIVEKIT_RECORDING_STORAGE_SECRET_KEY:
          env.server.LIVEKIT_RECORDING_STORAGE_SECRET_KEY,
      },
      severity: 'error',
    })
  }

  if (failFast) {
    pushMissing(issues, {
      id: 'inngest',
      label: 'Inngest background jobs',
      keys: ['INNGEST_APP_ID', 'INNGEST_EVENT_KEY', 'INNGEST_SIGNING_KEY'],
      env: {
        INNGEST_APP_ID: env.server.INNGEST_APP_ID,
        INNGEST_EVENT_KEY: env.server.INNGEST_EVENT_KEY,
        INNGEST_SIGNING_KEY: env.server.INNGEST_SIGNING_KEY,
      },
      severity: 'error',
    })

    if (!isSet(env.server.LIVEKIT_AGENT_NAME)) {
      issues.push({
        id: 'agent-runtime',
        message:
          'LIVEKIT_AGENT_NAME is required in production/CI so token dispatch targets the interviewer worker.',
        severity: 'error',
      })
    }
  }

  return issues
}

export function validateNextStartupEnv(): StartupValidationIssue[] {
  return validateNextStartupEnvForEnv({
    server: serverEnv,
    client: clientEnv,
  })
}

export function assertNextStartupEnv() {
  const blocking = validateNextStartupEnv().filter(
    (issue) => issue.severity === 'error'
  )
  if (blocking.length === 0) {
    return
  }

  throw new Error(
    `Invalid environment configuration:\n${blocking
      .map((issue) => `- ${issue.message}`)
      .join('\n')}`
  )
}
