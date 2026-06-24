import { api } from '@/convex/_generated/api'
import { PageHeader } from '@/components/admin/page-header'
import {
  settingsFormKey,
  WorkspaceSettingsForms,
} from '@/components/admin/workspace-settings-forms'
import { TeamInviteForm } from '@/components/admin/team-invite-form'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { serverConvexQuery } from '@/lib/convex/server-query'

export default async function SettingsPage() {
  const settingsResult = await serverConvexQuery(
    api.recruiter.workspace.getWorkspaceSettings,
    {}
  )

  if (!settingsResult.ok) {
    return (
      <div className="flex w-full flex-col gap-8">
        <PageHeader
          eyebrow="Configuration"
          title="Workspace Settings"
          description="Manage BYOK provider keys and default models."
        />
        <WorkspaceSurface className="p-6">
          <p className="text-sm text-muted-foreground">
            {settingsResult.message ??
              'Settings could not be loaded. Confirm your organization access and try again.'}
          </p>
        </WorkspaceSurface>
      </div>
    )
  }

  const settings = settingsResult.data

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
