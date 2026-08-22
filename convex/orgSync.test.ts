// @vitest-environment edge-runtime
/// <reference types="vite/client" />

// Webhook sync mutations authenticate with the processing write key.
process.env.KYMA_PROCESSING_WRITE_KEY = 'test-processing-key'

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const WRITE_KEY = 'test-processing-key'
const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

describe('clerk org sync patch semantics', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = WRITE_KEY
  })

  test('a partial payload preserves existing slug and imageUrl', async () => {
    const t = harness()

    await t.mutation(api.orgs.syncOrgFromClerkWebhook, {
      writeKey: WRITE_KEY,
      eventType: 'organization.created',
      clerkOrgId: 'org_clerk_1',
      name: 'Acme',
      slug: 'acme',
      imageUrl: 'https://img.example/acme.png',
    })

    // A later event carrying only the name must not erase the other fields.
    await t.mutation(api.orgs.syncOrgFromClerkWebhook, {
      writeKey: WRITE_KEY,
      eventType: 'organization.updated',
      clerkOrgId: 'org_clerk_1',
      name: 'Acme Renamed',
    })

    const org = await t.run((ctx) =>
      ctx.db
        .query('organizations')
        .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', 'org_clerk_1'))
        .unique()
    )

    expect(org?.name).toBe('Acme Renamed')
    expect(org?.slug).toBe('acme')
    expect(org?.imageUrl).toBe('https://img.example/acme.png')
  })

  test('an explicit slug change still applies', async () => {
    const t = harness()

    await t.mutation(api.orgs.syncOrgFromClerkWebhook, {
      writeKey: WRITE_KEY,
      eventType: 'organization.created',
      clerkOrgId: 'org_clerk_2',
      name: 'Beta',
      slug: 'beta',
    })

    await t.mutation(api.orgs.syncOrgFromClerkWebhook, {
      writeKey: WRITE_KEY,
      eventType: 'organization.updated',
      clerkOrgId: 'org_clerk_2',
      slug: 'beta-renamed',
    })

    const org = await t.run((ctx) =>
      ctx.db
        .query('organizations')
        .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', 'org_clerk_2'))
        .unique()
    )

    expect(org?.slug).toBe('beta-renamed')
  })
})

describe('clerk user sync patch semantics', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = WRITE_KEY
  })

  test('a partial user payload preserves the existing email', async () => {
    const t = harness()

    await t.mutation(api.users.syncFromClerkWebhook, {
      writeKey: WRITE_KEY,
      eventType: 'user.created',
      clerkId: 'user_sync_1',
      email: 'person@example.com',
      name: 'Person One',
    })

    // A Clerk user.updated carrying only the name must not delete the email:
    // `by_candidate_email` is the primary key for GDPR subject lookup.
    await t.mutation(api.users.syncFromClerkWebhook, {
      writeKey: WRITE_KEY,
      eventType: 'user.updated',
      clerkId: 'user_sync_1',
      name: 'Person Renamed',
    })

    const user = await t.run((ctx) =>
      ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', 'user_sync_1'))
        .unique()
    )

    expect(user?.name).toBe('Person Renamed')
    expect(user?.email).toBe('person@example.com')
  })
})

describe('dodo billing event retry semantics', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = WRITE_KEY
  })

  test('an event for an unmirrored org is not recorded, so it can retry', async () => {
    const t = harness()

    const result = await t.mutation(api.billing.applyDodoSubscriptionEvent, {
      writeKey: WRITE_KEY,
      eventKey: 'evt_unknown_org',
      eventType: 'subscription.active',
      clerkOrgId: 'org_not_yet_mirrored',
      plan: 'pro',
      status: 'active',
    })

    expect(result.applied).toBe(false)

    const recorded = await t.run((ctx) =>
      ctx.db
        .query('billingWebhookEvents')
        .withIndex('by_event_key', (q) => q.eq('eventKey', 'evt_unknown_org'))
        .unique()
    )

    // Recording it would make the dedupe check suppress every redelivery,
    // stranding the org on the wrong plan permanently.
    expect(recorded).toBeNull()
  })

  test('a redelivered event applies once the org exists', async () => {
    const t = harness()

    await t.mutation(api.billing.applyDodoSubscriptionEvent, {
      writeKey: WRITE_KEY,
      eventKey: 'evt_retry',
      eventType: 'subscription.active',
      clerkOrgId: 'org_late_mirror',
      plan: 'pro',
      status: 'active',
    })

    await t.mutation(api.orgs.syncOrgFromClerkWebhook, {
      writeKey: WRITE_KEY,
      eventType: 'organization.created',
      clerkOrgId: 'org_late_mirror',
      name: 'Late Mirror',
    })

    const result = await t.mutation(api.billing.applyDodoSubscriptionEvent, {
      writeKey: WRITE_KEY,
      eventKey: 'evt_retry',
      eventType: 'subscription.active',
      clerkOrgId: 'org_late_mirror',
      plan: 'pro',
      status: 'active',
    })

    expect(result.applied).toBe(true)

    const org = await t.run((ctx) =>
      ctx.db
        .query('organizations')
        .withIndex('by_clerk_org_id', (q) =>
          q.eq('clerkOrgId', 'org_late_mirror')
        )
        .unique()
    )

    expect(org?.plan).toBe('pro')
  })

  test('a genuine duplicate is still suppressed', async () => {
    const t = harness()

    await t.mutation(api.orgs.syncOrgFromClerkWebhook, {
      writeKey: WRITE_KEY,
      eventType: 'organization.created',
      clerkOrgId: 'org_dupe',
      name: 'Dupe Co',
    })

    const first = await t.mutation(api.billing.applyDodoSubscriptionEvent, {
      writeKey: WRITE_KEY,
      eventKey: 'evt_dupe',
      eventType: 'subscription.active',
      clerkOrgId: 'org_dupe',
      plan: 'pro',
      status: 'active',
    })
    const second = await t.mutation(api.billing.applyDodoSubscriptionEvent, {
      writeKey: WRITE_KEY,
      eventKey: 'evt_dupe',
      eventType: 'subscription.active',
      clerkOrgId: 'org_dupe',
      plan: 'enterprise',
      status: 'active',
    })

    expect(first.applied).toBe(true)
    expect(second.applied).toBe(false)

    const org = await t.run((ctx) =>
      ctx.db
        .query('organizations')
        .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', 'org_dupe'))
        .unique()
    )

    // The duplicate must not have upgraded the plan a second time.
    expect(org?.plan).toBe('pro')
  })
})
