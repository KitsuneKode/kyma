'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const surfaceVariants = cva(
  'relative overflow-hidden bg-card transition-all duration-200 ease-[var(--ease-out)]',
  {
    variants: {
      elevation: {
        default:
          'rounded-3xl shadow-[var(--shadow-sm)] ring-1 ring-border/50 hover:shadow-[var(--shadow-md)]',
        raised:
          'rounded-3xl shadow-[var(--shadow-md)] ring-1 ring-border/60 hover:shadow-[var(--shadow-lg)]',
        floating:
          'rounded-3xl shadow-[var(--shadow-lg)] ring-1 ring-border/70 hover:shadow-[var(--shadow-xl)]',
        sunken: 'rounded-2xl bg-muted/30 ring-1 ring-border/30',
        glass:
          'rounded-3xl bg-card/80 shadow-[var(--shadow-md)] ring-1 ring-border/40 backdrop-blur-xl',
      },
      interactive: {
        true: 'cursor-pointer hover:-translate-y-0.5',
        false: '',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
    },
    defaultVariants: {
      elevation: 'default',
      interactive: false,
      padding: 'md',
    },
  }
)

interface SurfaceProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {
  children: React.ReactNode
}

function Surface({
  className,
  elevation,
  interactive,
  padding,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        surfaceVariants({ elevation, interactive, padding, className })
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Surface, surfaceVariants }
export type { SurfaceProps }
