export type PersonaFaq = {
  id: string
  question: string
  answer: string
}

export type PersonaPage = {
  slug: string
  eyebrow: string
  title: string
  headline: string
  description: string
  metaTitle: string
  metaDescription: string
  painPoints: Array<{
    title: string
    description: string
  }>
  outcomes: Array<{
    title: string
    description: string
  }>
  workflow: Array<{
    step: string
    title: string
    description: string
  }>
  faqs: PersonaFaq[]
  relatedSlugs: string[]
}

export const personaPages: PersonaPage[] = [
  {
    slug: 'education-teams',
    eyebrow: 'For education teams',
    title: 'Kyma for education teams',
    headline: 'Screen tutor hires on teaching proof, not phone screens',
    description:
      'Education programs need tutors who explain clearly, stay patient with learners, and adapt when a concept does not land. Kyma gives academic operations and recruiting teams a repeatable first-round screen with transcript-backed evidence for every candidate.',
    metaTitle: 'AI Tutor Screening for Education Teams',
    metaDescription:
      'Run structured voice interviews for tutor hiring. Kyma scores clarity, patience, and teaching ability with evidence your academic team can review.',
    painPoints: [
      {
        title: 'Inconsistent first-round signal',
        description:
          'Different recruiters ask different questions, so two strong tutors can look uneven before they ever reach a teaching demo.',
      },
      {
        title: 'Teaching skill is hard to verify early',
        description:
          'Resumes show credentials, not whether someone can simplify a concept live or recover when a learner gets stuck.',
      },
      {
        title: 'Review packets take too long to assemble',
        description:
          'Teams stitch together notes, recordings, and impressions manually before a hiring manager can make a call.',
      },
    ],
    outcomes: [
      {
        title: 'One rubric across every cohort',
        description:
          'Use reusable screening templates so each tutor is evaluated on the same teaching signals, whether you hire ten tutors or five hundred.',
      },
      {
        title: 'Evidence recruiters can audit',
        description:
          'Every score links to transcript quotes with timestamps, so academic leads can validate the recommendation before moving forward.',
      },
      {
        title: 'Faster queue triage',
        description:
          'Needs-attention candidates surface first, while clear passes and holds stay organized for your review workflow.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Launch a screening batch',
        description:
          'Create invite links with policy controls for expiry, retries, and organization access.',
      },
      {
        step: '02',
        title: 'Candidates complete a live interview',
        description:
          'Tutors join from any device, pass a readiness check, and complete a guided conversation plus teaching simulation.',
      },
      {
        step: '03',
        title: 'Review structured evidence',
        description:
          'Your team reads rubric scores, transcript citations, and recommendation rationale in one recruiter workspace.',
      },
    ],
    faqs: [
      {
        id: 'academic-alignment',
        question: 'Can we align the rubric to our teaching standards?',
        answer:
          'Yes. Screening templates let you define prompts and rubric versions per program, so evaluation criteria can match your instructional model.',
      },
      {
        id: 'candidate-load',
        question: 'Will this add friction for tutor applicants?',
        answer:
          'Candidates join from a single invite link with a short readiness check. Most sessions complete in about 15 to 20 minutes without scheduling back-and-forth.',
      },
      {
        id: 'human-decision',
        question: 'Does Kyma auto-reject tutors?',
        answer:
          'No. Kyma recommends and surfaces evidence, but hiring decisions stay with your team. Reviewers can override any outcome.',
      },
    ],
    relatedSlugs: ['tutor-recruiters', 'online-learning-companies'],
  },
  {
    slug: 'tutor-recruiters',
    eyebrow: 'For tutor recruiters',
    title: 'Kyma for tutor recruiters',
    headline: 'Scale tutor screening without losing review quality',
    description:
      'High-volume tutor hiring breaks when every recruiter runs a different screen. Kyma standardizes the first round with live voice interviews, structured rubrics, and evidence packets your team can trust at scale.',
    metaTitle: 'AI Tutor Screening for Recruiting Teams',
    metaDescription:
      'Standardize tutor first-round screens with live AI interviews, structured rubrics, and transcript-backed evidence for recruiting teams.',
    painPoints: [
      {
        title: 'Recruiter time disappears into repeat screens',
        description:
          'Your team spends hours on similar first calls that still produce uneven notes and uneven hiring decisions.',
      },
      {
        title: 'Hard to compare candidates fairly',
        description:
          'Without a shared rubric, it is difficult to rank tutors on teaching behavior instead of confidence or familiarity.',
      },
      {
        title: 'Handoffs to hiring managers are messy',
        description:
          'Managers receive partial context and have to re-watch calls or chase down notes before they can decide.',
      },
    ],
    outcomes: [
      {
        title: 'Repeatable first-round coverage',
        description:
          'Send invite links at batch scale and let Kyma run the structured interview while your team focuses on review.',
      },
      {
        title: 'Comparable evidence across candidates',
        description:
          'Review clarity, patience, warmth, listening, and simplification using the same teaching rubric every time.',
      },
      {
        title: 'Copilot grounded in session evidence',
        description:
          'Ask follow-up questions against transcript and report context without leaving the recruiter workspace.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Configure templates and policy',
        description:
          'Set rubric versions, attempt limits, and invite rules for each hiring cohort.',
      },
      {
        step: '02',
        title: 'Distribute candidate invites',
        description:
          'Share short links or batch invites and track access state from the screenings dashboard.',
      },
      {
        step: '03',
        title: 'Decide from evidence, not memory',
        description:
          'Use structured reports, transcript quotes, and manual overrides to move candidates forward with confidence.',
      },
    ],
    faqs: [
      {
        id: 'volume',
        question: 'Can Kyma handle seasonal hiring spikes?',
        answer:
          'Kyma is built for invite-driven screening batches, so teams can run parallel cohorts without changing the review format.',
      },
      {
        id: 'override',
        question: 'What if a recruiter disagrees with the score?',
        answer:
          'Reviewers can inspect the evidence, add notes, and override recommendations while keeping the audit trail intact.',
      },
      {
        id: 'integration',
        question: 'Do we need to replace our ATS first?',
        answer:
          'No. Kyma focuses on the screening and evidence layer. Many teams start by running first-round tutor screens inside Kyma and exporting decisions to existing workflows.',
      },
    ],
    relatedSlugs: ['education-teams', 'communication-heavy-roles'],
  },
  {
    slug: 'online-learning-companies',
    eyebrow: 'For online learning companies',
    title: 'Kyma for online learning companies',
    headline: 'Protect learner experience with better tutor screening',
    description:
      'Online learning products live or die on tutor quality, but remote hiring makes teaching ability harder to inspect early. Kyma helps edtech teams evaluate explanation skill, adaptability, and learner empathy before tutors reach live classes.',
    metaTitle: 'AI Tutor Screening for Online Learning Companies',
    metaDescription:
      'Evaluate remote tutors with live voice interviews, teaching simulations, and evidence-backed rubrics built for online learning teams.',
    painPoints: [
      {
        title: 'Remote teaching is difficult to assess',
        description:
          'Video calls and static assessments miss how tutors simplify concepts, listen, and recover in real time.',
      },
      {
        title: 'Quality drift across regions and vendors',
        description:
          'When hiring ramps across markets, instructional quality can vary unless screening stays consistent.',
      },
      {
        title: 'Learner complaints arrive too late',
        description:
          'Teams often discover communication gaps only after a tutor is already assigned to students.',
      },
    ],
    outcomes: [
      {
        title: 'Teaching simulation in every screen',
        description:
          'Candidates complete a guided conversation and a short teaching exercise so you see instructional behavior, not just interview polish.',
      },
      {
        title: 'Operational consistency across teams',
        description:
          'Give recruiting, operations, and academic leaders the same evidence packet format for every tutor candidate.',
      },
      {
        title: 'Faster quality gates before onboarding',
        description:
          'Move strong tutors forward earlier and flag risky profiles for manual review before they touch learners.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Define the teaching bar',
        description:
          'Choose or customize rubric templates that reflect how tutors should explain, listen, and engage online.',
      },
      {
        step: '02',
        title: 'Screen remotely at scale',
        description:
          'Candidates complete the interview from any device while Kyma captures transcript and scoring evidence.',
      },
      {
        step: '03',
        title: 'Align ops and academic review',
        description:
          'Share structured reports across recruiting and instructional stakeholders before tutors enter onboarding.',
      },
    ],
    faqs: [
      {
        id: 'remote',
        question: 'Does Kyma work for fully remote tutor hiring?',
        answer:
          'Yes. The candidate flow is browser-based with device and audio checks, so tutors can complete screening without installing desktop software.',
      },
      {
        id: 'instructional-signals',
        question: 'What teaching behaviors does Kyma measure?',
        answer:
          'Sessions score signals like clarity, simplification, patience, warmth, listening, fluency, adaptability, engagement, and accuracy.',
      },
      {
        id: 'brand-experience',
        question: 'Can we keep the candidate experience on-brand?',
        answer:
          'Invite links and the interview flow are designed to feel calm and respectful, which matters when candidates are also potential brand ambassadors.',
      },
    ],
    relatedSlugs: ['education-teams', 'communication-heavy-roles'],
  },
  {
    slug: 'communication-heavy-roles',
    eyebrow: 'For communication-heavy roles',
    title: 'Kyma for communication-heavy roles',
    headline: 'Evaluate explanation skill before the live audition',
    description:
      'Roles that depend on clear speech, patient explanation, and adaptive conversation need more than resume screening. Kyma gives hiring teams a voice-first interview with structured evidence for communication-heavy positions such as tutors, coaches, and client educators.',
    metaTitle: 'Voice Screening for Communication-Heavy Roles',
    metaDescription:
      'Use live voice interviews and structured evidence to screen tutors, coaches, and other communication-heavy roles before the final audition.',
    painPoints: [
      {
        title: 'Resumes miss conversational ability',
        description:
          'Strong credentials do not guarantee that someone can explain, listen, or adjust tone when a conversation gets difficult.',
      },
      {
        title: 'Live auditions do not scale',
        description:
          'Teaching demos and role plays are informative, but expensive to run for every applicant in the funnel.',
      },
      {
        title: 'Subjective feedback is hard to compare',
        description:
          'Without structured evidence, interviewers remember impressions differently and struggle to calibrate decisions.',
      },
    ],
    outcomes: [
      {
        title: 'Voice-first signal early in the funnel',
        description:
          'Move from resume review to a live conversation that reveals pacing, clarity, empathy, and adaptability.',
      },
      {
        title: 'Structured evidence for stakeholders',
        description:
          'Share transcript-backed rubric scores with hiring managers, operations leaders, and subject-matter reviewers.',
      },
      {
        title: 'Better use of live audition time',
        description:
          'Spend final-stage demos on candidates who already passed a consistent communication screen.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Set the communication bar',
        description:
          'Choose prompts and rubric criteria that reflect how the role actually communicates with learners or customers.',
      },
      {
        step: '02',
        title: 'Run a guided voice interview',
        description:
          'Kyma conducts a structured session and captures transcript evidence throughout the conversation.',
      },
      {
        step: '03',
        title: 'Review before the final stage',
        description:
          'Use evidence packets to decide who earns a live audition, teaching demo, or final manager interview.',
      },
    ],
    faqs: [
      {
        id: 'roles',
        question: 'Is Kyma only for tutors?',
        answer:
          'Kyma is optimized for tutor screening, but the same voice-first format works for any role where explanation quality, patience, and conversational skill matter.',
      },
      {
        id: 'bias',
        question: 'How do teams keep humans in the loop?',
        answer:
          'Kyma surfaces recommendations and evidence, but reviewers make the final call and can override any automated suggestion.',
      },
      {
        id: 'evidence',
        question: 'What does the reviewer actually see?',
        answer:
          'Recruiters get rubric scores, recommendation rationale, and transcript quotes with timestamps tied to each evaluated signal.',
      },
    ],
    relatedSlugs: ['tutor-recruiters', 'online-learning-companies'],
  },
  ...(
    [
      {
        slug: 'software-engineers',
        eyebrow: 'For engineering hiring',
        title: 'Kyma for software engineers',
        headline:
          'Screen engineers on voice, reasoning, and explanation — not just take-homes',
        roleLabel: 'engineering',
      },
      {
        slug: 'product-managers',
        eyebrow: 'For product hiring',
        title: 'Kyma for product managers',
        headline:
          'Hear how PMs prioritize, communicate tradeoffs, and structure ambiguous problems',
        roleLabel: 'product',
      },
      {
        slug: 'customer-support',
        eyebrow: 'For support hiring',
        title: 'Kyma for customer support',
        headline:
          'Evaluate empathy, clarity, and troubleshooting communication before live role plays',
        roleLabel: 'support',
      },
      {
        slug: 'sales',
        eyebrow: 'For sales hiring',
        title: 'Kyma for sales teams',
        headline:
          'Screen discovery, objection handling, and concise storytelling at scale',
        roleLabel: 'sales',
      },
    ] as const
  ).map((config) => ({
    slug: config.slug,
    eyebrow: config.eyebrow,
    title: config.title,
    headline: config.headline,
    description: `Kyma runs structured voice screens for ${config.roleLabel} roles with transcript-backed evidence recruiters can review before live loops.`,
    metaTitle: config.title,
    metaDescription: `Structured AI voice screening for ${config.roleLabel} hiring with evidence-backed rubrics and recruiter review.`,
    painPoints: [
      {
        title: 'Phone screens vary by interviewer',
        description:
          'Different recruiters ask different questions, making it hard to compare candidates fairly early in the funnel.',
      },
      {
        title: 'Resumes miss spoken communication',
        description:
          'Credentials do not show how someone explains ideas live, handles follow-ups, or recovers from ambiguity.',
      },
      {
        title: 'Review packets are manual',
        description:
          'Teams stitch notes and impressions together before hiring managers can make a confident call.',
      },
    ],
    outcomes: [
      {
        title: 'Consistent rubric across the cohort',
        description:
          'Every candidate gets the same structured voice interview and scoring dimensions.',
      },
      {
        title: 'Evidence hiring managers trust',
        description:
          'Scores link to transcript quotes with timestamps for fast validation.',
      },
      {
        title: 'Fewer expensive live loops',
        description:
          'Spend onsite and panel time on candidates who already passed a calibrated screen.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Configure the screen',
        description:
          'Pick a role template, rubric, and invite policy for your hiring batch.',
      },
      {
        step: '02',
        title: 'Candidates complete a voice interview',
        description:
          'Applicants join from any device, pass readiness checks, and finish a guided conversation.',
      },
      {
        step: '03',
        title: 'Review structured evidence',
        description:
          'Recruiters triage recommendations, citations, and notes in one workspace.',
      },
    ],
    faqs: [
      {
        id: 'practice',
        question: 'Can candidates practice before a real screen?',
        answer:
          'Yes. Candidates can run private practice interviews by role family to build confidence before an employer-invited session.',
      },
      {
        id: 'decision',
        question: 'Does Kyma auto-reject candidates?',
        answer:
          'No. Kyma recommends and surfaces evidence, but your team makes the final decision.',
      },
      {
        id: 'evidence',
        question: 'What do reviewers see?',
        answer:
          'Rubric scores, recommendation rationale, and transcript quotes tied to each evaluated signal.',
      },
    ],
    relatedSlugs: ['communication-heavy-roles', 'education-teams'],
  })),
]

const personaBySlug = new Map(
  personaPages.map((persona) => [persona.slug, persona])
)

export function getPersonaPage(slug: string): PersonaPage | undefined {
  return personaBySlug.get(slug)
}

export function getAllPersonaSlugs(): string[] {
  return personaPages.map((persona) => persona.slug)
}

export function getRelatedPersonas(slugs: string[]): PersonaPage[] {
  return slugs
    .map((slug) => getPersonaPage(slug))
    .filter((persona): persona is PersonaPage => persona !== undefined)
}

export function personaPath(slug: string): string {
  return `/for/${slug}`
}
