'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

import { getAppBaseUrl } from '@/lib/url/app-base-url'

export type InviteTeammateResult = { ok: true } | { ok: false; error: string }

export async function inviteTeammateByEmail(
  email: string
): Promise<InviteTeammateResult> {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) {
    return { ok: false, error: 'You must be signed in.' }
  }
  if (!orgId) {
    return {
      ok: false,
      error: 'Select an organization before inviting teammates.',
    }
  }

  if (orgRole !== 'org:admin') {
    return {
      ok: false,
      error: 'Only organization admins can invite teammates.',
    }
  }

  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' }
  }

  try {
    const client = await clerkClient()
    const baseUrl = await getAppBaseUrl()
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: trimmed,
      role: 'org:member',
      redirectUrl: `${baseUrl}/join/${orgId}`,
    })
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to send organization invitation.'
    return { ok: false, error: message }
  }
}
