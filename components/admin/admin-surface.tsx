import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AdminSurfaceProps<T extends ElementType = 'section'> = {
  as?: T
  children: ReactNode
  className?: string
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>

export function AdminSurface<T extends ElementType = 'section'>({
  as,
  children,
  className,
  ...props
}: AdminSurfaceProps<T>) {
  const Component = as ?? 'section'

  return (
    <Component
      className={cn(
        'relative overflow-hidden rounded-[28px] bg-card/95 p-6 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.18)] ring-1 ring-border/60 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-foreground/10 before:to-transparent',
        className
      )}
      {...(props as any)}
    >
      {children}
    </Component>
  )
}
