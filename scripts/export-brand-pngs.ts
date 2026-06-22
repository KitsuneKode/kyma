#!/usr/bin/env bun
/**
 * Export brand SVG sources to PNG assets used by README, GitHub, and legacy fallbacks.
 *
 * Usage: bun run scripts/export-brand-pngs.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const root = process.cwd()
const brandDir = join(root, 'public', 'brand')
const publicDir = join(root, 'public')

function renderPng(svgPath: string, width: number, outputPath: string) {
  const svg = readFileSync(svgPath, 'utf8')
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'transparent',
  })
  const png = resvg.render().asPng()
  writeFileSync(outputPath, png)
}

mkdirSync(brandDir, { recursive: true })

const markSvg = join(brandDir, 'kyma-mark.svg')
const ogSvg = join(brandDir, 'og-image.svg')
const readmeHeroSvg = join(brandDir, 'readme-hero.svg')
const readmeCandidateSvg = join(brandDir, 'readme-candidate.svg')
const readmeRecruiterSvg = join(brandDir, 'readme-recruiter.svg')

renderPng(markSvg, 512, join(publicDir, 'kyma-mark.png'))
renderPng(markSvg, 16, join(publicDir, 'favicon-16x16.png'))
renderPng(markSvg, 32, join(publicDir, 'favicon-32x32.png'))
renderPng(markSvg, 48, join(publicDir, 'favicon-48x48.png'))
renderPng(markSvg, 180, join(publicDir, 'apple-touch-icon.png'))
renderPng(markSvg, 192, join(publicDir, 'android-chrome-192x192.png'))
renderPng(markSvg, 512, join(publicDir, 'android-chrome-512x512.png'))
renderPng(ogSvg, 1200, join(publicDir, 'og-image.png'))
renderPng(readmeHeroSvg, 1400, join(publicDir, 'readme-hero.png'))
renderPng(readmeCandidateSvg, 1400, join(publicDir, 'readme-candidate.png'))
renderPng(readmeRecruiterSvg, 1400, join(publicDir, 'readme-recruiter.png'))

console.log('Exported brand and README PNG assets from SVG sources.')
