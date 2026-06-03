'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useAppStore, type DocumentItem } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { DocumentViewer } from '@/components/shared/document-viewer'
import {
  Upload,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Search,
  Filter,
  Grid3X3,
  List,
  Sparkles,
  Eye,
  Trash2,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  ChevronRight,
  MoreHorizontal,
  Download,
  FolderOpen,
  FilePlus,
  ArrowUpDown,
  X,
  Loader2,
  ShieldCheck,
  Scale,
  CalendarDays,
  Lightbulb,
  FileQuestion,
  AlertCircle,
  CheckCircle,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* ─── Types ─── */

type CategoryFilter = 'all' | 'draft' | 'final' | 'received' | 'templates'
type TabFilter = 'all' | 'case' | 'templates' | 'ai-generated'
type ViewMode = 'grid' | 'list'

interface AIAnalysisResult {
  summary: string
  keyClauses: string[]
  riskPoints: string[]
  missingElements: string[]
  deadlines: string[]
  parties: string[]
  suggestedActions: string[]
}

/* ─── Helpers ─── */

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return <FileText className="size-5 text-red-400" />
    case 'docx':
    case 'doc':
      return <FileText className="size-5 text-blue-400" />
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="size-5 text-emerald-400" />
    case 'jpg':
    case 'jpeg':
    case 'png':
      return <FileImage className="size-5 text-purple-400" />
    default:
      return <File className="size-5 text-muted-foreground" />
  }
}

