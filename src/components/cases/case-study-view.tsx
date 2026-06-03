'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type CaseItem } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  BookMarked,
  Sparkles,
  Upload,
  FileText,
  X,
  ChevronRight,
  Shield,
  Scale,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Link2,
  Save,
  ArrowRight,
  Lightbulb,
  BarChart3,
  Calendar,
  Briefcase,
  Gavel,
  FilePlus,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { aiChatWithSuggestions } from '@/lib/api-client'
import { toast } from 'sonner'
import { DocumentUpload, type UploadedFile } from '@/components/shared/document-upload'

/* ─── Animation ─── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const as const } },
}

/* ─── Types ─── */

interface CaseStudyResult {
  analysis: string
  strengths: string[]
  weaknesses: string[]
  legalFramework: string[]
  caseReferences: { title: string; citation: string; year: string }[]
  strategy: string[]
  riskMatrix: { risk: string; level: string; mitigation: string }[]
  actionPlan: { step: string; timeline: string; priority: string }[]
}

const caseTypes = [
  'Property Dispute', 'Criminal Defence', 'Civil Recovery', 'Family Law',
  'Employment', 'Consumer Protection', 'IP/Patent', 'Banking/Finance',
  'Tax', 'Constitutional', 'Environmental', 'Corporate',
]

/* ─── Result Rendering Helpers ─── */

function SectionCard({ title, icon, children, accent = 'primary' }: { title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string }) {
  const accentMap: Record<string, string> = {
    primary: 'border-primary/20 bg-primary/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    violet: 'border-violet-500/20 bg-violet-500/5',
    sky: 'border-sky-500/20 bg-sky-500/5',
  }
  return (
    <Card className={cn('gap-0 overflow-hidden', accentMap[accent] || accentMap.primary)}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  )
}

/* ─── Main Component ─── */

