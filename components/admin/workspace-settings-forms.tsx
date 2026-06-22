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
  FunctionReturnType<typeof api.recruiter.workspace.getWorkspaceSettings>
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

type MutationFeedback = {
  tone: 'success' | 'error'
  message: string
} | null

export function WorkspaceSettingsForms({
  settings,
}: {
  settings: WorkspaceSettings
}) {
  const addProviderKey = useMutation(api.recruiter.workspace.addProviderKey)
  const removeProviderKey = useMutation(
    api.recruiter.workspace.removeProviderKey
  )
  const updateDefaultModels = useMutation(
    api.recruiter.workspace.updateDefaultModels
  )
  const updateCandidateReleaseMode = useMutation(
    api.recruiter.workspace.updateCandidateReleaseMode
  )
  const testProviderConnection = useAction(
    api.recruiter.workspace.testProviderConnection
  )
  const [provider, setProvider] = useState('openai')
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [models, setModels] = useState(toModelState(settings))
  const [releaseMode, setReleaseMode] = useState<'auto' | 'manual'>(
    settings.candidateReleaseMode ?? 'auto'
  )
  const [addKeyFeedback, setAddKeyFeedback] = useState<MutationFeedback>(null)
  const [testFeedback, setTestFeedback] = useState<MutationFeedback>(null)
  const [removeFeedback, setRemoveFeedback] = useState<MutationFeedback>(null)
  const [modelsFeedback, setModelsFeedback] = useState<MutationFeedback>(null)
  const [releaseFeedback, setReleaseFeedback] = useState<MutationFeedback>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const effectiveModels = resolveStageModels({
    workspaceDefaults: {
      stt: models.stt || undefined,
      llm: models.llm || undefined,
      tts: models.tts || undefined,
      reviewChat: models.reviewChat || undefined,
      scoring: models.scoring || undefined,
    },
  })

  async function runMutation(
    actionId: string,
    run: () => Promise<void>,
    setFeedback: (value: MutationFeedback) => void,
    successMessage: string
  ) {
    setBusyAction(actionId)
    setFeedback(null)
    try {
      await run()
      setFeedback({ tone: 'success', message: successMessage })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to save changes.',
      })
    } finally {
      setBusyAction(null)
    }
  }

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
        <div className="mt-3 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busyAction !== null || !key.trim()}
            onClick={() =>
              void runMutation(
                'add-key',
                async () => {
                  await addProviderKey({
                    provider,
                    key,
                    label: label || undefined,
                  })
                  setKey('')
                },
                setAddKeyFeedback,
                'Provider key added.'
              )
            }
          >
            {busyAction === 'add-key' ? 'Adding…' : 'Add key'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busyAction !== null}
            onClick={() =>
              void runMutation(
                'test-provider',
                async () => {
                  await testProviderConnection({ provider })
                },
                setTestFeedback,
                'Provider connection succeeded.'
              )
            }
          >
            {busyAction === 'test-provider' ? 'Testing…' : 'Test provider'}
          </Button>
        </div>
        {addKeyFeedback ? (
          <p
            className={
              addKeyFeedback.tone === 'success'
                ? 'mt-3 text-sm text-emerald-600 dark:text-emerald-400'
                : 'mt-3 text-sm text-destructive'
            }
          >
            {addKeyFeedback.message}
          </p>
        ) : null}
        {testFeedback ? (
          <p
            className={
              testFeedback.tone === 'success'
                ? 'mt-3 text-sm text-emerald-600 dark:text-emerald-400'
                : 'mt-3 text-sm text-destructive'
            }
          >
            {testFeedback.message}
          </p>
        ) : null}
        <div className="mt-4 space-y-2">
          {settings.providerKeys?.length ? (
            settings.providerKeys.map((item) => (
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
                  disabled={busyAction !== null}
                  onClick={() =>
                    void runMutation(
                      `remove-${item.keyId}`,
                      async () => {
                        await removeProviderKey({
                          provider: item.provider,
                          keyId: item.keyId,
                        })
                      },
                      setRemoveFeedback,
                      'Provider key removed.'
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
              No provider keys yet. Add a key to enable BYOK model routing.
            </p>
          )}
        </div>
        {removeFeedback ? (
          <p
            className={
              removeFeedback.tone === 'success'
                ? 'mt-3 text-sm text-emerald-600 dark:text-emerald-400'
                : 'mt-3 text-sm text-destructive'
            }
          >
            {removeFeedback.message}
          </p>
        ) : null}
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
          disabled={busyAction !== null}
          onClick={() =>
            void runMutation(
              'save-models',
              async () => {
                await updateDefaultModels({
                  models: {
                    stt: models.stt || undefined,
                    llm: models.llm || undefined,
                    tts: models.tts || undefined,
                    reviewChat: models.reviewChat || undefined,
                    scoring: models.scoring || undefined,
                  },
                })
              },
              setModelsFeedback,
              'Default models saved.'
            )
          }
        >
          {busyAction === 'save-models' ? 'Saving…' : 'Save model defaults'}
        </Button>
        {modelsFeedback ? (
          <p
            className={
              modelsFeedback.tone === 'success'
                ? 'mt-3 text-sm text-emerald-600 dark:text-emerald-400'
                : 'mt-3 text-sm text-destructive'
            }
          >
            {modelsFeedback.message}
          </p>
        ) : null}
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
          disabled={busyAction !== null}
          onClick={() =>
            void runMutation(
              'save-release',
              async () => {
                await updateCandidateReleaseMode({ mode: releaseMode })
              },
              setReleaseFeedback,
              'Release policy saved.'
            )
          }
        >
          {busyAction === 'save-release' ? 'Saving…' : 'Save release policy'}
        </Button>
        {releaseFeedback ? (
          <p
            className={
              releaseFeedback.tone === 'success'
                ? 'mt-3 text-sm text-emerald-600 dark:text-emerald-400'
                : 'mt-3 text-sm text-destructive'
            }
          >
            {releaseFeedback.message}
          </p>
        ) : null}
      </WorkspaceSurface>
    </>
  )
}
