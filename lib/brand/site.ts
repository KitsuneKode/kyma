const DEFAULT_SITE_URL = 'https://kyma.kitsunelabs.xyz'

export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`
      : undefined)

  return fromEnv ?? DEFAULT_SITE_URL
}

export const brand = {
  name: 'Kyma',
  legalName: 'Kyma',
  tagline: 'Clarity builds confidence.',
  headline: 'Screen tutors on real teaching, not resumes',
  shortDescription:
    'Voice-first AI tutor screening with structured, evidence-backed reviews.',
  description:
    'Kyma runs live AI-led tutor interviews and returns structured, evidence-backed review packets—so recruiting teams judge clarity, patience, and teaching ability consistently.',
  keywords: [
    'tutor screening',
    'AI interview',
    'education recruiting',
    'voice interview',
    'tutor assessment',
    'hiring automation',
    'teaching evaluation',
    'Cuemath',
    'screening platform',
  ],
  twitterHandle: undefined as string | undefined,
} as const
