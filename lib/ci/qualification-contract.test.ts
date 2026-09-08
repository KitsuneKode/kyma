// @vitest-environment node
/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest'

import packageJson from '../../package.json'
import ciSource from '../../.github/workflows/ci.yml?raw'
import nextConfigSource from '../../next.config.mjs?raw'
import playwrightConfigSource from '../../playwright.config.ts?raw'

describe('local and CI qualification parity', () => {
  test('the full local check includes every deterministic gate', () => {
    expect(packageJson.scripts['check:quality']).toContain('bun run knip')
    expect(packageJson.scripts.check).toBe(
      'bun run check:quality && bun run test:convex-integration && bun run test:e2e'
    )
  })

  test('CI includes dependency, integration, and browser gates', () => {
    expect(ciSource).toContain('run: bun run knip')
    expect(ciSource).toContain('integration:')
    expect(ciSource).toContain('run: bun run test:convex-integration')
    expect(ciSource).toContain('run: bun run test:e2e')
  })

  test('browser smoke tests allow for cold route compilation', () => {
    expect(playwrightConfigSource).toContain('timeout: 60_000')
    expect(playwrightConfigSource).toContain('runtimeEnv.CI ? 1 : 2')
    expect(playwrightConfigSource).toContain('`${baseURL}/favicon.ico`')
  })

  test('Turbopack is rooted to the active checkout', () => {
    expect(nextConfigSource).toContain('fileURLToPath(import.meta.url)')
    expect(nextConfigSource).toContain('root: projectRoot')
  })
})
