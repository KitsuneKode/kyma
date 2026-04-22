import { z } from 'zod'

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

export async function bootstrapInterviewSession(input: {
  inviteToken: string
  participantName: string
}) {
  const response = await fetch('/api/interviews/bootstrap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'Failed to bootstrap interview.'
    )
  }

  return bootstrapResponseSchema.parse(payload)
}
