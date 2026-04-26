'use client'

import type { ReactNode } from 'react'
import { Component } from 'react'

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
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-medium">{this.props.title} failed to load.</p>
          <p className="text-sm text-muted-foreground">
            Reload the page to try again.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
