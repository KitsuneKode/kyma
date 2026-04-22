import { createEnv } from '@t3-oss/env-core'
import {
  clientEnvSchema,
  runtimeEnv,
  serverEnvSchema,
} from '@/lib/env/definitions'

/**
 * Runtime-safe env for non-Next processes (agent worker, Convex, scripts).
 * Avoids importing Next-specific env wrappers in standalone runtimes.
 */
export const runtimeEnvConfig = createEnv({
  clientPrefix: 'NEXT_PUBLIC_',
  server: serverEnvSchema,
  client: clientEnvSchema,
  runtimeEnv,
  emptyStringAsUndefined: true,
})
