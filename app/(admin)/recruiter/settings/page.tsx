'use client'

import { api } from '@/convex/_generated/api'
import { ConvexAuthSetupPanel } from '@/components/auth/convex-auth-setup-panel'
import { PageHeader } from '@/components/admin/page-header'
import {
  settingsFormKey,
  WorkspaceSettingsForms,
} from '@/components/admin/workspace-settings-forms'
import { TeamInviteForm } from '@/components/admin/team-invite-form'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'

export default function SettingsPage() {
  const {
    data: settings,
    authLoading,
    isAuthenticated,
  } = useAuthenticatedQuery(api.admin.getWorkspaceSettings, {})

  if (authLoading) {
    return (
      <div className="flex w-full flex-col gap-8">
        <PageHeader
          eyebrow="Configuration"
          title="Workspace Settings"
          description="Manage BYOK provider keys and default models."
        />
        <WorkspaceSurface className="p-6">
          <p className="text-sm text-muted-foreground">Connecting to Convex…</p>
        </WorkspaceSurface>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex w-full flex-col gap-8">
        <PageHeader
          eyebrow="Configuration"
          title="Workspace Settings"
          description="Manage BYOK provider keys and default models."
        />
        <ConvexAuthSetupPanel />
      </div>
    )
  }

  if (settings === undefined) {
    return (
      <div className="flex w-full flex-col gap-8">
        <PageHeader
          eyebrow="Configuration"
          title="Workspace Settings"
          description="Manage BYOK provider keys and default models."
        />
        <WorkspaceSurface className="p-6">
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        </WorkspaceSurface>
      </div>
    )
  }

  if (settings === null) {
    return (
      <div className="flex w-full flex-col gap-8">
        <PageHeader
          eyebrow="Configuration"
          title="Workspace Settings"
          description="Workspace settings are not available for this organization yet."
        />
        <WorkspaceSurface className="p-6">
          <p className="text-sm text-muted-foreground">
            Settings could not be loaded. Confirm your organization access and
            try again.
          </p>
        </WorkspaceSurface>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader
        eyebrow="Configuration"
        title="Workspace Settings"
        description="Manage BYOK provider keys, default models, and candidate release policy."
      />

      <TeamInviteForm />
      <WorkspaceSettingsForms
        key={settingsFormKey(settings)}
        settings={settings}
      />
    </div>
  )
}
