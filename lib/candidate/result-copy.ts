export type CandidateProcessingStep = {
  id: string
  label: string
  description: string
  status: 'complete' | 'active' | 'pending'
}

const PROCESSING_STEPS = [
  {
    id: 'submitted',
    label: 'Interview submitted',
    description: 'Your session recording and transcript were saved.',
  },
  {
    id: 'assessing',
    label: 'Assessment in progress',
    description: 'Kyma is reviewing your responses against the role rubric.',
  },
  {
    id: 'review',
    label: 'Recruiter review',
    description: 'A recruiter may verify the assessment before release.',
  },
  {
    id: 'released',
    label: 'Results released',
    description: 'Your outcome becomes visible on this page.',
  },
] as const

export function buildCandidateProcessingSteps(input: {
  resultState: 'processing' | 'under_review' | 'released' | 'unavailable'
  reportStatus?: string | null
}): CandidateProcessingStep[] {
  const { resultState, reportStatus } = input

  if (resultState === 'released') {
    return PROCESSING_STEPS.map((step) => ({
      ...step,
      status: 'complete' as const,
    }))
  }

  if (resultState === 'under_review') {
    return PROCESSING_STEPS.map((step) => {
      if (step.id === 'released') {
        return { ...step, status: 'pending' as const }
      }
      if (step.id === 'review') {
        return { ...step, status: 'active' as const }
      }
      return { ...step, status: 'complete' as const }
    })
  }

  if (resultState === 'processing') {
    const assessingActive =
      reportStatus === 'processing' || reportStatus === 'pending'
    return PROCESSING_STEPS.map((step) => {
      if (step.id === 'submitted') {
        return { ...step, status: 'complete' as const }
      }
      if (step.id === 'assessing') {
        return {
          ...step,
          status: assessingActive ? ('active' as const) : ('pending' as const),
        }
      }
      return { ...step, status: 'pending' as const }
    })
  }

  return PROCESSING_STEPS.map((step) => ({
    ...step,
    status: 'pending' as const,
  }))
}

const CANDIDATE_EVENT_LABELS: Record<string, string> = {
  'invite-opened': 'Invite opened',
  'preflight-started': 'Setup checks started',
  'preflight-completed': 'Setup checks completed',
  'participant-connecting': 'Connecting to interview room',
  'participant-joined': 'Joined interview room',
  'participant-left': 'Left interview room',
  'processing-started': 'Processing started',
  'processing-completed': 'Processing completed',
  'teaching-simulation-started': 'Teaching simulation started',
  'teaching-simulation-completed': 'Teaching simulation completed',
  'session-failed': 'Session ended with an error',
}

export function formatCandidateTimelineLabel(type: string) {
  return CANDIDATE_EVENT_LABELS[type] ?? type.replaceAll('-', ' ')
}

export function formatCandidateScoreBand(score: number) {
  if (score >= 4) return 'Strong'
  if (score >= 3) return 'Solid'
  if (score >= 2) return 'Developing'
  return 'Needs focus'
}
