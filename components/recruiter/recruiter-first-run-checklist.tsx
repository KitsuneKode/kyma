'use client'

import Link from 'next/link'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { IconCheck, IconCircle } from '@tabler/icons-react'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { WorkspaceSurface } from '@/components/workspace/surface'

type OnboardingStep = 'template' | 'batch' | 'invite_preview' | 'example_report'

const STEPS: Array<{
  id: OnboardingStep
  title: string
  description: string
  href: (context: {
    templateId: string | null
    activeBatchId: string | null
    exampleReportSessionId: string | null
  }) => string
}> = [
  {
    id: 'template',
    title: 'Review your assessment template',
    description:
      'Confirm rubric dimensions, prompts, and model defaults before inviting candidates.',
    href: ({ templateId }) =>
      templateId
        ? `/recruiter/templates?highlight=${templateId}`
        : '/recruiter/templates',
  },
  {
    id: 'batch',
    title: 'Create a screening batch',
    description:
      'Launch an invite-gated cohort with attempt limits and expiry policy.',
    href: () => '/recruiter/screenings/new',
  },
  {
    id: 'invite_preview',
    title: 'Preview a candidate invite',
    description:
      'Open an active batch and verify invite links before sending them out.',
    href: ({ activeBatchId }) =>
      activeBatchId
        ? `/recruiter/screenings/${activeBatchId}`
        : '/recruiter/screenings',
  },
  {
    id: 'example_report',
    title: 'Review an example report',
    description:
      'Walk through transcript-backed evidence and recruiter review tools.',
    href: ({ exampleReportSessionId }) =>
      exampleReportSessionId
        ? `/recruiter/candidates/${exampleReportSessionId}`
        : '/recruiter/candidates',
  },
]

export function RecruiterFirstRunChecklist({
  completedSteps,
  templateId,
  activeBatchId,
  exampleReportSessionId,
}: {
  completedSteps: OnboardingStep[]
  templateId: string | null
  activeBatchId: string | null
  exampleReportSessionId: string | null
}) {
  const completeOnboarding = useMutation(
    api.onboarding.completeRecruiterOnboarding
  )
  const [busyStep, setBusyStep] = useState<OnboardingStep | null>(null)
  const [error, setError] = useState<string | null>(null)

  const context = { templateId, activeBatchId, exampleReportSessionId }

  async function markStepComplete(step: OnboardingStep) {
    setBusyStep(step)
    setError(null)
    try {
      await completeOnboarding({ step })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to update onboarding progress.'
      )
    } finally {
      setBusyStep(null)
    }
  }

  async function markAllComplete() {
    setBusyStep('example_report')
    setError(null)
    try {
      await completeOnboarding({ markAllComplete: true })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to complete onboarding.'
      )
    } finally {
      setBusyStep(null)
    }
  }

  return (
    <WorkspaceSurface className="space-y-6 p-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          First-run checklist
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Get your recruiter workspace ready
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Complete these four steps to publish screenings, send invites, and
          review evidence-backed candidate reports.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((step, index) => {
          const isComplete = completedSteps.includes(step.id)
          return (
            <li
              key={step.id}
              className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-muted/10 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border/60">
                  {isComplete ? (
                    <IconCheck className="size-4 text-primary" />
                  ) : (
                    <IconCircle className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<Link href={step.href(context)} />}
                >
                  Open
                </Button>
                <Button
                  type="button"
                  disabled={isComplete || busyStep === step.id}
                  onClick={() => void markStepComplete(step.id)}
                >
                  {isComplete
                    ? 'Done'
                    : busyStep === step.id
                      ? 'Saving…'
                      : 'Mark complete'}
                </Button>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={busyStep !== null}
          onClick={() => void markAllComplete()}
        >
          Mark all complete
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </WorkspaceSurface>
  )
}
