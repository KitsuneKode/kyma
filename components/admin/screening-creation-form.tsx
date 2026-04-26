'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { motion } from 'motion/react'
import { IconPlus, IconTrash } from '@tabler/icons-react'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const [templateId, setTemplateId] =
    useState<Id<'assessmentTemplates'> | null>(null)
  const [targetDurationMinutes, setTargetDurationMinutes] = useState('')
  const [allowsResume, setAllowsResume] = useState(true)
  const [candidates, setCandidates] = useState<
    { name: string; email: string }[]
  >([{ name: '', email: '' }])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (templates?.length && !templateId) {
      setTemplateId(templates[0].id)
    }
  }, [templates, templateId])

  const parsedCandidates = useMemo(
    () =>
      candidates
        .map((c) => ({
          candidateName: c.name.trim(),
          candidateEmail: c.email.trim() || undefined,
        }))
        .filter((c) => c.candidateName.length > 0),
    [candidates]
  )

  const addCandidate = () => {
    setCandidates([...candidates, { name: '', email: '' }])
  }

  const removeCandidate = (index: number) => {
    if (candidates.length > 1) {
      setCandidates(candidates.filter((_, i) => i !== index))
    }
  }

  const updateCandidate = (
    index: number,
    field: 'name' | 'email',
    value: string
  ) => {
    const newCandidates = [...candidates]
    newCandidates[index][field] = value
    setCandidates(newCandidates)
  }

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
        router.push(`/recruiter/screenings/${batchId}`)
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
            value={templateId}
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

      <motion.div variants={STAGGER_VARIANTS} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label className="font-semibold text-foreground/80">
            Eligible candidates
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCandidate}
            className="h-8 gap-1.5 rounded-lg transition-transform"
          >
            <IconPlus className="size-4" />
            Add Candidate
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/10 p-5">
          {candidates.map((candidate, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 sm:items-center"
            >
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <Input
                  value={candidate.name}
                  onChange={(e) =>
                    updateCandidate(index, 'name', e.target.value)
                  }
                  placeholder="Candidate Name"
                  className="h-10 flex-1 rounded-xl bg-background"
                />
                <Input
                  value={candidate.email}
                  onChange={(e) =>
                    updateCandidate(index, 'email', e.target.value)
                  }
                  placeholder="Email (optional)"
                  type="email"
                  className="h-10 flex-1 rounded-xl bg-background"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCandidate(index)}
                disabled={candidates.length === 1}
                className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <IconTrash className="size-4" />
              </Button>
            </motion.div>
          ))}
        </div>
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
          className="rounded-full px-8 py-6 text-sm font-semibold shadow-xl transition-all"
        >
          {isSubmitting ? 'Creating screening batch...' : 'Create Screening'}
        </Button>
      </motion.div>
    </motion.form>
  )
}
