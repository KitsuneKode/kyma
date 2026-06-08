import { Inngest } from 'inngest'
import { serverEnv } from '@/lib/env/server'

export const inngest = new Inngest({
  id: serverEnv.INNGEST_APP_ID ?? 'kyma',
  eventKey: serverEnv.INNGEST_EVENT_KEY,
  signingKey: serverEnv.INNGEST_SIGNING_KEY,
  isDev: serverEnv.NODE_ENV !== 'production',
})
