import { describe, expect, test } from 'vitest'

import { serializeJsonLd } from './serialize-json-ld'

describe('serializeJsonLd', () => {
  test('escapes script-sensitive characters without changing JSON semantics', () => {
    const serialized = serializeJsonLd({
      name: '</script><script>alert(1)</script>',
    })

    expect(serialized).not.toContain('</script>')
    expect(serialized).toContain('\\u003c/script\\u003e')
    expect(JSON.parse(serialized).name).toBe(
      '</script><script>alert(1)</script>'
    )
  })
})
