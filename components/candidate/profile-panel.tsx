'use client'

import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'

type CandidateIdentity = {
  name: string
  email: string
}

export function CandidateProfilePanel({
  identity,
}: {
  identity: CandidateIdentity
}) {
  const { data: preferences } = useAuthenticatedQuery(
    api.profile.getCandidatePreferences,
    {}
  )
  const savePreferences = useMutation(api.profile.saveCandidatePreferences)
  const [language, setLanguage] = useState('English')
  const [duration, setDuration] = useState(20)
  const [timezone, setTimezone] = useState('UTC')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<string | null>(null)

  useEffect(() => {
    if (!preferences) {
      return
    }
    setLanguage(preferences.preferredInterviewLanguage)
    setDuration(preferences.preferredInterviewLengthMinutes)
    setTimezone(preferences.timezone)
    setNotes(preferences.accessibilityNotes)
  }, [preferences])

  async function handleSave() {
    setSaving(true)
    setSaveState(null)
    try {
      await savePreferences({
        preferredInterviewLanguage: language,
        preferredInterviewLengthMinutes: duration,
        timezone,
        accessibilityNotes: notes.trim() || undefined,
      })
      setSaveState('Saved')
    } catch (error) {
      setSaveState(
        error instanceof Error
          ? error.message
          : 'Unable to save profile preferences.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Profile settings</h1>
        <p className="text-sm text-muted-foreground">
          Identity is managed by your auth account, interview preferences are
          editable here.
        </p>
      </div>

      <article className="rounded-2xl bg-card p-5 shadow-[var(--shadow-sm)] ring-1 ring-border/60">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Identity
        </h2>
        <p className="mt-3 text-sm">{identity.name}</p>
        <p className="text-sm text-muted-foreground">{identity.email}</p>
      </article>

      <article className="space-y-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-sm)] ring-1 ring-border/60">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Interview preferences
        </h2>
        <label className="block space-y-2 text-sm">
          <span>Preferred language</span>
          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Preferred interview length (minutes)</span>
          <input
            type="number"
            min={10}
            max={60}
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value) || 20)}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Timezone</span>
          <input
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Accessibility notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save preferences'}
          </Button>
          {saveState ? (
            <p className="text-sm text-muted-foreground">{saveState}</p>
          ) : null}
        </div>
      </article>
    </section>
  )
}
