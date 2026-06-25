'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { motion } from '@/components/motion/client-motion'
import { Button } from '@/components/ui/button'
import type { SessionPurpose } from '@/lib/interview/types'

type InterviewProcessingSuccessProps = {
  connectionError: string | null
  onRetrySubmission: () => void
  sessionId?: string | null
  sessionPurpose?: SessionPurpose
}

export function InterviewProcessingSuccess({
  connectionError,
  onRetrySubmission,
  sessionId,
  sessionPurpose = 'screening',
}: InterviewProcessingSuccessProps) {
  const router = useRouter()
  const isPractice = sessionPurpose === 'mock'
  const candidatePortalPath = sessionId
    ? isPractice
      ? `/candidate/practice/${sessionId}/feedback`
      : `/candidate/interviews/${sessionId}`
    : isPractice
      ? '/candidate/practice'
      : '/candidate'

  useEffect(() => {
    if (!isPractice || !sessionId || connectionError) {
      return
    }
    const timer = window.setTimeout(() => {
      router.push(candidatePortalPath)
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [candidatePortalPath, connectionError, isPractice, router, sessionId])

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0a] p-4">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/8 blur-2xl" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-card/95 p-10 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.45)]"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.3,
            delay: 0.05,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <svg
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.12,
                ease: [0.23, 1, 0.32, 1],
              }}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.28,
            delay: 0.1,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-emerald-400/80 uppercase">
            Success
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {isPractice ? 'Practice session submitted' : 'Interview submitted'}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.28,
            delay: 0.15,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          <p className="mx-auto mt-6 max-w-sm text-base leading-relaxed text-pretty text-muted-foreground">
            {isPractice
              ? 'Your practice session is processing. View learning-focused feedback with tips for your next rep — no hiring decision is attached.'
              : 'Your interview has been submitted and linked to your candidate portal. Track processing status and view your outcome when it is released.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.28,
            delay: 0.2,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="mt-10"
        >
          <Button
            type="button"
            className="rounded-full bg-primary px-8 py-6 font-medium text-primary-foreground shadow-[0_0_0_1px_rgba(232,255,71,0.45),0_10px_30px_rgba(0,0,0,0.35)] transition-colors hover:bg-primary/90"
            onClick={() => router.push(candidatePortalPath)}
          >
            {isPractice ? 'View practice feedback' : 'Go to candidate portal'}
          </Button>
        </motion.div>

        {connectionError ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 rounded-2xl bg-destructive/10 p-5 text-left shadow-[0_0_0_1px_rgba(239,68,68,0.28),0_8px_24px_rgba(0,0,0,0.3)]"
          >
            <p className="text-sm font-semibold text-destructive">
              Submission Warning
            </p>
            <p className="mt-2 text-sm text-destructive/90">
              {connectionError}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button
                type="button"
                onClick={onRetrySubmission}
                size="sm"
                variant="destructive"
                className="h-9 rounded-full px-5 transition-transform"
              >
                Retry submission
              </Button>
              <p className="text-xs text-destructive/80">
                If retry fails, contact the recruiter and share your invite
                token.
              </p>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  )
}
