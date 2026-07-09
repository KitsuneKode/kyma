'use client'

import Link from 'next/link'
import { startTransition, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { motion } from '@/components/motion/client-motion'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { ConvexAuthSetupPanel } from '@/components/auth/convex-auth-setup-panel'
import {
  ScreeningCandidateFields,
  type ScreeningCandidateDraft,
} from '@/components/admin/screening-candidate-fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'
import { fadeUp } from '@/lib/motion/presets'
import {
  clearScreeningCreationDraft,
  DEFAULT_SCREENING_CREATION_DRAFT,
  readScreeningCreationDraft,
  resolveScreeningAllowsResume,
  resolveScreeningDurationMinutes,
  type ScreeningCreationDraft,
  type ScreeningPolicyInheritMode,
  writeScreeningCreationDraft,
} from '@/lib/recruiter/screening-creation-draft'
import { formatStatusLabel } from '@/lib/recruiter/format'
import { sendBatchInviteEmails } from '@/lib/recruiter/send-batch-invite-emails'
import {
  JOB_FAMILY_LABELS,
  type JobFamily,
} from '@/lib/templates/job-family-starters'

const STAGGER_VARIANTS = fadeUp

const WIZARD_STEPS = [
  { id: 0, label: 'Batch config' },
  { id: 1, label: 'Candidates' },
  { id: 2, label: 'Review & publish' },
] as const

type TemplateOption = {
  id: string
  name: string
  rubricVersion: string
  jobFamily?: JobFamily
  targetDurationMinutes?: number
  allowsResume?: boolean
}

type CandidateDraft = ScreeningCandidateDraft

function createCandidateDraft(): CandidateDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    email: '',
  }
}

function buildDraftState(
  draft: ScreeningCreationDraft,
  templates: TemplateOption[]
): ScreeningCreationDraft {
  const templateId =
    draft.templateId &&
    templates.some((template) => template.id === draft.templateId)
      ? draft.templateId
      : (templates[0]?.id ?? '')

  return {
    ...draft,
    templateId,
    candidates:
      draft.candidates.length > 0 ? draft.candidates : [createCandidateDraft()],
  }
}

