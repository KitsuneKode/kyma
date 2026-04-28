'use client'

import type { ReactNode } from 'react'
import { Component } from 'react'
import { IconAlertCircle } from '@tabler/icons-react'

type RenderErrorBoundaryProps = {
  title: string
  children: ReactNode
}

type RenderErrorBoundaryState = {
  hasError: boolean
}

export class RenderErrorBoundary extends Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  state: RenderErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground/80">
          <IconAlertCircle className="size-4 text-red-500/50" />
          <div className="flex flex-col">
            <p className="text-xs font-semibold tracking-tight text-foreground/80">
              {this.props.title} unavailable
            </p>
            <p className="text-[10px] leading-tight opacity-60">
              System alert: module failed to initialize.
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
