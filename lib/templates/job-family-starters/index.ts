import { customStarter } from './custom'
import { customerSupportStarter } from './customer-support'
import { generalStarter } from './general'
import { productStarter } from './product'
import { salesStarter } from './sales'
import { softwareEngineeringStarter } from './software-engineering'
import { tutorStarter } from './tutor'
import type { JobFamily, JobFamilyStarterContent } from './types'

export * from './types'
export { tutorStarter } from './tutor'

const STARTERS: Record<JobFamily, JobFamilyStarterContent> = {
  tutor: tutorStarter,
  software_engineering: softwareEngineeringStarter,
  product: productStarter,
  sales: salesStarter,
  customer_support: customerSupportStarter,
  general: generalStarter,
  custom: customStarter,
}

export function getJobFamilyStarter(
  jobFamily: JobFamily
): JobFamilyStarterContent {
  return STARTERS[jobFamily]
}

export function listJobFamilyStarters(): JobFamilyStarterContent[] {
  return Object.values(STARTERS)
}