export function ScreeningCreationForm({
  initialTemplates = [],
}: {
  initialTemplates?: TemplateOption[]
}) {
  const router = useRouter()
  const {
    data: clientTemplates,
    authLoading,
    isAuthenticated,
  } = useAuthenticatedQuery(api.recruiter.templates.listActiveTemplates, {})
  const templates =
    clientTemplates !== undefined ? clientTemplates : initialTemplates
  const createScreeningBatch = useMutation(
    api.recruiter.screenings.createScreeningBatch
  )

  const [draftLoaded, setDraftLoaded] = useState(false)
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [batchName, setBatchName] = useState(
    DEFAULT_SCREENING_CREATION_DRAFT.batchName
  )
  const [expiryDays, setExpiryDays] = useState(
    DEFAULT_SCREENING_CREATION_DRAFT.expiryDays
  )
  const [allowedAttempts, setAllowedAttempts] = useState(
    DEFAULT_SCREENING_CREATION_DRAFT.allowedAttempts
  )
  const [candidateReleaseMode, setCandidateReleaseMode] = useState<
    'inherit' | 'auto' | 'manual'
  >(DEFAULT_SCREENING_CREATION_DRAFT.candidateReleaseMode)
  const [durationMode, setDurationMode] = useState<ScreeningPolicyInheritMode>(
    DEFAULT_SCREENING_CREATION_DRAFT.durationMode
  )
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(
    DEFAULT_SCREENING_CREATION_DRAFT.targetDurationMinutes
  )
  const [resumeMode, setResumeMode] = useState<ScreeningPolicyInheritMode>(
    DEFAULT_SCREENING_CREATION_DRAFT.resumeMode
  )
  const [allowsResume, setAllowsResume] = useState(
    DEFAULT_SCREENING_CREATION_DRAFT.allowsResume
  )
  const [templateId, setTemplateId] = useState('')
  const [candidates, setCandidates] = useState<CandidateDraft[]>([
    createCandidateDraft(),
  ])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const stored = readScreeningCreationDraft()
    if (stored) {
      setStep(stored.step)
      setBatchName(stored.batchName)
      setExpiryDays(stored.expiryDays)
      setAllowedAttempts(stored.allowedAttempts)
      setCandidateReleaseMode(stored.candidateReleaseMode)
      setDurationMode(stored.durationMode)
      setTargetDurationMinutes(stored.targetDurationMinutes)
      setResumeMode(stored.resumeMode)
      setAllowsResume(stored.allowsResume)
      setTemplateId(stored.templateId)
      setCandidates(
        stored.candidates.length > 0
          ? stored.candidates
          : [createCandidateDraft()]
      )
    }
    setDraftLoaded(true)
  }, [])

  useEffect(() => {
    if (!templates?.length) {
      setTemplateId('')
      return
    }
    setTemplateId((current) => {
      if (current && templates.some((template) => template.id === current)) {
        return current
      }
      return templates[0].id
    })
  }, [templates])

  useEffect(() => {
    if (!draftLoaded) {
      return
    }

    writeScreeningCreationDraft({
      step,
      batchName,
      expiryDays,
      allowedAttempts,
      candidateReleaseMode,
      durationMode,
      targetDurationMinutes,
      resumeMode,
      allowsResume,
      templateId,
      candidates,
    })
  }, [
    draftLoaded,
    step,
    batchName,
    expiryDays,
    allowedAttempts,
    candidateReleaseMode,
    durationMode,
    targetDurationMinutes,
    resumeMode,
    allowsResume,
    templateId,
    candidates,
  ])

  const selectedTemplateId = useMemo(() => {
    if (!templates?.length) {
      return ''
    }
    if (
      templateId &&
      templates.some((template) => template.id === templateId)
    ) {
      return templateId
    }
    return templates[0].id
  }, [templates, templateId])

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [templates, selectedTemplateId]
  )

  const resolvedDurationMinutes = resolveScreeningDurationMinutes(
    { durationMode, targetDurationMinutes },
    selectedTemplate?.targetDurationMinutes
  )
  const resolvedAllowsResume = resolveScreeningAllowsResume(
    { resumeMode, allowsResume },
    selectedTemplate?.allowsResume
  )
  const resolvedJobFamilyLabel = selectedTemplate?.jobFamily
    ? JOB_FAMILY_LABELS[selectedTemplate.jobFamily]
    : 'Unassigned'

  const parsedCandidates = useMemo(() => {
    const next: Array<{
      candidateName: string
      candidateEmail: string
    }> = []

    for (const candidate of candidates) {
      const candidateName = candidate.name.trim()
      const candidateEmail = candidate.email.trim().toLowerCase()
      if (candidateName.length === 0) {
        continue
      }

      next.push({
        candidateName,
        candidateEmail,
      })
    }

    return next
  }, [candidates])

  const addCandidate = () => {
    setCandidates((current) => [...current, createCandidateDraft()])
  }

  const removeCandidate = (id: string) => {
    setCandidates((current) => {
      if (current.length <= 1) {
        return current
      }
      return current.filter((candidate) => candidate.id !== id)
    })
  }

  const updateCandidate = (
    id: string,
    field: 'name' | 'email',
    value: string
  ) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: value } : candidate
      )
    )
  }

  function validateCandidatesStep() {
    if (parsedCandidates.length === 0) {
      setError(
        'Add at least one eligible candidate before creating a screening.'
      )
      return false
    }

    const missingEmail = parsedCandidates.find(
      (candidate) =>
        candidate.candidateEmail.length === 0 ||
        !candidate.candidateEmail.includes('@')
    )
    if (missingEmail) {
      setError(
        `Enter a valid email for ${missingEmail.candidateName || 'each candidate'}. Invites are email-bound for account linking.`
      )
      return false
    }

    setError(null)
    return true
  }

  function validateConfigStep() {
    if (!templates.length) {
      setError('Create an active assessment template before continuing.')
      return false
    }
    if (!batchName.trim()) {
      setError('Enter a screening name before continuing.')
      return false
    }
    setError(null)
    return true
  }

  function handleNextStep() {
    if (step === 0 && !validateConfigStep()) {
      return
    }
    if (step === 1 && !validateCandidatesStep()) {
      return
    }
    setError(null)
    setStep((current) => (current < 2 ? ((current + 1) as 0 | 1 | 2) : current))
  }

  function handlePreviousStep() {
    setError(null)
    setStep((current) => (current > 0 ? ((current - 1) as 0 | 1 | 2) : current))
  }

  function handleResetDraft() {
    clearScreeningCreationDraft()
    const reset = buildDraftState(DEFAULT_SCREENING_CREATION_DRAFT, templates)
    setStep(reset.step)
    setBatchName(reset.batchName)
    setExpiryDays(reset.expiryDays)
    setAllowedAttempts(reset.allowedAttempts)
    setCandidateReleaseMode(reset.candidateReleaseMode)
    setDurationMode(reset.durationMode)
    setTargetDurationMinutes(reset.targetDurationMinutes)
    setResumeMode(reset.resumeMode)
    setAllowsResume(reset.allowsResume)
    setTemplateId(reset.templateId)
    setCandidates(reset.candidates.map(() => createCandidateDraft()))
    setError(null)
  }

  async function handleSubmit() {
    if (!validateCandidatesStep()) {
      setStep(1)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const batchId = await createScreeningBatch({
        name: batchName.trim() || 'Screening batch',
        allowedAttempts: Math.max(1, Number.parseInt(allowedAttempts, 10) || 1),
        expiresAt: new Date(
          Date.now() +
            1000 * 60 * 60 * 24 * (Number.parseInt(expiryDays, 10) || 7)
        ).toISOString(),
        templateId: selectedTemplateId
          ? (selectedTemplateId as Id<'assessmentTemplates'>)
          : undefined,
        candidateReleaseMode,
        targetDurationMinutes: resolvedDurationMinutes,
        allowsResume: resolvedAllowsResume,
        candidates: parsedCandidates,
      })

      const emailResult = await sendBatchInviteEmails(batchId)
      if (!emailResult.ok) {
        console.warn('[screening] invite email send failed', emailResult.error)
      }

      clearScreeningCreationDraft()
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

  if (authLoading) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Connecting to Convex…
      </p>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="py-8">
        <ConvexAuthSetupPanel />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center py-16">
      <div className="w-full max-w-xl">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Create a screening batch
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Launch invite-only cohorts with explicit expiry and attempt rules.
          </p>
        </header>

        <ol className="mb-8 flex items-center justify-center gap-2">
          {WIZARD_STEPS.map((wizardStep, index) => (
            <li key={wizardStep.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (wizardStep.id < step) {
                    setStep(wizardStep.id)
                    setError(null)
                  }
                }}
                disabled={wizardStep.id > step}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  step === wizardStep.id
                    ? 'bg-primary/10 text-primary'
                    : wizardStep.id < step
                      ? 'text-foreground hover:bg-muted/30'
                      : 'text-muted-foreground'
                )}
              >
                <span className="font-mono tabular-nums">{index + 1}</span>
                {wizardStep.label}
              </button>
              {index < WIZARD_STEPS.length - 1 ? (
                <span className="text-muted-foreground/40">→</span>
              ) : null}
            </li>
          ))}
        </ol>

        <motion.div
          className="rounded-3xl bg-card p-8 shadow-[var(--shadow-md)] ring-1 ring-border/60 md:p-10"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          <div className="flex flex-col gap-8">
            {step === 0 ? (
              <>
                <motion.div
                  variants={STAGGER_VARIANTS}
                  className="flex flex-col gap-3"
                >
                  <Label
                    htmlFor="template"
                    className="text-xs font-bold tracking-widest text-muted-foreground uppercase"
                  >
                    Assessment template
                  </Label>
                  {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active templates yet.{' '}
                      <Link
                        href="/recruiter/templates/new"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        Create a template
                      </Link>{' '}
                      first.
                    </p>
                  ) : null}
                  {templates.length > 0 ? (
                    <Select
                      value={selectedTemplateId}
                      onValueChange={(value) => setTemplateId(value ?? '')}
                    >
                      <SelectTrigger
                        id="template"
                        className="h-12 rounded-xl border-border/40 bg-background px-4 text-base"
                      >
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}{' '}
                            <span className="ml-2 text-xs opacity-50">
                              · rubric {template.rubricVersion}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </motion.div>

                <motion.div
                  variants={STAGGER_VARIANTS}
                  className="flex flex-col gap-3"
                >
                  <Label
                    htmlFor="batch"
                    className="text-xs font-bold tracking-widest text-muted-foreground uppercase"
                  >
                    Screening name
                  </Label>
                  <Input
                    id="batch"
                    value={batchName}
                    onChange={(event) => setBatchName(event.target.value)}
                    className="h-12 rounded-xl border-border/40 bg-background px-4 text-base"
                    placeholder="Screening batch"
                  />
                </motion.div>

                {selectedTemplate ? (
                  <motion.div
                    variants={STAGGER_VARIANTS}
                    className="rounded-2xl border border-border/40 bg-muted/10 p-4 text-sm"
                  >
                    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                      Template policy
                    </p>
                    <dl className="mt-3 grid gap-2">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Job family</dt>
                        <dd className="font-medium">
                          {resolvedJobFamilyLabel}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">
                          Default duration
                        </dt>
                        <dd className="font-mono tabular-nums">
                          {selectedTemplate.targetDurationMinutes ?? 18} min
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Resume</dt>
                        <dd>
                          {selectedTemplate.allowsResume === false
                            ? 'Single-pass'
                            : 'Allowed'}
                        </dd>
                      </div>
                    </dl>
                  </motion.div>
                ) : null}

                <motion.div
                  variants={STAGGER_VARIANTS}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="col-span-2 flex flex-col gap-3">
                    <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                      Interview duration
                    </Label>
                    <Select
                      value={durationMode}
                      onValueChange={(value) =>
                        setDurationMode(
                          (value ?? 'inherit') as ScreeningPolicyInheritMode
                        )
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl border-border/40 bg-background px-4 text-base">
                        <SelectValue placeholder="Duration policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">
                          Inherit from template (
                          {selectedTemplate?.targetDurationMinutes ?? 18} min)
                        </SelectItem>
                        <SelectItem value="override">
                          Override duration
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {durationMode === 'override' ? (
                      <Input
                        value={targetDurationMinutes}
                        onChange={(event) =>
                          setTargetDurationMinutes(event.target.value)
                        }
                        inputMode="numeric"
                        className="h-12 rounded-xl border-border/40 bg-background px-4 text-base tabular-nums"
                        placeholder="Minutes"
                      />
                    ) : null}
                  </div>

                  <div className="col-span-2 flex flex-col gap-3">
                    <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                      Resume policy
                    </Label>
                    <Select
                      value={resumeMode}
                      onValueChange={(value) =>
                        setResumeMode(
                          (value ?? 'inherit') as ScreeningPolicyInheritMode
                        )
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl border-border/40 bg-background px-4 text-base">
                        <SelectValue placeholder="Resume policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">
                          Inherit from template (
                          {selectedTemplate?.allowsResume === false
                            ? 'single-pass'
                            : 'resume allowed'}
                          )
                        </SelectItem>
                        <SelectItem value="override">
                          Override resume policy
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {resumeMode === 'override' ? (
                      <Select
                        value={allowsResume ? 'allow' : 'deny'}
                        onValueChange={(value) =>
                          setAllowsResume((value ?? 'allow') === 'allow')
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl border-border/40 bg-background px-4 text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allow">Allow resume</SelectItem>
                          <SelectItem value="deny">Single-pass only</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                </motion.div>

                <motion.div
                  variants={STAGGER_VARIANTS}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex flex-col gap-3">
                    <Label
                      htmlFor="expiry"
                      className="text-xs font-bold tracking-widest text-muted-foreground uppercase"
                    >
                      Expiry (days)
                    </Label>
                    <Input
                      id="expiry"
                      value={expiryDays}
                      onChange={(event) => setExpiryDays(event.target.value)}
                      inputMode="numeric"
                      className="h-12 rounded-xl border-border/40 bg-background px-4 text-base tabular-nums"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label
                      htmlFor="attempts"
                      className="text-xs font-bold tracking-widest text-muted-foreground uppercase"
                    >
                      Attempts
                    </Label>
                    <Input
                      id="attempts"
                      value={allowedAttempts}
                      onChange={(event) =>
                        setAllowedAttempts(event.target.value)
                      }
                      inputMode="numeric"
                      className="h-12 rounded-xl border-border/40 bg-background px-4 text-base tabular-nums"
                    />
                  </div>
                </motion.div>

                <motion.div
                  variants={STAGGER_VARIANTS}
                  className="flex flex-col gap-3"
                >
                  <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Candidate release
                  </Label>
                  <Select
                    value={candidateReleaseMode}
                    onValueChange={(value) =>
                      setCandidateReleaseMode(
                        (value ?? 'inherit') as 'inherit' | 'auto' | 'manual'
                      )
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl border-border/40 bg-background px-4 text-base">
                      <SelectValue placeholder="Release policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">
                        Inherit workspace default
                      </SelectItem>
                      <SelectItem value="auto">
                        Auto-release on Advance / Reject
                      </SelectItem>
                      <SelectItem value="manual">
                        Manual release only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              </>
            ) : null}

            {step === 1 ? (
              <ScreeningCandidateFields
                candidates={candidates}
                onAddCandidate={addCandidate}
                onRemoveCandidate={removeCandidate}
                onUpdateCandidate={updateCandidate}
                staggerVariants={STAGGER_VARIANTS}
              />
            ) : null}

            {step === 2 ? (
              <motion.div
                variants={STAGGER_VARIANTS}
                className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-muted/10 p-5"
              >
                <div>
                  <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Batch summary
                  </p>
                  <p className="mt-2 text-lg font-semibold">{batchName}</p>
                </div>
                <dl className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Template</dt>
                    <dd className="text-right font-medium">
                      {selectedTemplate?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Job family</dt>
                    <dd className="text-right font-medium">
                      {resolvedJobFamilyLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-mono tabular-nums">
                      {resolvedDurationMinutes ?? '—'} min
                      {durationMode === 'inherit'
                        ? ' (template)'
                        : ' (override)'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Resume</dt>
                    <dd>
                      {resolvedAllowsResume === false
                        ? 'Single-pass'
                        : 'Allowed'}
                      {resumeMode === 'inherit' ? ' (template)' : ' (override)'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Expiry</dt>
                    <dd className="font-mono tabular-nums">
                      {expiryDays} days
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Attempts</dt>
                    <dd className="font-mono tabular-nums">
                      {allowedAttempts}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Release</dt>
                    <dd>{formatStatusLabel(candidateReleaseMode)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Candidates</dt>
                    <dd className="font-mono tabular-nums">
                      {parsedCandidates.length}
                    </dd>
                  </div>
                </dl>
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Invite list
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {parsedCandidates.map((candidate) => (
                      <li
                        key={`${candidate.candidateEmail}-${candidate.candidateName}`}
                        className="rounded-lg bg-background px-3 py-2 text-sm"
                      >
                        <span className="font-medium">
                          {candidate.candidateName}
                        </span>
                        <span className="text-muted-foreground">
                          {' '}
                          · {candidate.candidateEmail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : null}

            {error ? (
              <motion.div variants={STAGGER_VARIANTS}>
                <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
                  {error}
                </p>
              </motion.div>
            ) : null}

            <motion.div
              variants={STAGGER_VARIANTS}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetDraft}
                disabled={isSubmitting}
              >
                Clear draft
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                ) : null}
                {step < 2 ? (
                  <Button type="button" onClick={handleNextStep}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleSubmit()}
                    className="group relative h-14 min-w-48 overflow-hidden"
                  >
                    <div
                      className={cn(
                        'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
                        isSubmitting ? 'opacity-100' : 'opacity-0'
                      )}
                    >
                      <div className="size-6 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    </div>
                    <span
                      className={cn(
                        'transition-opacity duration-300',
                        isSubmitting ? 'opacity-0' : 'opacity-100'
                      )}
                    >
                      Create batch & generate links
                    </span>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
