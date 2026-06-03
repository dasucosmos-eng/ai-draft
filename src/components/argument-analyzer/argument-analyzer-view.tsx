'use client'

import { useState, useCallback } from 'react'
import { aiLitigation, type LitigationCitation } from '@/lib/ai-service'
import { cn } from '@/lib/utils'
import {
  Brain, Sparkles, Scale, CheckCircle2, Copy, ExternalLink,
  Building, Calendar, ShieldCheck, Database, Globe, Quote,
  Loader2, FileText, Target, AlertTriangle, Lightbulb,
  ArrowRight, XCircle, CheckCircle, Zap, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import { DocumentUpload, type UploadedFile } from '@/components/shared/document-upload'

/* ─── Types ─── */

interface AnalysisResult {
  content: string
  isLoading: boolean
  citations: LitigationCitation[]
  sources: string[]
  suggestedArguments: string[]
  relatedPrecedents: { title: string; year: string; citation: string; source: string }[]
  searchMeta?: { dataSources: string[]; citationsCount: number; searchPerformed: boolean }
  strengthScore?: number
  weaknesses?: string[]
  counterArguments?: string[]
}

/* ─── AI Helper ─── */

async function queryArgumentAI(
  input: Record<string, string | undefined>
): Promise<AnalysisResult> {
  const data = await aiLitigation('argument-analyzer', input)
  return {
    content: data.response || '',
    isLoading: false,
    citations: data.citations || [],
    sources: data.sources || [],
    suggestedArguments: data.suggestedArguments || [],
    relatedPrecedents: data.relatedPrecedents || [],
    searchMeta: data._meta,
    strengthScore: data.caseStrength ?? undefined,
  }
}

/* ─── Shared Citation Components (matching research/litigation pattern) ─── */

function RelevanceBar({ score }: { score: number }) {
  const getColor = (s: number) => s >= 90 ? 'bg-emerald-500' : s >= 75 ? 'bg-amber-500' : 'bg-orange-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', getColor(score))} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground">{score}%</span>
    </div>
  )
}

