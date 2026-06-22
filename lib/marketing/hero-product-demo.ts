import { RUBRIC_DIMENSIONS } from '@/lib/rubric/constants'

export type DemoDimension = (typeof RUBRIC_DIMENSIONS)[number]

export type DemoFocus =
  | 'playback'
  | 'transcript'
  | 'simulation'
  | 'rubric'
  | 'evidence'
  | 'recommendation'
  | 'queue'

export type DemoCandidateId = 'aarav' | 'sara' | 'daniel' | 'mei'

export type DemoTranscriptSegment = {
  id: string
  speaker: 'Kyma' | string
  agent?: boolean
  text: string
  timeSec: number
  cited?: boolean
  simulation?: boolean
  evidenceDimension?: DemoDimension
}

export type DemoCandidate = {
  id: DemoCandidateId
  name: string
  role: string
  state: 'review' | 'yes' | 'flag'
  recommendation: string
  overall: number
  confidence: string
  sessionLabel: string
  transcript: DemoTranscriptSegment[]
  dimensionScores: Record<DemoDimension, number>
  evidenceSnippet: string
  evidenceRationale: string
  evidenceTimeSec: number
  primaryEvidenceDimension: DemoDimension
}

export const DEMO_TOTAL_DURATION_SEC = 1024

export const DEMO_CANDIDATES: Record<DemoCandidateId, DemoCandidate> = {
  aarav: {
    id: 'aarav',
    name: 'Aarav Mehta',
    role: 'Math · Grades 6–8',
    state: 'review',
    recommendation: 'Lean yes',
    overall: 4.2,
    confidence: 'High confidence',
    sessionLabel: '17 min · 12 candidate turns · report ready',
    primaryEvidenceDimension: 'simplification',
    evidenceTimeSec: 372,
    evidenceSnippet:
      'Think of the fraction like a pizza cut into four slices—if you eat one, three are left, so that’s three quarters.',
    evidenceRationale:
      'Strong simplification — concrete metaphor before notation.',
    dimensionScores: {
      clarity: 4.6,
      simplification: 4.4,
      patience: 4.5,
      warmth: 4.1,
      listening: 3.8,
      fluency: 4.3,
      adaptability: 3.6,
      engagement: 4.0,
      accuracy: 4.4,
    },
    transcript: [
      {
        id: 't1',
        speaker: 'Kyma',
        agent: true,
        text: 'How would you introduce fractions to a student who has never seen them before?',
        timeSec: 42,
      },
      {
        id: 't2',
        speaker: 'Aarav',
        text: 'I’d start with something they already share—splitting a chocolate bar makes “parts of a whole” concrete before any notation.',
        timeSec: 98,
      },
      {
        id: 't3',
        speaker: 'Kyma',
        agent: true,
        text: 'Walk me through how you’d respond if the student still looked unsure after that example.',
        timeSec: 164,
      },
      {
        id: 't4',
        speaker: 'Aarav',
        text: 'I’d draw four equal slices, shade one, and ask them to name what they see before introducing numerals.',
        timeSec: 231,
      },
      {
        id: 't5',
        speaker: 'Student persona',
        simulation: true,
        text: 'But why is 3/4 bigger than 2/4? The bottom number is the same…',
        timeSec: 318,
      },
      {
        id: 't6',
        speaker: 'Aarav',
        text: 'Think of the fraction like a pizza cut into four slices—if you eat one, three are left, so that’s three quarters.',
        timeSec: 372,
        cited: true,
        evidenceDimension: 'simplification',
      },
    ],
  },
  daniel: {
    id: 'daniel',
    name: 'Daniel Cruz',
    role: 'English · Grades 4–6',
    state: 'flag',
    recommendation: 'Needs review',
    overall: 3.1,
    confidence: 'Medium confidence',
    sessionLabel: '14 min · 9 candidate turns · hard gate flagged',
    primaryEvidenceDimension: 'patience',
    evidenceTimeSec: 284,
    evidenceSnippet:
      'You already learned this — just read the paragraph again and answer the question.',
    evidenceRationale:
      'Dismissive response to confusion — patience hard gate triggered.',
    dimensionScores: {
      clarity: 3.4,
      simplification: 3.0,
      patience: 2.4,
      warmth: 2.8,
      listening: 3.2,
      fluency: 3.6,
      adaptability: 2.9,
      engagement: 3.1,
      accuracy: 3.5,
    },
    transcript: [
      {
        id: 'd1',
        speaker: 'Kyma',
        agent: true,
        text: 'How would you help a reluctant reader summarize a short story?',
        timeSec: 38,
      },
      {
        id: 'd2',
        speaker: 'Daniel',
        text: 'I would ask them to identify the beginning, middle, and end, then retell in their own words.',
        timeSec: 92,
      },
      {
        id: 'd3',
        speaker: 'Student persona',
        simulation: true,
        text: 'I don’t get what the main idea is. Can you just tell me?',
        timeSec: 210,
      },
      {
        id: 'd4',
        speaker: 'Daniel',
        text: 'You already learned this — just read the paragraph again and answer the question.',
        timeSec: 284,
        cited: true,
        evidenceDimension: 'patience',
      },
    ],
  },
  sara: {
    id: 'sara',
    name: 'Sara Khan',
    role: 'Science · Grades 9–10',
    state: 'yes',
    recommendation: 'Yes',
    overall: 4.5,
    confidence: 'High confidence',
    sessionLabel: '16 min · 11 candidate turns · report ready',
    primaryEvidenceDimension: 'clarity',
    evidenceTimeSec: 340,
    evidenceSnippet:
      'Photosynthesis is the plant’s way of turning sunlight into stored energy — like charging a battery.',
    evidenceRationale: 'Clear analogy with accurate scientific framing.',
    dimensionScores: {
      clarity: 4.7,
      simplification: 4.5,
      patience: 4.4,
      warmth: 4.2,
      listening: 4.1,
      fluency: 4.5,
      adaptability: 4.3,
      engagement: 4.4,
      accuracy: 4.6,
    },
    transcript: [
      {
        id: 's1',
        speaker: 'Kyma',
        agent: true,
        text: 'Explain photosynthesis to a student who only knows that plants need sunlight.',
        timeSec: 45,
      },
      {
        id: 's2',
        speaker: 'Sara',
        text: 'Photosynthesis is the plant’s way of turning sunlight into stored energy — like charging a battery.',
        timeSec: 340,
        cited: true,
        evidenceDimension: 'clarity',
      },
    ],
  },
  mei: {
    id: 'mei',
    name: 'Mei Lin',
    role: 'Math · Grades 9–10',
    state: 'yes',
    recommendation: 'Yes',
    overall: 4.3,
    confidence: 'High confidence',
    sessionLabel: '18 min · 13 candidate turns · report ready',
    primaryEvidenceDimension: 'adaptability',
    evidenceTimeSec: 410,
    evidenceSnippet:
      'Let’s switch to a number line — it helps when the algebra feels abstract.',
    evidenceRationale:
      'Recovered after initial confusion with a different representation.',
    dimensionScores: {
      clarity: 4.3,
      simplification: 4.2,
      patience: 4.4,
      warmth: 4.0,
      listening: 4.2,
      fluency: 4.1,
      adaptability: 4.5,
      engagement: 4.2,
      accuracy: 4.4,
    },
    transcript: [
      {
        id: 'm1',
        speaker: 'Kyma',
        agent: true,
        text: 'The student is stuck solving linear equations. What do you try next?',
        timeSec: 52,
      },
      {
        id: 'm2',
        speaker: 'Mei',
        text: 'Let’s switch to a number line — it helps when the algebra feels abstract.',
        timeSec: 410,
        cited: true,
        evidenceDimension: 'adaptability',
      },
    ],
  },
}

