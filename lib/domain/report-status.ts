export const REPORT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'manual_review',
] as const

export type ReportStatus = (typeof REPORT_STATUSES)[number]
