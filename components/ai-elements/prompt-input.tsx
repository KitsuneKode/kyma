'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { IconSend2 } from '@tabler/icons-react'
import type { TextareaHTMLAttributes } from 'react'

type PromptInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>

export const PromptInput = forwardRef<HTMLTextAreaElement, PromptInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      isLoading,
      placeholder = 'Ask a question...',
      disabled,
      className,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const handleKeyDown: TextareaHTMLAttributes<HTMLTextAreaElement>['onKeyDown'] =
      (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          if (value.trim() && !isLoading) onSubmit()
        }
        onKeyDown?.(e)
      }

    return (
      <div className="relative flex items-end gap-2 rounded-2xl border border-border/50 bg-foreground/[0.04] p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-foreground/5">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled || isLoading}
          className={cn(
            'max-h-[160px] min-h-[52px] resize-none border-0 bg-transparent px-3 py-3.5 text-[14px] leading-relaxed shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0',
            className
          )}
          style={{ fieldSizing: 'content' } as React.CSSProperties}
          {...props}
        />
        <Button
          type="button"
          size="icon"
          onClick={onSubmit}
          disabled={!value.trim() || isLoading || disabled}
          className="mb-1 size-9 shrink-0 rounded-xl shadow-sm active:scale-[0.96]"
          aria-label="Send"
        >
          <IconSend2 className="size-4" />
        </Button>
      </div>
    )
  }
)
PromptInput.displayName = 'PromptInput'
