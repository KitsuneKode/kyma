'use client'

import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WorkspaceSurface } from '@/components/workspace/surface'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getJobFamilyStarter,
  JOB_FAMILIES,
  JOB_FAMILY_LABELS,
  type JobFamily,
} from '@/lib/templates/job-family-starters'

const CREATE_JOB_FAMILIES = JOB_FAMILIES.filter((family) => family !== 'custom')

export function TemplateCreateForm() {
  const router = useRouter()
  const createTemplate = useMutation(
    api.recruiter.templates.createAssessmentTemplate
  )
  const [name, setName] = useState('')
  const [jobFamily, setJobFamily] = useState<JobFamily>('software_engineering')
  const [duration, setDuration] = useState(20)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const starterPreview = useMemo(
    () => getJobFamilyStarter(jobFamily),
    [jobFamily]
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const templateId = await createTemplate({
        name: name.trim() || starterPreview.defaultName,
        jobFamily,
        targetDurationMinutes: duration,
        allowsResume: true,
        interviewStyleMode: 'standard',
      })
      router.push(`/recruiter/templates/${templateId}/edit`)
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create template.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <WorkspaceSurface className="space-y-5 p-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="template-name">Template name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={starterPreview.defaultName}
          />
          <p className="text-xs text-muted-foreground">
            Shown to recruiters when assigning screenings.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-job-family">Job family</Label>
          <Select
            value={jobFamily}
            onValueChange={(value) => value && setJobFamily(value as JobFamily)}
          >
            <SelectTrigger id="template-job-family">
              <SelectValue placeholder="Select job family" />
            </SelectTrigger>
            <SelectContent>
              {CREATE_JOB_FAMILIES.map((family) => (
                <SelectItem key={family} value={family}>
                  {JOB_FAMILY_LABELS[family]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Loads default prompts, simulation mode, and rubric for this role
            type.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-duration">Target duration (minutes)</Label>
          <Input
            id="template-duration"
            type="number"
            min={10}
            max={60}
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value) || 20)}
          />
        </div>
      </WorkspaceSurface>

      <WorkspaceSurface className="space-y-3 p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Starter preview
        </p>
        <p className="text-sm text-muted-foreground">
          Simulation:{' '}
          <span className="font-medium text-foreground">
            {starterPreview.simulationMode.replace('_', ' ')}
          </span>
          {' · '}
          {starterPreview.rubricConfig.dimensions.length} rubric dimensions
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {starterPreview.rubricConfig.dimensions.map((dimension) => (
            <li
              key={dimension.name}
              className="rounded-lg bg-muted/20 px-3 py-2 text-sm"
            >
              <span className="font-medium">{dimension.name}</span>
              <span className="text-muted-foreground">
                {' '}
                · {Math.round(dimension.weight * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </WorkspaceSurface>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={saving}>
        {saving ? 'Creating…' : 'Create template'}
      </Button>
    </form>
  )
}
