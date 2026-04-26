'use client'

import { motion } from 'motion/react'
import { IconQuote } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

type EvidenceCardProps = {
  snippet: string
  rationale: string
  timestamp?: string
  index?: number
  onJumpToTime?: () => void
}

export function EvidenceCard({
  snippet,
  rationale,
  timestamp,
  index = 0,
  onJumpToTime,
}: EvidenceCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.06,
        ease: [0.23, 1, 0.32, 1],
      }}
      onClick={onJumpToTime}
      className={cn(
        'w-full rounded-xl bg-muted/15 p-3.5 text-left ring-1 ring-border/30',
        'transition-[background-color,box-shadow] duration-150',
        'hover:bg-muted/25'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/20">
          <IconQuote className="size-2.5" />
          Evidence
        </span>
        {timestamp ? (
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {timestamp}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[13px] leading-6 text-pretty text-foreground">
        &ldquo;{snippet}&rdquo;
      </p>
      <p className="mt-1.5 text-xs leading-5 text-pretty text-muted-foreground">
        {rationale}
      </p>
    </motion.button>
  )
}