export const DEMO_QUEUE: DemoCandidateId[] = ['aarav', 'sara', 'daniel', 'mei']

export function progressFromTimeSec(timeSec: number) {
  return Math.min(100, (timeSec / DEMO_TOTAL_DURATION_SEC) * 100)
}

export function formatDemoTimestamp(totalSec: number) {
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** Eased progress animation between two time positions. */
export async function animateProgress(
  fromSec: number,
  toSec: number,
  onProgress: (timeSec: number) => void,
  options?: { durationMs?: number; shouldCancel?: () => boolean }
) {
  const durationMs = options?.durationMs ?? 1400
  const start = performance.now()

  return new Promise<void>((resolve) => {
    const tick = (now: number) => {
      if (options?.shouldCancel?.()) {
        resolve()
        return
      }

      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      const current = fromSec + (toSec - fromSec) * eased
      onProgress(current)

      if (t >= 1) {
        resolve()
        return
      }

      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })
}

export type DemoController = {
  pauseForUser: (ms?: number) => void
  isPaused: () => boolean
}

export type DemoStepContext = DemoController & {
  setCandidate: (id: DemoCandidateId) => void
  setSegment: (id: string) => void
  setDimension: (dimension: DemoDimension) => void
  setProgressSec: (timeSec: number) => void
  setPlaying: (playing: boolean) => void
  setEvidenceVisible: (visible: boolean) => void
  setRubricTab: (tab: 'rubric' | 'evidence' | 'notes') => void
  setFocus: (focus: DemoFocus | null) => void
  setCaption: (caption: string | null) => void
}

export async function runAaravReviewDemo(ctx: DemoStepContext) {
  const cancel = () => ctx.isPaused()
  const candidate = DEMO_CANDIDATES.aarav

  ctx.setCandidate('aarav')
  ctx.setPlaying(false)
  ctx.setEvidenceVisible(false)
  ctx.setRubricTab('rubric')
  ctx.setProgressSec(0)
  ctx.setSegment(candidate.transcript[0].id)
  ctx.setDimension('clarity')

  await sleep(900)
  if (cancel()) return

  ctx.setCaption('Replay the live interview recording')
  ctx.setFocus('playback')
  ctx.setPlaying(true)
  await animateProgress(0, 98, ctx.setProgressSec, {
    durationMs: 2200,
    shouldCancel: cancel,
  })
  ctx.setSegment('t2')
  if (cancel()) return

  await sleep(500)
  ctx.setCaption('AI runs a teaching simulation mid-interview')
  ctx.setFocus('simulation')
  ctx.setPlaying(false)
  await animateProgress(98, 318, ctx.setProgressSec, {
    durationMs: 1800,
    shouldCancel: cancel,
  })
  ctx.setSegment('t5')
  if (cancel()) return

  await sleep(700)
  ctx.setCaption('Candidate responds to student confusion')
  ctx.setFocus('transcript')
  await animateProgress(318, 372, ctx.setProgressSec, {
    durationMs: 1200,
    shouldCancel: cancel,
  })
  ctx.setSegment('t6')
  if (cancel()) return

  await sleep(500)
  ctx.setCaption('Evidence links rubric scores to transcript moments')
  ctx.setFocus('rubric')
  ctx.setRubricTab('evidence')
  ctx.setDimension('simplification')
  ctx.setEvidenceVisible(true)
  ctx.setPlaying(false)
  if (cancel()) return

  await sleep(2200)
  ctx.setCaption('Scan dimensions — adaptability needs a closer look')
  ctx.setFocus('rubric')
  ctx.setEvidenceVisible(false)
  ctx.setRubricTab('rubric')
  ctx.setDimension('patience')
  await sleep(700)
  if (cancel()) return
  ctx.setDimension('adaptability')
  await sleep(1400)
  if (cancel()) return

  ctx.setCaption('Structured recommendation with confidence')
  ctx.setFocus('recommendation')
  ctx.setDimension('simplification')
  await sleep(1800)
  if (cancel()) return

  ctx.setCaption('Triaging candidates from the review queue')
  ctx.setFocus('queue')
  ctx.setEvidenceVisible(false)
  ctx.setCandidate('daniel')
  ctx.setSegment('d4')
  ctx.setDimension('patience')
  ctx.setProgressSec(284)
  ctx.setRubricTab('evidence')
  ctx.setEvidenceVisible(true)
  await sleep(2200)
  if (cancel()) return

  ctx.setCandidate('aarav')
  ctx.setSegment('t6')
  ctx.setDimension('simplification')
  ctx.setProgressSec(372)
  ctx.setEvidenceVisible(true)
  ctx.setRubricTab('evidence')
  await sleep(1200)
}
