'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'

import { api } from '@/convex/_generated/api'
import { motion } from '@/components/motion/client-motion'
import type { PracticeJobFamily } from '@/lib/practice/packs'
import { Button } from '@/components/ui/button'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { pressScaleClass } from '@/lib/motion/presets'
import { useMotionPresets } from '@/lib/motion/use-motion-presets'
import { cn } from '@/lib/utils'

export function PracticeHub() {
  const router = useRouter()
  const { staggerChildren, listItem } = useMotionPresets()
  const packs = useQuery(api.interviews.candidatePortal.listPracticePacks)
  const usage = useQuery(api.interviews.candidatePortal.getPracticeUsage)
  const createPractice = useMutation(
    api.interviews.candidatePortal.createMockInterview
  )
  const [selectedPack, setSelectedPack] = useState<PracticeJobFamily | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const atLimit =
    usage !== undefined && usage.sessionsUsed >= usage.sessionsLimit

  async function handleStart() {
    if (!selectedPack) {
      setError('Choose a practice pack to continue.')
      return
    }
    setError(null)
    setStarting(true)
    try {
      const { inviteToken } = await createPractice({ jobFamily: selectedPack })
      router.push(`/i/${inviteToken}`)
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Unable to start practice interview.'
      )
    } finally {
      setStarting(false)
    }
  }

  return (
    <section className="mx-auto w-full space-y-8">
      <WorkspacePageHeader
        eyebrow="Practice"
        title="Practice interviews"
        description="Pick a role pack, run a short readiness check, and complete a private voice practice session with learning-focused feedback."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/candidate/readiness" />}
          >
            Run readiness check
          </Button>
        }
      />

      {usage ? (
        <WorkspaceSurface className="p-4">
          <p className="text-sm text-muted-foreground">
            Practice sessions used:{' '}
            <span className="font-medium text-foreground tabular-nums">
              {usage.sessionsUsed} / {usage.sessionsLimit}
            </span>{' '}
            in the last {usage.windowHours} hours.
          </p>
        </WorkspaceSurface>
      ) : null}

      <motion.div
        className="grid gap-4 md:grid-cols-2"
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        {packs?.map((pack) => {
          const isSelected = selectedPack === pack.id
          return (
            <motion.div key={pack.id} variants={listItem}>
              <button
                type="button"
                className={cn('w-full text-left', pressScaleClass)}
                onClick={() => setSelectedPack(pack.id)}
              >
                <WorkspaceSurface
                  className={cn(
                    'h-full p-5 transition-[background-color,box-shadow,transform] duration-200',
                    isSelected
                      ? 'ring-2 ring-primary/50'
                      : 'hover:bg-muted/20 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--shadow-md)]'
                  )}
                >
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                    {pack.durationMinutes} min
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{pack.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pack.description}
                  </p>
                </WorkspaceSurface>
              </button>
            </motion.div>
          )
        })}
      </motion.div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={starting || atLimit || !selectedPack}
          onClick={() => void handleStart()}
        >
          {starting
            ? 'Starting practice…'
            : atLimit
              ? 'Daily practice limit reached'
              : 'Start practice interview'}
        </Button>
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link href="/candidate" />}
        >
          Back to dashboard
        </Button>
      </div>
    </section>
  )
}
