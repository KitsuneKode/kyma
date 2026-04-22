import 'server-only'

import { createEnv } from '@t3-oss/env-nextjs'

import { serverSchema } from '@/lib/env/shared'

// Next.js-specific server env. Split from the client schema so server variable
// names do not need to be bundled into browser code.
export const serverEnv = createEnv({
  server: serverSchema,
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
