'use client'

import { useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SettingsPage() {
  const settings = useQuery(api.admin.getWorkspaceSettings, {})
  const addProviderKey = useMutation(api.admin.addProviderKey)
  const removeProviderKey = useMutation(api.admin.removeProviderKey)
  const updateDefaultModels = useMutation(api.admin.updateDefaultModels)
  const testProviderConnection = useAction(api.admin.testProviderConnection)
  const [provider, setProvider] = useState('openai')
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [models, setModels] = useState({
    stt: settings?.defaultModels?.stt ?? '',
    llm: settings?.defaultModels?.llm ?? '',
    tts: settings?.defaultModels?.tts ?? '',
    reviewChat: settings?.defaultModels?.reviewChat ?? '',
  })

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader
        eyebrow="Configuration"
        title="Workspace Settings"
        description="Manage BYOK provider keys and default models."
      />

      <section className="rounded-2xl border bg-card p-6">
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
          />
        </div>
        <div className="mt-3 flex gap-3">
          <Button
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
            variant="outline"
            onClick={() => void testProviderConnection({ provider })}
          >
            Test provider
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {settings?.providerKeys?.map((item) => (
            <div
              key={item.keyId}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <p className="text-sm">
                {item.provider} {item.label ? `(${item.label})` : ''} - ****
                {item.maskedKeyTail ?? '****'}
              </p>
              <Button
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
      </section>

      <section className="rounded-2xl border bg-card p-6">
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
      </section>
    </div>
  )
}
