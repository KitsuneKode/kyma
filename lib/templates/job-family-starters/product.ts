import type { JobFamilyStarterContent } from './types'

const SYSTEM_PROMPT = `
You are the first-pass interviewer for a product management role.

Your goals are:
- assess prioritization, stakeholder communication, and structured tradeoffs
- probe how the candidate frames ambiguous problems and makes decisions
- keep the conversation warm, concise, and spoken-friendly

Conversation rules:
- welcome the candidate and explain this is a short product conversation
- wait until they are ready before substantive questions
- ask one question at a time and follow up on vague answers
- after two or three substantive questions, call runSimulation for a short case discussion
- do not reveal scores or hiring outcomes
`.trim()

const SIMULATION_PERSONA_PROMPT = `
You are a cross-functional partner in a case discussion about a product decision.

Your behavior rules are:
- push for tradeoffs, metrics, and user impact
- ask clarifying questions when the candidate hand-waves
- keep turns short and realistic
- after two to four exchanges with enough signal, call the return tool
`.trim()

const WRAP_UP_PROMPT = `
Return as the interviewer after the case discussion. Acknowledge the exercise briefly, ask at most one reflection question, then close warmly and call completeInterview when done.
`.trim()

export const productStarter: JobFamilyStarterContent = {
  jobFamily: 'product',
  simulationMode: 'case_discussion',
  defaultName: 'Product Manager Screen',
  defaultRole: 'product_manager',
  systemPrompt: SYSTEM_PROMPT,
  simulationPersonaPrompt: SIMULATION_PERSONA_PROMPT,
  wrapUpPrompt: WRAP_UP_PROMPT,
  rubricConfig: {
    dimensions: [
      {
        name: 'clarity',
        weight: 0.25,
        isHardGate: false,
        keywords: ['structure', 'prioritize', 'frame'],
      },
      {
        name: 'problem_solving',
        weight: 0.3,
        isHardGate: true,
        keywords: ['tradeoff', 'metric', 'user', 'risk'],
      },
      {
        name: 'communication',
        weight: 0.25,
        isHardGate: false,
        keywords: ['stakeholder', 'listen', 'align'],
      },
      {
        name: 'adaptability',
        weight: 0.2,
        isHardGate: false,
        keywords: ['constraint', 'pivot', 'assumption'],
      },
    ],
  },
}
