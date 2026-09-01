import { Inngest } from 'inngest'
import { serverEnv } from '@/lib/env/server'
import { isProductionDeployment } from '@/lib/env/deployment-mode'

export const inngest = new Inngest({
  id: serverEnv.INNGEST_APP_ID ?? 'kyma',
  eventKey: serverEnv.INNGEST_EVENT_KEY,
  signingKey: serverEnv.INNGEST_SIGNING_KEY,
  isDev: !isProductionDeployment({
    deploymentEnv: serverEnv.KYMA_DEPLOYMENT_ENV,
    nodeEnv: serverEnv.NODE_ENV,
  }),
})
