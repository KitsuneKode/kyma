'use node'

import { verifyWebhook } from '@clerk/backend/webhooks'
import { v } from 'convex/values'
import type { FunctionArgs } from 'convex/server'
import { WebhookReceiver } from 'livekit-server-sdk'

import { api } from './_generated/api'
import { internalAction, type ActionCtx } from './_generated/server'
import { convexEnv } from '../lib/env/convex'
import {
  createDiagnosticLogger,
  createRequestId,
} from '../lib/interview/diagnostics'
import { getLivekitWebhookCredentials } from '../lib/livekit/env'

function toNumber(value?: bigint) {
  if (value === undefined) {
    return undefined
  }
  return Number(value)
}

type LiveKitIngestArgs = FunctionArgs<typeof api.livekit.ingestWebhookEvent>
type LiveKitIngestBase = Pick<
  LiveKitIngestArgs,
  | 'processingKey'
  | 'roomName'
  | 'participantIdentity'
  | 'participantName'
  | 'egressId'
  | 'updatedAtMs'
  | 'error'
  | 'details'
>

function ingestLiveKitWebhookEvent(
  ctx: ActionCtx,
  base: LiveKitIngestBase,
  event: Omit<LiveKitIngestArgs, keyof LiveKitIngestBase>
) {
  return ctx.runMutation(api.livekit.ingestWebhookEvent, {
    ...base,
    ...event,
  })
}

type ClerkEmailAddress = {
  id?: string
  email_address?: string
}

type ClerkWebhookUser = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email_addresses?: ClerkEmailAddress[]
  primary_email_address_id?: string
  public_metadata?: {
    preferredWorkspace?: unknown
  }
}

type ClerkWebhookOrganization = {
  id: string
  name?: string
  slug?: string
  image_url?: string
}

type ClerkWebhookMembership = {
  id: string
  role?: string
  permissions?: string[]
  organization?: { id?: string }
  public_user_data?: { user_id?: string }
}

function preferredWorkspaceFromWebhookUser(
  user: ClerkWebhookUser
): 'candidate' | 'recruiter' | undefined {
  const metadata = user.public_metadata
  if (!metadata || typeof metadata !== 'object') {
    return undefined
  }
  const preferred = metadata.preferredWorkspace
  if (preferred === 'candidate' || preferred === 'recruiter') {
    return preferred
  }
  return undefined
}

function pickPrimaryEmail(user: ClerkWebhookUser) {
  const byPrimaryId = user.email_addresses?.find(
    (entry) =>
      user.primary_email_address_id &&
      entry.id === user.primary_email_address_id
  )
  return (
    byPrimaryId?.email_address ??
    user.email_addresses?.[0]?.email_address ??
    undefined
  )
}

function fullName(user: ClerkWebhookUser) {
  const value = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()
  return value || undefined
}

export const ingestLivekitWebhook = internalAction({
  args: {
    body: v.string(),
    authorization: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    status: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const requestId = createRequestId('lkwebhook')
    const logger = createDiagnosticLogger('livekit-webhook', {
      actor: 'convex',
      requestId,
    })
    const { apiKey, apiSecret } = getLivekitWebhookCredentials({
      LIVEKIT_API_KEY: convexEnv.LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET: convexEnv.LIVEKIT_API_SECRET,
      LIVEKIT_WEBHOOK_API_KEY: convexEnv.LIVEKIT_WEBHOOK_API_KEY,
      LIVEKIT_WEBHOOK_API_SECRET: convexEnv.LIVEKIT_WEBHOOK_API_SECRET,
    })

    if (!apiKey || !apiSecret) {
      logger.error({
        event: 'webhook.config.missing',
        detail: 'LiveKit webhook signing credentials are not configured.',
      })
      return {
        ok: false,
        status: 500,
        error: 'LiveKit webhook receiver is not configured.',
      }
    }

    const writeKey = convexEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
    if (!writeKey) {
      return {
        ok: false,
        status: 500,
        error: 'KYMA_PROCESSING_WRITE_KEY is required for webhook sync.',
      }
    }

    try {
      const receiver = new WebhookReceiver(apiKey, apiSecret)
      const event = await receiver.receive(args.body, args.authorization)
      const roomName = event.room?.name || event.egressInfo?.roomName
      const participantIdentity = event.participant?.identity
      const participantName = event.participant?.name

      logger.info({
        event: 'webhook.received',
        detail: `Received LiveKit webhook: ${event.event}.`,
        roomName: roomName ?? undefined,
        participantIdentity: participantIdentity ?? undefined,
        meta: {
          webhookEvent: event.event,
          egressId: event.egressInfo?.egressId,
        },
      })

      const egress = event.egressInfo
      const basePayload: LiveKitIngestBase = {
        processingKey: writeKey,
        roomName,
        participantIdentity,
        participantName,
        egressId: egress?.egressId,
        updatedAtMs: toNumber(egress?.updatedAt),
        error: egress?.error || undefined,
        details:
          egress?.details ||
          (roomName && participantIdentity
            ? `${event.event} for ${participantIdentity} in ${roomName}`
            : undefined),
      }
      const mutations = []

      if (egress && event.event.startsWith('egress_')) {
        const fileResults = egress.fileResults ?? []
        const segmentResults = egress.segmentResults ?? []

        if (fileResults.length === 0 && segmentResults.length === 0) {
          mutations.push(
            ingestLiveKitWebhookEvent(ctx, basePayload, {
              event: event.event,
              startedAtMs: toNumber(egress.startedAt),
              endedAtMs: toNumber(egress.endedAt),
            })
          )
        }

        for (const file of fileResults) {
          mutations.push(
            ingestLiveKitWebhookEvent(ctx, basePayload, {
              event: event.event,
              artifactKey: `${egress.egressId}:${file.location || file.filename || 'file'}`,
              filename: file.filename || undefined,
              location: file.location || undefined,
              startedAtMs: toNumber(file.startedAt),
              endedAtMs: toNumber(file.endedAt),
              durationMs: toNumber(file.duration),
              sizeBytes: toNumber(file.size),
            })
          )
        }

        for (const segment of segmentResults) {
          mutations.push(
            ingestLiveKitWebhookEvent(ctx, basePayload, {
              event: event.event,
              artifactKey: `${egress.egressId}:${segment.playlistLocation || segment.playlistName || 'segments'}`,
              filename: segment.playlistName || undefined,
              manifestLocation: segment.playlistLocation || undefined,
              startedAtMs: toNumber(segment.startedAt),
              endedAtMs: toNumber(segment.endedAt),
              durationMs: toNumber(segment.duration),
              sizeBytes: toNumber(segment.size),
            })
          )
        }
      } else {
        mutations.push(
          ingestLiveKitWebhookEvent(ctx, basePayload, {
            event: event.event,
          })
        )
      }

      await Promise.all(mutations)
      return { ok: true, status: 200 }
    } catch (error) {
      logger.error({
        event: 'webhook.failed',
        detail: 'Failed to process LiveKit webhook.',
        error,
      })
      return {
        ok: false,
        status: 401,
        error: error instanceof Error ? error.message : 'Invalid webhook.',
      }
    }
  },
})

