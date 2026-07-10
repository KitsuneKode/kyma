import { httpRouter } from 'convex/server'

import { internal } from './_generated/api'
import { httpAction } from './_generated/server'

const http = httpRouter()

function getWebhookAuthorizationHeader(request: Request) {
  return (
    request.headers.get('authorization') ??
    request.headers.get('Authorization') ??
    request.headers.get('Authorize') ??
    undefined
  )
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

http.route({
  path: '/livekit/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.text()
    const result = await ctx.runAction(
      internal.httpWebhooks.ingestLivekitWebhook,
      {
        body,
        authorization: getWebhookAuthorizationHeader(request) ?? undefined,
      }
    )
    if (!result.ok) {
      return jsonResponse({ error: result.error }, result.status)
    }
    return jsonResponse({ ok: true }, 200)
  }),
})

http.route({
  path: '/webhooks/clerk',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.text()
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    const result = await ctx.runAction(
      internal.httpWebhooks.ingestClerkWebhook,
      {
        body,
        headers,
      }
    )
    if (!result.ok) {
      return jsonResponse({ error: result.error }, result.status)
    }
    if (result.ignored) {
      return jsonResponse({ ok: true, ignored: result.ignored }, 200)
    }
    return jsonResponse({ ok: true }, 200)
  }),
})

export default http
