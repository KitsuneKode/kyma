import { expect, test, type Page } from '@playwright/test'

/**
 * ROI sprint smoke coverage — public routes and redirects.
 * With Clerk configured, candidate practice routes redirect to sign-in;
 * without Clerk, the hub renders directly. Backend logic is in Vitest
 * (convex/candidatePortal.practice.test.ts, convex/screenings.policy.test.ts).
 */

function isSignInUrl(url: string) {
  return (
    url.includes('sign-in') ||
    url.includes('sign-up') ||
    url.includes('accounts.dev') ||
    url.includes('clerk.accounts')
  )
}

async function waitForPracticeDestination(page: Page) {
  await page.waitForURL(
    (url) => {
      const { pathname, hostname } = url
      return (
        pathname.includes('/candidate/practice') ||
        pathname.includes('/sign-in') ||
        pathname.includes('/sign-up') ||
        hostname.includes('accounts.dev') ||
        hostname.includes('clerk')
      )
    },
    { timeout: 15_000 }
  )
}

test.describe('ROI sprint — candidate practice', () => {
  test('/practice redirects to practice hub or sign-in', async ({ page }) => {
    await page.goto('/practice')
    await waitForPracticeDestination(page)
    const url = page.url()
    expect(url.includes('/candidate/practice') || isSignInUrl(url)).toBeTruthy()
    expect(url.includes('Internal Server Error')).toBeFalsy()
  })

  test('practice hub renders packs or redirects to sign-in', async ({
    page,
  }) => {
    const response = await page.goto('/candidate/practice')
    expect(response?.status()).toBeLessThan(500)
    await waitForPracticeDestination(page)

    if (isSignInUrl(page.url())) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      return
    }

    await expect(page.getByText('Practice interviews')).toBeVisible()
    await expect(page.getByText('Software engineering')).toBeVisible()
    await expect(page.getByText('Start practice interview')).toBeVisible()
  })

  test('practice feedback route does not 500 for unknown session', async ({
    page,
  }) => {
    const response = await page.goto(
      '/candidate/practice/jh7fake00000000000000000/feedback'
    )
    expect(response?.status()).toBeLessThan(500)
    const body = await page.textContent('body')
    expect(body?.includes('Internal Server Error')).toBeFalsy()
  })
})

test.describe('ROI sprint — horizontal personas', () => {
  for (const slug of [
    'software-engineers',
    'product-managers',
    'customer-support',
    'sales',
  ]) {
    test(`/for/${slug} loads`, async ({ page }) => {
      const response = await page.goto(`/for/${slug}`)
      expect(response?.ok()).toBeTruthy()
      await expect(page.locator('body')).not.toContainText(
        'Internal Server Error'
      )
    })
  }
})

test.describe('ROI sprint — recruiter surfaces (unauthenticated)', () => {
  test('screening creation route does not 500', async ({ page }) => {
    const response = await page.goto('/recruiter/screenings/new')
    expect(response?.status()).toBeLessThan(500)
  })

  test('screenings list route does not 500', async ({ page }) => {
    const response = await page.goto('/recruiter/screenings')
    expect(response?.status()).toBeLessThan(500)
  })

  test('template create route does not 500', async ({ page }) => {
    const response = await page.goto('/recruiter/templates/new')
    expect(response?.status()).toBeLessThan(500)
  })
})

test.describe('ROI sprint — invite lobby', () => {
  test('invalid invite shows unavailable state', async ({ page }) => {
    const response = await page.goto('/interviews/not-a-real-invite-token')
    expect(response?.status()).toBeLessThan(500)
    const body = await page.textContent('body')
    const showsUnavailable =
      body?.includes('unavailable') ||
      body?.includes('Unavailable') ||
      body?.includes('not found') ||
      body?.includes('Sign in')
    expect(showsUnavailable).toBeTruthy()
  })
})
