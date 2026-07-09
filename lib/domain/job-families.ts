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

export const JOB_FAMILY_LABELS: Record<JobFamily, string> = {
  tutor: 'Tutor',
  software_engineering: 'Software Engineering',
  product: 'Product',
  sales: 'Sales',
  customer_support: 'Customer Support',
  general: 'General',
  custom: 'Custom',
}

export const SIMULATION_MODES = [
  'teaching',
  'roleplay',
  'case_discussion',
  'none',
] as const

export type SimulationMode = (typeof SIMULATION_MODES)[number]

/** Practice packs exclude `custom` — matches PRACTICE_PACKS job families. */
export const PRACTICE_JOB_FAMILIES = [
  'software_engineering',
  'product',
  'customer_support',
  'sales',
  'tutor',
  'general',
] as const

export type PracticeJobFamily = (typeof PRACTICE_JOB_FAMILIES)[number]

export const PRACTICE_JOB_FAMILY_SET: ReadonlySet<string> = new Set(
  PRACTICE_JOB_FAMILIES
)

export function isPracticeJobFamily(value: string): value is PracticeJobFamily {
  return PRACTICE_JOB_FAMILY_SET.has(value)
}
