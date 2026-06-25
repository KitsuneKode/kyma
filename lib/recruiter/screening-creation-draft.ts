import type { ScreeningCandidateDraft } from '@/components/admin/screening-candidate-fields'

export const SCREENING_CREATION_DRAFT_KEY = 'kyma-screening-creation-draft'

export type ScreeningPolicyInheritMode = 'inherit' | 'override'

export type ScreeningCreationDraft = {
  step: 0 | 1 | 2
  batchName: string
  expiryDays: string
  allowedAttempts: string
  candidateReleaseMode: 'inherit' | 'auto' | 'manual'
  templateId: string
  durationMode: ScreeningPolicyInheritMode
  targetDurationMinutes: string
  resumeMode: ScreeningPolicyInheritMode
  allowsResume: boolean
  candidates: ScreeningCandidateDraft[]
}

export const DEFAULT_SCREENING_CREATION_DRAFT: ScreeningCreationDraft = {
  step: 0,
  batchName: 'Screening batch',
  expiryDays: '7',
  allowedAttempts: '1',
  candidateReleaseMode: 'inherit',
  templateId: '',
  durationMode: 'inherit',
  targetDurationMinutes: '18',
  resumeMode: 'inherit',
  allowsResume: true,
  candidates: [{ id: 'draft-1', name: '', email: '' }],
}

function isCandidateReleaseMode(
  value: unknown
): value is ScreeningCreationDraft['candidateReleaseMode'] {
  return value === 'inherit' || value === 'auto' || value === 'manual'
}

function isPolicyInheritMode(
  value: unknown
): value is ScreeningPolicyInheritMode {
  return value === 'inherit' || value === 'override'
}

function isCandidateDraft(value: unknown): value is ScreeningCandidateDraft {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.email === 'string'
  )
}

export function parseScreeningCreationDraft(
  raw: string | null
): ScreeningCreationDraft | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const record = parsed as Record<string, unknown>
    const step = record.step
    if (step !== 0 && step !== 1 && step !== 2) {
      return null
    }

    if (
      typeof record.batchName !== 'string' ||
      typeof record.expiryDays !== 'string' ||
      typeof record.allowedAttempts !== 'string' ||
      typeof record.templateId !== 'string' ||
      !isCandidateReleaseMode(record.candidateReleaseMode) ||
      !Array.isArray(record.candidates) ||
      !record.candidates.every(isCandidateDraft)
    ) {
      return null
    }

    const durationMode = isPolicyInheritMode(record.durationMode)
      ? record.durationMode
      : 'inherit'
    const resumeMode = isPolicyInheritMode(record.resumeMode)
      ? record.resumeMode
      : 'inherit'

    return {
      step,
      batchName: record.batchName,
      expiryDays: record.expiryDays,
      allowedAttempts: record.allowedAttempts,
      candidateReleaseMode: record.candidateReleaseMode,
      templateId: record.templateId,
      durationMode,
      targetDurationMinutes:
        typeof record.targetDurationMinutes === 'string'
          ? record.targetDurationMinutes
          : DEFAULT_SCREENING_CREATION_DRAFT.targetDurationMinutes,
      resumeMode,
      allowsResume:
        typeof record.allowsResume === 'boolean'
          ? record.allowsResume
          : DEFAULT_SCREENING_CREATION_DRAFT.allowsResume,
      candidates:
        record.candidates.length > 0
          ? record.candidates
          : DEFAULT_SCREENING_CREATION_DRAFT.candidates,
    }
  } catch {
    return null
  }
}

export function readScreeningCreationDraft(): ScreeningCreationDraft | null {
  if (typeof window === 'undefined') {
    return null
  }
  return parseScreeningCreationDraft(
    window.localStorage.getItem(SCREENING_CREATION_DRAFT_KEY)
  )
}

export function writeScreeningCreationDraft(draft: ScreeningCreationDraft) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(
    SCREENING_CREATION_DRAFT_KEY,
    JSON.stringify(draft)
  )
}

export function clearScreeningCreationDraft() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(SCREENING_CREATION_DRAFT_KEY)
}

export function resolveScreeningDurationMinutes(
  draft: Pick<ScreeningCreationDraft, 'durationMode' | 'targetDurationMinutes'>,
  templateDuration?: number
) {
  if (draft.durationMode === 'inherit') {
    return templateDuration
  }
  const parsed = Number.parseInt(draft.targetDurationMinutes, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : templateDuration
}

export function resolveScreeningAllowsResume(
  draft: Pick<ScreeningCreationDraft, 'resumeMode' | 'allowsResume'>,
  templateAllowsResume?: boolean
) {
  if (draft.resumeMode === 'inherit') {
    return templateAllowsResume
  }
  return draft.allowsResume
}
