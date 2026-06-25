export const PRACTICE_JOB_FAMILIES = [
  'software_engineering',
  'product',
  'customer_support',
  'sales',
  'tutor',
  'general',
] as const

export type PracticeJobFamily = (typeof PRACTICE_JOB_FAMILIES)[number]

export type PracticePack = {
  id: PracticeJobFamily
  title: string
  description: string
  durationMinutes: number
  readinessRecommended: boolean
}

export const PRACTICE_PACKS: PracticePack[] = [
  {
    id: 'software_engineering',
    title: 'Software engineering',
    description:
      'Practice a short technical voice screen with fundamentals and a teaching-style explanation exercise.',
    durationMinutes: 12,
    readinessRecommended: true,
  },
  {
    id: 'product',
    title: 'Product management',
    description:
      'Practice prioritization, stakeholder communication, and structured problem framing.',
    durationMinutes: 15,
    readinessRecommended: true,
  },
  {
    id: 'customer_support',
    title: 'Customer support',
    description:
      'Practice de-escalation, empathy, and clear troubleshooting communication.',
    durationMinutes: 12,
    readinessRecommended: true,
  },
  {
    id: 'sales',
    title: 'Sales',
    description:
      'Practice discovery questions, objection handling, and concise value storytelling.',
    durationMinutes: 12,
    readinessRecommended: true,
  },
  {
    id: 'tutor',
    title: 'Tutor / teaching',
    description:
      'Practice explaining concepts clearly with patience and learner-centered follow-ups.',
    durationMinutes: 15,
    readinessRecommended: true,
  },
  {
    id: 'general',
    title: 'General professional',
    description:
      'Practice a balanced voice screen focused on communication and role-fit conversation.',
    durationMinutes: 12,
    readinessRecommended: true,
  },
]

export function getPracticePack(id: string): PracticePack | undefined {
  return PRACTICE_PACKS.find((pack) => pack.id === id)
}

export const PRACTICE_SESSION_LIMIT = 3
export const PRACTICE_SESSION_WINDOW_MS = 1000 * 60 * 60 * 24
