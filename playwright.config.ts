import { defineConfig, devices } from '@playwright/test'

import { runtimeEnv } from './lib/env/runtime'

const baseURL = runtimeEnv.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Turbopack's development server compiles routes on first request. Letting
  // Playwright use every host CPU caused the five-route auth smoke to exceed
  // its 30s test budget even though it completes in ~10s in isolation. Keep
  // CI conservative and local runs bounded; this suite verifies routing, not
  // production load capacity.
  workers: runtimeEnv.CI ? 2 : 4,
  forbidOnly: Boolean(runtimeEnv.CI),
  retries: runtimeEnv.CI ? 1 : 0,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
  },
  webServer: runtimeEnv.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        // Public smoke tests intentionally run without production CI env so
        // Clerk and provider integrations stay disabled unless explicitly set.
        command: 'env -u CI bun run dev:web',
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !runtimeEnv.CI,
      },
})
