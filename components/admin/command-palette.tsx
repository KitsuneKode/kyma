'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import {
  IconCommand,
  IconSearch,
  IconUsers,
  IconFolder,
  IconSettings,
  IconSun,
  IconMoon,
} from '@tabler/icons-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

type Action = {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  onSelect: () => void
  keywords?: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  const actions = useMemo<Action[]>(
    () => [
      {
        id: 'candidates',
        label: 'Go to candidate queue',
        description: 'Review candidate sessions',
        icon: <IconUsers className="size-4" />,
        onSelect: () => router.push('/recruiter/candidates'),
        keywords: 'candidate review queue',
      },
      {
        id: 'screenings',
        label: 'Go to screenings',
        description: 'Manage screening batches',
        icon: <IconFolder className="size-4" />,
        onSelect: () => router.push('/recruiter/screenings'),
        keywords: 'screening batch',
      },
      {
        id: 'new-screening',
        label: 'Create Screening',
        description: 'Start a new invite-controlled cohort',
        icon: <IconFolder className="size-4" />,
        onSelect: () => router.push('/recruiter/screenings/new'),
        keywords: 'create new screening batch',
      },
      {
        id: 'settings',
        label: 'Open settings',
        icon: <IconSettings className="size-4" />,
        onSelect: () => router.push('/recruiter/settings'),
        keywords: 'settings preferences config',
      },
      {
        id: 'toggle-theme',
        label: `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`,
        icon:
          resolvedTheme === 'dark' ? (
            <IconSun className="size-4" />
          ) : (
            <IconMoon className="size-4" />
          ),
        onSelect: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
        keywords: 'theme dark light mode toggle',
      },
    ],
    [resolvedTheme, router, setTheme]
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return actions
    const q = query.toLowerCase()
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.keywords?.toLowerCase().includes(q)
    )
  }, [actions, query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, open])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].onSelect()
      close()
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-[20%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border/40"
          >
            <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
              <IconSearch className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <kbd className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                esc
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {filtered.length ? (
                filtered.map((action, index) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.onSelect()
                      close()
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100',
                      index === selectedIndex
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted/20'
                    )}
                  >
                    <span
                      className={cn(
                        'shrink-0',
                        index === selectedIndex
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {action.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      {action.description ? (
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/30 px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <kbd className="rounded bg-muted/40 px-1 py-0.5 font-mono">
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <kbd className="rounded bg-muted/40 px-1 py-0.5 font-mono">
                    ↵
                  </kbd>
                  select
                </span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <IconCommand className="size-3" />
                <span>K</span>
              </span>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
