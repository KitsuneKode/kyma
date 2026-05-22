/**
 * Idempotent Kyma Clerk auth bootstrap via Backend API.
 *
 * Usage:
 *   bun run clerk:setup-auth
 *
 * Requires CLERK_SECRET_KEY in .env.local (or env).
 * Session-token claims still require one Dashboard paste (printed at end).
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_LOCAL = join(ROOT, '.env.local')

type ClerkPermission = {
  id: string
  key: string
  name: string
}

type ClerkRole = {
  id: string
  key: string
  permissions: ClerkPermission[]
}

type JwtTemplate = {
  id: string
  name: string
  claims: Record<string, unknown>
}

/** Clerk custom permissions must be exactly org:segment:segment (3 parts). */
const RECRUITER_PERMISSIONS = [
  {
    key: 'org:recruiter:access',
    name: 'Recruiter access',
    description: 'Access recruiter workspace in Kyma',
  },
] as const

const CONVEX_TEMPLATE_CLAIMS = {
  aud: 'convex',
  org_id: '{{org.id}}',
  org_role: '{{org.role}}',
  org_permissions: '{{org_membership.permissions}}',
  metadata: {
    preferredWorkspace: '{{user.public_metadata.preferredWorkspace}}',
    persona: '{{user.public_metadata.persona}}',
  },
}

const SESSION_TOKEN_CLAIMS_JSON = {
  metadata: '{{user.public_metadata}}',
  org_id: '{{org.id}}',
  org_role: '{{org.role}}',
  org_permissions: '{{org_membership.permissions}}',
}

function loadSecretKey() {
  if (process.env.CLERK_SECRET_KEY?.trim()) {
    return process.env.CLERK_SECRET_KEY.trim()
  }
  if (!existsSync(ENV_LOCAL)) {
    throw new Error(
      'CLERK_SECRET_KEY missing. Add it to .env.local or export it.'
    )
  }
  for (const line of readFileSync(ENV_LOCAL, 'utf8').split('\n')) {
    const match = line.match(/^CLERK_SECRET_KEY=(.+)$/)
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, '')
    }
  }
  throw new Error('CLERK_SECRET_KEY not found in .env.local')
}

async function clerkApi<T>(
  secretKey: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`https://api.clerk.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const text = await response.text()
  const body = text ? (JSON.parse(text) as T) : ({} as T)
  if (!response.ok) {
    throw new Error(
      `Clerk API ${init?.method ?? 'GET'} ${path} failed (${response.status}): ${text}`
    )
  }
  return body
}

async function listPermissions(secretKey: string) {
  const result = await clerkApi<{ data: ClerkPermission[] }>(
    secretKey,
    '/v1/organization_permissions?limit=100'
  )
  return result.data
}

async function ensurePermission(
  secretKey: string,
  spec: (typeof RECRUITER_PERMISSIONS)[number]
) {
  const existing = (await listPermissions(secretKey)).find(
    (permission) => permission.key === spec.key
  )
  if (existing) {
    console.log(`  permission exists: ${spec.key}`)
    return existing
  }
  const created = await clerkApi<ClerkPermission>(
    secretKey,
    '/v1/organization_permissions',
    {
      method: 'POST',
      body: JSON.stringify({
        name: spec.name,
        key: spec.key,
        description: spec.description,
      }),
    }
  )
  console.log(`  created permission: ${spec.key}`)
  return created
}

async function listRoles(secretKey: string) {
  const result = await clerkApi<{ data: ClerkRole[] }>(
    secretKey,
    '/v1/organization_roles?limit=20'
  )
  return result.data
}

async function ensureRoleHasPermission(
  secretKey: string,
  roleKey: 'org:member' | 'org:admin',
  permissionId: string
) {
  const role = (await listRoles(secretKey)).find(
    (entry) => entry.key === roleKey
  )
  if (!role) {
    throw new Error(`Role ${roleKey} not found`)
  }
  if (role.permissions.some((permission) => permission.id === permissionId)) {
    return
  }
  await clerkApi<ClerkRole>(
    secretKey,
    `/v1/organization_roles/${role.id}/permissions/${permissionId}`,
    { method: 'POST' }
  )
  console.log(`  attached ${permissionId} to ${roleKey}`)
}

async function listJwtTemplates(secretKey: string) {
  const result = await clerkApi<{ data?: JwtTemplate[] } | JwtTemplate[]>(
    secretKey,
    '/v1/jwt_templates?limit=50'
  )
  return Array.isArray(result) ? result : (result.data ?? [])
}

async function ensureConvexTemplate(secretKey: string) {
  const existing = (await listJwtTemplates(secretKey)).find(
    (template) => template.name === 'convex'
  )
  if (existing) {
    await clerkApi<JwtTemplate>(secretKey, `/v1/jwt_templates/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'convex',
        claims: CONVEX_TEMPLATE_CLAIMS,
        lifetime: 3600,
        allowed_clock_skew: 5,
      }),
    })
    console.log('  updated JWT template: convex')
    return
  }
  await clerkApi<JwtTemplate>(secretKey, '/v1/jwt_templates', {
    method: 'POST',
    body: JSON.stringify({
      name: 'convex',
      claims: CONVEX_TEMPLATE_CLAIMS,
      lifetime: 3600,
      allowed_clock_skew: 5,
    }),
  })
  console.log('  created JWT template: convex')
}

async function main() {
  const secretKey = loadSecretKey()
  console.log('Kyma Clerk auth setup\n')

  const orgSettings = await clerkApi<{ enabled: boolean }>(
    secretKey,
    '/v1/instance/organization_settings'
  )
  if (!orgSettings.enabled) {
    console.warn(
      '  Organizations are disabled. Enable them in Dashboard → Organizations, then re-run.'
    )
  } else {
    console.log('  organizations: enabled')
  }

  console.log('\nRecruiter permissions:')
  const permissionRecords = []
  for (const spec of RECRUITER_PERMISSIONS) {
    permissionRecords.push(await ensurePermission(secretKey, spec))
  }

  console.log('\nRole assignments:')
  for (const permission of permissionRecords) {
    await ensureRoleHasPermission(secretKey, 'org:member', permission.id)
    await ensureRoleHasPermission(secretKey, 'org:admin', permission.id)
  }

  console.log('\nJWT templates:')
  await ensureConvexTemplate(secretKey)

  console.log('\n--- Manual step (required once) ---')
  console.log(
    'Clerk session tokens cannot be fully configured via Backend API yet.'
  )
  console.log('Dashboard → Sessions → Customize session token → paste:\n')
  console.log(JSON.stringify(SESSION_TOKEN_CLAIMS_JSON, null, 2))
  console.log(
    '\nThen: Organizations → Settings → Membership optional (if not already).'
  )
  console.log(
    'Note: staged permissions in code (org:recruiter:candidates:read, etc.) need'
  )
  console.log(
    '3-segment Clerk keys before Dashboard creation — only access is bootstrapped here.'
  )
  console.log('Sign out and sign in, then test /onboarding → /candidate.')
  console.log(
    '\nOptional debug: KYMA_AUTH_DEBUG=1 in .env.local while testing onboarding.'
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
