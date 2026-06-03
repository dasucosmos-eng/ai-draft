'use client'

import { useState, useCallback } from 'react'
import { aiLitigation, type LitigationCitation } from '@/lib/ai-service'
import { cn } from '@/lib/utils'
import {
  Shield, Sparkles, Scale, CheckCircle2, Copy, ExternalLink,
  Building, Calendar, ShieldCheck, Database, Globe, Quote,
  Loader2, FileText, Target, Brain, AlertTriangle, Lightbulb, Swords,
  ChevronRight, ArrowRight, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import { DocumentUpload, type UploadedFile } from '@/components/shared/document-upload'

/* ─── Types ─── */

interface DefenseResult {
  content: string
  isLoading: boolean
  citations: LitigationCitation[]
  sources: string[]
  suggestedArguments: string[]
  relatedPrecedents: { title: string; year: string; citation: string; source: string }[]
  searchMeta?: { dataSources: string[]; citationsCount: number; searchPerformed: boolean }
  defenseStrategy?: { strength: number; weaknesses: string[]; recommendedActions: string[] }
}

/* ─── AI Helper ─── */

async function queryDefenseAI(
  input: Record<string, string | undefined>
): Promise<DefenseResult> {
  const data = await aiLitigation('defense-builder', input)
  return {
    content: data.response || '',
    isLoading: false,
    citations: data.citations || [],
    sources: data.sources || [],
    suggestedArguments: data.suggestedArguments || [],
    relatedPrecedents: data.relatedPrecedents || [],
    searchMeta: data._meta,
    defenseStrategy: data.caseStrength ? {
      strength: data.caseStrength,
      weaknesses: [],
      recommendedActions: [],
    } : undefined,
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
    toast.success('Citation copied to clipboard')
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

function CitationsPanel({ result }: { result: DefenseResult }) {
  if (!result.citations.length) return null
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Database className="size-3.5 text-primary" />
            Defense Citations
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

function SuggestedArgumentsPanel({ arguments: args }: { arguments: string[] }) {
  if (!args.length) return null
  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Lightbulb className="size-3 text-amber-500" /> Suggested Defense Arguments
      </p>
      <div className="space-y-1.5">
        {args.slice(0, 6).map((arg, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border group">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
            <p className="text-[10px] text-muted-foreground leading-relaxed flex-1">{arg.length > 200 ? arg.slice(0, 200) + '...' : arg}</p>
            <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => { navigator.clipboard.writeText(arg); toast.success('Argument copied') }}>
              <Copy className="size-2.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Component ─── */

export default function DefenseBuilderView() {
  const [caseType, setCaseType] = useState('')
  const [caseDetails, setCaseDetails] = useState('')
  const [complaintText, setComplaintText] = useState('')
  const [applicableLaw, setApplicableLaw] = useState('')
  const [uploadedContent, setUploadedContent] = useState('')
  const [result, setResult] = useState<DefenseResult>({ content: '', isLoading: false, citations: [], sources: [], suggestedArguments: [], relatedPrecedents: [] })
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)

  const handleFileExtracted = useCallback((files: UploadedFile[]) => {
    const text = files.filter((f) => f.extractedText).map((f) => f.extractedText || '').join('\n\n')
    if (text) setUploadedContent(text)
  }, [])

  const caseTypes = [
    'Criminal Defense', 'Civil Suit Defense', 'Property Dispute', 'Cheque Bounce (S.138 NI Act)',
    'Domestic Violence', 'Consumer Complaint', 'Trademark/IP Defense', 'Tax Appeal',
    'Anticipatory Bail', 'Quashing Petition', 'Divorce/Matrimonial', 'Labor/Employment',
  ]

  const handleGenerate = useCallback(async () => {
    if (!caseDetails.trim()) { toast.error('Please enter case details'); return }
    setResult(prev => ({ ...prev, isLoading: true }))
    setIsAILoading(true)
    try {
      const r = await queryDefenseAI({
        caseDetails: caseDetails + (uploadedContent ? '\n\n[Uploaded Document Content]\n' + uploadedContent : ''),
        caseType: caseType || undefined,
        complaint: complaintText || undefined,
        applicableLaw: applicableLaw || undefined,
      })
      setResult(r)
    } catch (err: any) {
      toast.error('AI generation failed: ' + (err?.message || 'Unknown error'))
      setResult(prev => ({ ...prev, isLoading: false, content: 'Failed to generate defense. Please try again.' }))
    } finally {
      setIsAILoading(false)
    }
  }, [caseDetails, caseType, complaintText, applicableLaw, uploadedContent, setIsAILoading])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="size-7 text-primary" />
            Defense Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build comprehensive legal defenses with AI-powered case law citations from Indian courts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1.5 bg-primary/15 text-primary border-primary/20 px-3 py-1"><Sparkles className="size-3.5" />AI Powered</Badge>
          <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/20 px-3 py-1"><Database className="size-3.5" />Live Case Law</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="border-primary/20">
          <CardContent className="p-5 space-y-5">
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
              <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Describe your case to receive a comprehensive defense strategy backed by real Indian case law.
                Include facts, opposing party arguments, and applicable laws for best results.
              </p>
            </div>

            {/* Case Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5"><Target className="size-3.5 text-primary" />Case Type</Label>
              <div className="flex flex-wrap gap-2">
                {caseTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setCaseType(type === caseType ? '' : type)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
                      caseType === type
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-secondary-foreground border-transparent hover:border-border'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Case Details */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5"><Scale className="size-3.5 text-primary" />Case Details <span className="text-red-400">*</span></Label>
              <Textarea
                placeholder="Describe the case: who are the parties, what is the dispute, what relief is sought against you, key facts..."
                value={caseDetails}
                onChange={(e) => setCaseDetails(e.target.value)}
                className="text-xs min-h-[120px] resize-none"
              />
            </div>

            {/* Complaint / FIR Text */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5"><FileText className="size-3.5 text-primary" />Complaint / FIR / Plaint <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Paste the complaint, FIR, plaint, or petition content for detailed analysis..."
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                className="text-xs min-h-[100px] resize-none"
              />
            </div>

            {/* Applicable Law */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Applicable Law / Sections <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="e.g., Section 138 NI Act, Section 498A IPC, Section 34 IPC"
                value={applicableLaw}
                onChange={(e) => setApplicableLaw(e.target.value)}
                className="h-10 text-xs"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5"><FileText className="size-3.5 text-primary" />Upload Case Documents <span className="text-muted-foreground">(optional)</span></Label>
              <DocumentUpload module="general" maxFiles={5} compact onFilesExtracted={handleFileExtracted} />
              {uploadedContent && <p className="text-[10px] text-emerald-600">Document content extracted ({uploadedContent.length} chars). It will be included with your query.</p>}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={result.isLoading || !caseDetails.trim()}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold rounded-xl h-12"
            >
              {result.isLoading ? (
                <><Loader2 className="size-4 animate-spin" /> Searching case law & building defense...</>
              ) : (
                <><Swords className="size-4" /> Build Defense with Citations<ArrowRight className="size-4" /></>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="space-y-4">
          {result.isLoading && (
            <div className="space-y-3 p-5 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="size-3.5 animate-pulse text-primary" />
                <span>Searching Indian Kanoon & legal databases for defense precedents...</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />Analyzing case facts and applicable law
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}

          {result.content && !result.isLoading && (
            <>
              {/* Defense Strategy Content */}
              <Card className="border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Defense Strategy</h3>
                  </div>
                  <ScrollArea className="max-h-[500px]">
                    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs whitespace-pre-wrap">
                      {result.content}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Citations */}
              <CitationsPanel result={result} />

              {/* Suggested Arguments */}
              <Card className="border-primary/20">
                <CardContent className="p-5">
                  <SuggestedArgumentsPanel arguments={result.suggestedArguments} />
                </CardContent>
              </Card>

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
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Shield className="size-8 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Build Your Defense</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Enter case details on the left to generate a comprehensive defense strategy backed by real Indian case law citations.
                </p>
                <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Scale className="size-3.5" /><span>Supreme Court</span></div>
                  <div className="flex items-center gap-1.5"><Building className="size-3.5" /><span>High Courts</span></div>
                  <div className="flex items-center gap-1.5"><Database className="size-3.5" /><span>3M+ Cases</span></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
