import { createEnv } from '@t3-oss/env-core'

import { clientSchema, serverSchema } from './shared'

/**
 * Standalone runtime env for Convex, agent workers, and scripts.
 * This stays framework-agnostic and validates against process.env directly.
 */
export const runtimeEnv = createEnv({
  clientPrefix: 'NEXT_PUBLIC_',
  server: serverSchema,
  client: clientSchema,
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
