export type ReadinessChecks = {
  browserSupported: boolean
  audioInputAvailable: boolean
  videoInputAvailable: boolean
  networkOnline: boolean
  secureContext: boolean
  mediaPermissionsGranted: boolean
}

export function countPassingReadinessChecks(checks: ReadinessChecks) {
  return Object.values(checks).filter(Boolean).length
}

export function isReadinessPassing(checks: ReadinessChecks) {
  return countPassingReadinessChecks(checks) === 6
}

export async function runReadinessChecks(): Promise<ReadinessChecks> {
  const browserSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  const networkOnline =
    typeof navigator !== 'undefined' ? navigator.onLine : false
  const secureContext =
    typeof window !== 'undefined' ? window.isSecureContext : false

  let audioInputAvailable = false
  let videoInputAvailable = false
  let mediaPermissionsGranted = false

  if (browserSupported) {
    const devices = await navigator.mediaDevices.enumerateDevices()
    audioInputAvailable = devices.some((device) => device.kind === 'audioinput')
    videoInputAvailable = devices.some((device) => device.kind === 'videoinput')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })
      mediaPermissionsGranted = true
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      mediaPermissionsGranted = false
    }
  }

  return {
    browserSupported,
    audioInputAvailable,
    videoInputAvailable,
    networkOnline,
    secureContext,
    mediaPermissionsGranted,
  }
}
