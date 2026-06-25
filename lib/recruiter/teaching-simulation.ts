import { formatDateTime } from '@/lib/recruiter/format'

export type SessionEventSummary = {
  type: string
  createdAt: string
}

export type SimulationSummary = {
  started: boolean
  completed: boolean
  screenShared: boolean
  startedAt?: string
}

/** @deprecated Use SimulationSummary */
export type TeachingSimulationSummary = SimulationSummary

const SIMULATION_STARTED_EVENTS = new Set([
  'simulation-started',
  'teaching-simulation-started',
])

const SIMULATION_COMPLETED_EVENTS = new Set([
  'simulation-completed',
  'teaching-simulation-completed',
])

export function summarizeSimulation(
  events: SessionEventSummary[]
): SimulationSummary {
  const startedEvent = events.find((event) =>
    SIMULATION_STARTED_EVENTS.has(event.type)
  )
  const completedEvent = events.find((event) =>
    SIMULATION_COMPLETED_EVENTS.has(event.type)
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

/** @deprecated Use summarizeSimulation */
export const summarizeTeachingSimulation = summarizeSimulation

export function formatOptionalDateTime(value?: string) {
  return value ? formatDateTime(value) : 'Not available'
}

export function getSimulationStatusLabel(simulation: SimulationSummary) {
  if (simulation.completed) return 'Completed'
  if (simulation.started) return 'Started'
  return 'Not reached'
}

/** @deprecated Use getSimulationStatusLabel */
export const getTeachingSimulationStatusLabel = getSimulationStatusLabel

export function getSimulationGuidance(simulation: SimulationSummary) {
  if (simulation.completed) {
    return 'The candidate reached the live simulation segment, which is the strongest signal for role-relevant communication and adaptability.'
  }
  if (simulation.started) {
    return 'The simulation began but did not fully complete, so reviewers should inspect the transcript and timeline before trusting the report too strongly.'
  }
  return 'This session never reached the live simulation segment, so the current report is based mainly on conversational evidence.'
}

/** @deprecated Use getSimulationGuidance */
export const getTeachingSimulationGuidance = getSimulationGuidance
