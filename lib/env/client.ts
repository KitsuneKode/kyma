import { createEnv } from '@t3-oss/env-nextjs'

import { clientRuntimeEnv, clientSchema } from '@/lib/env/shared'

// Client-safe env. runtimeEnv stays explicit here so Next only bundles the
// public keys we intentionally expose.
export const clientEnv = createEnv({
  client: clientSchema,
  runtimeEnv: clientRuntimeEnv,
  emptyStringAsUndefined: true,
})
