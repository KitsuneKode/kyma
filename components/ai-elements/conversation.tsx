'use client'

import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { HTMLAttributes, ReactNode } from 'react'

export function Conversation({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <ScrollArea className={cn('flex-1', className)} {...props}>
      <div className="flex flex-col gap-6 p-6 pb-24">{children}</div>
    </ScrollArea>
  )
}

export function ConversationEmpty({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center opacity-60">
      {icon ? <div className="opacity-50">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}
