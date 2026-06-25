'use client'

import type { ReactNode } from 'react'
import { Component } from 'react'

import { ChartErrorState } from '@/components/recruiter/chart-states'

type ChartErrorBoundaryProps = {
  children: ReactNode
  height?: number
  message?: string
}

type ChartErrorBoundaryState = {
  hasError: boolean
}

export class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <ChartErrorState
          height={this.props.height}
          message={this.props.message ?? 'Unable to render this chart.'}
        />
      )
    }

    return this.props.children
  }
}
