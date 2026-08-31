import { describe, expect, test } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const repoRoot = process.cwd()

const allowedProcessEnvPaths = new Set([
  'lib/env/shared.ts',
  'lib/env/server.ts',
  'lib/env/client.ts',
  'lib/env/runtime.ts',
  'lib/env/convex.ts',
  'lib/env/node-env.ts',
  'convex/auth.config.ts',
  'scripts/clerk-setup-kyma-auth.ts',
  'agents/worker.ts',
  'instrumentation.ts',
  'proxy.ts',
])

const scanRoots = [
  'app',
  'components',
  'lib',
  'convex',
  'agents',
  'scripts',
  'proxy.ts',
  'instrumentation.ts',
]

function walk(dir: string): string[] {
  const ignored = new Set([
    'node_modules',
    '.next',
    '.git',
    'dist',
    'coverage',
    '.convex',
    '_generated',
  ])

  return readdirSync(dir).flatMap((entry) => {
    if (ignored.has(entry) || entry.startsWith('.')) {
      return []
    }

    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      return walk(fullPath)
    }

    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
      return []
    }

    return [fullPath]
  })
}

function collectScanTargets() {
  return scanRoots.flatMap((root) => {
    const fullPath = join(repoRoot, root)
    const stats = statSync(fullPath)
    if (!stats.isDirectory()) {
      return [fullPath]
    }
    return walk(fullPath)
  })
}

describe('process.env source-of-truth contract', () => {
  test('direct process.env reads stay inside documented adapters', () => {
    const offenders = collectScanTargets()
      .map((filePath) => relative(repoRoot, filePath))
      .filter((relativePath) => {
        if (allowedProcessEnvPaths.has(relativePath)) {
          return false
        }
        if (relativePath.endsWith('.test.ts')) {
          return false
        }

        const source = readFileSync(join(repoRoot, relativePath), 'utf8')
        return /\bprocess\.env\b/.test(source)
      })

    expect(offenders).toEqual([])
  })

  test('shared Next-facing helpers do not import standalone runtime env', () => {
    const forbiddenRuntimeEnvFiles = [
      'lib/providers/resolve-model.ts',
      'lib/livekit/config.ts',
      'lib/processing/run-interview-processing-pipeline.ts',
    ]

    const offenders = forbiddenRuntimeEnvFiles.filter((relativePath) => {
      const source = readFileSync(join(repoRoot, relativePath), 'utf8')
      return (
        source.includes('@/lib/env/runtime') ||
        source.includes('../env/runtime') ||
        /\bruntimeEnv\b/.test(source)
      )
    })

    expect(offenders).toEqual([])
  })
})