function CitationCard({ citation }: { citation: LitigationCitation }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(citation.citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Citation copied')
  }, [citation.citation])

  return (
    <Card className="gap-0 overflow-hidden hover:border-primary/20 transition-all">
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
              <Scale className="size-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{citation.title}</h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-[9px] gap-1"><Building className="size-2" />{citation.court}</Badge>
                <Badge variant="outline" className="text-[9px] font-mono"><Calendar className="size-2" />{citation.year}</Badge>
              </div>
            </div>
          </div>
          <RelevanceBar score={citation.relevance} />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
          {expanded ? citation.summary : citation.summary.slice(0, 180) + (citation.summary.length > 180 ? '...' : '')}
        </p>
        {citation.summary.length > 180 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-medium text-primary hover:underline mb-2">
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        {citation.keyHoldings.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-2.5 mb-2">
            <p className="text-[9px] font-semibold text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <ShieldCheck className="size-2.5" /> Key Holdings
            </p>
            <ul className="space-y-1">
              {citation.keyHoldings.slice(0, 3).map((h, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
                  <CheckCircle2 className="size-2.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{h.length > 120 ? h.slice(0, 120) + '...' : h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Quote className="size-2.5 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">{citation.citation}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className={cn('h-6 text-[10px] gap-1', copied && 'text-emerald-500')} onClick={handleCopy}>
              {copied ? <><CheckCircle2 className="size-2.5" />Copied</> : <><Copy className="size-2.5" />Copy</>}
            </Button>
            {citation.source && (
              <a href={citation.source} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1">
                  <ExternalLink className="size-2.5" />Source
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CitationsPanel({ result }: { result: AnalysisResult }) {
  if (!result.citations.length) return null
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Database className="size-3.5 text-primary" />
            Legal Citations
          </h4>
          <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">
            {result.citations.length} cases
          </Badge>
        </div>
        {result.searchMeta?.dataSources && result.searchMeta.dataSources.length > 0 && (
          <div className="flex items-center gap-1.5">
            {result.searchMeta.dataSources.map((s) => (
              <Badge key={s} variant="outline" className="text-[9px] gap-1">
                <Globe className="size-2" />{s}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2.5 pr-2">
          {result.citations.map((citation, i) => (
            <CitationCard key={i} citation={citation} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

/* ─── Strength Meter ─── */

function StrengthMeter({ score }: { score: number }) {
  const getLabel = (s: number) => {
    if (s >= 80) return { label: 'Strong Argument', color: 'text-emerald-600', bg: 'bg-emerald-500' }
    if (s >= 60) return { label: 'Moderate Argument', color: 'text-amber-600', bg: 'bg-amber-500' }
    return { label: 'Weak Argument', color: 'text-red-600', bg: 'bg-red-500' }
  }
  const { label, color, bg } = getLabel(score)

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-amber-500" />
        <h4 className="text-sm font-semibold text-foreground">Argument Strength Analysis</h4>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Overall Strength</span>
          <span className={cn('text-lg font-bold', color)}>{score}%</span>
        </div>
        <div className="h-4 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000 ease-out', bg)}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className={cn('text-[11px] font-medium', color)}>{label}</p>
      </div>
    </div>
  )
}

/* ─── Main Component ─── */

export default function ArgumentAnalyzerView() {
  const [argumentText, setArgumentText] = useState('')
  const [caseContext, setCaseContext] = useState('')
  const [opposingSide, setOpposingSide] = useState('')
  const [uploadedContent, setUploadedContent] = useState('')
  const [result, setResult] = useState<AnalysisResult>({ content: '', isLoading: false, citations: [], sources: [], suggestedArguments: [], relatedPrecedents: [] })
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)

  const handleFileExtracted = useCallback((files: UploadedFile[]) => {
    const text = files.filter((f) => f.extractedText).map((f) => f.extractedText || '').join('\n\n')
    if (text) setUploadedContent(text)
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!argumentText.trim()) { toast.error('Please enter an argument to analyze'); return }
    setResult(prev => ({ ...prev, isLoading: true }))
    setIsAILoading(true)
    try {
      const r = await queryArgumentAI({
        argument: argumentText + (uploadedContent ? '\n\n[Uploaded Document Content]\n' + uploadedContent : ''),
        caseContext: caseContext || undefined,
        opponentArgument: opposingSide || undefined,
      })
      setResult(r)
    } catch (err: any) {
      toast.error('Analysis failed: ' + (err?.message || 'Unknown error'))
      setResult(prev => ({ ...prev, isLoading: false, content: 'Failed to analyze argument. Please try again.' }))
    } finally {
      setIsAILoading(false)
    }
  }, [argumentText, caseContext, opposingSide, uploadedContent, setIsAILoading])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Brain className="size-7 text-primary" />
            Argument Analyzer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze legal arguments with AI-powered strength scoring and case law citations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1.5 bg-primary/15 text-primary border-primary/20 px-3 py-1"><Sparkles className="size-3.5" />AI Powered</Badge>
          <Badge className="gap-1.5 bg-amber-500/15 text-amber-600 border-amber-500/20 px-3 py-1"><TrendingUp className="size-3.5" />Strength Scoring</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="border-amber-500/20">
          <CardContent className="p-5 space-y-5">
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 flex items-start gap-2">
              <Brain className="size-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Paste any legal argument to analyze its strength, find supporting case law, identify weaknesses,
                and discover counter-arguments backed by Indian judicial precedents.
              </p>
            </div>

            {/* Argument Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Scale className="size-3.5 text-primary" />Legal Argument <span className="text-red-400">*</span>
              </Label>
              <Textarea
                placeholder="Paste the legal argument to analyze: e.g., 'The petitioner argues that the impugned order violates natural justice principles as laid down in the case of...' or 'The defense claims that under Section 138 NI Act, the complainant failed to issue a valid notice within the prescribed period...'"
                value={argumentText}
                onChange={(e) => setArgumentText(e.target.value)}
                className="text-xs min-h-[140px] resize-none"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />Upload Argument Documents <span className="text-muted-foreground">(optional)</span>
              </Label>
              <DocumentUpload module="general" maxFiles={5} compact onFilesExtracted={handleFileExtracted} />
              {uploadedContent && <p className="text-[10px] text-emerald-600">Document content extracted ({uploadedContent.length} chars). It will be included with your query.</p>}
            </div>

            {/* Case Context */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />Case Context <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                placeholder="Brief case context: parties, court, stage of proceedings, applicable law..."
                value={caseContext}
                onChange={(e) => setCaseContext(e.target.value)}
                className="text-xs min-h-[80px] resize-none"
              />
            </div>

            {/* Opposing Side */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Target className="size-3.5 text-red-500" />Opposing Argument <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                placeholder="What is the other side arguing? This helps find counter-precedents..."
                value={opposingSide}
                onChange={(e) => setOpposingSide(e.target.value)}
                className="text-xs min-h-[80px] resize-none"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={result.isLoading || !argumentText.trim()}
              className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700 text-sm font-semibold rounded-xl h-12"
            >
              {result.isLoading ? (
                <><Loader2 className="size-4 animate-spin" /> Analyzing argument & searching case law...</>
              ) : (
                <><Brain className="size-4" /> Analyze with Citations<ArrowRight className="size-4" /></>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="space-y-4">
          {result.isLoading && (
            <div className="space-y-3 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="size-3.5 animate-pulse text-amber-500" />
                <span>Analyzing argument strength & searching Indian case law...</span>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-full rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}

          {result.content && !result.isLoading && (
            <>
              {/* Strength Score */}
              {result.strengthScore !== undefined && (
                <StrengthMeter score={result.strengthScore} />
              )}

              {/* Analysis Content */}
              <Card className="border-amber-500/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Detailed Analysis</h3>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs whitespace-pre-wrap">
                      {result.content}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Citations */}
              <CitationsPanel result={result} />

              {/* Suggested Improvements */}
              {result.suggestedArguments.length > 0 && (
                <Card className="border-primary/20">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Lightbulb className="size-3 text-amber-500" /> Suggested Strengthening Arguments
                    </p>
                    <div className="space-y-2">
                      {result.suggestedArguments.slice(0, 5).map((arg, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border group">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-[10px] text-muted-foreground leading-relaxed flex-1">{arg.length > 200 ? arg.slice(0, 200) + '...' : arg}</p>
                          <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => { navigator.clipboard.writeText(arg); toast.success('Copied') }}>
                            <Copy className="size-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sources */}
              {result.sources && result.sources.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="size-3.5 text-primary" />
                      <h4 className="text-xs font-semibold text-foreground">Data Sources</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.sources.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] gap-1">
                          <ExternalLink className="size-2" />{s}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!result.content && !result.isLoading && (
            <Card className="border-dashed">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 mb-4">
                  <Brain className="size-8 text-amber-500" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Analyze Any Argument</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Paste a legal argument on the left to receive AI-powered strength analysis with supporting case law citations.
                </p>
                <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Zap className="size-3.5" /><span>Strength Score</span></div>
                  <div className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /><span>Case Law Support</span></div>
                  <div className="flex items-center gap-1.5"><Lightbulb className="size-3.5" /><span>Improvements</span></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
