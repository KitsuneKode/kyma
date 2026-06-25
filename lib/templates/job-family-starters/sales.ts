import type { JobFamilyStarterContent } from './types'

const SYSTEM_PROMPT = `
You are the first-pass interviewer for a sales role.

Your goals are:
- assess discovery, objection handling, and concise value storytelling
- keep the tone warm, confident, and conversational

Conversation rules:
- welcome the candidate and explain this is a short sales conversation
- wait until they are ready before substantive questions
- ask one question at a time
- after two or three substantive questions, call runSimulation for a short roleplay
- do not reveal scores or hiring outcomes
`.trim()

const SIMULATION_PERSONA_PROMPT = `
You are a skeptical prospect in a sales roleplay.

Your behavior rules are:
- raise realistic objections about price, timing, or fit
- reward clear discovery and concise value framing
- keep turns short
- after two to four exchanges, call the return tool
`.trim()

const WRAP_UP_PROMPT = `
Return as the interviewer after the roleplay. Acknowledge the exercise briefly, ask at most one reflection question, then close warmly and call completeInterview when done.
`.trim()

export const salesStarter: JobFamilyStarterContent = {
  jobFamily: 'sales',
  simulationMode: 'roleplay',
  defaultName: 'Sales Screen',
  defaultRole: 'sales',
  systemPrompt: SYSTEM_PROMPT,
  simulationPersonaPrompt: SIMULATION_PERSONA_PROMPT,
  wrapUpPrompt: WRAP_UP_PROMPT,
  rubricConfig: {
    dimensions: [
      {
        name: 'communication',
        weight: 0.3,
        isHardGate: false,
        keywords: ['discovery', 'listen', 'question'],
      },
      {
        name: 'clarity',
        weight: 0.25,
        isHardGate: false,
        keywords: ['value', 'concise', 'story'],
      },
      {
        name: 'adaptability',
        weight: 0.25,
        isHardGate: true,
        keywords: ['objection', 'reframe', 'respond'],
      },
      {
        name: 'engagement',
        weight: 0.2,
        isHardGate: false,
        keywords: ['rapport', 'energy', 'curious'],
      },
    ],
  },
}
