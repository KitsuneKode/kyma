export type CitationJumpTarget = {
  timeSec?: number
  evidenceIndex?: number
  dimension?: string
}

export type CitationResolveContext = {
  recordingStartTime?: string
  transcript: Array<{
    startedAt: string
    startSec?: number
  }>
  evidence: Array<{
    dimension: string
    startedAt?: string
    startedAtSec?: number
  }>
}

const EVIDENCE_REF = /^evidence:(\d+)(?::(.+))?$/i
const TRANSCRIPT_REF = /^transcript:(.+)$/i

function baseTimeMs(context: CitationResolveContext): number | null {
  if (context.recordingStartTime) {
    const ms = new Date(context.recordingStartTime).getTime()
    return Number.isFinite(ms) ? ms : null
  }
  const first = context.transcript[0]?.startedAt
  if (!first) return null
  const ms = new Date(first).getTime()
  return Number.isFinite(ms) ? ms : null
}

function isoToTimeSec(
  iso: string,
  context: CitationResolveContext
): number | undefined {
  const absoluteMs = new Date(iso).getTime()
  if (!Number.isFinite(absoluteMs)) return undefined

  const matching = context.transcript.find(
    (segment) => segment.startedAt === iso
  )
  if (matching?.startSec !== undefined) {
    return matching.startSec
  }

  const base = baseTimeMs(context)
  if (base === null) return undefined
  return Math.max(0, (absoluteMs - base) / 1000)
}

/**
 * Map citation refs (`transcript:<ISO>`, `evidence:<index>:<dim>`, or raw seconds)
 * to a jump target for the review console.
 */
export function resolveCitationRef(
  ref: string,
  context: CitationResolveContext
): CitationJumpTarget | null {
  const trimmed = ref.trim()
  if (!trimmed) return null

  const numeric = Number.parseFloat(trimmed)
  if (Number.isFinite(numeric) && numeric >= 0 && /^[\d.]+$/.test(trimmed)) {
    return { timeSec: numeric }
  }

  const evidenceMatch = EVIDENCE_REF.exec(trimmed)
  if (evidenceMatch) {
    const evidenceIndex = Number.parseInt(evidenceMatch[1] ?? '', 10)
    if (!Number.isFinite(evidenceIndex) || evidenceIndex < 0) {
      return null
    }
    const dimensionFromRef = evidenceMatch[2]?.trim()
    const item = context.evidence[evidenceIndex]
    const dimension = dimensionFromRef || item?.dimension
    const timeSec =
      item?.startedAtSec ??
      (item?.startedAt ? isoToTimeSec(item.startedAt, context) : undefined)

    return {
      evidenceIndex,
      ...(dimension ? { dimension } : {}),
      ...(timeSec !== undefined ? { timeSec } : {}),
    }
  }

  const transcriptMatch = TRANSCRIPT_REF.exec(trimmed)
  if (transcriptMatch) {
    const iso = transcriptMatch[1]?.trim()
    if (!iso) return null
    const timeSec = isoToTimeSec(iso, context)
    if (timeSec === undefined) return null
    return { timeSec }
  }

  return null
}

export function isCitationJumpable(target: CitationJumpTarget | null): boolean {
  if (!target) return false
  return target.timeSec !== undefined || target.evidenceIndex !== undefined
}
