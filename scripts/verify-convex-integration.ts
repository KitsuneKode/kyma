#!/usr/bin/env bun
/**
 * Real local verification of Convex-owned product surfaces.
 *
 * This is NOT a mock suite. It drives the running local Convex deployment:
 * 1. Seeds invite/session data (`bunx convex run` internal mutations)
 * 2. Calls the real bootstrap action (mints a LiveKit JWT with local keys)
 * 3. POSTs a cryptographically signed LiveKit webhook to Convex HTTP
 * 4. POSTs a Standard Webhooks-signed Clerk event to Convex HTTP
 * 5. Runs processing recovery (Inngest enqueue against local event sink)
 *
 * Usage: bun run scripts/run-convex-integration.sh
 */

import { createHash, randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { connect as netConnect } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { AccessToken } from 'livekit-server-sdk'
import { Webhook } from 'standardwebhooks'

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? 'http://127.0.0.1:3210'
const CONVEX_SITE_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? 'http://127.0.0.1:3211'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devkey'
const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET ?? 'secretsecretsecretsecretsecretsecre'
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? 'ws://127.0.0.1:7880'
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET

type StepResult = { name: string; ok: boolean; detail: string }
const results: StepResult[] = []

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}: ${detail}`)
}

function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })
  })
}

async function convexRun<T>(
  fn: string,
  args: Record<string, unknown>
): Promise<T> {
  const { stdout, stderr, exitCode } = await runCommand(
    'bunx',
    ['convex', 'run', fn, JSON.stringify(args)],
    {
      ...process.env,
      CONVEX_AGENT_MODE: 'anonymous',
    }
  )
  if (exitCode !== 0) {
    throw new Error(
      `convex run ${fn} failed (${exitCode}): ${stderr || stdout}`
    )
  }
  const trimmed = stdout.trim()
  if (!trimmed || trimmed === 'null') {
    return null as T
  }
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const start = Math.min(
      ...['{', '[']
        .map((ch) => {
          const idx = trimmed.indexOf(ch)
          return idx === -1 ? Number.POSITIVE_INFINITY : idx
        })
        .filter((idx) => Number.isFinite(idx))
    )
    if (!Number.isFinite(start)) {
      throw new Error(`Unable to parse convex run output for ${fn}: ${trimmed}`)
    }
    try {
      return JSON.parse(trimmed.slice(start)) as T
    } catch {
      throw new Error(`Unable to parse convex run output for ${fn}: ${trimmed}`)
    }
  }
}

function tcpReachable(host: string, port: number, timeoutMs = 500) {
  return new Promise<boolean>((resolve) => {
    const socket = netConnect({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, timeoutMs)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.end()
      resolve(true)
    })
    socket.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

async function waitForConvex(url: string, attempts = 40) {
  const parsed = new URL(url)
  const host = parsed.hostname
  const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
  for (let i = 0; i < attempts; i += 1) {
    if (await tcpReachable(host, port)) {
      return
    }
    await delay(500)
  }
  throw new Error(`Convex backend not reachable at ${url}`)
}

async function signLivekitWebhook(body: string) {
  const hash = createHash('sha256').update(body).digest()
  const sha256 = Buffer.from(hash).toString('base64')
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    ttl: '5m',
  })
  token.sha256 = sha256
  return await token.toJwt()
}

async function postLivekitWebhook(body: string) {
  const auth = await signLivekitWebhook(body)
  const response = await fetch(`${CONVEX_SITE_URL}/livekit/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      Authorize: auth,
    },
    body,
  })
  return { status: response.status, text: await response.text() }
}

