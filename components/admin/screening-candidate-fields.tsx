'use client'

import { motion, type Variants } from '@/components/motion/client-motion'
import { IconPlus, IconTrash } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type ScreeningCandidateDraft = {
  id: string
  name: string
  email: string
}

type ScreeningCandidateFieldsProps = {
  candidates: ScreeningCandidateDraft[]
  onAddCandidate: () => void
  onRemoveCandidate: (id: string) => void
  onUpdateCandidate: (
    id: string,
    field: 'name' | 'email',
    value: string
  ) => void
  staggerVariants: Variants
}

export function ScreeningCandidateFields({
  candidates,
  onAddCandidate,
  onRemoveCandidate,
  onUpdateCandidate,
  staggerVariants,
}: ScreeningCandidateFieldsProps) {
  return (
    <motion.div
      variants={staggerVariants}
      className="flex flex-col gap-4 border-t border-border/20 pt-8"
    >
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Eligible candidates
        </Label>
      </div>
      <div className="flex flex-col gap-3">
        {candidates.map((candidate) => (
          <motion.div
            key={candidate.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3"
          >
            <Input
              value={candidate.name}
              onChange={(event) =>
                onUpdateCandidate(candidate.id, 'name', event.target.value)
              }
              placeholder="Name"
              className="h-12 flex-1 rounded-xl border-border/40 bg-background text-base transition-[border-color,box-shadow,background-color] duration-300 hover:bg-muted/10 focus-visible:ring-4 focus-visible:ring-primary/10"
            />
            <Input
              value={candidate.email}
              onChange={(event) =>
                onUpdateCandidate(candidate.id, 'email', event.target.value)
              }
              placeholder="Email"
              type="email"
              className="h-12 flex-1 rounded-xl border-border/40 bg-background text-base transition-[border-color,box-shadow,background-color] duration-300 hover:bg-muted/10 focus-visible:ring-4 focus-visible:ring-primary/10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveCandidate(candidate.id)}
              disabled={candidates.length === 1}
              className="h-12 w-12 shrink-0 rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <IconTrash className="size-5" />
            </Button>
          </motion.div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={onAddCandidate}
          className="mt-2 h-12 w-full gap-2 rounded-xl border-dashed border-border/40 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground active:scale-[0.98]"
        >
          <IconPlus className="size-4" />
          Add another candidate
        </Button>
      </div>
    </motion.div>
  )
}
