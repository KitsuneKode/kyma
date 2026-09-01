import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import {
  findConflictMarkers,
  type TrackedTextFile,
} from '../lib/ci/conflict-markers'

function readTrackedTextFiles(): TrackedTextFile[] {
  const paths = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)

  return paths.flatMap((path) => {
    const contents = readFileSync(path)
    if (contents.includes(0)) {
      return []
    }
    return [{ path, contents: contents.toString('utf8') }]
  })
}

const findings = findConflictMarkers(readTrackedTextFiles())

for (const finding of findings) {
  console.error(`${finding.path}:${finding.line}: ${finding.marker}`)
}

if (findings.length > 0) {
  process.exitCode = 1
}
