'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { aiLitigation, type LitigationCitation } from '@/lib/ai-service'
import { cn } from '@/lib/utils'
import {
  Swords, Shield, BookOpen, Target, CheckSquare, Mic, Sparkles,
  ChevronRight, ChevronUp, ArrowRight, Brain, AlertTriangle, Zap,
  FileText, Loader2, CheckCircle2, XCircle, Scale, Quote, Copy,
  ExternalLink, Building, Calendar, ShieldCheck, Lightbulb, Globe,
  Database, Clock, BookMarked, Search, RotateCcw, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { DocumentUpload, type UploadedFile } from '@/components/shared/document-upload'

/* ─── Types ─── */

type FeatureId =
  | 'argument-builder'
  | 'injunction-generator'
  | 'hearing-prep'
  | 'cross-examination'
  | 'filing-checklist'
  | 'courtroom-notes'

interface FeatureConfig {
  id: FeatureId
  icon: typeof Swords
  title: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

interface AIResult {
  content: string
  isLoading: boolean
  citations: LitigationCitation[]
  sources: string[]
  suggestedArguments: string[]
  relatedPrecedents: { title: string; year: string; citation: string; source: string }[]
  searchMeta?: { dataSources: string[]; citationsCount: number; searchPerformed: boolean }
}

/* ─── Feature Configs ─── */

const features: FeatureConfig[] = [
  { id: 'argument-builder', icon: Swords, title: 'AI Argument Builder', description: 'Generate arguments with real case citations', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  { id: 'injunction-generator', icon: Shield, title: 'Injunction Generator', description: 'Draft injunctions with legal backing', color: 'text-sky-500', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20' },
  { id: 'hearing-prep', icon: BookOpen, title: 'Hearing Prep Engine', description: 'Prepare hearings with precedent support', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  { id: 'cross-examination', icon: Target, title: 'Cross-Examination Assistant', description: 'Analyze statements with Evidence Act', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
  { id: 'filing-checklist', icon: CheckSquare, title: 'Filing Checklist', description: 'Autonomous filing error detection', color: 'text-violet-500', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20' },
  { id: 'courtroom-notes', icon: Mic, title: 'Courtroom Notes', description: 'Convert hearing notes into summaries', color: 'text-pink-500', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/20' },
]

const checklistItems = [
  { id: 'vakalatnama', label: 'Vakalatnama signed & filed', checked: true },
  { id: 'affidavit', label: 'Affidavit duly sworn & signed', checked: true },
  { id: 'court-fee', label: 'Court fee stamp attached', checked: true },
  { id: 'annexures', label: 'Annexures properly numbered & indexed', checked: false },
  { id: 'pagination', label: 'Pagination continuous & verified', checked: false },
  { id: 'copies', label: 'Copies complete for all respondents', checked: true },
  { id: 'synopsis', label: 'Synopsis of arguments included', checked: false },
  { id: 'list-dates', label: 'List of dates filed', checked: true },
  { id: 'cd', label: 'CD / USB with soft copies (if required)', checked: false },
  { id: 'advance-copy', label: 'Advance copy served on opposite party', checked: true },
]

/* ─── AI Helper with Citations ─── */

async function queryLitigationAI(
  toolType: string,
  input: Record<string, string | undefined>
): Promise<AIResult> {
  const data = await aiLitigation(toolType, input)
  return {
    content: data.response || '',
    isLoading: false,
    citations: data.citations || [],
    sources: data.sources || [],
    suggestedArguments: data.suggestedArguments || [],
    relatedPrecedents: data.relatedPrecedents || [],
    searchMeta: data._meta,
  }
}

/* ─── Shared Citation Components ─── */

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

function CitationsPanel({ result }: { result: AIResult }) {
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
      <ScrollArea className="max-h-[350px]">
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
        <Lightbulb className="size-3 text-amber-500" /> Suggested Arguments from Case Law
      </p>
      <div className="space-y-1.5">
        {args.slice(0, 4).map((arg, i) => (
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

/* ─── Feature Panel Components ─── */

function ArgumentBuilderPanel() {
  const [caseDetails, setCaseDetails] = useState('')
  const [petition, setPetition] = useState('')
  const [uploadedContent, setUploadedContent] = useState('')
  const [result, setResult] = useState<AIResult>({ content: '', isLoading: false, citations: [], sources: [], suggestedArguments: [], relatedPrecedents: [] })
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)

  const handleFileExtracted = useCallback((files: UploadedFile[]) => {
    const text = files.filter((f) => f.extractedText).map((f) => f.extractedText || '').join('\n\n')
    if (text) setUploadedContent(text)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!caseDetails.trim()) { toast.error('Please enter case details'); return }
    setResult(prev => ({ ...prev, isLoading: true }))
    setIsAILoading(true)
    try {
      const r = await queryLitigationAI('argument-builder', { caseDetails: caseDetails + (uploadedContent ? '\n\n[Uploaded Document Content]\n' + uploadedContent : ''), petition: petition || undefined })
      setResult(r)
    } catch { toast.error('AI generation failed'); setResult(prev => ({ ...prev, isLoading: false, content: 'Failed to generate arguments. Please try again.' })) }
    finally { setIsAILoading(false) }
  }, [caseDetails, petition, uploadedContent, setIsAILoading])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Case Details</Label>
        <Textarea placeholder="Describe the case: parties, cause of action, relief sought, applicable law..." value={caseDetails} onChange={(e) => setCaseDetails(e.target.value)} className="text-xs min-h-[100px] resize-none" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Petition / Reply / FIR <span className="text-muted-foreground ml-1">(optional)</span></Label>
        <Textarea placeholder="Paste the petition, reply, or FIR content for analysis..." value={petition} onChange={(e) => setPetition(e.target.value)} className="text-xs min-h-[80px] resize-none" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5"><Upload className="size-3.5" />Upload Case Documents</Label>
        <DocumentUpload module="general" maxFiles={5} compact onFilesExtracted={handleFileExtracted} />
        {uploadedContent && <p className="text-[10px] text-emerald-600">Document content extracted ({uploadedContent.length} chars). It will be included with your query.</p>}
      </div>
      <Button onClick={handleGenerate} disabled={result.isLoading} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
        {result.isLoading ? <><Loader2 className="size-3.5 animate-spin" /> Searching case law & generating...</> : <><Sparkles className="size-3.5" /> Generate with Citations</>}
      </Button>
      {result.isLoading && (
        <div className="space-y-2 p-4 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Database className="size-3.5 animate-pulse" />Searching Indian Kanoon & legal databases...</div>
          <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-5/6" />
        </div>
      )}
      {result.content && !result.isLoading && (
        <>
          <ScrollArea className="max-h-[400px] rounded-lg border border-border p-4 bg-card">
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs whitespace-pre-wrap">{result.content}</div>
          </ScrollArea>
          <CitationsPanel result={result} />
          <SuggestedArgumentsPanel arguments={result.suggestedArguments} />
        </>
      )}
    </div>
  )
}

function InjunctionGeneratorPanel() {
  const [caseType, setCaseType] = useState('')
  const [grounds, setGrounds] = useState('')
  const [result, setResult] = useState<AIResult>({ content: '', isLoading: false, citations: [], sources: [], suggestedArguments: [], relatedPrecedents: [] })
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)

  const handleGenerate = useCallback(async () => {
    if (!caseType.trim() || !grounds.trim()) { toast.error('Please fill all fields'); return }
    setResult(prev => ({ ...prev, isLoading: true }))
    setIsAILoading(true)
    try { setResult(await queryLitigationAI('injunction-generator', { caseType, grounds })) }
    catch { toast.error('AI generation failed'); setResult(prev => ({ ...prev, isLoading: false, content: 'Failed to generate injunction.' })) }
    finally { setIsAILoading(false) }
  }, [caseType, grounds, setIsAILoading])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Type of Relief</Label>
        <div className="flex flex-wrap gap-2">
          {['Temporary Injunction', 'Stay Order', 'Interim Relief', 'Mareva Injunction', 'Anton Piller Order'].map((type) => (
            <button key={type} onClick={() => setCaseType(type)} className={cn('px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors', caseType === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-transparent hover:border-border')}>{type}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Grounds & Case Details</Label>
        <Textarea placeholder="Describe the grounds for seeking injunction..." value={grounds} onChange={(e) => setGrounds(e.target.value)} className="text-xs min-h-[100px] resize-none" />
      </div>
      <Button onClick={handleGenerate} disabled={result.isLoading} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
        {result.isLoading ? <><Loader2 className="size-3.5 animate-spin" /> Searching case law...</> : <><Shield className="size-3.5" /> Generate with Citations</>}
      </Button>
      {result.isLoading && <div className="space-y-2 p-4 rounded-lg bg-secondary/50"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Database className="size-3.5 animate-pulse" />Searching legal databases...</div><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>}
      {result.content && !result.isLoading && (<><ScrollArea className="max-h-[400px] rounded-lg border border-border p-4 bg-card"><div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs whitespace-pre-wrap">{result.content}</div></ScrollArea><CitationsPanel result={result} /></>)}
    </div>
  )
}

function HearingPrepPanel() {
  const [caseInfo, setCaseInfo] = useState('')
  const [uploadedContent, setUploadedContent] = useState('')
  const [result, setResult] = useState<AIResult>({ content: '', isLoading: false, citations: [], sources: [], suggestedArguments: [], relatedPrecedents: [] })
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)

  const handleFileExtracted = useCallback((files: UploadedFile[]) => {
    const text = files.filter((f) => f.extractedText).map((f) => f.extractedText || '').join('\n\n')
    if (text) setUploadedContent(text)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!caseInfo.trim()) { toast.error('Please enter case information'); return }
    setResult(prev => ({ ...prev, isLoading: true })); setIsAILoading(true)
    try { setResult(await queryLitigationAI('hearing-prep', { caseInfo: caseInfo + (uploadedContent ? '\n\n[Uploaded Document]\n' + uploadedContent : '') })) }
    catch { toast.error('AI generation failed'); setResult(prev => ({ ...prev, isLoading: false, content: 'Failed to prepare hearing notes.' })) }
    finally { setIsAILoading(false) }
  }, [caseInfo, uploadedContent, setIsAILoading])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Case Information</Label>
        <Textarea placeholder="Describe the case: next hearing date, stage of proceedings, orders passed, issues to be argued..." value={caseInfo} onChange={(e) => setCaseInfo(e.target.value)} className="text-xs min-h-[100px] resize-none" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5"><Upload className="size-3.5" />Upload Court Orders / Previous Hearing Notes</Label>
        <DocumentUpload module="general" maxFiles={5} compact onFilesExtracted={handleFileExtracted} />
        {uploadedContent && <p className="text-[10px] text-emerald-600">Document content extracted ({uploadedContent.length} chars). It will be included with your query.</p>}
      </div>
      <Button onClick={handleGenerate} disabled={result.isLoading} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
        {result.isLoading ? <><Loader2 className="size-3.5 animate-spin" /> Searching precedents...</> : <><BookOpen className="size-3.5" /> Prepare with Citations</>}
      </Button>
      {result.isLoading && <div className="space-y-2 p-4 rounded-lg bg-secondary/50"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-5/6" /></div>}
      {result.content && !result.isLoading && (<><ScrollArea className="max-h-[400px] rounded-lg border border-border p-4 bg-card"><div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs whitespace-pre-wrap">{result.content}</div></ScrollArea><CitationsPanel result={result} /></>)}
    </div>
  )
}

function CrossExaminationPanel() {
  const [statement, setStatement] = useState('')
  const [witnessType, setWitnessType] = useState('pw')
  const [uploadedContent, setUploadedContent] = useState('')
  const [result, setResult] = useState<AIResult>({ content: '', isLoading: false, citations: [], sources: [], suggestedArguments: [], relatedPrecedents: [] })
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)

  const handleFileExtracted = useCallback((files: UploadedFile[]) => {
    const text = files.filter((f) => f.extractedText).map((f) => f.extractedText || '').join('\n\n')
    if (text) setUploadedContent(text)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!statement.trim()) { toast.error('Please enter the witness statement'); return }
    setResult(prev => ({ ...prev, isLoading: true })); setIsAILoading(true)
    try { setResult(await queryLitigationAI('cross-examination', { statement: statement + (uploadedContent ? '\n\n[Uploaded Document]\n' + uploadedContent : '') })) }
    catch { toast.error('AI generation failed'); setResult(prev => ({ ...prev, isLoading: false, content: 'Failed to generate cross-examination.' })) }
    finally { setIsAILoading(false) }
  }, [statement, uploadedContent, setIsAILoading])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Witness Type</Label>
        <div className="flex gap-2">
          {['pw', 'dw'].map((t) => (
            <button key={t} onClick={() => setWitnessType(t)} className={cn('px-4 py-1.5 rounded-full text-[11px] font-medium border transition-colors', witnessType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-transparent hover:border-border')}>
              {t === 'pw' ? 'Prosecution Witness' : 'Defense Witness'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Witness Statement</Label>
        <Textarea placeholder="Paste the witness statement / examination-in-chief / deposition..." value={statement} onChange={(e) => setStatement(e.target.value)} className="text-xs min-h-[120px] resize-none" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5"><Upload className="size-3.5" />Upload Witness Statement / Deposition</Label>
        <DocumentUpload module="general" maxFiles={5} compact onFilesExtracted={handleFileExtracted} />
        {uploadedContent && <p className="text-[10px] text-emerald-600">Document content extracted ({uploadedContent.length} chars). It will be included with your query.</p>}
      </div>
      <Button onClick={handleGenerate} disabled={result.isLoading} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
        {result.isLoading ? <><Loader2 className="size-3.5 animate-spin" /> Analyzing...</> : <><Target className="size-3.5" /> Generate with Citations</>}
      </Button>
      {result.isLoading && <div className="space-y-2 p-4 rounded-lg bg-secondary/50"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>}
      {result.content && !result.isLoading && (<><ScrollArea className="max-h-[400px] rounded-lg border border-border p-4 bg-card"><div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs whitespace-pre-wrap">{result.content}</div></ScrollArea><CitationsPanel result={result} /></>)}
    </div>
  )
}

function FilingChecklistPanel() {
  const [items, setItems] = useState(checklistItems)
  const checkedCount = items.filter((i) => i.checked).length
  const progress = Math.round((checkedCount / items.length) * 100)

  const toggleItem = (id: string) => setItems((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)))
  const aiSuggestions = items.filter((i) => !i.checked).map((i) => `⚠ ${i.label}`)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">{checkedCount} of {items.length} items verified</span>
          <Badge variant="outline" className={cn('text-[10px]', progress === 100 ? 'border-emerald-500/30 text-emerald-600' : progress >= 50 ? 'border-amber-500/30 text-amber-600' : 'border-red-500/30 text-red-600')}>{progress}%</Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <Separator />
      <div className="space-y-1">
        {items.map((item) => (
          <label key={item.id} className={cn('flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-colors', item.checked ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'bg-red-500/5 hover:bg-red-500/10')}>
            <Checkbox checked={item.checked} onCheckedChange={() => toggleItem(item.id)} className={cn('size-4', item.checked && 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500')} />
            <span className={cn('text-xs font-medium flex-1', item.checked ? 'text-emerald-700 line-through' : 'text-foreground')}>{item.label}</span>
            {item.checked ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-red-400" />}
          </label>
        ))}
      </div>
      {aiSuggestions.length > 0 && (<><Separator /><div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-2"><p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Lightbulb className="size-3.5" />AI Filing Warnings</p><ul className="space-y-1">{aiSuggestions.map((s, i) => <li key={i} className="text-xs text-amber-600/80">{s}</li>)}</ul></div></>)}
      {progress === 100 && <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center"><CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-1" /><p className="text-sm font-semibold text-emerald-700">Filing Package Complete!</p></div>}
    </div>
  )
}

function CourtroomNotesPanel() {
  const [notes, setNotes] = useState('')
  const [uploadedContent, setUploadedContent] = useState('')
  const [result, setResult] = useState<AIResult>({ content: '', isLoading: false, citations: [], sources: [], suggestedArguments: [], relatedPrecedents: [] })
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)

  const handleFileExtracted = useCallback((files: UploadedFile[]) => {
    const text = files.filter((f) => f.extractedText).map((f) => f.extractedText || '').join('\n\n')
    if (text) setUploadedContent(text)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!notes.trim()) { toast.error('Please enter hearing notes'); return }
    setResult(prev => ({ ...prev, isLoading: true })); setIsAILoading(true)
    try { setResult(await queryLitigationAI('courtroom-notes', { notes: notes + (uploadedContent ? '\n\n[Uploaded Document]\n' + uploadedContent : '') })) }
    catch { toast.error('AI generation failed'); setResult(prev => ({ ...prev, isLoading: false, content: 'Failed to process notes.' })) }
    finally { setIsAILoading(false) }
  }, [notes, uploadedContent, setIsAILoading])

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-pink-500/5 border border-pink-500/20 p-3 flex items-start gap-2">
        <Mic className="size-4 text-pink-500 mt-0.5 shrink-0" />
        <div><p className="text-xs font-semibold text-pink-700">Voice Input Mode</p><p className="text-[11px] text-muted-foreground">Type or paste your raw hearing notes below.</p></div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Hearing Notes</Label>
        <Textarea placeholder="Enter raw hearing notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs min-h-[120px] resize-none" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5"><Upload className="size-3.5" />Upload Audio Transcript / Notes File</Label>
        <DocumentUpload module="general" maxFiles={5} compact onFilesExtracted={handleFileExtracted} />
        {uploadedContent && <p className="text-[10px] text-emerald-600">Document content extracted ({uploadedContent.length} chars). It will be included with your query.</p>}
      </div>
      <Button onClick={handleGenerate} disabled={result.isLoading} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
        {result.isLoading ? <><Loader2 className="size-3.5 animate-spin" /> Processing...</> : <><Mic className="size-3.5" /> Generate Summary</>}
      </Button>
      {result.isLoading && <div className="space-y-2 p-4 rounded-lg bg-secondary/50"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>}
      {result.content && !result.isLoading && (<><ScrollArea className="max-h-[400px] rounded-lg border border-border p-4 bg-card"><div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs whitespace-pre-wrap">{result.content}</div></ScrollArea><CitationsPanel result={result} /></>)}
    </div>
  )
}

/* ─── Strategy Simulator ─── */

function StrategySimulator() {
  const [caseDetails, setCaseDetails] = useState('')
  const [opponentStrategy, setOpponentStrategy] = useState('')
  const [uploadedContent, setUploadedContent] = useState('')
  const [result, setResult] = useState<AIResult>({ content: '', isLoading: false, citations: [], sources: [], suggestedArguments: [], relatedPrecedents: [] })
  const [caseStrength, setCaseStrength] = useState<number | null>(null)
  const setIsAILoading = useAppStore((s) => s.setIsAILoading)

  const handleFileExtracted = useCallback((files: UploadedFile[]) => {
    const text = files.filter((f) => f.extractedText).map((f) => f.extractedText || '').join('\n\n')
    if (text) setUploadedContent(text)
  }, [])

  const handleSimulate = useCallback(async () => {
    if (!caseDetails.trim()) { toast.error('Please enter case details'); return }
    setResult(prev => ({ ...prev, isLoading: true })); setCaseStrength(null); setIsAILoading(true)
    try {
      const data = await aiLitigation('strategy-simulator', { caseDetails: caseDetails + (uploadedContent ? '\n\n[Uploaded Document]\n' + uploadedContent : ''), opponentStrategy: opponentStrategy || undefined })
      setCaseStrength(data.caseStrength ?? null)
      setResult({ content: data.response || '', isLoading: false, citations: data.citations || [], sources: data.sources || [], suggestedArguments: data.suggestedArguments || [], relatedPrecedents: data.relatedPrecedents || [], searchMeta: data._meta })
    } catch { toast.error('AI simulation failed'); setResult(prev => ({ ...prev, isLoading: false, content: 'Failed to simulate strategy.' })) }
    finally { setIsAILoading(false) }
  }, [caseDetails, opponentStrategy, uploadedContent, setIsAILoading])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1.5"><Scale className="size-3.5 text-primary" />Case Details</Label>
          <Textarea placeholder="Describe your case: facts, legal position, relief sought, evidence..." value={caseDetails} onChange={(e) => setCaseDetails(e.target.value)} className="text-xs min-h-[100px] resize-none" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1.5"><Swords className="size-3.5 text-red-500" />Opponent&apos;s Strategy</Label>
          <Textarea placeholder="Describe opponent's likely arguments, evidence, and strategy..." value={opponentStrategy} onChange={(e) => setOpponentStrategy(e.target.value)} className="text-xs min-h-[100px] resize-none" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5"><Upload className="size-3.5" />Upload Case Documents</Label>
        <DocumentUpload module="general" maxFiles={5} compact onFilesExtracted={handleFileExtracted} />
        {uploadedContent && <p className="text-[10px] text-emerald-600">Document content extracted ({uploadedContent.length} chars). It will be included with your query.</p>}
      </div>
      <Button onClick={handleSimulate} disabled={result.isLoading} className="gap-2 bg-amber-600 text-white hover:bg-amber-700 text-xs">
        {result.isLoading ? <><Loader2 className="size-3.5 animate-spin" /> Simulating Strategy...</> : <><Brain className="size-3.5" /> Run Strategy Simulation</>}
      </Button>

      {(result.isLoading || caseStrength !== null) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="size-4 text-amber-500" />Case Strength Analysis</h4>
          {result.isLoading ? (
            <div className="space-y-3"><Skeleton className="h-6 w-full rounded-full" /><div className="grid grid-cols-4 gap-3"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /></div></div>
          ) : caseStrength !== null ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Overall Case Strength</span>
                  <span className={cn('text-lg font-bold', caseStrength >= 70 ? 'text-emerald-600' : caseStrength >= 40 ? 'text-amber-600' : 'text-red-600')}>{caseStrength}%</span>
                </div>
                <div className="h-4 w-full rounded-full bg-secondary overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-1000 ease-out', caseStrength >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : caseStrength >= 40 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-red-400')} style={{ width: `${caseStrength}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">{caseStrength >= 70 ? 'Strong case with favorable prospects' : caseStrength >= 40 ? 'Moderate case — strategic improvements recommended' : 'Challenging case — significant risks identified'}</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {result.content && !result.isLoading && (<><ScrollArea className="max-h-[500px] rounded-lg border border-border p-4 bg-card"><div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs whitespace-pre-wrap">{result.content}</div></ScrollArea><CitationsPanel result={result} /></>)}
    </div>
  )
}

/* ─── Main Component ─── */

export default function LitigationView() {
  const [expandedFeature, setExpandedFeature] = useState<FeatureId | null>(null)

  const toggleFeature = (id: FeatureId) => setExpandedFeature((prev) => (prev === id ? null : id))

  const renderFeaturePanel = (id: FeatureId) => {
    switch (id) {
      case 'argument-builder': return <ArgumentBuilderPanel />
      case 'injunction-generator': return <InjunctionGeneratorPanel />
      case 'hearing-prep': return <HearingPrepPanel />
      case 'cross-examination': return <CrossExaminationPanel />
      case 'filing-checklist': return <FilingChecklistPanel />
      case 'courtroom-notes': return <CourtroomNotesPanel />
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2"><Scale className="size-7 text-primary" />Litigation Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered litigation tools with real case citations from Indian Kanoon</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1.5 bg-primary/15 text-primary border-primary/20 hover:bg-primary/20 px-3 py-1"><Sparkles className="size-3.5" />6 AI Tools</Badge>
          <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/20 px-3 py-1"><Database className="size-3.5" />Live Case Law</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => {
          const isExpanded = expandedFeature === feature.id
          const Icon = feature.icon
          return (
            <div key={feature.id} className={cn(isExpanded && 'sm:col-span-2 lg:col-span-3')}>
              <Card className={cn('py-0 gap-0 transition-all duration-300', isExpanded && `border-2 ${feature.borderColor}`, !isExpanded && 'hover:border-primary/20')}>
                <button className="w-full text-left" onClick={() => toggleFeature(feature.id)} aria-expanded={isExpanded}>
                  <CardContent className="p-4 md:p-5 flex items-center gap-4">
                    <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors', feature.bgColor)}><Icon className={cn('size-5', feature.color)} /></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">{feature.title}{isExpanded && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Active</Badge>}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                    </div>
                    <div className="shrink-0">
                      {isExpanded ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={(e) => { e.stopPropagation(); toggleFeature(feature.id) }}><ChevronUp className="size-3.5" />Close</Button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">Launch<ArrowRight className="size-3.5" /></div>
                      )}
                    </div>
                  </CardContent>
                </button>
                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="p-4 md:p-5 space-y-4">
                      <div className="rounded-lg bg-secondary/50 p-3 flex items-start gap-2">
                        <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {feature.id === 'argument-builder' && 'Input case details to generate comprehensive arguments with real legal citations from Indian courts.'}
                          {feature.id === 'injunction-generator' && 'Select relief type and grounds. AI searches case law and drafts a complete application with citations.'}
                          {feature.id === 'hearing-prep' && 'Enter case info for a hearing prep document backed by real precedents from Indian Kanoon.'}
                          {feature.id === 'cross-examination' && 'Paste witness statement for analysis with Indian Evidence Act provisions and case law support.'}
                          {feature.id === 'filing-checklist' && 'Interactive filing verification checklist with AI-powered error detection.'}
                          {feature.id === 'courtroom-notes' && 'Convert raw hearing notes into structured summaries with legal references.'}
                        </p>
                      </div>
                      {renderFeaturePanel(feature.id)}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2"><Brain className="size-5 text-amber-500" /><h2 className="text-lg font-semibold text-foreground">Strategy Simulator</h2><Badge className="gap-1.5 bg-amber-500/15 text-amber-600 border-amber-500/20 px-2.5 py-0.5 text-[10px]"><Zap className="size-3" />AI Powered</Badge></div>
        <Card className="border-amber-500/20">
          <CardContent className="p-4 md:p-5"><StrategySimulator /></CardContent>
        </Card>
      </div>
    </div>
  )
}
