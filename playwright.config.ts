import { defineConfig, devices } from '@playwright/test'

import { runtimeEnv } from './lib/env/runtime'

const baseURL = runtimeEnv.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Cold Turbopack route compilation can approach 30s on shared CI runners,
  // especially for smoke tests that visit several routes sequentially.
  timeout: 60_000,
  // Turbopack's development server compiles routes on first request. Letting
  // Playwright use every host CPU caused the multi-route auth smoke to exceed
  // its budget even though each route completes quickly in isolation. Keep CI
  // serial and local runs bounded; this suite verifies routing, not production
  // load capacity.
  workers: runtimeEnv.CI ? 1 : 2,
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
        command:
          'env -u CI -u CONVEX_DEPLOYMENT NEXT_PUBLIC_CONVEX_URL= NEXT_PUBLIC_CONVEX_SITE_URL= NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= CLERK_SECRET_KEY= CLERK_FRONTEND_API_URL= CLERK_JWT_ISSUER_DOMAIN= bun run dev:web',
        // Probe a committed favicon so readiness does not cold-compile the
        // largest marketing route before the browser suite can begin.
        url: `${baseURL}/favicon.ico`,
        timeout: 120_000,
        reuseExistingServer: !runtimeEnv.CI,
      },
})