async function postClerkWebhook(payload: Record<string, unknown>) {
  if (!CLERK_WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SIGNING_SECRET is required')
  }
  const body = JSON.stringify(payload)
  const msgId = `msg_${randomBytes(8).toString('hex')}`
  const timestamp = new Date()
  const wh = new Webhook(CLERK_WEBHOOK_SECRET)
  const signature = wh.sign(msgId, timestamp, body)
  const response = await fetch(`${CONVEX_SITE_URL}/webhooks/clerk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Clerk's verifyWebhook expects the Svix header names.
      'svix-id': msgId,
      'svix-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
      'svix-signature': signature,
      'webhook-id': msgId,
      'webhook-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
      'webhook-signature': signature,
    },
    body,
  })
  return { status: response.status, text: await response.text() }
}

function decodeJwtPayload(token: string) {
  const part = token.split('.')[1]
  if (!part) throw new Error('Invalid JWT')
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as {
    sub?: string
    video?: { room?: string; roomJoin?: boolean }
    name?: string
  }
}

async function main() {
  console.log('=== Convex integration verification (real local runtime) ===')
  console.log(`Convex URL: ${CONVEX_URL}`)
  console.log(`Convex site URL: ${CONVEX_SITE_URL}`)

  if (!CLERK_WEBHOOK_SECRET) {
    throw new Error(
      'CLERK_WEBHOOK_SIGNING_SECRET must be set (and synced to Convex).'
    )
  }

  await waitForConvex(CONVEX_URL)
  record('convex.reachable', true, CONVEX_URL)

  // 1. Bootstrap action
  const inviteToken = `integration-${randomBytes(6).toString('hex')}`
  const participantName = 'Integration Candidate'
  await convexRun('integrationSeed:seedPublicInvite', {
    inviteToken,
    participantName,
  })

  try {
    const bootstrapped = await convexRun<{
      sessionId: string
      roomName: string
      token: string
      wsUrl: string
      participantName: string
    }>('interviews/bootstrapActions:bootstrapInterviewSession', {
      inviteToken,
      participantName,
    })
    const claims = decodeJwtPayload(bootstrapped.token)
    const tokenOk =
      Boolean(bootstrapped.token) &&
      claims.sub === `candidate-${bootstrapped.sessionId}` &&
      claims.video?.room === bootstrapped.roomName &&
      bootstrapped.wsUrl === LIVEKIT_URL

    record(
      'bootstrap.action',
      tokenOk,
      tokenOk
        ? `session=${bootstrapped.sessionId} room=${bootstrapped.roomName} jwt.sub=${claims.sub}`
        : `unexpected token payload: ${JSON.stringify(claims)} wsUrl=${bootstrapped.wsUrl}`
    )
  } catch (error) {
    record(
      'bootstrap.action',
      false,
      error instanceof Error ? error.message : String(error)
    )
  }

  // 2. LiveKit webhook HTTP
  const liveSeed = await convexRun<{
    sessionId?: string
    roomName?: string
  }>('integrationSeed:seedPublicInvite', {
    inviteToken: `lk-${randomBytes(6).toString('hex')}`,
    participantName: 'Webhook Candidate',
    withLiveSession: true,
  })

  if (!liveSeed.sessionId || !liveSeed.roomName) {
    record('livekit.webhook', false, 'seed did not return session/room')
  } else {
    const body = JSON.stringify({
      event: 'participant_left',
      room: { name: liveSeed.roomName },
      participant: {
        identity: `candidate-${liveSeed.sessionId}`,
        name: 'Webhook Candidate',
      },
    })
    const { status, text } = await postLivekitWebhook(body)
    const httpOk = status === 200 && text.includes('"ok":true')
    record(
      'livekit.webhook.http',
      httpOk,
      `status=${status} body=${text.slice(0, 200)}`
    )

    await delay(500)
    const snapshot = await convexRun<{
      state: string
      eventCount: number
    } | null>('integrationSeed:getSessionSnapshot', {
      sessionId: liveSeed.sessionId,
    })
    const stateOk = snapshot?.state === 'interrupted'
    record(
      'livekit.webhook.effect',
      stateOk,
      stateOk
        ? `session -> interrupted (events=${snapshot?.eventCount})`
        : `expected interrupted, got ${snapshot?.state ?? 'null'}`
    )
  }

  // 3. Clerk webhook HTTP
  const clerkId = `user_integration_${randomBytes(4).toString('hex')}`
  const clerkResponse = await postClerkWebhook({
    type: 'user.created',
    data: {
      id: clerkId,
      first_name: 'Integration',
      last_name: 'User',
      email_addresses: [
        { id: 'idn_1', email_address: `${clerkId}@example.com` },
      ],
      primary_email_address_id: 'idn_1',
      public_metadata: { preferredWorkspace: 'candidate' },
    },
    object: 'event',
  })
  const clerkHttpOk =
    clerkResponse.status === 200 && clerkResponse.text.includes('"ok":true')
  record(
    'clerk.webhook.http',
    clerkHttpOk,
    `status=${clerkResponse.status} body=${clerkResponse.text.slice(0, 200)}`
  )

  await delay(500)
  const syncedUser = await convexRun<{
    clerkId: string
    email?: string
  } | null>('integrationSeed:getUserByClerkId', { clerkId })
  record(
    'clerk.webhook.effect',
    Boolean(syncedUser),
    syncedUser
      ? `synced user ${syncedUser.email ?? syncedUser.clerkId}`
      : 'user row not found after webhook'
  )

  // 4. Processing recovery via Inngest event sink
  const processingInvite = `proc-${randomBytes(6).toString('hex')}`
  try {
    const processingSession = await convexRun<{
      sessionId: string
    }>('integrationSeed:seedProcessingSession', {
      inviteToken: processingInvite,
    })
    const requeue = await convexRun<{
      ok: true
      queued: boolean
      fallback: boolean
    }>('interviews/bootstrapActions:requeueInterviewProcessing', {
      sessionId: processingSession.sessionId,
      inviteToken: processingInvite,
    })
    record(
      'processing.requeue',
      requeue.ok === true && (requeue.queued || requeue.fallback),
      `queued=${requeue.queued} fallback=${requeue.fallback}`
    )
  } catch (error) {
    record(
      'processing.requeue',
      false,
      error instanceof Error ? error.message : String(error)
    )
  }

  const failed = results.filter((r) => !r.ok)
  console.log('\n=== Summary ===')
  for (const result of results) {
    console.log(`- ${result.ok ? '✓' : '✗'} ${result.name}: ${result.detail}`)
  }
  if (failed.length > 0) {
    console.error(`\n${failed.length} step(s) failed.`)
    process.exit(1)
  }
  console.log(`\nAll ${results.length} steps passed against local Convex.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
