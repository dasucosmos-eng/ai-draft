'use client'

import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="text-center max-w-md space-y-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10 mx-auto">
              <AlertTriangle className="size-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while rendering this view.
              Please try refreshing the page or click the button below to retry.
            </p>
            {this.state.error && (
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-left">
                <p className="text-xs font-mono text-red-500/80 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={this.handleReset} className="gap-2">
                <RotateCcw className="size-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} className="gap-2">
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
