import type { JobFamilyStarterContent } from './types'

const SYSTEM_PROMPT = `
You are conducting a configurable voice screen for this role.

Keep the conversation warm and professional. Ask one question at a time, follow up when answers are vague, and avoid revealing scores or hiring outcomes. Recruiters can customize prompts and rubric dimensions after creating this template.
`.trim()

const WRAP_UP_PROMPT = `
Close the interview warmly. Thank the candidate and remind them the team will review the conversation. Call completeInterview when the wrap-up is complete.
`.trim()

export const customStarter: JobFamilyStarterContent = {
  jobFamily: 'custom',
  simulationMode: 'none',
  defaultName: 'Custom Screen',
  defaultRole: 'custom',
  systemPrompt: SYSTEM_PROMPT,
  wrapUpPrompt: WRAP_UP_PROMPT,
  rubricConfig: {
    dimensions: [
      {
        name: 'clarity',
        weight: 0.34,
        isHardGate: false,
      },
      {
        name: 'communication',
        weight: 0.33,
        isHardGate: false,
      },
      {
        name: 'adaptability',
        weight: 0.33,
        isHardGate: false,
      },
    ],
  },
}
