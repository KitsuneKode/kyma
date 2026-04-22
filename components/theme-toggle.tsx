'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { IconSun, IconMoon } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme">
        <span className="size-4" />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          className="inline-flex items-center justify-center"
        >
          {isDark ? (
            <IconMoon className="size-4" />
          ) : (
            <IconSun className="size-4" />
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}
