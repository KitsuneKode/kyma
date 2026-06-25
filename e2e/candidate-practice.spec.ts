import { expect, test } from '@playwright/test'

test('candidate practice hub renders', async ({ page }) => {
  const response = await page.goto('/candidate/practice')
  expect(response?.status()).toBeLessThan(500)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('recruiter health page renders readiness panel', async ({ page }) => {
  const response = await page.goto('/recruiter/health')
  expect(response?.status()).toBeLessThan(500)
  await expect(page.getByText('Platform readiness')).toBeVisible()
})

test('software engineers persona page loads', async ({ page }) => {
  const response = await page.goto('/for/software-engineers')
  expect(response?.ok()).toBeTruthy()
  await expect(page.locator('body')).not.toContainText('Internal Server Error')
})
