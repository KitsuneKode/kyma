import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { BillingSettingsPanel } from '@/components/admin/billing-settings-panel'
import { SettingsSubNav } from '@/components/admin/settings-sub-nav'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import {
  settingsFormKey,
  WorkspaceSettingsForms,
} from '@/components/admin/workspace-settings-forms'
import { TeamInviteForm } from '@/components/admin/team-invite-form'
import { Button } from '@/components/ui/button'
import { WorkspaceQueryState } from '@/components/workspace/query-state'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { hasOrgPermission, requireRecruiterPageAccess } from '@/lib/auth/access'
import { dodoBillingReady, getConfiguredDodoCatalog } from '@/lib/billing/dodo'
import { serverConvexQuery } from '@/lib/convex/server-query'
import { signInPath } from '@/lib/auth/workspace-intent'

export default async function SettingsPage() {
  await requireRecruiterPageAccess()
  const canEditSettings = await hasOrgPermission('recruiter:settings:write')
  const canEditBilling =
    (await hasOrgPermission('recruiter:billing:write')) || canEditSettings

  const [settingsResult, billingResult] = await Promise.all([
    serverConvexQuery(api.recruiter.workspace.getWorkspaceSettings, {}),
    serverConvexQuery(api.billing.getOrgBilling, {}),
  ])

  const queryStatus = !settingsResult.ok
    ? 'error'
    : settingsResult.data === null
      ? 'empty'
      : 'ready'

  const dodoReady = dodoBillingReady()
  const catalogConfigured = getConfiguredDodoCatalog().length > 0

  return (
    <div className="flex w-full flex-col gap-8">
      <WorkspacePageHeader
        eyebrow="Configuration"
        title="Workspace Settings"
        description="Manage billing, BYOK provider keys, default models, and candidate release policy."
      />

      <SettingsSubNav />

      {billingResult.ok && billingResult.data ? (
        <BillingSettingsPanel
          billing={billingResult.data}
          catalogConfigured={catalogConfigured}
          dodoReady={dodoReady}
          readOnly={!canEditBilling}
        />
      ) : null}

      <WorkspaceQueryState
        status={queryStatus}
        emptyTitle="Settings unavailable"
        emptyDescription="Workspace settings are not available for this organization yet. Confirm your organization access and try again."
        emptyAction={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/recruiter" />}
          >
            Back to recruiter
          </Button>
        }
        errorTitle={
          settingsResult.ok
            ? 'Unable to load settings'
            : settingsResult.kind === 'auth'
              ? 'Sign in required'
              : 'Unable to load settings'
        }
        errorDescription={
          settingsResult.ok
            ? ''
            : (settingsResult.message ??
              'Settings could not be loaded. Confirm your organization access and try again.')
        }
        errorAction={
          settingsResult.ok ? undefined : settingsResult.kind === 'auth' ? (
            <Button
              nativeButton={false}
              render={<Link href={signInPath('recruiter')} />}
            >
              Sign in again
            </Button>
          ) : (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/recruiter" />}
            >
              Back to recruiter
            </Button>
          )
        }
      >
        {settingsResult.ok && settingsResult.data ? (
          <>
            {!canEditSettings ? (
              <WorkspaceSurface className="border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm text-muted-foreground">
                  You have view-only access to workspace settings. Ask an org
                  admin to update provider keys, default models, or candidate
                  release policy.
                </p>
              </WorkspaceSurface>
            ) : null}
            <TeamInviteForm />
            <WorkspaceSettingsForms
              key={settingsFormKey(settingsResult.data)}
              settings={settingsResult.data}
              readOnly={!canEditSettings}
            />
          </>
        ) : null}
      </WorkspaceQueryState>
    </div>
  )
}
