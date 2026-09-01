import { describe, expect, test } from 'vitest'

import { findConflictMarkers } from './conflict-markers'

describe('findConflictMarkers', () => {
  test('reports every diff3 marker with its file and line', () => {
    expect(
      findConflictMarkers([
        {
          path: 'broken.ts',
          contents:
            'const ok = true\n<<<<<<< HEAD\nours\n||||||| base\nbase\n=======\ntheirs\n>>>>>>> branch\n',
        },
      ])
    ).toEqual([
      { path: 'broken.ts', line: 2, marker: '<<<<<<< HEAD' },
      { path: 'broken.ts', line: 4, marker: '||||||| base' },
      { path: 'broken.ts', line: 6, marker: '=======' },
      { path: 'broken.ts', line: 8, marker: '>>>>>>> branch' },
    ])
  })

  test('does not flag ordinary comparison operators or prose', () => {
    expect(
      findConflictMarkers([
        { path: 'clean.ts', contents: 'const result = left >= right\n' },
      ])
    ).toEqual([])
  })
})
