import { describe, expect, it } from 'vitest'

import {
  isAuthGatedPathWithoutClerk,
  mustFailClosedWithoutClerk,
} from '@/lib/auth/clerk-fail-closed'

describe('mustFailClosedWithoutClerk', () => {
  it('fails closed in production when Clerk is missing', () => {
    expect(
      mustFailClosedWithoutClerk({ hasClerk: false, isProduction: true })
    ).toBe(true)
  })

  it('allows local/dev passthrough when Clerk is missing', () => {
    expect(
      mustFailClosedWithoutClerk({ hasClerk: false, isProduction: false })
    ).toBe(false)
  })

  it('does not fail closed when Clerk is configured', () => {
    expect(
      mustFailClosedWithoutClerk({ hasClerk: true, isProduction: true })
    ).toBe(false)
    expect(
      mustFailClosedWithoutClerk({ hasClerk: true, isProduction: false })
    ).toBe(false)
  })
})

describe('isAuthGatedPathWithoutClerk', () => {
  it('gates recruiter and candidate surfaces', () => {
    expect(isAuthGatedPathWithoutClerk('/recruiter')).toBe(true)
    expect(isAuthGatedPathWithoutClerk('/recruiter/templates')).toBe(true)
    expect(isAuthGatedPathWithoutClerk('/admin/screenings')).toBe(true)
    expect(isAuthGatedPathWithoutClerk('/candidate')).toBe(true)
    expect(isAuthGatedPathWithoutClerk('/candidate/profile')).toBe(true)
  })

  it('gates app-shell and onboarding paths', () => {
    expect(isAuthGatedPathWithoutClerk('/onboarding')).toBe(true)
    expect(isAuthGatedPathWithoutClerk('/write-up')).toBe(true)
    expect(isAuthGatedPathWithoutClerk('/settings')).toBe(true)
    expect(isAuthGatedPathWithoutClerk('/auth/continue')).toBe(true)
    expect(isAuthGatedPathWithoutClerk('/join/org_123')).toBe(true)
  })

  it('leaves public and marketing paths open', () => {
    expect(isAuthGatedPathWithoutClerk('/')).toBe(false)
    expect(isAuthGatedPathWithoutClerk('/sign-in')).toBe(false)
    expect(isAuthGatedPathWithoutClerk('/interviews/abc')).toBe(false)
    expect(isAuthGatedPathWithoutClerk('/i/token')).toBe(false)
    expect(isAuthGatedPathWithoutClerk('/for/tutors')).toBe(false)
    expect(isAuthGatedPathWithoutClerk('/api/health')).toBe(false)
  })
})
