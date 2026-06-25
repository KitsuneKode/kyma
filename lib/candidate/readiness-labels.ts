import type { ReadinessChecks } from '@/lib/candidate/readiness-checks'

export const READINESS_CHECK_ROWS: Array<{
  key: keyof ReadinessChecks
  label: string
  description: string
}> = [
  {
    key: 'browserSupported',
    label: 'Browser support',
    description: 'Media APIs are available in this browser.',
  },
  {
    key: 'audioInputAvailable',
    label: 'Microphone device',
    description: 'An audio input device is detected.',
  },
  {
    key: 'videoInputAvailable',
    label: 'Camera device',
    description: 'A video input device is detected.',
  },
  {
    key: 'networkOnline',
    label: 'Network',
    description: 'The device reports an online connection.',
  },
  {
    key: 'secureContext',
    label: 'Secure context',
    description: 'HTTPS or localhost is required for media access.',
  },
  {
    key: 'mediaPermissionsGranted',
    label: 'Media permissions',
    description: 'Microphone and camera permissions are granted.',
  },
]
