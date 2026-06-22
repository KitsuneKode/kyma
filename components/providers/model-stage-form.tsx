'use client'

import { ModelStagePicker, type ModelStageValues } from './model-stage-picker'
import type { ModelKind } from '@/lib/providers/provider-id'
import { MODEL_STAGE_LABELS } from '@/lib/providers/model-catalog'
import { resolveStageModels } from '@/lib/providers/resolve-model'
import { formatModelLabel } from '@/lib/providers/model-catalog'

const MODEL_KINDS: ModelKind[] = ['stt', 'llm', 'tts', 'scoring', 'reviewChat']

type ModelStageFormProps = {
  values: ModelStageValues
  onChange: (values: ModelStageValues) => void
  providerKeys?: Array<{ provider: string }>
  inheritLabel?: string
  showEffectiveSummary?: boolean
  workspaceDefaults?: ModelStageValues
}

export function ModelStageForm({
  values,
  onChange,
  providerKeys,
  inheritLabel = 'Inherit workspace default',
  showEffectiveSummary = false,
  workspaceDefaults,
}: ModelStageFormProps) {
  const effective = showEffectiveSummary
    ? resolveStageModels({
        workspaceDefaults,
        templateOverrides: values,
      })
    : null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {MODEL_KINDS.map((kind) => (
          <ModelStagePicker
            key={kind}
            kind={kind}
            value={values[kind] ?? ''}
            onChange={(next) =>
              onChange({
                ...values,
                [kind]: next.trim() ? next : undefined,
              })
            }
            providerKeys={providerKeys}
            inheritLabel={inheritLabel}
          />
        ))}
      </div>
      {effective ? (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
          <p className="text-sm font-medium">Effective models</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {MODEL_KINDS.map((kind) => (
              <li key={kind}>
                <span className="font-medium text-foreground">
                  {MODEL_STAGE_LABELS[kind].title}:
                </span>{' '}
                <span className="font-mono">{effective[kind]}</span>
                <span className="ml-1">
                  ({formatModelLabel(effective[kind])})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
