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
  public_metadata?: { role?: unknown }
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
    const event = await verifyWebhook(request)
    if (
      event.type !== 'user.created' &&
      event.type !== 'user.updated' &&
      event.type !== 'user.deleted'
    ) {
      return NextResponse.json({ ok: true, ignored: event.type })
    }

    const user = event.data as ClerkWebhookUser
    await fetchMutation(api.users.syncFromClerkWebhook, {
      writeKey,
      eventType: event.type,
      clerkId: user.id,
      email: pickPrimaryEmail(user),
      name: fullName(user),
      role:
        user.public_metadata?.role === 'admin' ||
        user.public_metadata?.role === 'recruiter' ||
        user.public_metadata?.role === 'candidate'
          ? user.public_metadata.role
          : undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Clerk webhook handling failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
