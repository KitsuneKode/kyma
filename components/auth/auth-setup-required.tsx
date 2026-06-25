import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { Button } from '@/components/ui/button'
import type { ClerkSetupMissingKey } from '@/lib/clerk/setup-status'

const SETUP_STEPS: { key: ClerkSetupMissingKey; hint: string }[] = [
  {
    key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    hint: 'Copy from Clerk Dashboard → API Keys → Publishable key',
  },
  {
    key: 'CLERK_SECRET_KEY',
    hint: 'Copy from Clerk Dashboard → API Keys → Secret key',
  },
  {
    key: 'CLERK_FRONTEND_API_URL',
    hint: 'Set to your Clerk Frontend API URL (or leave blank if publishable key can derive it)',
  },
  {
    key: 'NEXT_PUBLIC_CONVEX_URL',
    hint: 'Run `bun run convex:dev` once; Convex writes this to .env.local',
  },
  {
    key: 'KYMA_PROCESSING_WRITE_KEY',
    hint: 'Any long random string for local dev (e.g. openssl rand -hex 32)',
  },
]

type AuthSetupRequiredProps = {
  missing: ClerkSetupMissingKey[]
  derivedIssuerDomain?: string | null
}

export function AuthSetupRequired({
  missing,
  derivedIssuerDomain,
}: AuthSetupRequiredProps) {
  const missingSet = new Set(missing)

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Kyma
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Authentication is not configured
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign-in is disabled until Clerk and Convex credentials are present in{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            .env.local
          </code>
          .
        </p>
      </header>

      <Alert>
        <AlertTitle>Local environment setup required</AlertTitle>
        <AlertDescription>
          Add the missing variables below to{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            .env.local
          </code>{' '}
          before signing in.
        </AlertDescription>
      </Alert>

      <WorkspaceSurface className="space-y-4 p-6">
        <h2 className="text-base font-semibold">Missing configuration</h2>
        <ul className="space-y-3 text-sm">
          {SETUP_STEPS.filter(
            (step) =>
              missingSet.has(step.key) ||
              (step.key === 'CLERK_FRONTEND_API_URL' &&
                missingSet.has('CLERK_JWT_ISSUER_DOMAIN'))
          ).map((step) => (
            <li
              key={step.key}
              className="rounded-lg border border-border/50 p-3"
            >
              <p className="font-mono text-xs font-medium">{step.key}</p>
              <p className="mt-1 text-muted-foreground">{step.hint}</p>
            </li>
          ))}
        </ul>
        {derivedIssuerDomain ? (
          <p className="text-xs text-muted-foreground">
            Detected issuer from publishable key:{' '}
            <code className="rounded bg-muted px-1 py-0.5">
              {derivedIssuerDomain}
            </code>
            . Add it as{' '}
            <code className="rounded bg-muted px-1 py-0.5">
              CLERK_FRONTEND_API_URL
            </code>{' '}
            and sync to Convex.
          </p>
        ) : null}
      </WorkspaceSurface>

      <WorkspaceSurface className="space-y-3 p-6">
        <h2 className="text-base font-semibold">Quick setup</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Copy <code className="text-xs">.env.example</code> values into{' '}
            <code className="text-xs">.env.local</code> and fill Clerk keys.
          </li>
          <li>
            Run{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              bun run convex:sync-env
            </code>{' '}
            to push Clerk vars to your Convex deployment.
          </li>
          <li>
            Run{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              bun run clerk:setup-auth
            </code>{' '}
            and paste the session-token JSON into Clerk Dashboard.
          </li>
          <li>Restart the dev server and try sign-in again.</li>
        </ol>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button nativeButton={false} render={<Link href="/dev" />}>
            Open dev setup hub
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <a
                href="https://dashboard.clerk.com"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Open Clerk Dashboard
          </Button>
        </div>
      </WorkspaceSurface>
    </div>
  )
}
