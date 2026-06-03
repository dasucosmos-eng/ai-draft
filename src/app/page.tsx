'use client'

import { Component, useEffect, useRef, type ReactNode, type ErrorInfo } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import AppLayout from '@/components/shared/app-layout'
import LoginView from '@/components/auth/login-view'
import { Button } from '@/components/ui/button'

/* ─── Error Boundary to catch render crashes in AppLayout ─── */

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class AppErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] Caught render error:', error?.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-6 max-w-md px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
              <svg className="size-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while loading the application.
                This has been logged. Please try again.
              </p>
            </div>
            <Button
              onClick={() => {
                this.props.onReset()
                this.setState({ hasError: false, error: null })
              }}
              variant="outline"
              className="gap-2"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reload Application
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* ─── Main Page Component ─── */

export default function Home() {
  const { user, loading, restoreSession, logout } = useAuthStore()
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    restoreSession()
  }, [restoreSession])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginView />
  }

  return (
    <AppErrorBoundary
      onReset={() => {
        window.location.reload()
      }}
    >
      <AppLayout />
    </AppErrorBoundary>
  )
}
