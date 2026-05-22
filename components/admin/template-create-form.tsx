'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'

export function TemplateCreateForm() {
  const router = useRouter()
  const createTemplate = useMutation(api.admin.createAssessmentTemplate)
  const [name, setName] = useState('')
  const [role, setRole] = useState('teacher')
  const [duration, setDuration] = useState(20)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const templateId = await createTemplate({
        name,
        role,
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
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]"
    >
      <label className="block space-y-2 text-sm">
        <span>Template name</span>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Grade 6 Math Screener"
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span>Role</span>
        <input
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span>Target duration (minutes)</span>
        <input
          type="number"
          min={10}
          max={60}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value) || 20)}
          className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={saving}>
        {saving ? 'Creating...' : 'Create template'}
      </Button>
    </form>
  )
}
