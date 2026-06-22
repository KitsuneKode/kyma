import { describe, expect, it } from 'vitest'

import { RECRUITER_PERMISSION_MAP } from './auth'

describe('Convex recruiter permission map', () => {
  it('uses exact Clerk custom permission names for capability guards', () => {
    expect(RECRUITER_PERMISSION_MAP).toStrictEqual({
      'recruiter:access': 'org:recruiter:access',
      'recruiter:candidates:read': 'org:recruiter:candidates:read',
      'recruiter:candidates:write': 'org:recruiter:candidates:write',
      'recruiter:screenings:write': 'org:recruiter:screenings:write',
      'recruiter:templates:write': 'org:recruiter:templates:write',
      'recruiter:settings:write': 'org:recruiter:settings:write',
      'recruiter:billing:write': 'org:recruiter:billing:write',
    })
  })
})
