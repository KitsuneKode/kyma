import { Inngest } from 'inngest'
import { serverEnv } from '@/lib/env/server'

export const inngest = new Inngest({
  id: serverEnv.INNGEST_APP_ID ?? 'kyma',
})
