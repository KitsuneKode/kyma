import { z } from "zod"

const livekitEnvSchema = z.object({
  NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1).optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
  LIVEKIT_AGENT_NAME: z.string().min(1).optional(),
})

export function getLivekitEnv() {
  return livekitEnvSchema.parse({
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    LIVEKIT_AGENT_NAME: process.env.LIVEKIT_AGENT_NAME,
  })
}

export function hasLivekitServerCredentials() {
  const env = getLivekitEnv()

  return Boolean(
    env.NEXT_PUBLIC_LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET
  )
}
