'use client'

import Link from 'next/link'
import { ArrowLeft, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteFooter } from '@/components/shared/site-footer'

interface PublicPageLayoutProps {
  children: React.ReactNode
  title: string
}

export function PublicPageLayout({ children, title }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                <span className="text-xs">Back to AI Draft</span>
              </Button>
            </Link>
          </div>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/20 overflow-hidden">
              <Scale className="size-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">AI Draft</span>
          </Link>
          <div className="w-[120px]" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{title}</h1>
            <div className="mt-2 h-1 w-16 bg-gradient-to-r from-primary to-primary/40 rounded-full" />
          </div>
          <div className="prose-custom">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
