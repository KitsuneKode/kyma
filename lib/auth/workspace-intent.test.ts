import { describe, expect, it } from 'vitest'

import {
  authContinuePath,
  parseRedirectUrl,
  postAuthRedirectPath,
} from '@/lib/auth/workspace-intent'

describe('parseRedirectUrl', () => {
  it('accepts same-origin relative paths', () => {
    expect(parseRedirectUrl('/join/org_123')).toBe('/join/org_123')
    expect(parseRedirectUrl('/candidate/interviews')).toBe(
      '/candidate/interviews'
    )
  })

  it('rejects absolute and protocol-relative URLs', () => {
    expect(parseRedirectUrl('https://evil.example')).toBeNull()
    expect(parseRedirectUrl('//evil.example')).toBeNull()
    expect(parseRedirectUrl('')).toBeNull()
  })
})

describe('authContinuePath', () => {
  it('includes workspace and redirect_url query params', () => {
    expect(authContinuePath('recruiter', '/join/org_123')).toBe(
      '/auth/continue?workspace=recruiter&redirect_url=%2Fjoin%2Forg_123'
    )
  })
})

describe('postAuthRedirectPath', () => {
  it('prefers redirect_url over auth continue', () => {
    expect(postAuthRedirectPath('recruiter', '/join/org_123')).toBe(
      '/join/org_123'
    )
  })

  it('falls back to auth continue when redirect_url is absent', () => {
    expect(postAuthRedirectPath('candidate', null)).toBe(
      '/auth/continue?workspace=candidate'
    )
  })
})
