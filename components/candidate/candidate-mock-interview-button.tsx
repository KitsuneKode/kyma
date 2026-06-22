'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useMutation } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'

export function CandidateMockInterviewButton() {
  const router = useRouter()
  const createMockInterview = useMutation(
    api.interviews.candidatePortal.createMockInterview
  )
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  async function handleStartMockInterview() {
    setError(null)
    setIsStarting(true)

    try {
      const { inviteToken } = await createMockInterview({})
      router.push(`/i/${inviteToken}`)
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Unable to start mock interview.'
      )
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="ghost"
        disabled={isStarting}
        onClick={() => void handleStartMockInterview()}
      >
        {isStarting ? 'Starting mock interview…' : 'Try mock interview'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
