import { expect, test } from '@playwright/test'

/**
 * Public smoke tests for auth routing surfaces.
 * Full signed-in Clerk flows require dashboard JWT setup and test credentials;
 * see .docs/auth-org-rbac-cutover-checklist.md.
 */
test.describe('auth routing (public)', () => {
  test('onboarding page requires sign-in redirect or renders for signed-in users', async ({
    page,
  }) => {
    const response = await page.goto('/onboarding')
    expect(response?.status()).toBeLessThan(500)
    const url = page.url()
    expect(url.includes('/sign-in') || url.includes('/onboarding')).toBeTruthy()
  })

  test('candidate route does not 500 without auth', async ({ page }) => {
    const response = await page.goto('/candidate')
    expect(response?.status()).toBeLessThan(500)
  })

  test('recruiter route does not 500 without auth', async ({ page }) => {
    const response = await page.goto('/recruiter')
    expect(response?.status()).toBeLessThan(500)
  })
})
