import { isDevelopmentMode } from '../runtime-mode'

/** @deprecated Legacy public demo token — mock interviews are auth-gated via createMockInterview. */
export const DEMO_INVITE_TOKEN = 'demo-invite'

type DemoInviteEnv = {
  NODE_ENV?: string
  KYMA_ENABLE_DEMO_INVITE?: string
}

/**
 * Public demo invites are disabled in production. Mock interviews are created
 * through the authenticated `createMockInterview` mutation instead.
 */
export function isDemoInviteEnabled(env: DemoInviteEnv) {
  return isDevelopmentMode(env.NODE_ENV) || env.KYMA_ENABLE_DEMO_INVITE === '1'
}

/** @deprecated Use auth-gated mock interviews instead of the public demo token. */
export function isEnabledDemoInviteToken(
  inviteToken: string,
  env: DemoInviteEnv
) {
  return inviteToken === DEMO_INVITE_TOKEN && isDemoInviteEnabled(env)
}
