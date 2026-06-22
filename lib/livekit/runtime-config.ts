import { runtimeEnv } from '@/lib/env/runtime'
import { sliceLivekitEnv, type LivekitEnvSlice } from '@/lib/livekit/env'

export function getLivekitRuntimeEnv(): LivekitEnvSlice {
  return sliceLivekitEnv(runtimeEnv)
}
