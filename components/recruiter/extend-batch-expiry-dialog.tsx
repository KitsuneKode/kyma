'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const EXTEND_OPTIONS = [
  { days: 7 as const, label: '7 days' },
  { days: 14 as const, label: '14 days' },
  { days: 30 as const, label: '30 days' },
]

export function ExtendBatchExpiryDialog({
  batchId,
  currentExpiry,
}: {
  batchId: Id<'screeningBatches'>
  currentExpiry?: string
}) {
  const router = useRouter()
  const extendBatchExpiry = useMutation(
    api.recruiter.screenings.extendBatchExpiry
  )
  const [open, setOpen] = useState(false)
  const [selectedDays, setSelectedDays] = useState<7 | 14 | 30>(7)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleExtend() {
    setIsSubmitting(true)
    try {
      const result = await extendBatchExpiry({
        batchId,
        extendDays: selectedDays,
      })
      toast.success('Batch expiry extended', {
        description: `Updated ${result.updatedInviteCount} active invite(s). New expiry applies to non-completed invites.`,
      })
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to extend batch expiry.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            Extend expiry
          </Button>
        }
      />
      <PopoverContent className="w-80 space-y-4 p-4">
        <div>
          <p className="text-sm font-medium">Extend batch expiry</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Push batch and non-completed invite expiry forward.
            {currentExpiry
              ? ` Current: ${new Date(currentExpiry).toLocaleString()}.`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXTEND_OPTIONS.map((option) => (
            <Button
              key={option.days}
              type="button"
              size="sm"
              variant={selectedDays === option.days ? 'default' : 'outline'}
              onClick={() => setSelectedDays(option.days)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleExtend()}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Extending…' : `Extend ${selectedDays}d`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
