'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'

import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'

export function TemplateEditForm({
  template,
}: {
  template: Doc<'assessmentTemplates'>
}) {
  const router = useRouter()
  const updateTemplate = useMutation(api.admin.updateAssessmentTemplate)
  const [name, setName] = useState(template.name)
  const [systemPrompt, setSystemPrompt] = useState(template.systemPrompt ?? '')
  const [childPersonaPrompt, setChildPersonaPrompt] = useState(
    template.childPersonaPrompt ?? ''
  )
  const [wrapUpPrompt, setWrapUpPrompt] = useState(template.wrapUpPrompt ?? '')
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

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
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

      <div className="space-y-4 rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
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
