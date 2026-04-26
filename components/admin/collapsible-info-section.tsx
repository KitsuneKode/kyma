'use client'

import { ReactNode, useState } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { IconChevronDown } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export function CollapsibleInfoSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string
  description?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-2xl bg-card/80 px-5 py-4 text-left ring-1 ring-border/40 transition-colors duration-150 hover:bg-card',
          open && 'ring-b-0 rounded-b-none'
        )}
      >
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <IconChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </Collapsible.Trigger>
      <Collapsible.Panel className="ring-t-0 rounded-b-2xl bg-card/80 px-5 pb-5 ring-1 ring-border/40">
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
