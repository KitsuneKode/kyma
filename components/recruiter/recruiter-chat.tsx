'use client'

import { useState } from 'react'

import { Message, MessageContent } from '@/components/ai-elements/message'
import { CitationList } from '@/components/recruiter/citation-list'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/recruiter/format'
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

  async function handleSubmit() {
    if (!question.trim()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    const optimisticUserMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((current) => [...current, optimisticUserMessage])

    try {
      const response = await fetch('/api/recruiter/report-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          reportId,
          question: question.trim(),
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
      setQuestion('')
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
    <div className="flex flex-col gap-4">
      <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-4">
        {messages.length ? (
          messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent
                className={cn(
                  'rounded-lg border px-4 py-3',
                  message.role === 'assistant'
                    ? 'bg-background'
                    : 'bg-secondary'
                )}
              >
                <p className="text-xs text-muted-foreground">
                  {message.role} · {formatDateTime(message.createdAt)}
                  {message.answerSource
                    ? ` · source: ${message.answerSource}`
                    : ''}
                </p>
                <p className="mt-2 leading-6">{message.content}</p>
                {message.citationsJson ? (
                  <CitationList citationsJson={message.citationsJson} />
                ) : null}
              </MessageContent>
            </Message>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No recruiter chat yet. Ask about strengths, risks, recommendation,
            or missing evidence.
          </p>
        )}
      </div>

      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask about the candidate’s strengths, risks, or recommendation."
        className={cn(
          'min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
        )}
      />

      {error ? (
        <p className="text-sm text-destructive">
          {error} Try again or rephrase your question.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Thinking…' : 'Ask recruiter copilot'}
        </Button>
      </div>
    </div>
  )
}
