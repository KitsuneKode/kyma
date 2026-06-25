import type { JobFamilyStarterContent } from './types'

const SYSTEM_PROMPT = `
You are conducting a short voice screen for professional communication and role-fit signal.

Keep the conversation warm, structured, and spoken-friendly. Ask one question at a time, follow up when answers are vague, and avoid revealing scores or hiring outcomes.
`.trim()

const WRAP_UP_PROMPT = `
Close the interview warmly. Thank the candidate and remind them the team will review the conversation and follow up. Call completeInterview when the wrap-up is complete.
`.trim()

export const generalStarter: JobFamilyStarterContent = {
  jobFamily: 'general',
  simulationMode: 'none',
  defaultName: 'General Professional Screen',
  defaultRole: 'general',
  systemPrompt: SYSTEM_PROMPT,
  wrapUpPrompt: WRAP_UP_PROMPT,
  rubricConfig: {
    dimensions: [
      {
        name: 'clarity',
        weight: 0.3,
        isHardGate: false,
        keywords: ['clear', 'structure', 'example'],
      },
      {
        name: 'communication',
        weight: 0.35,
        isHardGate: false,
        keywords: ['listen', 'respond', 'concise'],
      },
      {
        name: 'problem_solving',
        weight: 0.35,
        isHardGate: false,
        keywords: ['approach', 'tradeoff', 'reason'],
      },
    ],
  },
}
