import { describe, expect, it } from 'vitest'

import {
  resolveAuthSetupSurface,
  shouldExposeLocalAuthSetup,
} from '@/lib/auth/local-auth-setup'

describe('shouldExposeLocalAuthSetup', () => {
  it('keeps local setup on a development machine', () => {
    expect(
      shouldExposeLocalAuthSetup({
        nodeEnv: 'development',
      })
    ).toBe(true)
  })

  it('hides local setup for production Node', () => {
    expect(
      shouldExposeLocalAuthSetup({
        nodeEnv: 'production',
      })
    ).toBe(false)
  })

  it('hides local setup on Vercel preview even if deployment env is development', () => {
    expect(
      shouldExposeLocalAuthSetup({
        deploymentEnv: 'development',
        nodeEnv: 'development',
        vercelEnv: 'preview',
      })
    ).toBe(false)
  })

  it('hides local setup on Vercel production', () => {
    expect(
      shouldExposeLocalAuthSetup({
        nodeEnv: 'production',
        vercelEnv: 'production',
      })
    ).toBe(false)
  })
})

describe('resolveAuthSetupSurface', () => {
  it('maps local development to the operator setup surface', () => {
    expect(
      resolveAuthSetupSurface({
        nodeEnv: 'development',
      })
    ).toBe('local')
  })

  it('maps hosted deployments to the product surface', () => {
    expect(
      resolveAuthSetupSurface({
        nodeEnv: 'production',
        vercelEnv: 'preview',
      })
    ).toBe('hosted')
  })
})
