import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  S3Upload,
} from 'livekit-server-sdk'

import { createDiagnosticLogger } from '@/lib/interview/diagnostics'
import { getLivekitEnv } from '@/lib/livekit/config'

function getLivekitApiBaseUrl(wsUrl: string) {
  if (wsUrl.startsWith('wss://')) {
    return wsUrl.replace('wss://', 'https://')
  }

  if (wsUrl.startsWith('ws://')) {
    return wsUrl.replace('ws://', 'http://')
  }

  return wsUrl
}

export function hasLivekitRecordingConfig() {
  const env = getLivekitEnv()

  return Boolean(
    env.LIVEKIT_RECORDING_ENABLED === '1' &&
    env.NEXT_PUBLIC_LIVEKIT_URL &&
    env.LIVEKIT_API_KEY &&
    env.LIVEKIT_API_SECRET &&
    env.LIVEKIT_RECORDING_STORAGE_BUCKET &&
    env.LIVEKIT_RECORDING_STORAGE_REGION &&
    env.LIVEKIT_RECORDING_STORAGE_ACCESS_KEY &&
    env.LIVEKIT_RECORDING_STORAGE_SECRET_KEY
  )
}

export async function maybeStartRoomRecording(roomName: string) {
  const env = getLivekitEnv()
  const logger = createDiagnosticLogger('livekit-recording', {
    actor: 'agent',
    roomName,
  })

  if (!hasLivekitRecordingConfig()) {
    logger.debug({
      event: 'recording.skipped',
      detail:
        'LiveKit room recording was not started because recording env configuration is incomplete or disabled.',
    })
    return null
  }

  const egressClient = new EgressClient(
    getLivekitApiBaseUrl(env.NEXT_PUBLIC_LIVEKIT_URL!),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET
  )

  const output = new EncodedFileOutput({
    fileType:
      env.LIVEKIT_RECORDING_AUDIO_ONLY === '1'
        ? EncodedFileType.OGG
        : EncodedFileType.MP4,
    filepath: `kyma/${roomName}-${Date.now()}.${
      env.LIVEKIT_RECORDING_AUDIO_ONLY === '1' ? 'ogg' : 'mp4'
    }`,
    output: {
      case: 's3',
      value: new S3Upload({
        accessKey: env.LIVEKIT_RECORDING_STORAGE_ACCESS_KEY,
        secret: env.LIVEKIT_RECORDING_STORAGE_SECRET_KEY,
        bucket: env.LIVEKIT_RECORDING_STORAGE_BUCKET,
        region: env.LIVEKIT_RECORDING_STORAGE_REGION,
      }),
    },
  })

  const info = await egressClient.startRoomCompositeEgress(roomName, output, {
    layout: 'grid',
    encodingOptions: EncodingOptionsPreset.H264_720P_30,
    audioOnly: env.LIVEKIT_RECORDING_AUDIO_ONLY === '1',
    customBaseUrl: env.LIVEKIT_RECORDING_TEMPLATE_URL,
  })

  logger.info({
    event: 'recording.started',
    detail: 'LiveKit room composite recording started.',
    meta: {
      egressId: info.egressId,
      audioOnly: env.LIVEKIT_RECORDING_AUDIO_ONLY === '1',
    },
  })

  return info
}
