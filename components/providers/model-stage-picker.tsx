'use client'

import { useMemo, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CUSTOM_MODEL_VALUE,
  isKnownModelId,
  MODEL_CATALOG,
  MODEL_STAGE_LABELS,
  providerHasKey,
} from '@/lib/providers/model-catalog'
import type { ModelKind } from '@/lib/providers/provider-id'
import { cn } from '@/lib/utils'

export type ModelStageValues = Partial<Record<ModelKind, string | undefined>>

type ModelStagePickerProps = {
  kind: ModelKind
  value: string
  onChange: (value: string) => void
  providerKeys?: Array<{ provider: string }>
  inheritLabel?: string
  className?: string
}

function groupCatalogByProvider(kind: ModelKind) {
  const groups = new Map<string, (typeof MODEL_CATALOG)[ModelKind]>()
  for (const entry of MODEL_CATALOG[kind]) {
    const existing = groups.get(entry.provider) ?? []
    existing.push(entry)
    groups.set(entry.provider, existing)
  }
  return groups
}

export function ModelStagePicker({
  kind,
  value,
  onChange,
  providerKeys,
  inheritLabel = 'Inherit workspace default',
  className,
}: ModelStagePickerProps) {
  const trimmedValue = value.trim()
  const isCustom =
    trimmedValue.length > 0 && !isKnownModelId(kind, trimmedValue)
  const [showCustom, setShowCustom] = useState(isCustom)

  const selectValue = useMemo(() => {
    if (!trimmedValue) {
      return '__inherit__'
    }
    if (isKnownModelId(kind, trimmedValue)) {
      return trimmedValue
    }
    return CUSTOM_MODEL_VALUE
  }, [kind, trimmedValue])

  const stage = MODEL_STAGE_LABELS[kind]
  const groups = groupCatalogByProvider(kind)

  return (
    <div className={cn('space-y-2', className)}>
      <div>
        <p className="text-sm font-medium">{stage.title}</p>
        <p className="text-xs text-muted-foreground">{stage.description}</p>
      </div>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (!next) {
            return
          }
          if (next === '__inherit__') {
            setShowCustom(false)
            onChange('')
            return
          }
          if (next === CUSTOM_MODEL_VALUE) {
            setShowCustom(true)
            if (!trimmedValue || isKnownModelId(kind, trimmedValue)) {
              onChange('')
            }
            return
          }
          setShowCustom(false)
          onChange(next)
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__inherit__">{inheritLabel}</SelectItem>
          {Array.from(groups.entries()).map(([provider, entries]) => (
            <SelectGroup key={provider}>
              <SelectLabel className="capitalize">{provider}</SelectLabel>
              {entries.map((entry) => {
                const hasKey = providerHasKey(entry.provider, providerKeys)
                return (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                    {!hasKey &&
                    entry.provider !== 'deepgram' &&
                    entry.provider !== 'cartesia'
                      ? ' (no BYOK key)'
                      : ''}
                  </SelectItem>
                )
              })}
            </SelectGroup>
          ))}
          <SelectItem value={CUSTOM_MODEL_VALUE}>Custom model ID…</SelectItem>
        </SelectContent>
      </Select>
      {showCustom || selectValue === CUSTOM_MODEL_VALUE ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="provider/model-id"
          className="font-mono text-sm"
        />
      ) : null}
    </div>
  )
}
