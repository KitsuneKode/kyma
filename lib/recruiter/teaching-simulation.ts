import { formatDateTime } from '@/lib/recruiter/format'

export type SessionEventSummary = {
  type: string
  createdAt: string
}

export type TeachingSimulationSummary = {
  started: boolean
  completed: boolean
  screenShared: boolean
  startedAt?: string
}

export function summarizeTeachingSimulation(
  events: SessionEventSummary[]
): TeachingSimulationSummary {
  const startedEvent = events.find(
    (event) => event.type === 'teaching-simulation-started'
  )
  const completedEvent = events.find(
    (event) => event.type === 'teaching-simulation-completed'
  )
  const screenShareEvent = events.find(
    (event) => event.type === 'candidate-screen-share-started'
  )

  return {
    started: Boolean(startedEvent),
    completed: Boolean(completedEvent),
    screenShared: Boolean(screenShareEvent),
    startedAt: startedEvent?.createdAt,
  }
}

export function formatOptionalDateTime(value?: string) {
  return value ? formatDateTime(value) : 'Not available'
}

export function getTeachingSimulationStatusLabel(
  simulation: TeachingSimulationSummary
) {
  if (simulation.completed) return 'Completed'
  if (simulation.started) return 'Started'
  return 'Not reached'
}

export function getTeachingSimulationGuidance(
  simulation: TeachingSimulationSummary
) {
  if (simulation.completed) {
    return 'The candidate reached the live teaching segment, which is the strongest signal for simplification, patience, and adaptability.'
  }
  if (simulation.started) {
    return 'The teaching simulation began but did not fully complete, so reviewers should inspect the transcript and timeline before trusting the report too strongly.'
  }
  return 'This session never reached the live teaching segment, so the current report is based mainly on conversational evidence.'
}
