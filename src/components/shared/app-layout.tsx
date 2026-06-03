'use client'

import { useState, useRef, useCallback, useEffect, lazy, Suspense, Component, type ComponentType, type ReactNode, type ErrorInfo } from 'react'
import { useAppStore, type ViewType } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  Menu,
  Sparkles,
  Bell,
  Mic,
  Paperclip,
  SendHorizonal,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MessageSquare,
  Scale,
  ShieldCheck,
  Gavel,
  Briefcase,
  LayoutDashboard,
  FileText,
  FolderOpen,
  Search,
  IndianRupee,
  Clock,
  Settings,
  UserPlus,
  LogOut,
  User,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/auth-store'
import { AppSidebar } from './app-sidebar'
import { ProfileForm } from '@/components/onboarding/profile-form'
import type { LucideIcon } from 'lucide-react'
import type { UploadedFile } from '@/components/shared/document-upload'

// Lazy-load view components to prevent eager import crashes
const DashboardView = lazy(() => import('@/components/dashboard/dashboard-view'))
const CasesListView = lazy(() => import('@/components/cases/cases-list-view'))
const CaseDetailView = lazy(() => import('@/components/cases/case-detail-view'))
const AIIntakeView = lazy(() => import('@/components/intake/ai-intake-view'))
const AIDraftingView = lazy(() => import('@/components/drafting/ai-drafting-view'))
const DocumentsView = lazy(() => import('@/components/documents/documents-view'))
const AIResearchView = lazy(() => import('@/components/research/ai-research-view'))
const BillingView = lazy(() => import('@/components/billing/billing-view'))
const LitigationView = lazy(() => import('@/components/litigation/litigation-view'))
const DefenseBuilderView = lazy(() => import('@/components/defense-builder/defense-builder-view'))
const ArgumentAnalyzerView = lazy(() => import('@/components/argument-analyzer/argument-analyzer-view'))
const ExecutionView = lazy(() => import('@/components/execution/execution-view'))
const CivilOriginalView = lazy(() => import('@/components/civil/civil-original-view'))
const CriminalView = lazy(() => import('@/components/criminal/criminal-view'))
const FamilyView = lazy(() => import('@/components/family/family-view'))
const ClientsView = lazy(() => import('@/components/clients/clients-view'))
const PricingView = lazy(() => import('@/components/pricing/pricing-view'))
const TimelineView = lazy(() => import('@/components/timeline/timeline-view'))
const SettingsView = lazy(() => import('@/components/settings/settings-view'))

/* ─── Lazy-loaded skeleton fallback ─── */

function ViewLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading view...</p>
      </div>
    </div>
  )
}

/* ─── View Labels ─── */

const viewLabels: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  cases: 'Cases',
  'case-detail': 'Case Details',
  intake: 'New Case / Intake',
  drafting: 'AI Drafting',
  documents: 'Documents',
  research: 'Research',
  timeline: 'Timeline',
  billing: 'Billing',
  clients: 'Clients',
  litigation: 'Litigation',
  'defense-builder': 'Defense Builder',
  'argument-analyzer': 'Argument Analyzer',
  execution: 'Execution',
  'civil-original': 'Civil Original Side',
  criminal: 'Criminal Law',
  family: 'Family & Motor Accident',
  pricing: 'Pricing & Plans',
  settings: 'Settings',
}

/* ─── AI Suggestions (for expanded command bar) ─── */

const aiSuggestions = [
  {
    icon: FileText,
    title: 'Draft a Legal Notice',
    description: 'Generate a Section 138 NI Act notice for a bounced cheque',
  },
  {
    icon: Gavel,
    title: 'Case Research',
    description: 'Find Supreme Court precedents for fundamental rights violation',
  },
  {
    icon: ShieldCheck,
    title: 'Document Summary',
    description: 'Summarize latest amendments to the Civil Procedure Code',
  },
  {
    icon: Scale,
    title: 'Compliance Check',
    description: 'Verify GST compliance requirements for legal services',
  },
]

/* ─── Placeholder View Components ─── */

interface PlaceholderViewProps {
  title: string
  description: string
  icon: LucideIcon
}

function PlaceholderView({ title, description, icon: Icon }: PlaceholderViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
        <Icon className="size-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-md">{description}</p>
      <Badge variant="outline" className="mt-6 gap-1.5 text-xs">
        <Sparkles className="size-3" />
        AI-Powered Module
      </Badge>
    </div>
  )
}

/* ─── View-level Error Boundary ─── */

class ViewErrorBoundary extends Component<
  { children: ReactNode; onError: (msg: string) => void },
  { hasError: boolean; errorMsg: string }
