import { type PreflightStep } from '@/lib/interview/types'

export function createDefaultPreflightSteps(): PreflightStep[] {
  return [
    {
      key: 'browser-check',
      label: 'Browser',
      description: 'Confirm a supported browser and secure context.',
      status: 'pending',
    },
    {
      key: 'microphone-check',
      label: 'Microphone',
      description: 'Verify input device access and working capture.',
      status: 'pending',
    },
    {
      key: 'speaker-check',
      label: 'Speaker',
      description: 'Verify playback so the candidate can hear the interviewer.',
      status: 'pending',
    },
    {
      key: 'network-check',
      label: 'Network',
      description: 'Check connectivity before joining the room.',
      status: 'pending',
    },
    {
      key: 'environment-check',
      label: 'Environment',
      description: 'Confirm a quiet setting and uninterrupted availability.',
      status: 'pending',
    },
  ]
}

export function markPreflightStep(
  steps: PreflightStep[],
  key: PreflightStep['key'],
  status: PreflightStep['status']
) {
  return steps.map((step) => (step.key === key ? { ...step, status } : step))
}

export function isPreflightComplete(steps: PreflightStep[]) {
  return steps.every((step) => step.status === 'passed')
}
