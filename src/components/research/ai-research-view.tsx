'use client'

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Search,
  Sparkles,
  BookOpen,
  Scale,
  Gavel,
  ChevronRight,
  ArrowRight,
  Filter,
  Star,
  Clock,
  Quote,
  Bookmark,
  BookmarkPlus,
  Copy,
  Download,
  ExternalLink,
  Lightbulb,
  FileText,
  Loader2,
  X,
  CheckCircle,
  Shield,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  Building,
  Calendar,
  BarChart3,
  SearchX,
  BookMarked,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* ─── Types ─── */

interface SourceExcerpts {
  facts?: string
  issues?: string
  held?: string
  ratio?: string
  disposition?: string
}

interface ResearchResult {
  title: string
  court: string
  year: string
  summary: string
  keyHoldings: string[]
  relevance: number
  citation: string
  source?: string
  sourceExcerpts?: SourceExcerpts
  rawJudgmentExcerpt?: string
}

interface ResearchResponse {
  results: ResearchResult[]
  suggestedArguments: string[]
  relatedPrecedents: { title: string; year: string; citation: string; source?: string }[]
  _meta?: {
    source: string
    dataSources?: string[]
    message?: string
    ikResultsCount?: number
    webResultsCount?: number
    docsFetchedCount?: number
    searchTimeMs?: number
    analysisTimeMs?: number
    totalFound?: string
    fetchedTids?: string[]
    totalCharsFetched?: number
  }
}

/* ─── Example Queries ─── */

const exampleQueries = [
  'Supreme Court judgments on cheque bounce after 2022',
  'Section 138 NI Act landmark cases',
  'Property injunction precedents Delhi High Court',
  'Anticipatory bail guidelines',
  'Consumer protection act recent amendments',
]

/* ─── Error State ─── */

function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
        <AlertTriangle className="size-7 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Research Failed</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        {message || 'Unable to connect to the research server. Please try again.'}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 gap-1.5"
        onClick={onRetry}
      >
        <Search className="size-3.5" />
        Try Again
      </Button>
    </div>
  )
}

/* ─── Relevance Bar ─── */

function RelevanceBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 90) return 'bg-emerald-500'
    if (s >= 75) return 'bg-amber-500'
    return 'bg-orange-500'
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground">{score}%</span>
    </div>
  )
}

/* ─── Search Empty State ─── */

