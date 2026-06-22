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

const STAGGER_VARIANTS: any = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
}

type CandidateDraft = ScreeningCandidateDraft

function createCandidateDraft(): CandidateDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    email: '',
  }
}

export function ScreeningCreationForm() {
  const router = useRouter()
  const {
    data: templates,
    authLoading,
    isAuthenticated,
  } = useAuthenticatedQuery(api.admin.listActiveTemplates, {})
  const createScreeningBatch = useMutation(api.admin.createScreeningBatch)
  const [batchName, setBatchName] = useState('Primary tutor screening')
  const [expiryDays, setExpiryDays] = useState('7')
  const [allowedAttempts, setAllowedAttempts] = useState('1')
  const [candidateReleaseMode, setCandidateReleaseMode] = useState<
    'inherit' | 'auto' | 'manual'
  >('inherit')
  const [templateId, setTemplateId] = useState('')
  const [candidates, setCandidates] = useState<CandidateDraft[]>([
    createCandidateDraft(),
  ])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (parsedCandidates.length === 0) {
      setError(
        'Add at least one eligible candidate before creating a screening.'
      )
      return
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
      return
    }

    setIsSubmitting(true)

    try {
      const batchId = await createScreeningBatch({
        name: batchName.trim() || 'Tutor screening',
        allowedAttempts: Math.max(1, Number.parseInt(allowedAttempts, 10) || 1),
        expiresAt: new Date(
          Date.now() +
            1000 * 60 * 60 * 24 * (Number.parseInt(expiryDays, 10) || 7)
        ).toISOString(),
        templateId: selectedTemplateId
          ? (selectedTemplateId as Id<'assessmentTemplates'>)
          : undefined,
        candidateReleaseMode,
        candidates: parsedCandidates,
      })

      // Simulate a small delay for tactile success feeling before redirecting
      setTimeout(() => {
        startTransition(() => {
          router.push(`/recruiter/screenings/${batchId}`)
          router.refresh()
        })
      }, 400)
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

        <motion.form
          onSubmit={handleSubmit}
          className="rounded-[2rem] bg-card p-8 shadow-2xl ring-1 ring-border/20 md:p-10"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          <div className="flex flex-col gap-8">
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
              {templates === undefined ? (
                <p className="text-sm text-muted-foreground">
                  Loading templates...
                </p>
              ) : templates.length === 0 ? (
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
              {templates && templates.length > 0 ? (
                <Select
                  value={selectedTemplateId}
                  onValueChange={(value) => setTemplateId(value ?? '')}
                >
                  <SelectTrigger
                    id="template"
                    className="h-12 rounded-xl border-border/40 bg-background px-4 text-base transition-[border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/10 focus:ring-4 focus:ring-primary/10"
                  >
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
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
                className="h-12 rounded-xl border-border/40 bg-background px-4 text-base transition-[border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/10 focus-visible:ring-4 focus-visible:ring-primary/10"
                placeholder="Primary tutor screening"
              />
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
                  className="h-12 rounded-xl border-border/40 bg-background px-4 text-base tabular-nums transition-[border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/10 focus-visible:ring-4 focus-visible:ring-primary/10"
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
                  onChange={(event) => setAllowedAttempts(event.target.value)}
                  inputMode="numeric"
                  className="h-12 rounded-xl border-border/40 bg-background px-4 text-base tabular-nums transition-[border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/10 focus-visible:ring-4 focus-visible:ring-primary/10"
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
                  <SelectItem value="manual">Manual release only</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            <ScreeningCandidateFields
              candidates={candidates}
              onAddCandidate={addCandidate}
              onRemoveCandidate={removeCandidate}
              onUpdateCandidate={updateCandidate}
              staggerVariants={STAGGER_VARIANTS}
            />

            {error && (
              <motion.div variants={STAGGER_VARIANTS}>
                <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
                  {error}
                </p>
              </motion.div>
            )}

            <motion.div
              variants={STAGGER_VARIANTS}
              className="mt-4 flex justify-end"
            >
              <Button
                type="submit"
                disabled={isSubmitting}
                className="group relative h-14 w-full overflow-hidden rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96]"
              >
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
                    isSubmitting ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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
            </motion.div>
          </div>
        </motion.form>
      </div>
    </div>
  )
}
