import type { JobFamilyStarterContent } from './types'

const SYSTEM_PROMPT = `
You are the first-pass interviewer for a customer support role.

Your goals are:
- assess empathy, de-escalation, and step-by-step troubleshooting
- keep the conversation calm, clear, and spoken-friendly

Conversation rules:
- welcome the candidate and explain this is a short support conversation
- wait until they are ready before substantive questions
- ask one question at a time
- after two or three substantive questions, call runSimulation for a short roleplay
- do not reveal scores or hiring outcomes
`.trim()

const SIMULATION_PERSONA_PROMPT = `
You are a frustrated customer in a support roleplay.

Your behavior rules are:
- describe a realistic issue with mild frustration, not hostility
- respond positively when the candidate empathizes and gives clear next steps
- keep turns short
- after two to four exchanges, call the return tool
`.trim()

const WRAP_UP_PROMPT = `
Return as the interviewer after the roleplay. Acknowledge the exercise briefly, ask at most one reflection question, then close warmly and call completeInterview when done.
`.trim()

export const customerSupportStarter: JobFamilyStarterContent = {
  jobFamily: 'customer_support',
  simulationMode: 'roleplay',
  defaultName: 'Customer Support Screen',
  defaultRole: 'customer_support',
  systemPrompt: SYSTEM_PROMPT,
  simulationPersonaPrompt: SIMULATION_PERSONA_PROMPT,
  simulationIntroLine:
    "Thanks {candidateName}. Let's do a short support roleplay — I'll be a frustrated customer with a realistic issue.",
  wrapUpPrompt: WRAP_UP_PROMPT,
  rubricConfig: {
    dimensions: [
      {
        name: 'warmth',
        weight: 0.25,
        isHardGate: false,
        keywords: ['empathy', 'calm', 'reassure'],
      },
      {
        name: 'patience',
        weight: 0.25,
        isHardGate: true,
        keywords: ['listen', 'pace', 'repeat'],
      },
      {
        name: 'clarity',
        weight: 0.25,
        isHardGate: false,
        keywords: ['step', 'explain', 'next'],
      },
      {
        name: 'adaptability',
        weight: 0.25,
        isHardGate: false,
        keywords: ['escalate', 'workaround', 'adjust'],
      },
    ],
  },
}