function getCategoryStyle(category: string) {
  switch (category.toLowerCase()) {
    case 'final':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'draft':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'received':
      return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20'
    case 'templates':
      return 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20'
    case 'ai generated':
      return 'bg-primary/15 text-primary border-primary/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function getTypeStyle(type: string) {
  switch (type.toLowerCase()) {
    case 'notice':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    case 'affidavit':
      return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
    case 'petition':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    case 'agreement':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    default:
      return 'bg-secondary text-secondary-foreground border-border'
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/* ─── Upload Zone ─── */

function UploadZone({ onClose }: { onClose: () => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const simulateUpload = useCallback((names: string[]) => {
    setIsUploading(true)
    setProgress(0)
    setUploadedFiles(names)
    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setTimeout(() => {
          setIsUploading(false)
        }, 500)
      }
      setProgress(Math.min(p, 100))
    }, 200)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    simulateUpload(files.map((f) => f.name))
  }, [simulateUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      simulateUpload(Array.from(files).map((f) => f.name))
    }
  }, [simulateUpload])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all duration-200 p-8 text-center',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/40 hover:bg-accent/30',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'flex size-14 items-center justify-center rounded-2xl transition-colors',
              isDragging ? 'bg-primary/15' : 'bg-muted'
            )}
          >
            <Upload className={cn('size-6', isDragging ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? 'Drop your files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse from your device
            </p>
          </div>
          {!isUploading && (
            <Button size="sm" variant="outline" onClick={handleFileSelect} className="mt-1">
              <FolderOpen className="size-3.5" />
              Browse Files
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="flex items-center gap-3 mt-2">
            {['PDF', 'DOCX', 'XLSX', 'JPG'].map((fmt) => (
              <Badge key={fmt} variant="secondary" className="text-[10px] font-mono">
                .{fmt.toLowerCase()}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Upload progress */}
      {isUploading && uploadedFiles.length > 0 && (
        <div className="space-y-3 bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Uploading {uploadedFiles.length} file(s)...</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="space-y-1.5">
            {uploadedFiles.map((name, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="size-3.5 shrink-0" />
                <span className="truncate">{name}</span>
                {progress >= 100 && <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 ml-auto" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && !isUploading && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {uploadedFiles.length} file(s) uploaded successfully
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── AI Analysis Dialog ─── */

function AIAnalysisDialog({
  document,
  open,
  onOpenChange,
}: {
  document: DocumentItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('summary')

  const runAnalysis = useCallback(async () => {
    if (!document) return
    setIsLoading(true)
    setAnalysis(null)
    try {
      const res = await fetch('/api/ai-document?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentContent: document.content || document.summary || '' }),
      })
      const data = await res.json()
      setAnalysis(data)
    } catch {
      setAnalysis(null)
    }
    setIsLoading(false)
  }, [document])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && !analysis) {
        runAnalysis()
      }
      onOpenChange(nextOpen)
    },
    [analysis, runAnalysis, onOpenChange]
  )

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setAnalysis(null)
    setActiveSection('summary')
  }, [onOpenChange])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  if (!document) return null

  const sectionButtons = [
    { key: 'summary', label: 'Summary', icon: FileText },
    { key: 'clauses', label: 'Key Clauses', icon: ShieldCheck },
    { key: 'risks', label: 'Risk Points', icon: AlertTriangle },
    { key: 'missing', label: 'Missing', icon: FileQuestion },
    { key: 'deadlines', label: 'Deadlines', icon: CalendarDays },
    { key: 'parties', label: 'Parties', icon: Users },
    { key: 'actions', label: 'Actions', icon: Lightbulb },
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="size-4.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg">AI Document Analysis</DialogTitle>
              <DialogDescription className="text-xs truncate mt-0.5">
                {document.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {isLoading ? (
          /* Loading skeleton */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Loader2 className="size-4 animate-spin text-primary" />
              Analyzing document with AI...
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-9/12" />
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-7/12" />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        ) : analysis ? (
          <>
            {/* Section navigation pills */}
            <div className="px-6 py-3 border-b border-border">
              <ScrollArea className="w-full" orientation="horizontal">
                <div className="flex items-center gap-1.5 min-w-max">
                  {sectionButtons.map((section) => (
                    <Button
                      key={section.key}
                      size="sm"
                      variant={activeSection === section.key ? 'default' : 'ghost'}
                      className={cn(
                        'h-7 text-xs gap-1.5 px-2.5',
                        activeSection === section.key && 'shadow-sm'
                      )}
                      onClick={() => setActiveSection(section.key)}
                    >
                      <section.icon className="size-3" />
                      {section.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="px-6 py-5">
                {activeSection === 'summary' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <h3 className="text-sm font-semibold">Document Summary</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>
                )}

                {activeSection === 'clauses' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold">Key Clauses Detected</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.keyClauses.map((clause, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                        >
                          <CheckCircle className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground leading-relaxed">{clause}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'risks' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-destructive" />
                      <h3 className="text-sm font-semibold">Risk Points</h3>
                      <Badge variant="destructive" className="text-[10px]">
                        {analysis.riskPoints.length} risks
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {analysis.riskPoints.map((risk, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                        >
                          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground leading-relaxed">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'missing' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="size-4 text-amber-500" />
                      <h3 className="text-sm font-semibold">Missing Elements</h3>
                      <Badge className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                        {analysis.missingElements.length} items
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {analysis.missingElements.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                        >
                          <XCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'deadlines' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-orange-500" />
                      <h3 className="text-sm font-semibold">Deadlines Found</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.deadlines.map((deadline, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10"
                        >
                          <Clock className="size-4 text-orange-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground leading-relaxed">{deadline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'parties' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-violet-500" />
                      <h3 className="text-sm font-semibold">Parties Mentioned</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.parties.map((party, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10"
                        >
                          <Users className="size-4 text-violet-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground leading-relaxed">{party}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === 'actions' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="size-4 text-primary" />
                      <h3 className="text-sm font-semibold">Suggested Actions</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.suggestedActions.map((action, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10 group"
                        >
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-foreground leading-relaxed flex-1">{action}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => copyToClipboard(action)}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <DialogFooter className="px-6 py-4">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close Analysis
              </Button>
              <Button size="sm">
                <Download className="size-3.5" />
                Export Report
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/* ─── Document Card (Grid Mode) ─── */

function DocumentCardGrid({
  document,
  onAnalyze,
  onDelete,
  onView,
}: {
  document: DocumentItem
  onAnalyze: (doc: DocumentItem) => void
  onDelete: (id: string) => void
  onView: (doc: DocumentItem) => void
}) {
  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/20 gap-0 overflow-hidden">
      <CardHeader className="pb-0 pt-5 px-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/80 shrink-0">
              {getFileIcon(document.name)}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                {document.name}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatDate(document.createdAt)}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="gap-2 text-xs" onClick={() => onView(document)}>
                <Eye className="size-3.5" />
                View Document
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs" onClick={() => onAnalyze(document)}>
                <Sparkles className="size-3.5" />
                AI Analyze
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs">
                <Download className="size-3.5" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-xs text-destructive focus:text-destructive"
                onClick={() => onDelete(document.id)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-2 space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={cn('text-[10px] px-1.5 py-0 border', getTypeStyle(document.type))}>
            {document.type}
          </Badge>
          <Badge className={cn('text-[10px] px-1.5 py-0 border', getCategoryStyle(document.category))}>
            {document.category}
          </Badge>
        </div>

        {/* AI Summary */}
        {document.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {document.summary}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1.5 flex-1"
            onClick={() => onAnalyze(document)}
          >
            <Sparkles className="size-3" />
            Analyze
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 flex-1" onClick={() => onView(document)}>
            <Eye className="size-3" />
            View
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(document.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Document Card (List Mode) ─── */

function DocumentCardList({
  document,
  onAnalyze,
  onDelete,
  onView,
}: {
  document: DocumentItem
  onAnalyze: (doc: DocumentItem) => void
  onDelete: (id: string) => void
  onView: (doc: DocumentItem) => void
}) {
  return (
    <div className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-all duration-200 hover:border-primary/20">
      {/* File icon */}
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted/80 shrink-0">
        {getFileIcon(document.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-foreground truncate">{document.name}</p>
          {document.category === 'AI Generated' && (
            <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">
              <Sparkles className="size-2.5" />
              AI
            </Badge>
          )}
        </div>
        {document.summary && (
          <p className="text-xs text-muted-foreground line-clamp-1">{document.summary}</p>
        )}
      </div>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <Badge className={cn('text-[10px] px-1.5 py-0 border', getTypeStyle(document.type))}>
          {document.type}
        </Badge>
        <Badge className={cn('text-[10px] px-1.5 py-0 border', getCategoryStyle(document.category))}>
          {document.category}
        </Badge>
      </div>

      {/* Date */}
      <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:block shrink-0">
        {formatDate(document.createdAt)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <TooltipWrapper text="AI Analyze">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onAnalyze(document)}
          >
            <Sparkles className="size-3.5 text-primary" />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper text="View">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onView(document)}>
            <Eye className="size-3.5" />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper text="Delete">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(document.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </TooltipWrapper>
      </div>
    </div>
  )
}

/* ─── Simple Tooltip Wrapper ─── */

function TooltipWrapper({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-popover text-popover-foreground text-[11px] rounded-md shadow-md border border-border opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {text}
      </div>
    </div>
  )
}

/* ─── Main Documents View ─── */

export default function DocumentsView() {
  const { documents, setDocuments, addDocument } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [tabFilter, setTabFilter] = useState<TabFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showUpload, setShowUpload] = useState(false)
  const [analysisDoc, setAnalysisDoc] = useState<DocumentItem | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null)

  // Use documents directly from the store
  const localDocuments = documents

  // Filter logic
  const filteredDocuments = useMemo(() => {
    let filtered = localDocuments

    // Tab filter
    if (tabFilter === 'case') {
      filtered = filtered.filter((d) => !['Templates', 'AI Generated'].includes(d.category))
    } else if (tabFilter === 'templates') {
      filtered = filtered.filter((d) => d.category === 'Templates')
    } else if (tabFilter === 'ai-generated') {
      filtered = filtered.filter((d) => d.category === 'AI Generated')
    }

    // Category filter
    if (categoryFilter !== 'all') {
      const categoryMap: Record<string, string> = {
        draft: 'Draft',
        final: 'Final',
        received: 'Received',
        templates: 'Templates',
      }
      filtered = filtered.filter((d) => d.category === categoryMap[categoryFilter])
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.summary && d.summary.toLowerCase().includes(q))
      )
    }

    return filtered
  }, [localDocuments, tabFilter, categoryFilter, searchQuery])

  const handleAnalyze = useCallback((doc: DocumentItem) => {
    setAnalysisDoc(doc)
    setShowAnalysis(true)
  }, [])

  const handleView = useCallback((doc: DocumentItem) => {
    setViewingDoc(doc)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      setDocuments(localDocuments.filter((d) => d.id !== id))
    },
    [localDocuments, setDocuments]
  )

  const handleUploadClose = useCallback(() => {
    setShowUpload(false)
  }, [])

  const stats = useMemo(() => {
    const all = localDocuments.length
    const drafts = localDocuments.filter((d) => d.category === 'Draft').length
    const finals = localDocuments.filter((d) => d.category === 'Final').length
    const received = localDocuments.filter((d) => d.category === 'Received').length
    const ai = localDocuments.filter((d) => d.category === 'AI Generated').length
    return { all, drafts, finals, received, ai }
  }, [localDocuments])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <FolderOpen className="size-7 text-primary" />
                Document Hub
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered document management & analysis
              </p>
            </div>
            <Button
              onClick={() => setShowUpload(!showUpload)}
              className={cn('gap-2 shadow-sm', showUpload && 'bg-muted text-foreground hover:bg-muted/80')}
            >
              <Upload className="size-4" />
              Upload Documents
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'All Documents', count: stats.all, icon: FileText, color: 'text-foreground' },
              { label: 'Drafts', count: stats.drafts, icon: FilePlus, color: 'text-amber-500' },
              { label: 'Final', count: stats.finals, icon: CheckCircle2, color: 'text-emerald-500' },
              { label: 'AI Generated', count: stats.ai, icon: Sparkles, color: 'text-primary' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <stat.icon className={cn('size-4', stat.color)} />
                <div>
                  <p className="text-lg font-bold text-foreground leading-none">{stat.count}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Upload zone (toggle) */}
          {showUpload && (
            <Card className="gap-0 overflow-hidden">
              <CardContent className="p-4">
                <UploadZone onClose={handleUploadClose} />
              </CardContent>
            </Card>
          )}

          {/* Tabs + Controls */}
          <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as TabFilter)}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <TabsList>
                <TabsTrigger value="all" className="text-xs gap-1.5">
                  <FileText className="size-3" />
                  All Documents
                </TabsTrigger>
                <TabsTrigger value="case" className="text-xs gap-1.5">
                  <FolderOpen className="size-3" />
                  Case Documents
                </TabsTrigger>
                <TabsTrigger value="templates" className="text-xs gap-1.5">
                  <FilePlus className="size-3" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="ai-generated" className="text-xs gap-1.5">
                  <Sparkles className="size-3" />
                  AI Generated
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-48 md:w-56 pl-8 text-xs"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>

                {/* Category filter */}
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                  <SelectTrigger size="sm" className="h-8 w-[110px] text-xs">
                    <Filter className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="templates">Templates</SelectItem>
                  </SelectContent>
                </Select>

                {/* View mode */}
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    className={cn('size-8 rounded-r-none', viewMode === 'grid' && 'shadow-sm')}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="size-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    className={cn('size-8 rounded-l-none', viewMode === 'list' && 'shadow-sm')}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content for each tab */}
            {['all', 'case', 'templates', 'ai-generated'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                {filteredDocuments.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
                      <FolderOpen className="size-7 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">No documents found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      {searchQuery
                        ? `No documents match "${searchQuery}". Try adjusting your search.`
                        : 'Upload your first document or create one with AI assistance.'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 gap-2"
                      onClick={() => setShowUpload(true)}
                    >
                      <Upload className="size-3.5" />
                      Upload Document
                    </Button>
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Grid view */
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredDocuments.map((doc) => (
                      <DocumentCardGrid
                        key={doc.id}
                        document={doc}
                        onAnalyze={handleAnalyze}
                        onDelete={handleDelete}
                        onView={handleView}
                      />
                    ))}
                  </div>
                ) : (
                  /* List view */
                  <div className="space-y-2">
                    {filteredDocuments.map((doc) => (
                      <DocumentCardList
                        key={doc.id}
                        document={doc}
                        onAnalyze={handleAnalyze}
                        onDelete={handleDelete}
                        onView={handleView}
                      />
                    ))}
                  </div>
                )}

                {/* Results count */}
                {filteredDocuments.length > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Showing {filteredDocuments.length} of {localDocuments.length} documents
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowUpDown className="size-3" />
                      <span>Sort by date</span>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* AI Analysis Dialog */}
      <AIAnalysisDialog
        document={analysisDoc}
        open={showAnalysis}
        onOpenChange={setShowAnalysis}
      />

      {/* Document Viewer */}
      {viewingDoc && (
        <DocumentViewer
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          title={viewingDoc.name}
          content={viewingDoc.content || viewingDoc.summary || 'No content available.'}
          category={viewingDoc.category}
          createdAt={viewingDoc.createdAt}
        />
      )}
    </div>
  )
}
