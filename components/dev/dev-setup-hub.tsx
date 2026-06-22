'use client'

import Link from 'next/link'
import { useAuth, useOrganization } from '@clerk/nextjs'
import { useAction, useConvexAuth, useMutation } from 'convex/react'
import { useMemo, useState } from 'react'

import type { ClerkSetupStatus } from '@/lib/clerk/setup-status'
import { AuthSetupRequired } from '@/components/auth/auth-setup-required'
import { ClerkJwtSetupCard } from '@/components/auth/clerk-jwt-setup-card'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { WorkspaceSurface } from '@/components/workspace/surface'

const SEED_CONFIRMATION = 'SEED_DEV_ONLY'
const RESET_CONFIRMATION = 'RESET_DEV_ONLY'

type SampleIndexEntry = {
  sessionId: string
  inviteToken: string
  candidateName: string
}

type SeedResult = {
  sampleIndex?: Record<string, SampleIndexEntry>
}

const SCREEN_LINKS = [
  { href: '/recruiter', label: 'Recruiter dashboard' },
  { href: '/recruiter/settings', label: 'Workspace settings' },
  { href: '/recruiter/screenings', label: 'Screenings list' },
  { href: '/recruiter/screenings/new', label: 'Create screening' },
  { href: '/recruiter/candidates', label: 'Candidates queue' },
  { href: '/recruiter/templates', label: 'Assessment templates' },
  { href: '/candidate', label: 'Candidate portal home' },
  { href: '/candidate/interviews', label: 'Candidate interviews' },
  { href: '/recruiter/setup', label: 'Recruiter org setup' },
  { href: '/interviews/demo-invite', label: 'Public demo invite' },
] as const

function DevSetupHubHeader() {
  return (
    <header className="space-y-2">
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Development
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Local setup hub</h1>
      <p className="text-sm text-muted-foreground">
        Fix Clerk ↔ Convex auth, seed data into your active organization, and
        jump to every major screen for QA.
      </p>
    </header>
  )
}

function DevScreenLinks() {
  return (
    <WorkspaceSurface className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Screen coverage map</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SCREEN_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </WorkspaceSurface>
  )
}

function DevSetupHubTools() {
  const { isSignedIn, userId } = useAuth()
  const { organization } = useOrganization()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentWorkspace = useMutation(
    api.workspace.ensureCurrentWorkspace
  )
  const seedForActiveOrg = useAction(api.devSeed.seedDevDataForActiveOrg)
  const resetDevData = useAction(api.devSeed.resetDevData)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null)

  const sampleEntries = useMemo(
    () => Object.entries(seedResult?.sampleIndex ?? {}),
    [seedResult?.sampleIndex]
  )

  async function runTask(label: string, task: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    setStatus(`${label}…`)
    try {
      const result = await task()
      setStatus(`${label} complete`)
      return result
    } catch (taskError) {
      setError(
        taskError instanceof Error ? taskError.message : 'Operation failed.'
      )
      setStatus(null)
      throw taskError
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <WorkspaceSurface className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Auth status</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Clerk signed in</dt>
            <dd>{isSignedIn ? 'yes' : 'no'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Clerk user id</dt>
            <dd className="font-mono text-xs">{userId ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Active organization</dt>
            <dd className="font-mono text-xs">
              {organization?.id ?? 'none selected'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Convex auth loading</dt>
            <dd>{isLoading ? 'yes' : 'no'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Convex authenticated</dt>
            <dd>{isAuthenticated ? 'yes' : 'no'}</dd>
          </div>
        </dl>
        {!isAuthenticated && !isLoading ? <ClerkJwtSetupCard compact /> : null}
      </WorkspaceSurface>

      <WorkspaceSurface className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Workspace tools</h2>
        <p className="text-sm text-muted-foreground">
          Run these after selecting your organization in the recruiter header
          switcher. Seeding is destructive for dev data and repopulates
          screenings, candidates, reports, and settings for your active org.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy || !isAuthenticated}
            onClick={() =>
              void runTask('Workspace sync', () => ensureCurrentWorkspace({}))
            }
          >
            Sync org + settings
          </Button>
          <Button
            type="button"
            disabled={busy || !isAuthenticated || !organization?.id}
            onClick={() =>
              void runTask('Seed active org', async () => {
                const result = (await seedForActiveOrg({
                  confirm: SEED_CONFIRMATION,
                  candidates: 24,
                  recruiters: 3,
                  orgName: organization?.name,
                })) as SeedResult
                setSeedResult(result)
                return result
              })
            }
          >
            Seed data for active org
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void runTask('Reset dev tables', () =>
                resetDevData({ confirm: RESET_CONFIRMATION })
              ).then(() => setSeedResult(null))
            }
          >
            Reset all dev data
          </Button>
        </div>
        {status ? (
          <p className="text-sm text-muted-foreground">{status}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {sampleEntries.length > 0 ? (
          <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="text-sm font-medium">
              Full-spectrum sample index ({sampleEntries.length} labels)
            </p>
            <ul className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
              {sampleEntries.map(([label, entry]) => (
                <li
                  key={label}
                  className="rounded-lg border border-border/40 bg-background/60 p-3 text-xs"
                >
                  <p className="font-mono font-medium">{label}</p>
                  <p className="mt-1 text-muted-foreground">
                    {entry.candidateName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/interviews/${entry.inviteToken}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Invite lobby
                    </Link>
                    <Link
                      href={`/recruiter/candidates/${entry.sessionId}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Review report
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          CLI alternative:{' '}
          <code className="rounded bg-muted px-1 py-0.5">
            bun run clerk:setup-auth
          </code>{' '}
          then{' '}
          <code className="rounded bg-muted px-1 py-0.5">
            bun run db:cutover:org-rbac:dev
          </code>{' '}
          (uses fixed org_seed — prefer the button above for your Clerk org).
        </p>
      </WorkspaceSurface>
    </>
  )
}

export function DevSetupHub({
  setupStatus,
}: {
  setupStatus: ClerkSetupStatus
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <DevSetupHubHeader />

      {!setupStatus.ready ? (
        <AuthSetupRequired
          missing={setupStatus.missing}
          derivedIssuerDomain={setupStatus.derivedIssuerDomain}
        />
      ) : (
        <DevSetupHubTools />
      )}

      <DevScreenLinks />
    </div>
  )
}
