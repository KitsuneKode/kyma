'use client'

import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { WorkspaceTextarea } from '@/components/workspace/textarea'
import type { FunctionReturnType } from 'convex/server'

type CandidatePreferences = FunctionReturnType<
  typeof api.profile.getCandidatePreferences
>

type CandidateIdentity = {
  name: string
  email: string
}

export function CandidateProfilePanel({
  identity,
  initialPreferences,
}: {
  identity: CandidateIdentity
  initialPreferences?: CandidatePreferences
}) {
  const savePreferences = useMutation(api.profile.saveCandidatePreferences)
  const [language, setLanguage] = useState(
    initialPreferences?.preferredInterviewLanguage ?? 'English'
  )
  const [duration, setDuration] = useState(
    initialPreferences?.preferredInterviewLengthMinutes ?? 20
  )
  const [timezone, setTimezone] = useState(
    initialPreferences?.timezone ?? 'UTC'
  )
  const [notes, setNotes] = useState(
    initialPreferences?.accessibilityNotes ?? ''
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initialPreferences) {
      return
    }
    setLanguage(initialPreferences.preferredInterviewLanguage)
    setDuration(initialPreferences.preferredInterviewLengthMinutes)
    setTimezone(initialPreferences.timezone)
    setNotes(initialPreferences.accessibilityNotes)
  }, [initialPreferences])

  async function handleSave() {
    setSaving(true)
    try {
      await savePreferences({
        preferredInterviewLanguage: language,
        preferredInterviewLengthMinutes: duration,
        timezone,
        accessibilityNotes: notes.trim() || undefined,
      })
      toast.success('Profile preferences saved')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to save profile preferences.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-8">
      <WorkspacePageHeader
        eyebrow="Candidate account"
        title="Profile settings"
        description="Identity is managed by your auth account. Interview preferences are editable here."
      />

      <WorkspaceSurface className="space-y-3 p-5">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Identity
        </h2>
        <p className="text-sm">{identity.name}</p>
        <p className="text-sm text-muted-foreground">{identity.email}</p>
      </WorkspaceSurface>

      <WorkspaceSurface className="space-y-5 p-5">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Interview preferences
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-language">Preferred language</Label>
            <Input
              id="profile-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-duration">
              Preferred interview length (minutes)
            </Label>
            <Input
              id="profile-duration"
              type="number"
              min={10}
              max={60}
              value={duration}
              onChange={(event) =>
                setDuration(Number(event.target.value) || 20)
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-timezone">Timezone</Label>
            <Input
              id="profile-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-notes">Accessibility notes</Label>
            <WorkspaceTextarea
              id="profile-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </WorkspaceSurface>
    </section>
  )
}
