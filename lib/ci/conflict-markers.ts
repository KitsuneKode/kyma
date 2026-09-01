export type TrackedTextFile = {
  path: string
  contents: string
}

export type ConflictMarkerFinding = {
  path: string
  line: number
  marker: string
}

const CONFLICT_MARKER =
  /^(<<<<<<<(?: .*)?|\|{7}(?: .*)?|=======|>>>>>>>(?: .*)?)$/

export function findConflictMarkers(
  files: readonly TrackedTextFile[]
): ConflictMarkerFinding[] {
  return files.flatMap(({ path, contents }) =>
    contents
      .split(/\r?\n/)
      .flatMap((line, index) =>
        CONFLICT_MARKER.test(line)
          ? [{ path, line: index + 1, marker: line }]
          : []
      )
  )
}
