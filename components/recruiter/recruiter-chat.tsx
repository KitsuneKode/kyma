'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { IconSparkles, IconX, IconSend2 } from '@tabler/icons-react'

import { Message, MessageContent } from '@/components/ai-elements/message'
import { CitationList } from '@/components/recruiter/citation-list'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  answerSource?: 'fallback' | 'model'
  citationsJson?: string
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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
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
            'group flex items-center gap-3 rounded-full border border-white/10 bg-[#0a0a0a]/90 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl transition-[transform,background-color] duration-200 ease-out active:scale-[0.96]',
            isOpen ? 'bg-[#1a1a1a]/90' : 'hover:bg-[#1a1a1a]/90'
          )}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <IconSparkles className="size-4 text-emerald-400" />
          <span>Ask AI Copilot</span>
          <kbd className="ml-2 hidden rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/50 sm:inline-block">
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
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
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
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-[#0a0a0a] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-2">
                  <IconSparkles className="size-4 text-emerald-400" />
                  <h3 className="font-semibold tracking-tight text-white">
                    Recruiter Copilot
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.96]"
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
                                ? 'border border-white/5 bg-white/5 text-white/90'
                                : 'ml-4 bg-primary text-primary-foreground'
                            )}
                          >
                            <p className="mb-2 text-[10px] font-medium tracking-widest uppercase opacity-50">
                              {message.role}
                              {message.answerSource
                                ? ` • ${message.answerSource}`
                                : ''}
                            </p>
                            <p>{message.content}</p>
                            {message.citationsJson ? (
                              <div className="mt-4 border-t border-white/10 pt-4">
                                <CitationList
                                  citationsJson={message.citationsJson}
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
                      className="flex items-center gap-3 px-2 text-white/50"
                    >
                      <IconSparkles className="size-4 animate-pulse text-emerald-400" />
                      <span className="text-xs font-medium">Thinking...</span>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="absolute right-0 bottom-0 left-0 border-t border-white/5 bg-[#0a0a0a] p-4">
                {error ? (
                  <p className="mb-3 px-2 text-xs text-red-400">{error}</p>
                ) : null}
                <div className="relative flex items-center">
                  <textarea
                    ref={inputRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    className="min-h-[52px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 pt-3.5 pr-12 pb-3 pl-4 text-sm text-white transition-[border-color,box-shadow] outline-none placeholder:text-white/30 focus:border-white/20 focus:ring-4 focus:ring-white/5"
                    rows={1}
                    style={{ fieldSizing: 'content', maxHeight: '160px' }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !question.trim()}
                    className="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-xl bg-white text-black transition-[transform,opacity] active:scale-[0.92] disabled:opacity-50"
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
