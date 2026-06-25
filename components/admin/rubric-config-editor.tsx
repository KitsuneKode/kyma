'use client'

import type { TemplateRubricConfig } from '@/lib/templates/default-assessment-content'
import { DIMENSION_LABELS, isRubricDimension } from '@/lib/rubric/constants'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

type RubricConfigEditorProps = {
  value: TemplateRubricConfig
  onChange: (next: TemplateRubricConfig) => void
}

export function RubricConfigEditor({
  value,
  onChange,
}: RubricConfigEditorProps) {
  function updateDimension(
    index: number,
    patch: Partial<TemplateRubricConfig['dimensions'][number]>
  ) {
    const nextDimensions = value.dimensions.map((dimension, dimensionIndex) =>
      dimensionIndex === index ? { ...dimension, ...patch } : dimension
    )
    onChange({ dimensions: nextDimensions })
  }

  return (
    <div className="space-y-3">
      {value.dimensions.map((dimension, index) => {
        const label = isRubricDimension(dimension.name)
          ? DIMENSION_LABELS[dimension.name]
          : dimension.name

        return (
          <div
            key={dimension.name}
            className="grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-4 md:grid-cols-[1fr_120px_120px_1fr]"
          >
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{dimension.name}</p>
            </div>
            <label className="space-y-1 text-xs">
              <span>Weight</span>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={dimension.weight}
                onChange={(event) =>
                  updateDimension(index, {
                    weight: Number.parseFloat(event.target.value) || 0,
                  })
                }
              />
            </label>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id={`hard-gate-${dimension.name}`}
                checked={dimension.isHardGate}
                onCheckedChange={(checked) =>
                  updateDimension(index, { isHardGate: checked === true })
                }
              />
              <Label
                htmlFor={`hard-gate-${dimension.name}`}
                className="text-xs font-normal"
              >
                Hard gate
              </Label>
            </div>
            <label className="space-y-1 text-xs md:col-span-1">
              <span>Keywords (comma-separated)</span>
              <Input
                value={(dimension.keywords ?? []).join(', ')}
                onChange={(event) =>
                  updateDimension(index, {
                    keywords: event.target.value
                      .split(',')
                      .map((keyword) => keyword.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="clear, patient"
              />
            </label>
          </div>
        )
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const total = value.dimensions.reduce(
            (sum, dimension) => sum + dimension.weight,
            0
          )
          if (total <= 0) return
          onChange({
            dimensions: value.dimensions.map((dimension) => ({
              ...dimension,
              weight: Number((dimension.weight / total).toFixed(4)),
            })),
          })
        }}
      >
        Normalize weights to 1.0
      </Button>
    </div>
  )
}
