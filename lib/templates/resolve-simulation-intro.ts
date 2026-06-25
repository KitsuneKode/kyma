import { getJobFamilyStarter } from '@/lib/templates/job-family-starters'
import {
  JOB_FAMILIES,
  type JobFamily,
  type SimulationMode,
} from '@/lib/templates/job-family-starters/types'

const CANDIDATE_NAME_PLACEHOLDER = '{candidateName}'

type ActiveSimulationMode = Exclude<SimulationMode, 'none'>

function isJobFamily(value: string): value is JobFamily {
  return (JOB_FAMILIES as readonly string[]).includes(value)
}

function applyCandidateName(template: string, candidateName: string) {
  return template.replaceAll(CANDIDATE_NAME_PLACEHOLDER, candidateName)
}

const MODE_FALLBACK_INTRO: Record<
  ActiveSimulationMode,
  (candidateName: string) => string
> = {
  teaching: (candidateName) =>
    `Okay ${candidateName}, let's do a short teaching simulation. I'll play the learner — keep it concrete and check that I follow. Start when you're ready.`,
  roleplay: (candidateName) =>
    `Thanks ${candidateName}. Let's try a short roleplay so I can see how you handle it in the moment.`,
  case_discussion: (candidateName) =>
    `Thanks ${candidateName}. Let's walk through a short case discussion so I can see how you think through the tradeoffs.`,
}

export function resolveSimulationIntroLine(args: {
  jobFamily?: string | null
  simulationMode: ActiveSimulationMode
  candidateName: string
}) {
  const { jobFamily, simulationMode, candidateName } = args

  if (jobFamily && isJobFamily(jobFamily)) {
    const starterIntro = getJobFamilyStarter(jobFamily).simulationIntroLine
    if (starterIntro?.trim()) {
      return applyCandidateName(starterIntro.trim(), candidateName)
    }
  }

  return MODE_FALLBACK_INTRO[simulationMode](candidateName)
}