function EmptyState({ onQueryClick }: { onQueryClick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-4">
      <div className="relative mb-6">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10">
          <BookOpen className="size-9 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Sparkles className="size-3.5" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">AI Legal Research</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Search across judgments, precedents, and legal provisions from Indian courts. 
        Get AI-powered analysis with key holdings and suggested arguments.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
        {exampleQueries.map((query, i) => (
          <button
            key={i}
            onClick={() => onQueryClick(query)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
              'bg-muted/80 text-foreground border border-transparent',
              'hover:bg-accent hover:border-border transition-all duration-150',
              'max-w-full truncate'
            )}
          >
            <Search className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{query}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-6 mt-10 text-xs text-muted-foreground">
        {[
          { icon: Scale, label: 'Supreme Court' },
          { icon: Building, label: 'High Courts' },
          { icon: Gavel, label: 'Tribunals' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="size-3.5" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Loading State ─── */

function LoadingState() {
  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center gap-3 mb-2">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm font-medium text-foreground">AI is researching across Indian case law...</span>
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i} className="gap-0 overflow-hidden animate-pulse">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ─── Source Excerpt Block ─── */

function SourceExcerptBlock({
  label,
  text,
  icon,
}: {
  label: string
  text?: string
  icon: React.ElementType
}) {
  if (!text) return null
  const Icon = icon
  return (
    <div className="rounded-lg bg-card border border-border/60 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 border-b border-border/40">
        <Icon className="size-3 text-primary/70" />
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{label}</span>
      </div>
      <blockquote className="px-3 py-2.5 text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 ml-0">
        &ldquo;{text}&rdquo;
      </blockquote>
    </div>
  )
}

/* ─── Result Card ─── */

function ResultCard({
  result,
  onCite,
}: {
  result: ResearchResult
  onCite: (citation: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showExcerpts, setShowExcerpts] = useState(false)
  const [showRawJudgment, setShowRawJudgment] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasExcerpts = result.sourceExcerpts && Object.values(result.sourceExcerpts).some(Boolean)
  const hasRawJudgment = !!result.rawJudgmentExcerpt

  const handleCopyCitation = useCallback(() => {
    navigator.clipboard.writeText(result.citation)
    setCopied(true)
    onCite(result.citation)
    setTimeout(() => setCopied(false), 2000)
  }, [result.citation, onCite])

  const handleCopyExcerpt = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  // Build source URL for Indian Kanoon
  const sourceUrl = result.source || ''
  const isKanoonSource = sourceUrl.includes('indiankanoon.org')
  const isWebSource = sourceUrl.startsWith('http')

  return (
    <Card className="group gap-0 overflow-hidden hover:border-primary/20 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-5">
        {/* Top row: title + relevance */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
              <Scale className="size-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {result.title}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Building className="size-2.5" />
                  {result.court}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                  <Calendar className="size-2.5" />
                  {result.year}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <Shield className="size-2.5" />
                  Verified
                </Badge>
              </div>
            </div>
          </div>
          <RelevanceBar score={result.relevance} />
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {expanded ? result.summary : result.summary.slice(0, 350) + (result.summary.length > 350 ? '...' : '')}
        </p>
        {result.summary.length > 350 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-primary hover:underline mb-3"
          >
            {expanded ? 'Show less' : 'Read full summary'}
          </button>
        )}

        {/* Key Holdings — with highlight styling */}
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield className="size-3" />
            Key Holdings
          </p>
          <ul className="space-y-1.5">
            {result.keyHoldings.map((holding, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <CheckCircle className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                <span className="flex-1">{holding}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopyExcerpt(holding)}
                >
                  <Copy className="size-2.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* Source Excerpts — Verbatim highlights from the judgment */}
        {hasExcerpts && (
          <div className="mb-3">
            <button
              onClick={() => setShowExcerpts(!showExcerpts)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-primary uppercase tracking-wider mb-2 hover:underline"
            >
              <Quote className="size-3" />
              Source Highlights from Judgment
              <ChevronRight className={cn('size-3 transition-transform', showExcerpts && 'rotate-90')} />
            </button>
            {showExcerpts && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <SourceExcerptBlock label="Facts & Background" text={result.sourceExcerpts?.facts} icon={FileText} />
                <SourceExcerptBlock label="Issues Before the Court" text={result.sourceExcerpts?.issues} icon={AlertTriangle} />
                <SourceExcerptBlock label="Court Held" text={result.sourceExcerpts?.held} icon={Gavel} />
                <SourceExcerptBlock label="Ratio Decidendi" text={result.sourceExcerpts?.ratio} icon={Scale} />
                <SourceExcerptBlock label="Final Disposition" text={result.sourceExcerpts?.disposition} icon={Bookmark} />
              </div>
            )}
          </div>
        )}

        {/* Raw Judgment Excerpt — expandable */}
        {hasRawJudgment && (
          <div className="mb-3">
            <button
              onClick={() => setShowRawJudgment(!showRawJudgment)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-2 hover:underline"
            >
              <BookOpen className="size-3" />
              Raw Judgment Text ({result.rawJudgmentExcerpt.length > 500 ? 'excerpt' : 'full'})
              <ChevronRight className={cn('size-3 transition-transform', showRawJudgment && 'rotate-90')} />
            </button>
            {showRawJudgment && (
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 animate-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {showRawJudgment ? result.rawJudgmentExcerpt : result.rawJudgmentExcerpt.slice(0, 600) + '...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Citation + Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Quote className="size-3 text-muted-foreground" />
            <span className="text-[11px] font-mono text-muted-foreground">{result.citation}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* View Source — link to Indian Kanoon or web source */}
            {isWebSource && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1.5 text-orange-500 hover:text-orange-400"
                onClick={() => window.open(sourceUrl, '_blank', 'noopener')}
              >
                <ExternalLink className="size-3" />
                View Source
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 text-[11px] gap-1.5',
                copied && 'text-emerald-500'
              )}
              onClick={handleCopyCitation}
            >
              {copied ? (
                <>
                  <CheckCircle className="size-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Copy Citation
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5"
              onClick={() => onCite(result.citation)}
            >
              <FileText className="size-3" />
              Cite in Document
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Suggested Arguments Panel ─── */

function SuggestedArguments({ arguments: args }: { arguments: string[] }) {
  return (
    <Card className="gap-0 overflow-hidden border-primary/20 bg-primary/5">
      <CardHeader className="pb-0 pt-5 px-5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
            <Lightbulb className="size-3.5 text-primary" />
          </div>
          <CardTitle className="text-sm font-semibold">Suggested Arguments</CardTitle>
          <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">
            AI Generated
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        <div className="space-y-2.5">
          {args.map((arg, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-background border border-border group"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{arg}</p>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => navigator.clipboard.writeText(arg)}
              >
                <Copy className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Research Meta Info ─── */

function ResearchMetaInfo({ meta }: { meta?: ResearchResponse['_meta'] }) {
  if (!meta) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
      {meta.dataSources && meta.dataSources.length > 0 && (
        <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <Shield className="size-2.5" />
          Sources: {meta.dataSources.join(', ')}
        </Badge>
      )}
      {meta.ikResultsCount != null && meta.ikResultsCount > 0 && (
        <span className="flex items-center gap-1">
          <BookMarked className="size-2.5" />
          {meta.ikResultsCount} cases from Indian Kanoon
        </span>
      )}
      {meta.webResultsCount != null && meta.webResultsCount > 0 && (
        <span className="flex items-center gap-1">
          <ExternalLink className="size-2.5" />
          {meta.webResultsCount} web results
        </span>
      )}
      {meta.docsFetchedCount != null && meta.docsFetchedCount > 0 && (
        <span className="flex items-center gap-1">
          <FileText className="size-2.5" />
          {meta.docsFetchedCount} full judgments fetched ({meta.totalCharsFetched || 0} chars)
        </span>
      )}
      {meta.searchTimeMs != null && (
        <span className="flex items-center gap-1">
          <Clock className="size-2.5" />
          Search: {(meta.searchTimeMs / 1000).toFixed(1)}s
          {meta.analysisTimeMs != null && ` + AI extraction: ${(meta.analysisTimeMs / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  )
}

/* ─── No Data Message ─── */

function NoDataMessage({ meta }: { meta?: ResearchResponse['_meta'] }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
        <SearchX className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">No Cases Found</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        {meta?.message || 'No matching cases found in Indian Kanoon database or legal web sources.'}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          Try different keywords
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Check LiveLaw.in directly
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Search Supreme Court website
        </Badge>
      </div>
    </div>
  )
}

/* ─── Related Precedents Panel ─── */

function RelatedPrecedents({ precedents }: { precedents: ResearchResult['relatedPrecedents'] }) {
  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="pb-0 pt-5 px-5">
        <div className="flex items-center gap-2">
          <BookMarked className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Related Precedents</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        <div className="space-y-1">
          {precedents.map((prec, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors text-left group"
            >
              <div className="flex size-7 items-center justify-center rounded bg-muted shrink-0">
                <Briefcase className="size-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {prec.title}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {prec.citation}
                </p>
              </div>
              {prec.source && (
                <ExternalLink
                  className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); window.open(prec.source, '_blank', 'noopener') }}
                />
              )}
              <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Main Research View ─── */

export default function AIResearchView() {
  const [query, setQuery] = useState('')
  const [courtFilter, setCourtFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [caseTypeFilter, setCaseTypeFilter] = useState('all')
  const [results, setResults] = useState<ResearchResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setIsSearching(true)
    setSearchedQuery(query.trim())
    setResults(null)
    setErrorMessage(null)

    try {
      // Use AbortController with generous timeout (180s matches backend)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 200000) // 200s client timeout

      const res = await fetch('https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiResearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          court: courtFilter,
          year: yearFilter,
          caseType: caseTypeFilter,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        setErrorMessage(`Server error (${res.status}): ${errBody.substring(0, 100)}`)
        setIsSearching(false)
        return
      }

      const data = await res.json()

      // Check for API-level errors
      if (data.error) {
        setErrorMessage(data.details || data.error)
        setIsSearching(false)
        return
      }

      setResults(data)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setErrorMessage('Research timed out. The query may be too complex. Please try again with simpler terms.')
      } else {
        setErrorMessage('Network error. Please check your connection and try again.')
      }
    }
    setIsSearching(false)
  }, [query, courtFilter, yearFilter, caseTypeFilter])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSearch()
      }
    },
    [handleSearch]
  )

  const handleQueryClick = useCallback((q: string) => {
    setQuery(q)
    // Trigger search after a brief delay for UX
    setTimeout(() => {
      // We'll set a flag and handle in next render
    }, 0)
  }, [])

  const handleCite = useCallback((citation: string) => {
    // In a real app, this would open a document picker or insert into current document
  }, [])

  const handleClearSearch = useCallback(() => {
    setQuery('')
    setResults(null)
    setSearchedQuery('')
    setErrorMessage(null)
  }, [])

  const hasResults = results !== null && !isSearching

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <BookOpen className="size-7 text-primary" />
              AI Legal Research
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Search judgments, precedents, and legal provisions across Indian courts
            </p>
          </div>

          {/* Search Section */}
          <div className="space-y-3">
            {/* Main search input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search for judgments, precedents, sections..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 pl-12 pr-24 text-sm rounded-xl border-border bg-card shadow-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleClearSearch}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSearch}
                  disabled={!query.trim() || isSearching}
                  className="h-8 gap-1.5 rounded-lg shadow-sm"
                >
                  {isSearching ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">Research</span>
                </Button>
              </div>
            </div>

            {/* Filters toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 text-xs gap-1.5',
                  showFilters && 'bg-accent text-accent-foreground'
                )}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="size-3" />
                Filters
                {(courtFilter !== 'all' || yearFilter !== 'all' || caseTypeFilter !== 'all') && (
                  <Badge className="ml-1 h-4 min-w-[16px] px-1 text-[10px] bg-primary text-primary-foreground rounded-full">
                    {[courtFilter !== 'all', yearFilter !== 'all', caseTypeFilter !== 'all'].filter(Boolean).length}
                  </Badge>
                )}
              </Button>

              {showFilters && (
                <div className="flex items-center gap-2 flex-wrap animate-in slide-in-from-top-2 duration-200">
                  <Select value={courtFilter} onValueChange={setCourtFilter}>
                    <SelectTrigger size="sm" className="h-8 w-[150px] text-xs">
                      <SelectValue placeholder="Court" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courts</SelectItem>
                      <SelectItem value="supreme">Supreme Court</SelectItem>
                      <SelectItem value="high">High Court</SelectItem>
                      <SelectItem value="district">District Court</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger size="sm" className="h-8 w-[120px] text-xs">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2020-2024">2020–2024</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                    <SelectTrigger size="sm" className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Case Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="criminal">Criminal</SelectItem>
                      <SelectItem value="civil">Civil</SelectItem>
                      <SelectItem value="constitutional">Constitutional</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>

                  {(courtFilter !== 'all' || yearFilter !== 'all' || caseTypeFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={() => {
                        setCourtFilter('all')
                        setYearFilter('all')
                        setCaseTypeFilter('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content: Empty / Loading / Results */}
          {!searchedQuery && !isSearching && !results && !errorMessage ? (
            <EmptyState onQueryClick={(q) => { setQuery(q); }} />
          ) : isSearching ? (
            <LoadingState />
          ) : errorMessage ? (
            <ErrorMessage message={errorMessage} onRetry={handleSearch} />
          ) : hasResults ? (
            <div className="space-y-6">
              {/* Results header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{results.results.length}</span> results for{' '}
                    <span className="font-medium text-foreground">&ldquo;{searchedQuery}&rdquo;</span>
                  </p>
                  <ResearchMetaInfo meta={results._meta} />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5">
                    <BookmarkPlus className="size-3" />
                    Save Research
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5">
                    <Download className="size-3" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Results + Sidebar layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                {/* Main results */}
                <div className="space-y-4">
                  {results.results.map((result, i) => (
                    <ResultCard key={i} result={result} onCite={handleCite} />
                  ))}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <SuggestedArguments arguments={results.suggestedArguments} />
                  <RelatedPrecedents precedents={results.relatedPrecedents} />
                </div>
              </div>
            </div>
          ) : (
            <NoDataMessage meta={results?._meta} />
          )}
        </div>
      </div>
    </div>
  )
}
