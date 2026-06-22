export const SESSION_PURPOSES = ['screening', 'demo', 'mock'] as const

export type SessionPurpose = (typeof SESSION_PURPOSES)[number]

export const SYSTEM_ORG_ID = 'org_system'

export const MOCK_INTERVIEW_DURATION_MINUTES = 12

export type SessionBudget = {
  maxDurationMinutes: number
  maxCandidateTurns: number
  maxAgentTurns: number
}

export const SESSION_BUDGETS: Record<SessionPurpose, SessionBudget> = {
  screening: {
    maxDurationMinutes: 18,
    maxCandidateTurns: 50,
    maxAgentTurns: 60,
  },
  demo: {
    maxDurationMinutes: MOCK_INTERVIEW_DURATION_MINUTES,
    maxCandidateTurns: 20,
    maxAgentTurns: 30,
  },
  mock: {
    maxDurationMinutes: MOCK_INTERVIEW_DURATION_MINUTES,
    maxCandidateTurns: 20,
    maxAgentTurns: 30,
  },
}

export function resolveSessionPurpose(
  purpose?: SessionPurpose | null
): SessionPurpose {
  if (purpose === 'demo' || purpose === 'mock') {
    return purpose
  }
  return 'screening'
}

export function resolveSessionBudget(
  purpose?: SessionPurpose | null
): SessionBudget {
  return SESSION_BUDGETS[resolveSessionPurpose(purpose)]
}

export function maxActiveDurationMs(purpose?: SessionPurpose | null) {
  return resolveSessionBudget(purpose).maxDurationMinutes * 60_000
}
