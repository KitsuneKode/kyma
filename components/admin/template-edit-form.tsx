'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'

import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { ModelStageForm } from '@/components/providers/model-stage-form'
import { RubricConfigEditor } from '@/components/admin/rubric-config-editor'
import { Button } from '@/components/ui/button'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'
import {
  buildDefaultRubricConfig,
  type TemplateRubricConfig,
} from '@/lib/templates/default-assessment-content'

function toModelOverrides(template: Doc<'assessmentTemplates'>) {
  return {
    stt: template.modelOverrides?.stt ?? '',
    llm: template.modelOverrides?.llm ?? '',
    tts: template.modelOverrides?.tts ?? '',
    reviewChat: template.modelOverrides?.reviewChat ?? '',
    scoring: template.modelOverrides?.scoring ?? '',
  }
}

function toRubricConfig(
  template: Doc<'assessmentTemplates'>
): TemplateRubricConfig {
  return template.rubricConfig ?? buildDefaultRubricConfig()
}

export function TemplateEditForm({
  template,
}: {
  template: Doc<'assessmentTemplates'>
}) {
  const router = useRouter()
  const updateTemplate = useMutation(
    api.recruiter.templates.updateAssessmentTemplate
  )
  const { data: workspaceSettings } = useAuthenticatedQuery(
    api.recruiter.workspace.getWorkspaceSettings,
    {}
  )
  const [name, setName] = useState(template.name)
  const [systemPrompt, setSystemPrompt] = useState(template.systemPrompt ?? '')
  const [childPersonaPrompt, setChildPersonaPrompt] = useState(
    template.childPersonaPrompt ?? ''
  )
  const [wrapUpPrompt, setWrapUpPrompt] = useState(template.wrapUpPrompt ?? '')
  const [modelOverrides, setModelOverrides] = useState(
    toModelOverrides(template)
  )
  const [rubricConfig, setRubricConfig] = useState(toRubricConfig(template))
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<string | null>(null)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setSaveState(null)
    try {
      await updateTemplate({
        templateId: template._id as Id<'assessmentTemplates'>,
        name,
        systemPrompt: systemPrompt.trim() || undefined,
        childPersonaPrompt: childPersonaPrompt.trim() || undefined,
        wrapUpPrompt: wrapUpPrompt.trim() || undefined,
        modelOverrides: {
          stt: modelOverrides.stt.trim() || undefined,
          llm: modelOverrides.llm.trim() || undefined,
          tts: modelOverrides.tts.trim() || undefined,
          reviewChat: modelOverrides.reviewChat.trim() || undefined,
          scoring: modelOverrides.scoring.trim() || undefined,
        },
        rubricConfig,
      })
      setSaveState('Saved')
      router.refresh()
    } catch (error) {
      setSaveState(
        error instanceof Error ? error.message : 'Unable to save template.'
      )
    } finally {
      setSaving(false)
    }
  }

  const workspaceDefaults = workspaceSettings?.defaultModels
    ? {
        stt: workspaceSettings.defaultModels.stt ?? '',
        llm: workspaceSettings.defaultModels.llm ?? '',
        tts: workspaceSettings.defaultModels.tts ?? '',
        reviewChat: workspaceSettings.defaultModels.reviewChat ?? '',
        scoring: workspaceSettings.defaultModels.scoring ?? '',
      }
    : undefined

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-sm)] ring-1 ring-border/60">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Template details
        </p>
        <label className="mt-4 block space-y-2 text-sm">
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
        <p className="mt-3 text-sm text-muted-foreground">
          Rubric version: {template.rubricVersion} · Status: {template.status}
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-card p-6 shadow-[var(--shadow-sm)] ring-1 ring-border/60">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Interview prompts
        </p>
        <label className="mt-4 block space-y-2 text-sm">
          <span>System prompt</span>
          <textarea
            rows={4}
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Child persona prompt</span>
          <textarea
            rows={3}
            value={childPersonaPrompt}
            onChange={(event) => setChildPersonaPrompt(event.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Wrap-up prompt</span>
          <textarea
            rows={3}
            value={wrapUpPrompt}
            onChange={(event) => setWrapUpPrompt(event.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
      </div>

      <div className="space-y-4 rounded-2xl bg-card p-6 shadow-[var(--shadow-sm)] ring-1 ring-border/60">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Rubric dimensions
        </p>
        <p className="text-sm text-muted-foreground">
          Tune scoring weights, hard gates, and keyword hints used by the
          assessment pipeline for this template.
        </p>
        <RubricConfigEditor value={rubricConfig} onChange={setRubricConfig} />
      </div>

      <div className="space-y-4 rounded-2xl bg-card p-6 shadow-[var(--shadow-sm)] ring-1 ring-border/60">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Model overrides
        </p>
        <p className="text-sm text-muted-foreground">
          Leave a stage on inherit to use workspace defaults. Overrides apply to
          live interviews, scoring, and recruiter review chat for sessions using
          this template.
        </p>
        <ModelStageForm
          values={modelOverrides}
          onChange={(next) =>
            setModelOverrides({
              stt: next.stt ?? '',
              llm: next.llm ?? '',
              tts: next.tts ?? '',
              reviewChat: next.reviewChat ?? '',
              scoring: next.scoring ?? '',
            })
          }
          providerKeys={workspaceSettings?.providerKeys}
          inheritLabel="Inherit workspace default"
          showEffectiveSummary
          workspaceDefaults={workspaceDefaults}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
        {saveState ? (
          <p className="text-sm text-muted-foreground">{saveState}</p>
        ) : null}
      </div>
    </form>
  )
}
