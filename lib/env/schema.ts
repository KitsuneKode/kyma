import { createEnv } from '@t3-oss/env-nextjs'
import {
  clientEnvSchema,
  runtimeEnv,
  serverEnvSchema,
} from '@/lib/env/definitions'

/**
 * Canonical env schema and runtime mapping.
 * Keep all key definitions centralized here.
 */
export const env = createEnv({
  server: serverEnvSchema,
  client: clientEnvSchema,
  runtimeEnv,
  emptyStringAsUndefined: true,
})
