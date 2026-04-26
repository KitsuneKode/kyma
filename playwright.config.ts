import { defineConfig, devices } from '@playwright/test'

import { runtimeEnv } from '@/lib/env/runtime'

const baseURL = runtimeEnv.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(runtimeEnv.CI),
  retries: runtimeEnv.CI ? 1 : 0,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
  },
  webServer: runtimeEnv.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'bun run dev:web',
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !runtimeEnv.CI,
      },
})
