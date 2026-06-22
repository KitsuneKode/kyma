/** Scroll within a transcript panel only — never call scrollIntoView (it hijacks page scroll). */
export function scrollSegmentInContainer(
  root: HTMLElement,
  segmentId: string,
  options?: { behavior?: ScrollBehavior }
) {
  const target = root.querySelector<HTMLElement>(
    `[data-segment-id="${segmentId}"]`
  )
  if (!target) return

  const behavior = options?.behavior ?? 'auto'
  const rootRect = root.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const maxScroll = root.scrollHeight - root.clientHeight
  const delta =
    targetRect.top - rootRect.top - (root.clientHeight - targetRect.height) / 2
  const nextTop = Math.max(0, Math.min(root.scrollTop + delta, maxScroll))

  root.scrollTo({ top: nextTop, behavior })
}
