'use client'

import { useState } from 'react'
import { useAction, useMutation } from 'convex/react'

import type { FunctionReturnType } from 'convex/server'

import { api } from '@/convex/_generated/api'
import { ConvexAuthSetupPanel } from '@/components/auth/convex-auth-setup-panel'
import { PageHeader } from '@/components/admin/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type WorkspaceSettings = NonNullable<
  FunctionReturnType<typeof api.admin.getWorkspaceSettings>
>

function settingsFormKey(settings: WorkspaceSettings) {
  return [
    settings.candidateReleaseMode ?? 'auto',
    settings.defaultModels?.stt ?? '',
    settings.defaultModels?.llm ?? '',
    settings.defaultModels?.tts ?? '',
    settings.defaultModels?.reviewChat ?? '',
    settings.providerKeys?.length ?? 0,
  ].join('|')
}

function SettingsForms({ settings }: { settings: WorkspaceSettings }) {
  const addProviderKey = useMutation(api.admin.addProviderKey)
  const removeProviderKey = useMutation(api.admin.removeProviderKey)
  const updateDefaultModels = useMutation(api.admin.updateDefaultModels)
  const updateCandidateReleaseMode = useMutation(
    api.admin.updateCandidateReleaseMode
  )
  const testProviderConnection = useAction(api.admin.testProviderConnection)
  const [provider, setProvider] = useState('openai')
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [models, setModels] = useState({
    stt: settings.defaultModels?.stt ?? '',
    llm: settings.defaultModels?.llm ?? '',
    tts: settings.defaultModels?.tts ?? '',
    reviewChat: settings.defaultModels?.reviewChat ?? '',
  })
  const [releaseMode, setReleaseMode] = useState<'auto' | 'manual'>(
    settings.candidateReleaseMode ?? 'auto'
  )

  return (
    <>
      <WorkspaceSurface className="p-6">
        <h2 className="text-lg font-semibold">Provider keys</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Input
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            placeholder="provider"
          />
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="label"
          />
          <Input
            value={key}
            type="password"
            onChange={(event) => setKey(event.target.value)}
            placeholder="api key"
            className="font-mono"
          />
        </div>
        <div className="mt-3 flex gap-3">
          <Button
            type="button"
            onClick={() => {
              void addProviderKey({
                provider,
                key,
                label: label || undefined,
              }).then(() => setKey(''))
            }}
          >
            Add key
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void testProviderConnection({ provider })}
          >
            Test provider
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {settings.providerKeys?.map((item) => (
            <div
              key={item.keyId}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3"
            >
              <p className="font-mono text-sm">
                {item.provider} {item.label ? `(${item.label})` : ''} - ****
                {item.maskedKeyTail ?? '****'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void removeProviderKey({
                    provider: item.provider,
                    keyId: item.keyId,
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </WorkspaceSurface>

      <WorkspaceSurface className="p-6">
        <h2 className="text-lg font-semibold">Default models</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            value={models.stt}
            onChange={(event) =>
              setModels((current) => ({ ...current, stt: event.target.value }))
            }
            placeholder="STT model"
          />
          <Input
            value={models.llm}
            onChange={(event) =>
              setModels((current) => ({ ...current, llm: event.target.value }))
            }
            placeholder="LLM model"
          />
          <Input
            value={models.tts}
            onChange={(event) =>
              setModels((current) => ({ ...current, tts: event.target.value }))
            }
            placeholder="TTS model"
          />
          <Input
            value={models.reviewChat}
            onChange={(event) =>
              setModels((current) => ({
                ...current,
                reviewChat: event.target.value,
              }))
            }
            placeholder="Review chat model"
          />
        </div>
        <Button
          type="button"
          className="mt-4"
          onClick={() =>
            void updateDefaultModels({
              models: {
                stt: models.stt || undefined,
                llm: models.llm || undefined,
                tts: models.tts || undefined,
                reviewChat: models.reviewChat || undefined,
              },
            })
          }
        >
          Save model defaults
        </Button>
      </WorkspaceSurface>

      <WorkspaceSurface className="p-6">
        <h2 className="text-lg font-semibold">Candidate results</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Auto-release shares outcomes when recruiters choose Advance or Reject.
          Manual release requires an explicit action from the review console.
        </p>
        <div className="mt-4 max-w-sm">
          <Select
            value={releaseMode}
            onValueChange={(value) =>
              setReleaseMode(value as 'auto' | 'manual')
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Release mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto-release on Advance / Reject
              </SelectItem>
              <SelectItem value="manual">Manual release only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          className="mt-4"
          onClick={() => void updateCandidateReleaseMode({ mode: releaseMode })}
        >
          Save release policy
        </Button>
      </WorkspaceSurface>
    </>
  )
}

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

      <SettingsForms key={settingsFormKey(settings)} settings={settings} />
    </div>
  )
}
