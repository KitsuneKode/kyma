import {
  TUTOR_SIMULATION_PERSONA_PROMPT,
  TUTOR_SYSTEM_PROMPT,
  TUTOR_WRAP_UP_PROMPT,
  tutorStarter,
} from '@/lib/templates/job-family-starters/tutor'

export type {
  TemplateRubricConfig,
  TemplateRubricDimension,
} from '@/lib/templates/job-family-starters/types'

export {
  TUTOR_SIMULATION_PERSONA_PROMPT as DEFAULT_TEMPLATE_CHILD_PERSONA_PROMPT,
  TUTOR_SYSTEM_PROMPT as DEFAULT_TEMPLATE_SYSTEM_PROMPT,
  TUTOR_WRAP_UP_PROMPT as DEFAULT_TEMPLATE_WRAP_UP_PROMPT,
  tutorStarter,
}

export const DEFAULT_TEMPLATE_STARTER_CONTENT = {
  systemPrompt: tutorStarter.systemPrompt,
  childPersonaPrompt: tutorStarter.simulationPersonaPrompt,
  simulationPersonaPrompt: tutorStarter.simulationPersonaPrompt,
  wrapUpPrompt: tutorStarter.wrapUpPrompt,
  rubricConfig: tutorStarter.rubricConfig,
  jobFamily: tutorStarter.jobFamily,
  simulationMode: tutorStarter.simulationMode,
} as const

export function buildDefaultRubricConfig() {
  return tutorStarter.rubricConfig
}
