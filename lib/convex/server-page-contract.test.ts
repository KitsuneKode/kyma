import { describe, expect, test } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const appRoot = join(process.cwd(), 'app')
const allowedDirectFetch = new Set([join(appRoot, 'api')])

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      return walk(fullPath)
    }
    return fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')
      ? [fullPath]
      : []
  })
}

describe('server page convex fetch contract', () => {
  test('app pages do not import convex/nextjs directly', () => {
    const offenders = walk(appRoot).filter((filePath) => {
      if (filePath.includes(`${join('app', 'api')}${join('', '')}`)) {
        return false
      }
      if (allowedDirectFetch.has(filePath)) {
        return false
      }
      if (!filePath.includes(`${join('app', '')}`)) {
        return false
      }
      if (filePath.includes(`${join('app', 'api')}`)) {
        return false
      }
      const source = readFileSync(filePath, 'utf8')
      return source.includes("from 'convex/nextjs'")
    })

    expect(offenders).toEqual([])
  })
})
