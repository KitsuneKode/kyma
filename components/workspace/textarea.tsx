import * as React from 'react'

import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type WorkspaceTextareaProps = React.ComponentProps<typeof Textarea>

export const WorkspaceTextarea = React.forwardRef<
  HTMLTextAreaElement,
  WorkspaceTextareaProps
>(function WorkspaceTextarea({ className, ...props }, ref) {
  return (
    <Textarea
      ref={ref}
      className={cn('min-h-24 bg-background', className)}
      {...props}
    />
  )
})
