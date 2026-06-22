import 'server-only'

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { serverEnv } from '@/lib/env/server'
import { hasLivekitRecordingConfig } from '@/lib/livekit/recording'

type S3ObjectRef = {
  bucket: string
  key: string
}

function parseS3Uri(value: string): S3ObjectRef | null {
  if (!value.startsWith('s3://')) {
    return null
  }

  const withoutScheme = value.slice('s3://'.length)
  const slashIndex = withoutScheme.indexOf('/')
  if (slashIndex <= 0) {
    return null
  }

  return {
    bucket: withoutScheme.slice(0, slashIndex),
    key: withoutScheme.slice(slashIndex + 1),
  }
}

function parseHttpsS3Url(value: string): S3ObjectRef | null {
  try {
    const url = new URL(value)
    const host = url.hostname

    const virtualHosted = host.match(
      /^(.+)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i
    )
    if (virtualHosted?.[1]) {
      return {
        bucket: virtualHosted[1],
        key: url.pathname.replace(/^\//, ''),
      }
    }

    const pathStyle = host.match(/^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i)
    if (pathStyle) {
      const [bucket, ...rest] = url.pathname.replace(/^\//, '').split('/')
      if (!bucket || rest.length === 0) {
        return null
      }
      return { bucket, key: rest.join('/') }
    }
  } catch {
    return null
  }

  return null
}

function resolveS3ObjectRef(
  location?: string | null,
  filename?: string | null
): S3ObjectRef | null {
  const trimmedLocation = location?.trim()
  if (!trimmedLocation) {
    return null
  }

  const fromS3Uri = parseS3Uri(trimmedLocation)
  if (fromS3Uri) {
    return fromS3Uri
  }

  if (
    trimmedLocation.startsWith('http://') ||
    trimmedLocation.startsWith('https://')
  ) {
    if (trimmedLocation.includes('X-Amz-Signature=')) {
      return null
    }
    return parseHttpsS3Url(trimmedLocation)
  }

  const bucket = serverEnv.LIVEKIT_RECORDING_STORAGE_BUCKET?.trim()
  if (!bucket) {
    return null
  }

  const key = filename?.trim() || trimmedLocation
  return key ? { bucket, key } : null
}

async function presignS3Object(ref: S3ObjectRef) {
  const region = serverEnv.LIVEKIT_RECORDING_STORAGE_REGION?.trim()
  const accessKeyId = serverEnv.LIVEKIT_RECORDING_STORAGE_ACCESS_KEY?.trim()
  const secretAccessKey = serverEnv.LIVEKIT_RECORDING_STORAGE_SECRET_KEY?.trim()

  if (!region || !accessKeyId || !secretAccessKey) {
    return null
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: ref.bucket,
      Key: ref.key,
    }),
    { expiresIn: 60 * 60 }
  )
}

export async function createRecordingPlaybackUrl(
  location?: string | null,
  filename?: string | null
): Promise<string | null> {
  const trimmedLocation = location?.trim()
  if (!trimmedLocation) {
    return null
  }

  if (
    (trimmedLocation.startsWith('http://') ||
      trimmedLocation.startsWith('https://')) &&
    trimmedLocation.includes('X-Amz-Signature=')
  ) {
    return trimmedLocation
  }

  const objectRef = resolveS3ObjectRef(trimmedLocation, filename)
  if (!objectRef || !hasLivekitRecordingConfig()) {
    if (
      trimmedLocation.startsWith('http://') ||
      trimmedLocation.startsWith('https://')
    ) {
      return trimmedLocation
    }
    return null
  }

  return await presignS3Object(objectRef)
}
