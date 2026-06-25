export type TemplateRubricDimension = {
  name: string
  weight: number
  isHardGate: boolean
  keywords?: string[]
}

export type TemplateRubricConfig = {
  dimensions: TemplateRubricDimension[]
}

export const JOB_FAMILIES = [
  'tutor',
  'software_engineering',
  'product',
  'sales',
  'customer_support',
  'general',
  'custom',
] as const

export type JobFamily = (typeof JOB_FAMILIES)[number]

export const SIMULATION_MODES = [
  'teaching',
  'roleplay',
  'case_discussion',
  'none',
] as const

export type SimulationMode = (typeof SIMULATION_MODES)[number]

export type JobFamilyStarterContent = {
  jobFamily: JobFamily
  simulationMode: SimulationMode
  defaultName: string
  defaultRole: string
  systemPrompt: string
  simulationPersonaPrompt?: string
  wrapUpPrompt: string
  rubricConfig: TemplateRubricConfig
}

export const JOB_FAMILY_LABELS: Record<JobFamily, string> = {
  tutor: 'Tutor',
  software_engineering: 'Software Engineering',
  product: 'Product',
  sales: 'Sales',
  customer_support: 'Customer Support',
  general: 'General',
  custom: 'Custom',
}