> {
  state = { hasError: false, errorMsg: '' }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Unknown error' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ViewBoundary]', error)
    this.props.onError(error?.message || 'Unknown error')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-destructive font-medium">This view encountered an error</p>
            <p className="text-xs text-muted-foreground max-w-sm">{this.state.errorMsg}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* ─── View Router ─── */

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView)
  const [viewError, setViewError] = useState<string | null>(null)
  const setCurrentView = useAppStore((s) => s.setCurrentView)

  // Clear error on view change
  const prevView = useRef(currentView)
  if (prevView.current !== currentView) {
    prevView.current = currentView
    setViewError(null)
  }

  if (viewError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive font-medium">This view encountered an error</p>
          <p className="text-xs text-muted-foreground max-w-sm">{viewError}</p>
          <Button variant="outline" size="sm" onClick={() => { setViewError(null); setCurrentView('dashboard') }}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const views: Record<ViewType, React.ReactNode> = {
    dashboard: <DashboardView />,
    cases: <CasesListView />,
    'case-detail': <CaseDetailView />,
    intake: <AIIntakeView />,
    drafting: <AIDraftingView />,
    documents: <DocumentsView />,
    research: <AIResearchView />,
    litigation: <LitigationView />,
    'defense-builder': <DefenseBuilderView />,
    'argument-analyzer': <ArgumentAnalyzerView />,
    execution: <ExecutionView />,
    'civil-original': <CivilOriginalView />,
    criminal: <CriminalView />,
    family: <FamilyView />,
    billing: <BillingView />,
    clients: <ClientsView />,
    pricing: <PricingView />,
    timeline: <TimelineView />,
    settings: <SettingsView />,
  }

  return (
    <ViewErrorBoundary onError={(msg) => setViewError(msg)}>
      <Suspense fallback={<ViewLoading />}>
        {views[currentView] || views.dashboard}
      </Suspense>
    </ViewErrorBoundary>
  )
}

/* ─── Top Bar ─── */

