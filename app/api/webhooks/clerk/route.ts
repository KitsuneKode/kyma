import { fetchMutation } from 'convex/nextjs'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest, NextResponse } from 'next/server'

import { api } from '@/convex/_generated/api'
import { serverEnv } from '@/lib/env/server'

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
    persona?: unknown
    preferredWorkspace?: unknown
  }
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
  const legacy = metadata.persona
  if (legacy === 'candidate' || legacy === 'recruiter') {
    return legacy
  }
  return undefined
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

export async function POST(request: NextRequest) {
  const writeKey = serverEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (!writeKey) {
    return NextResponse.json(
      { error: 'KYMA_PROCESSING_WRITE_KEY is required for webhook sync.' },
      { status: 500 }
    )
  }

  try {
    const unsafeApi = api as Record<string, any>
    const event = await verifyWebhook(request)
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
      return NextResponse.json({ ok: true, ignored: event.type })
    }

    if (
      event.type === 'user.created' ||
      event.type === 'user.updated' ||
      event.type === 'user.deleted'
    ) {
      const user = event.data as ClerkWebhookUser
      await fetchMutation(api.users.syncFromClerkWebhook, {
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
      await fetchMutation(unsafeApi.orgs.syncOrgFromClerkWebhook, {
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
      await fetchMutation(unsafeApi.orgs.syncMembershipFromClerkWebhook, {
        writeKey,
        eventType: event.type,
        clerkMembershipId: membership.id,
        clerkOrgId: membership.organization?.id ?? '',
        clerkUserId: membership.public_user_data?.user_id ?? '',
        role: membership.role ?? 'org:member',
        permissions: membership.permissions ?? [],
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Clerk webhook handling failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
