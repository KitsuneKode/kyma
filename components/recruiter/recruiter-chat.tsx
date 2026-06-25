'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { IconSparkles, IconX, IconSend2 } from '@tabler/icons-react'

import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import { CitationList } from '@/components/recruiter/citation-list'
import { useReviewActions } from '@/components/recruiter/review-context'
import { WorkspaceTextarea } from '@/components/workspace/textarea'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  answerSource?: 'fallback' | 'model'
  citationsJson?: string
}

function formatAnswerSourceLabel(source?: 'fallback' | 'model') {
  if (source === 'model') {
    return 'Model-backed'
  }
  if (source === 'fallback') {
    return 'Deterministic fallback'
  }
  return null
}

export function RecruiterChat({
  sessionId,
  reportId,
  initialMessages,
}: {
  sessionId: string
  reportId?: string
  initialMessages: ChatMessage[]
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [question, setQuestion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const { jumpToTime } = useReviewActions()
  const { data: workspaceSettings } = useAuthenticatedQuery(
    api.recruiter.workspace.getWorkspaceSettings,
    {}
  )
  const hasWorkspaceModels =
    Boolean(workspaceSettings?.defaultModels?.reviewChat) ||
    Boolean(workspaceSettings?.providerKeys?.length)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 100)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

    return () => window.clearTimeout(focusTimer)
  }, [isOpen, messages.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  async function handleSubmit() {
    if (!question.trim()) return

    setIsSubmitting(true)
    setError(null)

    const optimisticUserMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((current) => [...current, optimisticUserMessage])
    const currentQuestion = question.trim()
    setQuestion('')

    try {
      const response = await fetch('/api/recruiter/report-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          reportId,
          question: currentQuestion,
        }),
      })

      const payload = (await response.json()) as {
        answer?: string
        error?: string
        source?: 'fallback' | 'model'
        citations?: Array<{ ref: string; label: string; kind: string }>
      }
      const answer = payload.answer

      if (!response.ok || !answer) {
        throw new Error(
          payload.error ?? 'Unable to answer the recruiter question.'
        )
      }

      setMessages((current) => [
        ...current,
        {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          answerSource: payload.source,
          citationsJson:
            payload.citations && payload.citations.length > 0
              ? JSON.stringify(payload.citations)
              : undefined,
        },
      ])
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to answer the recruiter question.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'group flex items-center gap-3 rounded-full border border-border/50 bg-card/90 px-5 py-3 text-sm font-medium text-foreground shadow-2xl backdrop-blur-xl transition-[transform,background-color] duration-200 ease-out active:scale-[0.96]',
            isOpen ? 'bg-card' : 'hover:bg-card'
          )}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <IconSparkles className="size-4 text-emerald-400" />
          <span>Ask AI Copilot</span>
          <kbd className="ml-2 hidden rounded-md border border-border/50 bg-foreground/5 px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5, filter: 'blur(8px)' }}
              animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ x: '100%', opacity: 0, filter: 'blur(8px)' }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 300,
                mass: 0.8,
              }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border/50 bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
                <div className="flex items-center gap-2">
                  <IconSparkles className="size-4 text-emerald-400" />
                  <h3 className="font-semibold tracking-tight text-foreground">
                    Recruiter Copilot
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close recruiter copilot"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground active:scale-[0.96]"
                >
                  <IconX className="size-4" />
                </button>
              </div>

              <div
                className="relative flex-1 overflow-y-auto px-6 py-6"
                style={{
                  maskImage:
                    'linear-gradient(to bottom, black 90%, transparent 100%)',
                }}
              >
                <div className="flex flex-col gap-6 pb-24">
                  {!hasWorkspaceModels ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                      <p className="font-medium">
                        Copilot runs in fallback mode
                      </p>
                      <p className="mt-1 text-xs opacity-90">
                        Add provider keys or set default review-chat models in
                        workspace settings for model-backed answers.
                      </p>
                      <Link
                        href="/recruiter/settings#models"
                        className="mt-3 inline-block text-xs font-medium underline underline-offset-4"
                      >
                        Open model settings
                      </Link>
                    </div>
                  ) : null}
                  {messages.length ? (
                    messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{
                          opacity: 0,
                          y: 12,
                          scale: 0.96,
                          filter: 'blur(4px)',
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          filter: 'blur(0px)',
                        }}
                        transition={{
                          type: 'spring',
                          damping: 25,
                          stiffness: 200,
                          delay: index === messages.length - 1 ? 0 : 0.1,
                        }}
                      >
                        <Message from={message.role}>
                          <MessageContent
                            className={cn(
                              'rounded-2xl px-5 py-4 text-[14px] leading-relaxed shadow-sm',
                              message.role === 'assistant'
                                ? 'border border-border/40 bg-foreground/5 text-foreground/90'
                                : 'ml-4 bg-primary text-primary-foreground'
                            )}
                          >
                            <p className="mb-2 text-[10px] font-medium tracking-widest uppercase opacity-50">
                              {message.role}
                              {message.answerSource
                                ? ` · ${formatAnswerSourceLabel(message.answerSource)}`
                                : ''}
                            </p>
                            {message.role === 'assistant' ? (
                              <MessageResponse>
                                {message.content}
                              </MessageResponse>
                            ) : (
                              <p>{message.content}</p>
                            )}
                            {message.citationsJson ? (
                              <div className="mt-4 border-t border-border/50 pt-4">
                                <CitationList
                                  citationsJson={message.citationsJson}
                                  onJumpToTime={jumpToTime}
                                />
                              </div>
                            ) : null}
                          </MessageContent>
                        </Message>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center opacity-50">
                      <IconSparkles className="size-8" />
                      <p className="text-sm">
                        Ask about the candidate’s strengths, risks,
                        recommendation, or missing evidence.
                      </p>
                    </div>
                  )}

                  {isSubmitting && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 12,
                        scale: 0.96,
                        filter: 'blur(4px)',
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        filter: 'blur(0px)',
                      }}
                      className="flex items-center gap-3 px-2 text-muted-foreground"
                    >
                      <IconSparkles className="size-4 animate-pulse text-emerald-400" />
                      <span className="text-xs font-medium">Thinking...</span>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="absolute right-0 bottom-0 left-0 border-t border-border/40 bg-card p-4">
                {error ? (
                  <p className="mb-3 px-2 text-xs text-red-400">{error}</p>
                ) : null}
                <div className="relative flex items-center">
                  <WorkspaceTextarea
                    ref={inputRef}
                    value={question}
                    aria-label="Ask about this candidate"
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    className="min-h-[52px] resize-none rounded-2xl border-border/50 bg-foreground/5 pt-3.5 pr-12 pb-3 pl-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-border focus:ring-4 focus:ring-ring/20"
                    rows={1}
                    style={{ fieldSizing: 'content', maxHeight: '160px' }}
                  />
                  <button
                    type="button"
                    aria-label="Send question"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !question.trim()}
                    className="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-[transform,opacity] active:scale-[0.92] disabled:opacity-50"
                  >
                    <IconSend2 className="size-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
