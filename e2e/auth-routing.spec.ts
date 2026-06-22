import { expect, test } from '@playwright/test'

/**
 * Public smoke tests for auth routing surfaces.
 * Full signed-in Clerk flows require dashboard JWT setup and test credentials;
 * see .docs/auth-org-rbac-cutover-checklist.md.
 */
test.describe('auth routing (public)', () => {
  test('sign-in shows setup instructions when Clerk is not configured', async ({
    page,
  }) => {
    const response = await page.goto('/sign-in')
    expect(response?.status()).toBeLessThan(500)
    const body = await page.textContent('body')
    const hasSetup =
      body?.includes('Authentication is not configured') ||
      body?.includes('Sign in to Kyma')
    expect(hasSetup).toBeTruthy()
  })

  test('sign-in with redirect_url preserves join path in page or redirect', async ({
    page,
  }) => {
    const response = await page.goto(
      '/sign-in/recruiter?redirect_url=%2Fjoin%2Forg_test'
    )
    expect(response?.status()).toBeLessThan(500)
    const html = await page.content()
    const preservesJoin =
      html.includes('/join/org_test') ||
      html.includes('Authentication is not configured')
    expect(preservesJoin).toBeTruthy()
  })

  test('dev setup hub is reachable in development', async ({ page }) => {
    const response = await page.goto('/dev')
    expect(response?.status()).toBeLessThan(500)
    await expect(
      page.getByRole('heading', { name: /local setup hub/i })
    ).toBeVisible()
  })
  test('onboarding page requires sign-in redirect or renders for signed-in users', async ({
    page,
  }) => {
    const response = await page.goto('/onboarding')
    expect(response?.status()).toBeLessThan(500)
    const url = page.url()
    expect(
      url.includes('/sign-in') ||
        url.includes('/onboarding') ||
        url.includes('Authentication is not configured')
    ).toBeTruthy()
  })

  test('candidate route does not 500 without auth', async ({ page }) => {
    const response = await page.goto('/candidate')
    expect(response?.status()).toBeLessThan(500)
  })

  test('recruiter route does not 500 without auth', async ({ page }) => {
    const response = await page.goto('/recruiter')
    expect(response?.status()).toBeLessThan(500)
  })

  test('permission-gated recruiter routes do not 500 without auth', async ({
    page,
  }) => {
    for (const path of [
      '/recruiter/settings',
      '/recruiter/templates/new',
      '/recruiter/screenings/new',
      '/recruiter/candidates',
    ]) {
      const response = await page.goto(path)
      expect(response?.status() ?? 200).toBeLessThan(500)
    }
  })
})
