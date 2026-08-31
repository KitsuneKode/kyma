/**
 * Serialize JSON-LD safely for an inline script tag.
 *
 * JSON.stringify alone permits a string containing `</script>` to terminate the
 * surrounding HTML script element. Escaping HTML-significant characters keeps
 * structured data valid JSON while preventing script-context termination.
 */
export function serializeJsonLd(value: unknown): string {
  return (JSON.stringify(value) ?? '')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
}
