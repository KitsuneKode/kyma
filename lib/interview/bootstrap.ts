import { ConvexError } from 'convex/values'
import { useAction } from 'convex/react'
import { z } from 'zod'

import { api } from '@/convex/_generated/api'

const bootstrapResponseSchema = z.object({
  inviteId: z.string(),
  sessionId: z.string(),
  roomName: z.string(),
  templateName: z.string(),
  token: z.string(),
  participantName: z.string(),
  wsUrl: z.string(),
})

export type BootstrappedInterviewSession = z.infer<
  typeof bootstrapResponseSchema
>

function bootstrapErrorMessage(error: unknown) {
  if (error instanceof ConvexError) {
    return String(error.data ?? error.message)
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Failed to bootstrap interview.'
}

/**
 * Client helper that calls the Convex bootstrap action.
 * Prefer `useBootstrapInterviewSession` in React components.
 */
export async function bootstrapInterviewSession(
  runBootstrap: (args: {
    inviteToken: string
    participantName: string
  }) => Promise<unknown>,
  input: {
    inviteToken: string
    participantName: string
  }
) {
  try {
    const payload = await runBootstrap(input)
    return bootstrapResponseSchema.parse(payload)
  } catch (error) {
    throw new Error(bootstrapErrorMessage(error), { cause: error })
  }
}

export function useBootstrapInterviewSession() {
  const runBootstrap = useAction(
    api.interviews.bootstrapActions.bootstrapInterviewSession
  )

  return async (input: { inviteToken: string; participantName: string }) =>
    await bootstrapInterviewSession(runBootstrap, input)
}
