import 'server-only'

import { getLivekitServerEnv } from '@/lib/livekit/config'
import {
  computeLivekitTokenTtlMinutes,
  createParticipantTokenWithEnv,
  type CreateParticipantTokenInput,
} from '@/lib/livekit/create-participant-token'

export { computeLivekitTokenTtlMinutes }

export async function createParticipantToken(
  input: CreateParticipantTokenInput
) {
  return await createParticipantTokenWithEnv(getLivekitServerEnv(), input)
}
