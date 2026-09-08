#!/usr/bin/env bun
/**
 * Export brand SVG sources to PNG assets used by GitHub and legacy fallbacks.
 *
 * Usage: bun run scripts/export-brand-pngs.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
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

renderPng(markSvg, 512, join(publicDir, 'kyma-mark.png'))
renderPng(markSvg, 16, join(publicDir, 'favicon-16x16.png'))
renderPng(markSvg, 32, join(publicDir, 'favicon-32x32.png'))
renderPng(markSvg, 48, join(publicDir, 'favicon-48x48.png'))
renderPng(markSvg, 180, join(publicDir, 'apple-touch-icon.png'))
renderPng(markSvg, 192, join(publicDir, 'android-chrome-192x192.png'))
renderPng(markSvg, 512, join(publicDir, 'android-chrome-512x512.png'))
renderPng(ogSvg, 1200, join(publicDir, 'og-image.png'))

const faviconIco = join(publicDir, 'favicon.ico')
const appFaviconIco = join(root, 'app', 'favicon.ico')

function pngToIco(png: Buffer, width: number, height: number) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry.writeUInt8(width >= 256 ? 0 : width, 0)
  entry.writeUInt8(height >= 256 ? 0 : height, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, png])
}

const magick = spawnSync(
  'magick',
  [
    join(publicDir, 'favicon-16x16.png'),
    join(publicDir, 'favicon-32x32.png'),
    join(publicDir, 'favicon-48x48.png'),
    faviconIco,
  ],
  { stdio: 'inherit' }
)

if (magick.status !== 0) {
  const png32 = readFileSync(join(publicDir, 'favicon-32x32.png'))
  writeFileSync(faviconIco, pngToIco(png32, 32, 32))
}

writeFileSync(appFaviconIco, readFileSync(faviconIco))

console.log('Exported brand and favicon assets from SVG sources.')
