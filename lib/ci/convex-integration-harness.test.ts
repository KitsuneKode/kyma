// @vitest-environment node
/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest'

import harnessSource from '../../scripts/run-convex-integration.sh?raw'
import sinkSource from '../../scripts/inngest-event-sink.ts?raw'

describe('Convex integration process lifecycle', () => {
  test('owns child processes without persistent tmux sessions', () => {
    expect(harnessSource).not.toContain('tmux')
    expect(harnessSource).toContain('trap cleanup EXIT')
    expect(harnessSource).toContain('trap handle_signal INT TERM')
    expect(harnessSource).toContain('SINK_PID=')
    expect(harnessSource).toContain('CONVEX_PID=')
    expect(harnessSource).toContain('stop_process_group')
    expect(harnessSource).toContain('CONVEX_DEPLOYMENT is not anonymous/local')
    expect(harnessSource).toContain('Convex URL is not loopback')
    expect(harnessSource).toContain('Convex site URL is not loopback')
    expect(harnessSource).toContain('assert_port_available 3211')
    expect(harnessSource).toContain('command -v setsid')
    expect(harnessSource).not.toContain('${LIVEKIT_API_SECRET:-')
  })

  test('uses a dedicated event-sink process', () => {
    expect(harnessSource).toContain('scripts/inngest-event-sink.ts')
    expect(sinkSource).toContain('createServer')
    expect(sinkSource).toContain("ids: ['local-sink']")
  })
})
