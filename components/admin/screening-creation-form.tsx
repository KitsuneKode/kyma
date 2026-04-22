'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { motion } from 'motion/react'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function parseCandidateLines(rawValue: string) {
  return rawValue
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [candidateName, candidateEmail] = line
        .split(',')
        .map((part) => part.trim())

      return {
        candidateName,
        candidateEmail: candidateEmail || undefined,
      }
    })
    .filter((candidate) => candidate.candidateName.length > 0)
}

const STAGGER_VARIANTS: any = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
}

export function ScreeningCreationForm() {
  const router = useRouter()
  const templates = useQuery(api.admin.listActiveTemplates)
  const createScreeningBatch = useMutation(api.admin.createScreeningBatch)
  const [batchName, setBatchName] = useState('Primary tutor screening')
  const [expiryDays, setExpiryDays] = useState('7')
  const [allowedAttempts, setAllowedAttempts] = useState('1')
  const [templateId, setTemplateId] = useState<Id<'assessmentTemplates'> | ''>(
    ''
  )
  const [targetDurationMinutes, setTargetDurationMinutes] = useState('')
  const [allowsResume, setAllowsResume] = useState(true)
  const [candidateLines, setCandidateLines] = useState(
    'Aarav Mehta, aarav@example.com\nNaina Rao, naina@example.com'
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (templates?.length && !templateId) {
      setTemplateId(templates[0].id)
    }
  }, [templates, templateId])

  const parsedCandidates = useMemo(
    () => parseCandidateLines(candidateLines),
    [candidateLines]
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (parsedCandidates.length === 0) {
      setError(
        'Add at least one eligible candidate before creating a screening.'
      )
      return
    }

    setIsSubmitting(true)

    try {
      const durationParsed = Number.parseInt(targetDurationMinutes, 10)
      const batchId = await createScreeningBatch({
        name: batchName.trim() || 'Tutor screening',
        allowedAttempts: Math.max(1, Number.parseInt(allowedAttempts, 10) || 1),
        expiresAt: new Date(
          Date.now() +
            1000 * 60 * 60 * 24 * (Number.parseInt(expiryDays, 10) || 7)
        ).toISOString(),
        templateId: templateId || undefined,
        targetDurationMinutes: Number.isFinite(durationParsed)
          ? Math.max(5, durationParsed)
          : undefined,
        allowsResume,
        candidates: parsedCandidates,
      })

      startTransition(() => {
        router.push(`/admin/screenings/${batchId}`)
        router.refresh()
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create the screening.'
      )
      setIsSubmitting(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="grid gap-8"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.05 } },
      }}
    >
      <motion.div
        variants={STAGGER_VARIANTS}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-3">
          <Label
            htmlFor="template"
            className="font-semibold text-foreground/80"
          >
            Assessment template
          </Label>
          <Select
            value={templateId || undefined}
            onValueChange={(val) =>
              setTemplateId(val as Id<'assessmentTemplates'>)
            }
            disabled={!templates?.length}
          >
            <SelectTrigger
              id="template"
              className="h-12 rounded-xl border-border/60 bg-muted/20 px-4 transition-all hover:bg-muted/40 focus:ring-primary/20"
            >
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem
                  key={template.id}
                  value={template.id}
                  className="rounded-lg"
                >
                  {template.name}{' '}
                  <span className="ml-2 text-xs opacity-50">
                    · rubric {template.rubricVersion}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground/80">
            Batch-level duration and resume below override template defaults
            when set.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Label
            htmlFor="duration"
            className="font-semibold text-foreground/80"
          >
            Duration override (min)
          </Label>
          <Input
            id="duration"
            value={targetDurationMinutes}
            onChange={(event) => setTargetDurationMinutes(event.target.value)}
            inputMode="numeric"
            className="h-12 rounded-xl border-border/60 bg-muted/20 px-4 transition-all hover:bg-muted/40 focus-visible:ring-primary/20"
            placeholder="Template default"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Label className="font-semibold text-foreground/80">
            Resume policy
          </Label>
          <div
            className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 transition-colors hover:bg-muted/40"
            onClick={() => setAllowsResume(!allowsResume)}
          >
            <Checkbox
              id="resume"
              checked={allowsResume}
              onCheckedChange={(checked) => setAllowsResume(checked as boolean)}
            />
            <Label
              htmlFor="resume"
              className="w-full cursor-pointer text-sm font-medium"
            >
              Allow reconnect / resume
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label htmlFor="batch" className="font-semibold text-foreground/80">
            Screening name
          </Label>
          <Input
            id="batch"
            value={batchName}
            onChange={(event) => setBatchName(event.target.value)}
            className="h-12 rounded-xl border-border/60 bg-muted/20 px-4 transition-all hover:bg-muted/40 focus-visible:ring-primary/20"
            placeholder="Primary tutor screening"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Label htmlFor="expiry" className="font-semibold text-foreground/80">
            Expiry in days
          </Label>
          <Input
            id="expiry"
            value={expiryDays}
            onChange={(event) => setExpiryDays(event.target.value)}
            inputMode="numeric"
            className="h-12 rounded-xl border-border/60 bg-muted/20 px-4 transition-all hover:bg-muted/40 focus-visible:ring-primary/20"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Label
            htmlFor="attempts"
            className="font-semibold text-foreground/80"
          >
            Allowed attempts
          </Label>
          <Input
            id="attempts"
            value={allowedAttempts}
            onChange={(event) => setAllowedAttempts(event.target.value)}
            inputMode="numeric"
            className="h-12 rounded-xl border-border/60 bg-muted/20 px-4 transition-all hover:bg-muted/40 focus-visible:ring-primary/20"
          />
        </div>
      </motion.div>

      <motion.div variants={STAGGER_VARIANTS} className="flex flex-col gap-3">
        <Label
          htmlFor="candidates"
          className="font-semibold text-foreground/80"
        >
          Eligible candidates
        </Label>
        <Textarea
          id="candidates"
          value={candidateLines}
          onChange={(event) => setCandidateLines(event.target.value)}
          className="min-h-48 rounded-2xl border-border/60 bg-muted/20 p-5 leading-relaxed transition-all hover:bg-muted/40 focus-visible:ring-primary/20"
          placeholder="Candidate Name, candidate@email.com"
        />
        <p className="text-xs text-muted-foreground/80">
          One candidate per line. Use{' '}
          <code className="rounded bg-muted/50 px-1 py-0.5 text-foreground">
            Name, email
          </code>{' '}
          format. Email is optional.
        </p>
      </motion.div>

      <motion.div
        variants={STAGGER_VARIANTS}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm"
      >
        <p className="text-sm font-semibold tracking-wide text-primary">
          Preview & Confirmation
        </p>
        <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
          <strong className="text-foreground">{parsedCandidates.length}</strong>{' '}
          eligible candidates will receive invite links tied to this screening
          batch.
        </p>
      </motion.div>

      {error && (
        <motion.div variants={STAGGER_VARIANTS}>
          <p className="text-sm font-medium text-destructive">{error}</p>
        </motion.div>
      )}

      <motion.div variants={STAGGER_VARIANTS} className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full px-8 py-6 text-sm font-semibold shadow-xl transition-all active:scale-[0.96]"
        >
          {isSubmitting ? 'Creating screening...' : 'Create screening'}
        </Button>
      </motion.div>
    </motion.form>
  )
}
