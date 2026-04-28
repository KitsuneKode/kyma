'use client'

import { motion } from 'motion/react'
import { type Icon as TablerIconType } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: TablerIconType
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeVariants = {
  sm: {
    container: 'p-6',
    icon: 'size-8',
    iconContainer: 'size-14',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'p-8',
    icon: 'size-10',
    iconContainer: 'size-16',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'p-12',
    icon: 'size-12',
    iconContainer: 'size-20',
    title: 'text-xl',
    description: 'text-base',
  },
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizes = sizeVariants[size]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-muted/30',
            sizes.iconContainer
          )}
        >
          <Icon className={cn('text-muted-foreground/60', sizes.icon)} />
        </div>
      )}
      <h3 className={cn('mt-4 font-semibold text-foreground', sizes.title)}>
        {title}
      </h3>
      <p
        className={cn(
          'mt-2 max-w-sm text-pretty text-muted-foreground',
          sizes.description
        )}
      >
        {description}
      </p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button render={<a href={action.href} />} nativeButton={false}>
              {action.label}
            </Button>
          ) : (
            <Button onClick={action.onClick} nativeButton={false}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
