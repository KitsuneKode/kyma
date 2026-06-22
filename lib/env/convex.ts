import { createEnv } from '@t3-oss/env-core'

import { convexClientSchema, convexServerSchema } from './shared'

/**
 * Slim Convex deployment env. Import this from Convex functions instead of the
 * full standalone runtime env to avoid coupling backend startup to unrelated
 * app keys.
 */
export const convexEnv = createEnv({
  clientPrefix: 'NEXT_PUBLIC_',
  server: convexServerSchema,
  client: convexClientSchema,
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