export default function CaseStudyView() {
  const cases = useAppStore((s) => s.cases)
  const addCase = useAppStore((s) => s.addCase)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSelectedCaseId = useAppStore((s) => s.setSelectedCaseId)

  const [caseType, setCaseType] = useState('')
  const [facts, setFacts] = useState('')
  const [issues, setIssues] = useState('')
  const [desiredOutcome, setDesiredOutcome] = useState('')
  const [linkedCaseId, setLinkedCaseId] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<CaseStudyResult | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('analysis')

  const handleFilesExtracted = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files)
    if (files.some((f) => f.extractedText)) {
      toast.success(`${files.filter((f) => f.extractedText).length} file${files.length > 1 ? 's' : ''} processed successfully`)
    }
  }, [])

  const buildContext = useCallback(() => {
    const parts: string[] = []
    parts.push(`Case Type: ${caseType}`)
    if (facts) parts.push(`Facts: ${facts}`)
    if (issues) parts.push(`Key Issues: ${issues}`)
    if (desiredOutcome) parts.push(`Desired Outcome: ${desiredOutcome}`)

    if (linkedCaseId) {
      const linked = cases.find((c) => c.id === linkedCaseId)
      if (linked) {
        parts.push(`\nLinked Case: ${linked.title}`)
        parts.push(`Type: ${linked.caseType} - ${linked.subType || ''}`)
        parts.push(`Status: ${linked.status}`)
        if (linked.description) parts.push(`Description: ${linked.description}`)
        if ((linked as any).intakeData) {
          try {
            const intake = JSON.parse((linked as any).intakeData)
            if (intake.extractedInfo) {
              const info = intake.extractedInfo
              if (info.facts?.length) parts.push(`Case Facts: ${info.facts.join('; ')}`)
              if (info.parties?.length) parts.push(`Parties: ${info.parties.map((p: any) => `${p.role}: ${p.name}`).join(', ')}`)
            }
          } catch { /* ignore */ }
        }
      }
    }

    const textContent = uploadedFiles.map((f) => f.extractedText || '').filter(Boolean).join('\n\n---\n\n')
    if (textContent) parts.push(`\nUploaded Document Contents:\n${textContent.substring(0, 5000)}`)

    return parts.join('\n')
  }, [caseType, facts, issues, desiredOutcome, linkedCaseId, cases, uploadedFiles])

  const handleAnalyze = useCallback(async () => {
    if (!caseType || !facts.trim()) {
      toast.error('Please provide case type and facts')
      return
    }
    setIsAnalyzing(true)
    setResult(null)
    setActiveResultTab('analysis')

    try {
      const context = buildContext()
      const prompt = `You are an expert Indian legal analyst. Provide a comprehensive case study analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "analysis": "Detailed case analysis (3-4 paragraphs covering legal merits, factual matrix, and procedural aspects)",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "legalFramework": ["Section X of Act - Description", "Relevant case law precedent"],
  "caseReferences": [{"title": "Case Name v. Case Name", "citation": "YYYY Vol Page", "year": "YYYY"}],
  "strategy": ["Strategy recommendation 1", "Strategy 2"],
  "riskMatrix": [{"risk": "Risk description", "level": "High/Medium/Low", "mitigation": "How to mitigate"}],
  "actionPlan": [{"step": "Step description", "timeline": "Timeline", "priority": "High/Medium/Low"}]
}

Case Context:
${context}`

      const { response } = await aiChatWithSuggestions(prompt)
      if (response) {
        try {
          // Try to parse JSON from response, handling potential markdown wrapping
          let jsonStr = response.trim()
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
          if (jsonMatch) jsonStr = jsonMatch[1]
          else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
          const parsed = JSON.parse(jsonStr)
          // Safely merge with defaults to prevent undefined access in render
          setResult({
            analysis: parsed.analysis || '',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
            legalFramework: Array.isArray(parsed.legalFramework) ? parsed.legalFramework : [],
            caseReferences: Array.isArray(parsed.caseReferences) ? parsed.caseReferences : [],
            strategy: Array.isArray(parsed.strategy) ? parsed.strategy : [],
            riskMatrix: Array.isArray(parsed.riskMatrix) ? parsed.riskMatrix : [],
            actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
          })
        } catch {
          // If JSON parse fails, create a result from the text
          setResult({
            analysis: response,
            strengths: ['Based on provided facts', 'Legal framework identified'],
            weaknesses: ['Further document review recommended'],
            legalFramework: ['Please consult specific statutes'],
            caseReferences: [],
            strategy: ['Proceed with case filing', 'Gather additional evidence'],
            riskMatrix: [{ risk: 'Incomplete information', level: 'Medium', mitigation: 'Collect additional documents' }],
            actionPlan: [{ step: 'Review all evidence', timeline: '1-2 weeks', priority: 'High' }],
          })
        }
      }
    } catch (err) {
      console.error('[CaseStudy] Analysis failed:', err)
      toast.error('Analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [caseType, facts, issues, desiredOutcome, linkedCaseId, buildContext])

  const handleSaveAsCase = useCallback(() => {
    if (!caseType || !facts.trim()) return
    const now = new Date().toISOString()
    const title = issues
      ? `${caseType} - ${issues.substring(0, 60)}${issues.length > 60 ? '...' : ''}`
      : `Case Study - ${caseType}`
    const newCase: CaseItem = {
      id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      caseNumber: `CS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      title,
      description: facts,
      caseType: caseType.includes(' ') ? caseType.split(' ')[0] : caseType,
      subType: caseType,
      status: 'Pending',
      priority: 'Medium',
      createdAt: now,
      updatedAt: now,
    }
    addCase(newCase)
    setSelectedCaseId(newCase.id)
    setCurrentView('case-detail')
    toast.success('Case study saved as a new case!')
  }, [caseType, facts, issues, addCase, setCurrentView, setSelectedCaseId])

  return (
    <motion.div
      className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <BookMarked className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">AI Case Study</h1>
            <p className="text-sm text-muted-foreground">Deep legal analysis with strategy &amp; risk assessment</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2 self-start" onClick={handleSaveAsCase} disabled={!caseType || !facts.trim()}>
          <Save className="size-4" />
          Save as Case
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Left: Input Form */}
        <motion.div variants={itemVariants} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Case Study Parameters
              </CardTitle>
              <CardDescription className="text-xs">Provide case details for comprehensive AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Link to existing case */}
              {cases.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Link2 className="size-3" /> Link Existing Case (optional)
                  </Label>
                  <Select value={linkedCaseId} onValueChange={setLinkedCaseId}>
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select a case..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.caseNumber ? `${c.caseNumber} — ` : ''}{c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Case Type */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Case Type <span className="text-destructive">*</span></Label>
                <Select value={caseType} onValueChange={setCaseType}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select case type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {caseTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Facts */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Case Facts <span className="text-destructive">*</span></Label>
                <Textarea
                  value={facts} onChange={(e) => setFacts(e.target.value)}
                  placeholder="Describe the facts of the case in detail - what happened, when, who is involved, what evidence exists..."
                  className="min-h-[120px] text-sm"
                />
              </div>

              {/* Issues */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Key Legal Issues</Label>
                <Textarea
                  value={issues} onChange={(e) => setIssues(e.target.value)}
                  placeholder="What are the main legal questions or disputes? (e.g., ownership validity, contract breach, negligence...)"
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* Desired Outcome */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Desired Outcome</Label>
                <Textarea
                  value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)}
                  placeholder="What does the client want to achieve? (e.g., injunction, damages, specific performance...)"
                  className="min-h-[60px] text-sm"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Upload className="size-3" /> Supporting Documents
                </Label>
                <DocumentUpload module="general" maxFiles={5} compact onFilesExtracted={handleFilesExtracted} />
              </div>

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={!caseType || !facts.trim() || isAnalyzing}
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isAnalyzing ? (
                  <><Loader2 className="size-4 animate-spin" /> Analyzing Case...</>
                ) : (
                  <><Sparkles className="size-4" /> Generate Case Study</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Results */}
        <motion.div variants={itemVariants} className="space-y-4">
          {isAnalyzing ? (
            <Card>
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="relative">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 animate-pulse">
                    <BookMarked className="size-7 text-primary" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground mt-4">AI is analyzing your case...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                <Loader2 className="size-5 animate-spin text-primary mt-4" />
              </CardContent>
            </Card>
          ) : result ? (
            <div className="space-y-4">
              <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="analysis" className="text-xs gap-1"><Scale className="size-3" />Analysis</TabsTrigger>
                  <TabsTrigger value="strengths" className="text-xs gap-1"><Target className="size-3" />S&amp;W</TabsTrigger>
                  <TabsTrigger value="strategy" className="text-xs gap-1"><Lightbulb className="size-3" />Strategy</TabsTrigger>
                  <TabsTrigger value="risk" className="text-xs gap-1"><BarChart3 className="size-3" />Risk</TabsTrigger>
                  <TabsTrigger value="plan" className="text-xs gap-1"><Calendar className="size-3" />Plan</TabsTrigger>
                </TabsList>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="space-y-3 mt-3">
                  <SectionCard title="Case Analysis" icon={<Scale className="size-4 text-primary" />} accent="primary">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
                  </SectionCard>
                  {result.legalFramework.length > 0 && (
                    <SectionCard title="Legal Framework" icon={<Gavel className="size-4 text-violet-500" />} accent="violet">
                      <ul className="space-y-1.5">
                        {result.legalFramework.map((fw, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <BookMarked className="size-3 text-violet-500 shrink-0 mt-0.5" />
                            <span>{fw}</span>
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}
                  {result.caseReferences.length > 0 && (
                    <SectionCard title="Case Law References" icon={<Star className="size-4 text-amber-500" />} accent="amber">
                      <div className="space-y-2">
                        {result.caseReferences.map((ref, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-background">
                            <Briefcase className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-foreground">{ref.title}</p>
                              <p className="text-[10px] text-muted-foreground">{ref.citation} ({ref.year})</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </TabsContent>

                {/* Strengths & Weaknesses Tab */}
                <TabsContent value="strengths" className="space-y-3 mt-3">
                  <SectionCard title="Strengths" icon={<CheckCircle2 className="size-4 text-emerald-500" />} accent="emerald">
                    <ul className="space-y-1.5">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                  <SectionCard title="Weaknesses" icon={<AlertTriangle className="size-4 text-red-500" />} accent="red">
                    <ul className="space-y-1.5">
                      {result.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <AlertTriangle className="size-3 text-red-500 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                </TabsContent>

                {/* Strategy Tab */}
                <TabsContent value="strategy" className="space-y-3 mt-3">
                  <SectionCard title="Strategy Recommendations" icon={<Lightbulb className="size-4 text-primary" />} accent="primary">
                    <ul className="space-y-2">
                      {result.strategy.map((s, i) => (
                        <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background border border-border text-xs text-muted-foreground">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">{i + 1}</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                </TabsContent>

                {/* Risk Matrix Tab */}
                <TabsContent value="risk" className="space-y-3 mt-3">
                  <SectionCard title="Risk Assessment Matrix" icon={<BarChart3 className="size-4 text-amber-500" />} accent="amber">
                    <div className="space-y-2">
                      {result.riskMatrix.map((r, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-background border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-foreground">{r.risk}</p>
                            <Badge className={cn('text-[9px]', r.level === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20 border' : r.level === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 border' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 border')}>
                              {r.level}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground">Mitigation: </span>{r.mitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </TabsContent>

                {/* Action Plan Tab */}
                <TabsContent value="plan" className="space-y-3 mt-3">
                  <SectionCard title="Step-by-Step Action Plan" icon={<Calendar className="size-4 text-sky-500" />} accent="sky">
                    <div className="space-y-2">
                      {result.actionPlan.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-background border border-border">
                          <div className="flex size-6 items-center justify-center rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{a.step}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="size-2.5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">{a.timeline}</span>
                              <Badge variant="outline" className="text-[9px]">{a.priority}</Badge>
                            </div>
                          </div>
                          <ChevronRight className="size-3 text-muted-foreground mt-2" />
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                  <Button onClick={handleSaveAsCase} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <FilePlus className="size-4" /> Save as Real Case
                    <ArrowRight className="size-4" />
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <BookMarked className="size-7 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">AI Case Study</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Fill in the case details and click &ldquo;Generate Case Study&rdquo; to get a comprehensive legal analysis with strategy, risk assessment, and action plan.
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