export const ingestClerkWebhook = internalAction({
  args: {
    body: v.string(),
    headers: v.record(v.string(), v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    status: v.number(),
    error: v.optional(v.string()),
    ignored: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const writeKey = convexEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
    if (!writeKey) {
      return {
        ok: false,
        status: 500,
        error: 'KYMA_PROCESSING_WRITE_KEY is required for webhook sync.',
      }
    }

    const signingSecret = convexEnv.CLERK_WEBHOOK_SIGNING_SECRET?.trim()
    if (!signingSecret) {
      return {
        ok: false,
        status: 500,
        error: 'CLERK_WEBHOOK_SIGNING_SECRET is required for webhook sync.',
      }
    }

    try {
      const request = new Request('https://convex.local/webhooks/clerk', {
        method: 'POST',
        headers: args.headers,
        body: args.body,
      })
      const event = await verifyWebhook(request, { signingSecret })
      if (
        event.type !== 'user.created' &&
        event.type !== 'user.updated' &&
        event.type !== 'user.deleted' &&
        event.type !== 'organization.created' &&
        event.type !== 'organization.updated' &&
        event.type !== 'organization.deleted' &&
        event.type !== 'organizationMembership.created' &&
        event.type !== 'organizationMembership.updated' &&
        event.type !== 'organizationMembership.deleted'
      ) {
        return { ok: true, status: 200, ignored: event.type }
      }

      if (
        event.type === 'user.created' ||
        event.type === 'user.updated' ||
        event.type === 'user.deleted'
      ) {
        const user = event.data as ClerkWebhookUser
        await ctx.runMutation(api.users.syncFromClerkWebhook, {
          writeKey,
          eventType: event.type,
          clerkId: user.id,
          email: pickPrimaryEmail(user),
          name: fullName(user),
          preferredWorkspace: preferredWorkspaceFromWebhookUser(user),
        })
      }

      if (
        event.type === 'organization.created' ||
        event.type === 'organization.updated' ||
        event.type === 'organization.deleted'
      ) {
        const organization = event.data as ClerkWebhookOrganization
        await ctx.runMutation(api.orgs.syncOrgFromClerkWebhook, {
          writeKey,
          eventType: event.type,
          clerkOrgId: organization.id,
          name: organization.name,
          slug: organization.slug,
          imageUrl: organization.image_url,
        })
      }

      if (
        event.type === 'organizationMembership.created' ||
        event.type === 'organizationMembership.updated' ||
        event.type === 'organizationMembership.deleted'
      ) {
        const membership = event.data as ClerkWebhookMembership
        await ctx.runMutation(api.orgs.syncMembershipFromClerkWebhook, {
          writeKey,
          eventType: event.type,
          clerkMembershipId: membership.id,
          clerkOrgId: membership.organization?.id ?? '',
          clerkUserId: membership.public_user_data?.user_id ?? '',
          role: membership.role ?? 'org:member',
          permissions: membership.permissions ?? [],
        })
      }

      return { ok: true, status: 200 }
    } catch (error) {
      return {
        ok: false,
        status: 400,
        error:
          error instanceof Error
            ? error.message
            : 'Clerk webhook handling failed.',
      }
    }
  },
})