function TopBar() {
  const currentView = useAppStore((s) => s.currentView)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const commandBarOpen = useAppStore((s) => s.commandBarOpen)
  const setCommandBarOpen = useAppStore((s) => s.setCommandBarOpen)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const { user, logout } = useAuthStore()

  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U'

  const displayName = user?.displayName || user?.email || 'User'

  return (
    <header className="h-14 shrink-0 border-b border-border flex items-center justify-between px-3 md:px-5 bg-background/80 backdrop-blur-sm z-20">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-9"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground hidden sm:inline">AI Draft</span>
          <ChevronRight className="size-3.5 text-muted-foreground hidden sm:inline" />
          <span className="font-medium text-foreground">
            {viewLabels[currentView]}
          </span>
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* AI Command trigger */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'hidden sm:flex items-center gap-2 h-9 px-3 text-muted-foreground',
            'hover:text-foreground hover:bg-accent transition-colors',
            commandBarOpen && 'text-primary bg-primary/10 hover:text-primary hover:bg-primary/15'
          )}
          onClick={() => setCommandBarOpen(!commandBarOpen)}
        >
          <Sparkles className="size-4" />
          <span className="text-xs font-medium">Ask AI anything...</span>
        </Button>

        {/* Mobile: small AI button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden size-9"
          onClick={() => setCommandBarOpen(!commandBarOpen)}
          aria-label="Open AI assistant"
        >
          <Sparkles className="size-4 text-primary" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label="Notifications"
        >
          <Bell className="size-[18px]" />
          <span className="absolute top-1.5 right-1.5 flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              aria-label="User profile"
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || user?.phoneNumber || ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => setCurrentView('settings')}>
              <User className="size-3.5" />
              Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="size-3.5" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

/* ─── AI Command Bar ─── */

function CommandBar() {
  const commandBarOpen = useAppStore((s) => s.commandBarOpen)
  const setCommandBarOpen = useAppStore((s) => s.setCommandBarOpen)
  const chatMessages = useAppStore((s) => s.chatMessages)
  const isAILoading = useAppStore((s) => s.isAILoading)
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)
  const addChatMessage = useAppStore((s) => s.addChatMessage)
  const [commandInput, setCommandInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])
  const [isExtractingFile, setIsExtractingFile] = useState(false)

  const handleToggleExpand = useCallback(() => {
    setCommandBarOpen(!commandBarOpen)
  }, [commandBarOpen, setCommandBarOpen])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setCommandInput(suggestion)
    inputRef.current?.focus()
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsExtractingFile(true)
    try {
      for (const file of Array.from(files)) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        // Extract text from the file
        try {
          const extractRes = await fetch('https://us-central1-ai-draft-39e32.cloudfunctions.net/apiExtractFile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: base64, fileName: file.name, mimeType: file.type }),
          })
          const extractData = await extractRes.json()
          if (extractData.success && extractData.content) {
            const uploaded: UploadedFile = {
              id: crypto.randomUUID(),
              name: file.name,
              size: file.size,
              type: file.name.split('.').pop() || '',
              mimeType: file.type,
              base64,
              extractedText: extractData.content,
              status: 'done',
            }
            setAttachedFiles((prev) => [...prev, uploaded])
          }
        } catch {
          // If extraction fails, still attach the file name
          const uploaded: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.name.split('.').pop() || '',
            mimeType: file.type,
            base64,
            status: 'error',
            error: 'Could not extract text',
          }
          setAttachedFiles((prev) => [...prev, uploaded])
        }
      }
    } finally {
      setIsExtractingFile(false)
      // Reset the file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleSend = useCallback(async () => {
    if ((!commandInput.trim() && attachedFiles.length === 0) || isAILoading) return
    const msg = commandInput.trim()
    setCommandInput('')

    // Build the full message with file content
    let fullMessage = msg
    if (attachedFiles.length > 0) {
      const fileTexts = attachedFiles
        .filter((f) => f.extractedText)
        .map((f) => `[Document: ${f.name}]\n${f.extractedText?.substring(0, 8000)}`)
        .join('\n\n')
      if (fileTexts) {
        fullMessage = msg ? `${msg}\n\n${fileTexts}` : fileTexts
      }
    }

    const fileNames = attachedFiles.map((f) => f.name).join(', ')
    const displayMsg = msg || `📎 ${fileNames}`

    addChatMessage({ id: Date.now().toString(), role: 'user', content: displayMsg, timestamp: new Date() })
    setAttachedFiles([])
    setIsAILoading(true)
    setCommandBarOpen(true)
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage }),
      })
      const data = await res.json()
      if (data.response) {
        addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: data.response, timestamp: new Date() })
      }
    } catch {
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() })
    } finally {
      setIsAILoading(false)
    }
  }, [commandInput, attachedFiles, isAILoading, addChatMessage, setIsAILoading, setCommandBarOpen])

  return (
    <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md command-bar-glow z-20">
      {/* Expanded: AI suggestions panel */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          commandBarOpen ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <ScrollArea className="max-h-[320px]">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                AI Quick Actions
              </span>
            </div>
            {/* Chat messages */}
            {chatMessages.length > 0 && (
              <div className="space-y-2 mb-3 max-h-[180px] overflow-y-auto">
                {chatMessages.slice(-6).map((msg) => (
                  <div key={msg.id} className={cn('rounded-lg p-2.5 text-sm', msg.role === 'user' ? 'bg-primary/10 text-foreground ml-8' : 'bg-secondary text-foreground mr-8')}>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
            {aiSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className={cn(
                  'w-full flex items-start gap-3 rounded-lg p-3 text-left',
                  'bg-secondary/50 hover:bg-secondary transition-colors duration-150',
                  'border border-transparent hover:border-border'
                )}
                onClick={() => handleSuggestionClick(suggestion.description)}
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                  <suggestion.icon className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {suggestion.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Input bar (always visible) */}
      <div className="px-3 md:px-4 pb-3 pt-2">
        <div className={cn(
          'flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5',
          'transition-colors duration-200',
          'focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20',
          'border-border'
        )}>
          {/* Attachment */}
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp" multiple onChange={handleFileSelect} className="hidden" />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtractingFile}
          >
            {isExtractingFile ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          </Button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Describe your legal matter or ask AI for assistance..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none py-1 min-w-0"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
          />

          {/* Attached files indicator */}
          {attachedFiles.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                <Paperclip className="size-2.5" />
                {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''}
              </Badge>
              <button onClick={() => setAttachedFiles([])} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </div>
          )}

          {/* Mic */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Voice input"
          >
            <Mic className="size-4" />
          </Button>

          {/* Send */}
          <Button
            size="icon"
            className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50"
            aria-label="Send message"
            onClick={handleSend}
            disabled={(!commandInput.trim() && attachedFiles.length === 0) || isAILoading}
          >
            {isAILoading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <SendHorizonal className="size-4" />
            )}
          </Button>

          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground hidden md:flex"
            onClick={handleToggleExpand}
            aria-label={commandBarOpen ? 'Collapse AI panel' : 'Expand AI panel'}
          >
            {commandBarOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main App Layout ─── */

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Profile Onboarding Dialog */}
      <ProfileForm />

      {/* Sidebar */}
      <AppSidebar />

      {/* Main Area */}
      <div className="flex-1 md:ml-[260px] flex flex-col h-screen min-w-0">
        {/* Top Bar */}
        <TopBar />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <ViewRouter />
        </main>

        {/* AI Command Bar */}
        <CommandBar />
      </div>
    </div>
  )
}
