'use client'

import { useState } from 'react'
import { useAction, useMutation } from 'convex/react'

import type { FunctionReturnType } from 'convex/server'

import { api } from '@/convex/_generated/api'
import { ModelStageForm } from '@/components/providers/model-stage-form'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { resolveStageModels } from '@/lib/providers/resolve-model'

export type WorkspaceSettings = NonNullable<
  FunctionReturnType<typeof api.admin.getWorkspaceSettings>
>

export function settingsFormKey(settings: WorkspaceSettings) {
  return [
    settings.candidateReleaseMode ?? 'auto',
    settings.defaultModels?.stt ?? '',
    settings.defaultModels?.llm ?? '',
    settings.defaultModels?.tts ?? '',
    settings.defaultModels?.reviewChat ?? '',
    settings.defaultModels?.scoring ?? '',
    settings.providerKeys?.length ?? 0,
  ].join('|')
}

function toModelState(settings: WorkspaceSettings) {
  return {
    stt: settings.defaultModels?.stt ?? '',
    llm: settings.defaultModels?.llm ?? '',
    tts: settings.defaultModels?.tts ?? '',
    reviewChat: settings.defaultModels?.reviewChat ?? '',
    scoring: settings.defaultModels?.scoring ?? '',
  }
}

export function WorkspaceSettingsForms({
  settings,
}: {
  settings: WorkspaceSettings
}) {
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
  const [models, setModels] = useState(toModelState(settings))
  const [releaseMode, setReleaseMode] = useState<'auto' | 'manual'>(
    settings.candidateReleaseMode ?? 'auto'
  )

  const effectiveModels = resolveStageModels({
    workspaceDefaults: {
      stt: models.stt || undefined,
      llm: models.llm || undefined,
      tts: models.tts || undefined,
      reviewChat: models.reviewChat || undefined,
      scoring: models.scoring || undefined,
    },
  })

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
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Choose models for each pipeline stage. Interview voice models power
          the live agent; scoring and review chat run after the session.
        </p>
        <div className="mt-4">
          <ModelStageForm
            values={models}
            onChange={(next) =>
              setModels({
                stt: next.stt ?? '',
                llm: next.llm ?? '',
                tts: next.tts ?? '',
                reviewChat: next.reviewChat ?? '',
                scoring: next.scoring ?? '',
              })
            }
            providerKeys={settings.providerKeys}
            inheritLabel="Platform default"
          />
        </div>
        <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-4">
          <p className="text-sm font-medium">Effective defaults after save</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            STT {effectiveModels.stt} · LLM {effectiveModels.llm} · TTS{' '}
            {effectiveModels.tts} · Scoring {effectiveModels.scoring} · Review{' '}
            {effectiveModels.reviewChat}
          </p>
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
                scoring: models.scoring || undefined,
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
