'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const surfaceVariants = cva(
  'relative overflow-hidden bg-card transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]',
  {
    variants: {
      elevation: {
        default: 'rounded-2xl shadow-sm ring-1 ring-border/20 hover:shadow-md',
        raised:
          'rounded-[2rem] shadow-lg ring-1 ring-border/30 hover:shadow-xl',
        floating:
          'rounded-[2rem] shadow-2xl ring-1 ring-border/40 hover:shadow-[0_32px_64px_-24px_rgba(0,0,0,0.35)]',
        sunken: 'rounded-2xl bg-muted/30 shadow-inner',
        glass:
          'rounded-2xl bg-card/80 shadow-lg ring-1 ring-border/20 backdrop-blur-xl',
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
