#!/usr/bin/env node
/**
 * Capture real README product screenshots from the live marketing site.
 * Usage: node scripts/capture-readme-screenshots.mjs
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const baseUrl =
  process.env.README_SCREENSHOT_URL ?? 'https://kyma.kitsunelabs.xyz'

mkdirSync(publicDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2,
})

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

// Hero: marketing headline + product preview peek
await page.evaluate(() => window.scrollTo(0, 0))
await page.screenshot({
  path: join(publicDir, 'readme-hero.png'),
  fullPage: false,
})

// Recruiter review workspace (interactive product showcase on the homepage)
await page.evaluate(() => {
  const heading = [...document.querySelectorAll('h2')].find((el) =>
    el.textContent?.includes('Aarav Mehta')
  )
  heading?.scrollIntoView({ block: 'center' })
})
await page.waitForTimeout(800)
await page.screenshot({
  path: join(publicDir, 'readme-recruiter.png'),
  fullPage: false,
})

// Candidate flow: transcript panel from the live interview demo
const transcript = page.locator('div.overflow-y-auto').filter({
  has: page.locator('[data-segment-id]'),
})
await transcript.first().scrollIntoViewIfNeeded()
await page.waitForTimeout(500)
const box = await transcript.first().boundingBox()
if (box) {
  await page.screenshot({
    path: join(publicDir, 'readme-candidate.png'),
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    },
  })
} else {
  throw new Error('Could not locate transcript panel for candidate screenshot')
}

await browser.close()
console.log(
  'Captured readme-hero.png, readme-recruiter.png, readme-candidate.png'
)
