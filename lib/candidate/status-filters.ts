export function isActiveStatus(status: string) {
  return [
    'ready',
    'connecting',
    'live',
    'reconnecting',
    'interrupted',
  ].includes(status)
}

export function isCompletedPipelineStatus(status: string) {
  const normalizedStatus = status.trim().toLowerCase()
  return ['completed', 'submitted', 'processing'].includes(normalizedStatus)
}

export function isPendingRelease(item: {
  status: string
  reportStatus?: string
  released: boolean
}) {
  if (item.released) {
    return false
  }

  return (
    item.status === 'processing' ||
    item.reportStatus === 'processing' ||
    item.reportStatus === 'manual_review'
  )
}
