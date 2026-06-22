import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  serverSchema,
  clientSchema,
  convexServerSchema,
  convexClientSchema,
  toolingEnvKeys,
} from './shared'

function parseEnvExample(path: string) {
  const source = readFileSync(join(process.cwd(), path), 'utf8')
  const keys = new Set<string>()
  const duplicates = new Set<string>()

  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const match = trimmed.match(/^([A-Z0-9_]+)=/)
    if (match?.[1]) {
      if (keys.has(match[1])) {
        duplicates.add(match[1])
      }
      keys.add(match[1])
    }
  }

  return { keys, duplicates }
}

describe('env template schema contract', () => {
  test('.env.example keys are declared in shared schemas', () => {
    const { keys: exampleKeys, duplicates } = parseEnvExample('.env.example')
    const schemaKeys = new Set([
      ...Object.keys(serverSchema),
      ...Object.keys(clientSchema),
    ])

    const missing = [...exampleKeys].filter(
      (key) =>
        !schemaKeys.has(key) &&
        !toolingEnvKeys.includes(key as (typeof toolingEnvKeys)[number])
    )
    expect([...duplicates]).toEqual([])
    expect(missing).toEqual([])
  })

  test('convex/.env.example keys are declared in convex schemas', () => {
    const { keys: exampleKeys, duplicates } = parseEnvExample(
      'convex/.env.example'
    )
    const schemaKeys = new Set([
      ...Object.keys(convexServerSchema),
      ...Object.keys(convexClientSchema),
    ])

    const missing = [...exampleKeys].filter(
      (key) =>
        !schemaKeys.has(key) &&
        !toolingEnvKeys.includes(key as (typeof toolingEnvKeys)[number])
    )
    expect([...duplicates]).toEqual([])
    expect(missing).toEqual([])
  })
})
