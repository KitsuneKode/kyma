import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  hasLegacyBothPersona,
  personaFromSessionClaims,
  preferredWorkspaceFromSessionClaims,
} from '@/lib/auth/clerk-role'

const fixtures = JSON.parse(
  readFileSync(
    join(process.cwd(), '.docs/fixtures/auth-org-rbac-fixtures.json'),
    'utf8'
  )
) as {
  jwtClaimFixtures: Record<string, Record<string, unknown>>
}

describe('preferredWorkspaceFromSessionClaims', () => {
  it('reads candidate from jwt fixtures', () => {
    const claims = fixtures.jwtClaimFixtures.candidateOnly
    expect(preferredWorkspaceFromSessionClaims(claims)).toBe('candidate')
  })

  it('reads recruiter from jwt fixtures', () => {
    const claims = fixtures.jwtClaimFixtures.recruiterAllowed
    expect(preferredWorkspaceFromSessionClaims(claims)).toBe('recruiter')
  })

  it('returns null for legacy both persona', () => {
    const claims = fixtures.jwtClaimFixtures.orgAdmin
    expect(preferredWorkspaceFromSessionClaims(claims)).toBeNull()
    expect(hasLegacyBothPersona(claims)).toBe(true)
  })

  it('prefers preferredWorkspace over legacy persona', () => {
    expect(
      preferredWorkspaceFromSessionClaims({
        metadata: {
          preferredWorkspace: 'candidate',
          persona: 'recruiter',
        },
      })
    ).toBe('candidate')
  })
})

describe('personaFromSessionClaims (legacy)', () => {
  it('maps preferredWorkspace to persona-compatible values', () => {
    expect(
      personaFromSessionClaims({
        metadata: { preferredWorkspace: 'recruiter' },
      })
    ).toBe('recruiter')
  })
})
