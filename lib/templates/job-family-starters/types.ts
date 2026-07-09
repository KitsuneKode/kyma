export type TemplateRubricDimension = {
  name: string
  weight: number
  isHardGate: boolean
  keywords?: string[]
}

export type TemplateRubricConfig = {
  dimensions: TemplateRubricDimension[]
}

export {
  JOB_FAMILIES,
  JOB_FAMILY_LABELS,
  SIMULATION_MODES,
  type JobFamily,
  type SimulationMode,
} from '@/lib/domain/job-families'

import type { JobFamily, SimulationMode } from '@/lib/domain/job-families'

export type JobFamilyStarterContent = {
  jobFamily: JobFamily
  simulationMode: SimulationMode
  defaultName: string
  defaultRole: string
  systemPrompt: string
  simulationPersonaPrompt?: string
  /** Spoken once when the simulation persona enters; use {candidateName} placeholder. */
  simulationIntroLine?: string
  wrapUpPrompt: string
  rubricConfig: TemplateRubricConfig
}
