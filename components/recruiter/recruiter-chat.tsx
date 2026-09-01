'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { IconSparkles, IconX } from '@tabler/icons-react'

import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  Conversation,
  ConversationEmpty,
} from '@/components/ai-elements/conversation'
import { PromptInput } from '@/components/ai-elements/prompt-input'
import { CitationList } from '@/components/recruiter/citation-list'
import {
  useReviewActions,
  useReviewData,
} from '@/components/recruiter/review-context'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'
import { api } from '@/convex/_generated/api'
import type { CitationJumpTarget } from '@/lib/recruiter/citation-resolve'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  answerSource?: 'fallback' | 'model'
  modelId?: string
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
  const [sessionDegradedReason, setSessionDegradedReason] = useState<
    string | null
  >(null)
  const { jumpToTime, setFocusedEvidenceIndex, setActiveDimension } =
    useReviewActions()
  const { transcriptWithTimes, evidenceWithTiming, recordingStartTime } =
    useReviewData()
  const { data: workspaceSettings } = useAuthenticatedQuery(
    api.recruiter.workspace.getWorkspaceSettings,
    {}
  )

  const citationResolveContext = useMemo(
    () => ({
      recordingStartTime,
      transcript: transcriptWithTimes.map((segment) => ({
        startedAt: segment.startedAt,
        startSec: segment.startSec,
      })),
      evidence: evidenceWithTiming.map((item) => ({
        dimension: item.dimension,
        startedAt: item.startedAt,
        startedAtSec: item.startedAtSec,
      })),
    }),
    [evidenceWithTiming, recordingStartTime, transcriptWithTimes]
  )

  const hasExplicitReviewChatModel = Boolean(
    workspaceSettings?.defaultModels?.reviewChat?.trim()
  )
  const showFallbackBanner =
    sessionDegradedReason !== null ||
    messages.some((message) => message.answerSource === 'fallback') ||
    !hasExplicitReviewChatModel

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

  function handleCitationJump(target: CitationJumpTarget) {
    const evidenceItem =
      target.evidenceIndex !== undefined
        ? evidenceWithTiming[target.evidenceIndex]
        : undefined
    const dimension = target.dimension ?? evidenceItem?.dimension

    if (dimension) {
      setActiveDimension(dimension)
    }

    if (target.evidenceIndex !== undefined && dimension) {
      const withinDimensionIndex = evidenceWithTiming
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.dimension === dimension)
        .findIndex(({ index }) => index === target.evidenceIndex)
      if (withinDimensionIndex >= 0) {
        setFocusedEvidenceIndex(withinDimensionIndex)
      }
    }

    if (target.timeSec !== undefined) {
      jumpToTime(target.timeSec)
    } else if (evidenceItem?.startedAtSec !== undefined) {
      jumpToTime(evidenceItem.startedAtSec)
    }
  }

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
        modelId?: string
        degradedReason?: string
        citations?: Array<{ ref: string; label: string; kind: string }>
      }
      const answer = payload.answer

      if (!response.ok || !answer) {
        throw new Error(
          payload.error ?? 'Unable to answer the recruiter question.'
        )
      }

      if (payload.degradedReason) {
        setSessionDegradedReason(payload.degradedReason)
      } else if (payload.source === 'model') {
        setSessionDegradedReason(null)
      }

      setMessages((current) => [
        ...current,
        {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          answerSource: payload.source,
          modelId: payload.modelId,
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

              <Conversation className="flex-1">
                {showFallbackBanner ? (
                  <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100">
                    <AlertTitle className="text-sm font-medium">
                      Copilot runs in fallback mode
                    </AlertTitle>
                    <AlertDescription className="mt-1 text-xs opacity-90">
                      {sessionDegradedReason ??
                        'Set an explicit review-chat model and ensure platform or workspace credentials are available for model-backed answers.'}
                    </AlertDescription>
                    <Link
                      href="/recruiter/settings#models"
                      className="mt-3 inline-block text-xs font-medium underline underline-offset-4"
                    >
                      Open model settings
                    </Link>
                  </Alert>
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
                        delay: index === messages.length - 1 ? 0 : 0.05,
                      }}
                    >
                      <Message from={message.role}>
                        <MessageContent
                          className={cn(
                            'rounded-2xl px-5 py-4 text-[14px] leading-relaxed shadow-sm',
                            message.role === 'assistant'
                              ? 'border border-border/40 bg-card text-card-foreground'
                              : 'ml-4 bg-primary text-primary-foreground'
                          )}
                        >
                          <div className="mb-2 flex items-center gap-2 text-[10px] font-medium tracking-widest uppercase opacity-60">
                            <span>{message.role}</span>
                            {message.answerSource ? (
                              <span className="inline-flex h-5 items-center rounded-full bg-secondary px-1.5 text-[10px] font-medium tracking-normal normal-case">
                                {formatAnswerSourceLabel(message.answerSource)}
                              </span>
                            ) : null}
                            {message.modelId ? (
                              <span className="font-mono tracking-normal normal-case opacity-60">
                                · {message.modelId}
                              </span>
                            ) : null}
                          </div>
                          {message.role === 'assistant' ? (
                            <MessageResponse>{message.content}</MessageResponse>
                          ) : (
                            <p>{message.content}</p>
                          )}
                          {message.citationsJson ? (
                            <div className="mt-4 border-t border-border/50 pt-4">
                              <CitationList
                                citationsJson={message.citationsJson}
                                resolveContext={citationResolveContext}
                                onJump={handleCitationJump}
                              />
                            </div>
                          ) : null}
                        </MessageContent>
                      </Message>
                    </motion.div>
                  ))
                ) : (
                  <ConversationEmpty
                    icon={<IconSparkles className="size-8" />}
                    title="Ask about this candidate"
                    description="Ask about strengths, risks, recommendation, or missing evidence — grounded in transcript and evidence."
                  />
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
                    className="flex items-center gap-3 px-1 text-muted-foreground"
                  >
                    <IconSparkles className="size-4 animate-pulse text-emerald-400" />
                    <span className="text-xs font-medium">Thinking…</span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </Conversation>

              <div className="border-t border-border/40 bg-card p-4">
                {error ? (
                  <Alert variant="destructive" className="mb-3 py-2">
                    <AlertDescription className="text-xs">
                      {error}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <PromptInput
                  ref={inputRef}
                  value={question}
                  onChange={setQuestion}
                  onSubmit={handleSubmit}
                  isLoading={isSubmitting}
                  placeholder="Ask about strengths, risks, or recommendation..."
                  aria-label="Ask about this candidate"
                />
                <p className="mt-2 px-1 text-[10px] leading-relaxed text-muted-foreground/60">
                  Enter to send · Shift+Enter for newline · ⌘K to toggle
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
