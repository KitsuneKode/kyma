'use client'

import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { ModelStageForm } from '@/components/providers/model-stage-form'
import { RubricConfigEditor } from '@/components/admin/rubric-config-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WorkspaceSurface } from '@/components/workspace/surface'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'
import {
  buildDefaultRubricConfig,
  type TemplateRubricConfig,
} from '@/lib/templates/default-assessment-content'
import {
  getJobFamilyStarter,
  JOB_FAMILIES,
  JOB_FAMILY_LABELS,
  SIMULATION_MODES,
  type JobFamily,
  type SimulationMode,
} from '@/lib/templates/job-family-starters'

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

function formatSimulationMode(mode: SimulationMode) {
  return mode.replace('_', ' ')
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
  const [jobFamily, setJobFamily] = useState<JobFamily>(
    template.jobFamily ?? 'tutor'
  )
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(
    template.simulationMode ?? 'teaching'
  )
  const [systemPrompt, setSystemPrompt] = useState(template.systemPrompt ?? '')
  const [simulationPersonaPrompt, setSimulationPersonaPrompt] = useState(
    template.simulationPersonaPrompt ?? template.childPersonaPrompt ?? ''
  )
  const [wrapUpPrompt, setWrapUpPrompt] = useState(template.wrapUpPrompt ?? '')
  const [modelOverrides, setModelOverrides] = useState(
    toModelOverrides(template)
  )
  const [rubricConfig, setRubricConfig] = useState(toRubricConfig(template))
  const [saving, setSaving] = useState(false)

  const starterPreview = useMemo(
    () => getJobFamilyStarter(jobFamily),
    [jobFamily]
  )

  function applyStarterDefaults() {
    const starter = getJobFamilyStarter(jobFamily)
    setSimulationMode(starter.simulationMode)
    setSystemPrompt(starter.systemPrompt)
    setSimulationPersonaPrompt(starter.simulationPersonaPrompt ?? '')
    setWrapUpPrompt(starter.wrapUpPrompt)
    setRubricConfig(starter.rubricConfig)
    toast.message('Starter defaults loaded', {
      description: 'Review prompts and rubric before saving.',
    })
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await updateTemplate({
        templateId: template._id as Id<'assessmentTemplates'>,
        name,
        jobFamily,
        simulationMode,
        systemPrompt: systemPrompt.trim() || undefined,
        simulationPersonaPrompt: simulationPersonaPrompt.trim() || undefined,
        childPersonaPrompt: simulationPersonaPrompt.trim() || undefined,
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
      toast.success('Template saved')
      router.refresh()
    } catch (error) {
      toast.error(
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
    <form onSubmit={handleSave} className="space-y-6">
      <WorkspaceSurface className="space-y-4 p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Template details
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="template-name">Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-family">Job family</Label>
            <Select
              value={jobFamily}
              onValueChange={(value) =>
                value && setJobFamily(value as JobFamily)
              }
            >
              <SelectTrigger id="job-family">
                <SelectValue placeholder="Job family" />
              </SelectTrigger>
              <SelectContent>
                {JOB_FAMILIES.map((family) => (
                  <SelectItem key={family} value={family}>
                    {JOB_FAMILY_LABELS[family]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="simulation-mode">Simulation mode</Label>
            <Select
              value={simulationMode}
              onValueChange={(value) =>
                value && setSimulationMode(value as SimulationMode)
              }
            >
              <SelectTrigger id="simulation-mode">
                <SelectValue placeholder="Simulation mode" />
              </SelectTrigger>
              <SelectContent>
                {SIMULATION_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {formatSimulationMode(mode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Rubric version: {template.rubricVersion} · Status: {template.status}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyStarterDefaults}
          >
            Load {JOB_FAMILY_LABELS[jobFamily]} starter
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Starter includes {starterPreview.rubricConfig.dimensions.length}{' '}
          dimensions and {formatSimulationMode(starterPreview.simulationMode)}{' '}
          simulation defaults.
        </p>
      </WorkspaceSurface>

      <WorkspaceSurface className="space-y-4 p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Interview prompts
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="system-prompt">System prompt</Label>
          <Textarea
            id="system-prompt"
            rows={4}
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
          />
        </div>
        {simulationMode !== 'none' ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="persona-prompt">Simulation persona prompt</Label>
            <Textarea
              id="persona-prompt"
              rows={3}
              value={simulationPersonaPrompt}
              onChange={(event) =>
                setSimulationPersonaPrompt(event.target.value)
              }
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="wrap-up-prompt">Wrap-up prompt</Label>
          <Textarea
            id="wrap-up-prompt"
            rows={3}
            value={wrapUpPrompt}
            onChange={(event) => setWrapUpPrompt(event.target.value)}
          />
        </div>
      </WorkspaceSurface>

      <WorkspaceSurface className="space-y-4 p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Rubric dimensions
        </p>
        <p className="text-sm text-muted-foreground">
          Tune scoring weights, hard gates, and keyword hints used by the
          assessment pipeline for this template.
        </p>
        <RubricConfigEditor value={rubricConfig} onChange={setRubricConfig} />
      </WorkspaceSurface>

      <WorkspaceSurface className="space-y-4 p-6">
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
      </WorkspaceSurface>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
