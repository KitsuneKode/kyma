import { isDevelopmentMode } from '../runtime-mode'

export const DEMO_INVITE_TOKEN = 'demo-invite'

type DemoInviteEnv = {
  NODE_ENV?: string
  KYMA_ENABLE_DEMO_INVITE?: string
}

export function isDemoInviteEnabled(env: DemoInviteEnv) {
  return isDevelopmentMode(env.NODE_ENV) || env.KYMA_ENABLE_DEMO_INVITE === '1'
}

export function isEnabledDemoInviteToken(
  inviteToken: string,
  env: DemoInviteEnv
) {
  return inviteToken === DEMO_INVITE_TOKEN && isDemoInviteEnabled(env)
}
