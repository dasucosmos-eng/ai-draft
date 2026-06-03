'use client'
import { generateBrandedPdf } from '@/lib/pdf-generator'
import { stripMarkdown } from '@/lib/ai-service'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfileStore } from '@/store/profile-store'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Copy,
  Download,
  FileDown,
  Edit3,
  FileCheck,
  FileText,
  Handshake,
  Heart,
  Home,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Printer,
  Scroll,
  SendHorizonal,
  Shield,
  ShoppingCart,
  Sparkles,
  Unlock,
  Building2,
  X,
  Zap,
  Save,
  ClipboardList,
  TriangleAlert,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LucideIcon } from 'lucide-react'

/* ─── Types ─── */

interface DocumentTypeOption {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

interface GeneratedDocument {
  title: string
  content: string
  keyPoints: string[]
  warnings: string[]
}

interface QuickDraftResult {
  title: string
  content: string
  documentType: string
}

/* ─── Document Types ─── */

const documentTypes: DocumentTypeOption[] = [
  { id: 'legal-notice', label: 'Legal Notice', icon: AlertTriangle, description: 'Formal legal notice for any dispute' },
  { id: 'affidavit', label: 'Affidavit', icon: FileCheck, description: 'Sworn declaration affidavit' },
  { id: 'petition', label: 'Petition', icon: Scroll, description: 'Court petition or application' },
  { id: 'injunction', label: 'Injunction', icon: Shield, description: 'Stay order or injunction application' },
  { id: 'agreement', label: 'Agreement', icon: Handshake, description: 'Legal agreement or contract' },
  { id: 'consumer-complaint', label: 'Consumer Complaint', icon: ShoppingCart, description: 'Consumer disputes complaint' },
  { id: 'bail-application', label: 'Bail Application', icon: Unlock, description: 'Regular or anticipatory bail' },
  { id: 'employment-contract', label: 'Employment Contract', icon: Building2, description: 'Employment or service agreement' },
  { id: 'nda', label: 'NDA', icon: Lock, description: 'Non-disclosure agreement' },
  { id: 'property-agreement', label: 'Property Agreement', icon: Home, description: 'Property sale, lease, or rent' },
  { id: 'rti-application', label: 'RTI Application', icon: Mail, description: 'Right to Information application' },
  { id: 'divorce-notice', label: 'Divorce Notice', icon: Heart, description: 'Divorce or separation notice' },
]

/* ─── Animation Variants ─── */

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
}

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

/* ─── Step labels ─── */

const stepLabels = ['Select Type', 'Provide Details', 'AI Generation', 'Preview & Edit']

/* ─── Main Component ─── */

export default function AIDraftingView() {
  const cases = useAppStore((s) => s.cases)
  const addDocument = useAppStore((s) => s.addDocument)

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedDocType, setSelectedDocType] = useState<DocumentTypeOption | null>(null)
  const [details, setDetails] = useState('')
  const [caseContext, setCaseContext] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [priority, setPriority] = useState('standard')
  const [isGenerating, setIsGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genMessage, setGenMessage] = useState('')
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Quick Draft state
  const [quickDraftInput, setQuickDraftInput] = useState('')
  const [isQuickDrafting, setIsQuickDrafting] = useState(false)
  const [quickDraftResults, setQuickDraftResults] = useState<QuickDraftResult[]>([])
  const [showQuickDraft, setShowQuickDraft] = useState(false)

  /* ─── Navigation ─── */

  const goNext = useCallback(() => setCurrentStep((s) => Math.min(s + 1, 3)), [])
  const goBack = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 0)), [])

  const goToStep = useCallback((step: number) => {
    if (step <= currentStep) setCurrentStep(step)
  }, [currentStep])

  /* ─── Generate Document ─── */

  const handleGenerate = useCallback(async () => {
    if (!selectedDocType || !details.trim()) return

    setError(null)
    setIsGenerating(true)
    setGenProgress(0)

    const messages = [
      'Analyzing requirements...',
      'Generating content...',
      'Applying legal sections...',
      'Finalizing document...',
    ]

    let msgIdx = 0
    const msgInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, messages.length - 1)
      setGenMessage(messages[msgIdx])
    }, 900)

    const progressInterval = setInterval(() => {
      setGenProgress((prev) => {
        if (prev >= 95) { clearInterval(progressInterval); return 95 }
        return prev + Math.random() * 12
      })
    }, 300)

    try {
      const response = await fetch('/api/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedDocType.label,
          details: details.trim(),
          caseContext: caseContext.trim() || undefined,
          priority,
        }),
      })

      clearInterval(msgInterval)
      clearInterval(progressInterval)
      setGenProgress(100)
      setGenMessage('Document generated successfully!')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await response.json()
      setGeneratedDoc(data.data)
      setEditContent(data.data.content)
      setTimeout(() => {
        setIsGenerating(false)
        setCurrentStep(3)
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      setIsGenerating(false)
    }
  }, [selectedDocType, details, caseContext, priority])

  /* ─── Quick Draft ─── */

  const handleQuickDraft = useCallback(async () => {
    if (!quickDraftInput.trim()) return
    setIsQuickDrafting(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'Legal Notice',
          details: quickDraftInput.trim(),
          priority: 'standard',
        }),
      })

      if (!response.ok) throw new Error('Quick draft failed')

      const data = await response.json()
      setQuickDraftResults((prev) => [
        {
          title: data.data.title,
          content: stripMarkdown(data.data.content),
          documentType: 'Legal Notice',
        },
        ...prev,
      ])
      setQuickDraftInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick draft failed.')
    } finally {
      setIsQuickDrafting(false)
    }
  }, [quickDraftInput])

  /* ─── Copy / Download / Print ─── */

  const handleCopy = useCallback(() => {
    if (!generatedDoc) return
    navigator.clipboard.writeText(generatedDoc.content)
  }, [generatedDoc])

  

  const handlePdfDownload = useCallback(() => {
    const profile = useProfileStore.getState().profile
    const doc = generatedDoc
    if (!doc?.content) return
    generateBrandedPdf({ title: doc.title || 'Legal Document', content: doc.content, profile })
  }, [generatedDoc])
const handleDownload = useCallback(() => {
    if (!generatedDoc) return
    const blob = new Blob([generatedDoc.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${generatedDoc.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [generatedDoc])

  const handlePrint = useCallback(() => {
    if (!generatedDoc) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>${generatedDoc.title}</title>
      <style>body{font-family:'Times New Roman',serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;white-space:pre-wrap;}</style>
      </head><body>${generatedDoc.content}</body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }, [generatedDoc])

  /* ─── Save to Case ─── */

  const handleSaveToCase = useCallback(() => {
    if (!generatedDoc || !selectedDocType) return
    addDocument({
      id: crypto.randomUUID(),
      name: generatedDoc.title,
      type: selectedDocType.label,
      category: 'Generated',
      content: generatedDoc.content,
      summary: generatedDoc.keyPoints.join('. '),
      createdAt: new Date().toISOString(),
    })
  }, [generatedDoc, selectedDocType, addDocument])

  /* ─── Reset ─── */

  const handleReset = useCallback(() => {
    setCurrentStep(0)
    setSelectedDocType(null)
    setDetails('')
    setCaseContext('')
    setSelectedCaseId('')
    setPriority('standard')
    setGeneratedDoc(null)
    setIsEditing(false)
    setEditContent('')
    setError(null)
  }, [])

  /* ─── RENDER ─── */

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              AI Document Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate professional legal documents in seconds
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowQuickDraft(!showQuickDraft)}
            className={cn(
              'rounded-xl h-10 transition-all duration-200',
              showQuickDraft && 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            )}
          >
            <Zap className="size-4 mr-2" />
            Quick Draft
          </Button>
        </motion.div>

        {/* ── Quick Draft Panel ── */}
        <AnimatePresence>
          {showQuickDraft && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <Card className="rounded-xl border-2 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-primary/5">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                      <Zap className="size-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Quick Draft</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Describe your legal need in plain English — AI will generate the right document(s) automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={quickDraftInput}
                        onChange={(e) => setQuickDraftInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isQuickDrafting && handleQuickDraft()}
                        placeholder='e.g., "Client says: Tenant is not paying rent for 5 months"'
                        className="h-11 rounded-xl pr-12"
                        disabled={isQuickDrafting}
                      />
                      <Button
                        size="icon"
                        onClick={handleQuickDraft}
                        disabled={!quickDraftInput.trim() || isQuickDrafting}
                        className="absolute right-1.5 top-1.5 size-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        {isQuickDrafting ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Quick draft results */}
                  {quickDraftResults.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Documents</p>
                      {quickDraftResults.map((doc, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-lg border border-border bg-card p-3 flex items-start gap-3 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                            <FileText className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.content.slice(0, 120)}...</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-xs rounded-lg h-8"
                            onClick={() => {
                              setGeneratedDoc({
                                title: doc.title,
                                content: doc.content,
                                keyPoints: ['Generated via Quick Draft'],
                                warnings: ['AI-generated draft — advocate review required before filing.'],
                              })
                              setEditContent(doc.content)
                              setSelectedDocType(documentTypes[0])
                              setCurrentStep(3)
                            }}
                          >
                            View
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {error && showQuickDraft && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 flex items-center gap-2 text-xs text-red-500"
                    >
                      <TriangleAlert className="size-3.5 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Step Indicator ── */}
        <div className="flex items-center justify-center mb-8 sm:mb-10">
          <div className="flex items-center gap-0">
            {stepLabels.map((label, idx) => (
              <div key={label} className="flex items-center">
                <button
                  onClick={() => goToStep(idx)}
                  className={cn(
                    'flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200',
                    idx <= currentStep ? 'cursor-pointer' : 'cursor-default'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 sm:size-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                      idx < currentStep && 'bg-primary text-primary-foreground',
                      idx === currentStep && 'bg-primary/15 text-primary ring-2 ring-primary/30',
                      idx > currentStep && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {idx < currentStep ? <CheckCircle2 className="size-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-medium hidden sm:inline',
                      idx <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                </button>
                {idx < stepLabels.length - 1 && (
                  <div
                    className={cn(
                      'w-6 sm:w-10 h-0.5 mx-1 rounded-full transition-colors duration-300',
                      idx < currentStep ? 'bg-primary' : 'bg-border'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Step Content ── */}
        <AnimatePresence mode="wait">
          {/* STEP 0: Select Document Type */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                Select Document Type
              </motion.h2>
              <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                Choose the type of legal document you want to generate
              </motion.p>

              <motion.div variants={staggerContainer} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {documentTypes.map((docType) => (
                  <motion.button
                    key={docType.id}
                    variants={fadeInUp}
                    custom={documentTypes.indexOf(docType) % 8}
                    onClick={() => {
                      setSelectedDocType(docType)
                      setCurrentStep(1)
                    }}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-xl p-4 sm:p-5 text-left transition-all duration-200',
                      'border border-border bg-card hover:border-primary/30 hover:bg-primary/5',
                      'group active:scale-[0.97]'
                    )}
                  >
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <docType.icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{docType.label}</span>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{docType.description}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground ml-auto mt-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* STEP 1: Provide Details */}
          {currentStep === 1 && selectedDocType && (
            <motion.div
              key="step-1"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
              className="max-w-2xl mx-auto"
            >
              <motion.div variants={fadeInUp} custom={0} className="mb-6">
                <Button variant="ghost" size="sm" onClick={goBack} className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-4 mr-1.5" /> Back
                </Button>

                <div className="flex items-center gap-3 mb-1">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <selectedDocType.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedDocType.label}</h2>
                    <p className="text-xs text-muted-foreground">{selectedDocType.description}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} custom={1} className="space-y-5">
                {/* Details textarea */}
                <div className="space-y-2">
                  <Label htmlFor="details" className="text-sm font-semibold">
                    Document Details <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={`Describe the ${selectedDocType.label.toLowerCase()} you need... Include parties, amounts, dates, and any specific requirements.`}
                    className="min-h-[140px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                  />
                </div>

                {/* Case context */}
                <div className="space-y-2">
                  <Label htmlFor="context" className="text-sm font-semibold">
                    Case Context <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="context"
                    value={caseContext}
                    onChange={(e) => setCaseContext(e.target.value)}
                    placeholder="Any additional case context, background, or previous legal actions..."
                    className="min-h-[80px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                  />
                </div>

                {/* Linked case */}
                {cases.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Link to Case <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                    <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                      <SelectTrigger className="w-full rounded-xl">
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

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Priority</Label>
                  <div className="flex gap-2">
                    {[
                      { value: 'urgent', label: 'Urgent', color: 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5' },
                      { value: 'standard', label: 'Standard', color: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5' },
                      { value: 'low', label: 'Low', color: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' },
                    ].map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPriority(p.value)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all duration-150',
                          priority === p.value ? p.color : 'border-border text-muted-foreground hover:border-border/80'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <Button
                  onClick={() => {
                    setCurrentStep(2)
                    handleGenerate()
                  }}
                  disabled={details.trim().length < 10}
                  className={cn(
                    'w-full h-12 text-sm font-semibold rounded-xl mt-4',
                    'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                    'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                    'transition-all duration-200 active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                  )}
                >
                  <Sparkles className="size-4 mr-2" />
                  Generate Document
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: AI Generation (loading) */}
          {currentStep === 2 && isGenerating && (
            <motion.div
              key="step-2"
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center justify-center min-h-[50vh]"
            >
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              >
                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                  <Brain className="size-8 text-primary" />
                </div>
                <motion.div
                  className="absolute -inset-2 rounded-2xl border-2 border-dashed border-primary/20"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-bold text-foreground mt-8"
              >
                AI is drafting your document...
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 w-full max-w-xs space-y-3"
              >
                <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full"
                    animate={{ width: `${genProgress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  {genMessage}
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 3: Preview & Edit */}
          {currentStep === 3 && generatedDoc && (
            <motion.div
              key="step-3"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
            >
              {/* Header */}
              <motion.div variants={fadeInUp} custom={0} className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{generatedDoc.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generated by AI — Review and edit before filing
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="rounded-lg">
                  <ArrowLeft className="size-3.5 mr-1.5" /> New Document
                </Button>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* ── Document Preview ── */}
                <motion.div variants={fadeInUp} custom={1}>
                  <Card className="rounded-xl border-2 border-border overflow-hidden">
                    {/* Document toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditing(!isEditing)
                            setEditContent(generatedDoc.content)
                          }}
                          className="h-8 rounded-lg text-xs"
                        >
                          <Pencil className="size-3.5 mr-1.5" />
                          {isEditing ? 'Preview' : 'Edit'}
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handleCopy} className="size-8" title="Copy">
                          <Copy className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handlePdfDownload} className="size-8" title="Download PDF">
                          <FileDown className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDownload} className="size-8" title="Download">
                          <Download className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handlePrint} className="size-8" title="Print">
                          <Printer className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-0">
                      {isEditing ? (
                        <Textarea
                          value={editContent}
                          onChange={(e) => {
                            setEditContent(e.target.value)
                            setGeneratedDoc((prev) => prev ? { ...prev, content: e.target.value } : null)
                          }}
                          className="min-h-[500px] border-0 rounded-none resize-y text-sm font-mono leading-relaxed p-6"
                        />
                      ) : (
                        <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-muted/30 dark:from-card dark:to-card min-h-[500px]">
                          <div className="max-w-none">
                            {generatedDoc.content?.split('\n').map((line, idx) => (
                              <p
                                key={idx}
                                className={cn(
                                  'text-sm leading-relaxed text-foreground/90',
                                  line.trim() === '' && 'h-4',
                                  line.startsWith('[') && 'font-semibold text-foreground',
                                  idx === 0 && 'text-lg font-bold text-foreground mb-4'
                                )}
                              >
                                {line || '\u00A0'}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* ── Side Panel ── */}
                <motion.div variants={slideInRight} className="space-y-4">
                  {/* Document Metadata */}
                  <Card className="rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardList className="size-4 text-primary" />
                        Document Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedDocType?.label || 'Legal Document'}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Priority</span>
                        <Badge variant="outline" className="text-xs capitalize">{priority}</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Words</span>
                        <span className="text-xs font-medium text-foreground">
                          {generatedDoc.content.split(/\s+/).filter(Boolean).length}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Generated</span>
                        <span className="text-xs font-medium text-foreground">
                          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Points */}
                  <Card className="rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        Key Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {generatedDoc.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                            <ChevronRight className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Warnings */}
                  <Card className="rounded-xl border border-red-500/20 bg-red-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                        <TriangleAlert className="size-4" />
                        Warnings & Caveats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Always-shown disclaimer */}
                      <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                          AI-generated draft. Advocate review required before filing.
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {generatedDoc.warnings.map((warning, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-red-600/80 dark:text-red-300/80">
                            <ChevronRight className="size-3.5 mt-0.5 shrink-0" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Save to Case */}
                  <Button
                    onClick={handleSaveToCase}
                    className={cn(
                      'w-full h-11 text-sm font-semibold rounded-xl',
                      'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                      'text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30',
                      'transition-all duration-200 active:scale-[0.98]'
                    )}
                  >
                    <Save className="size-4 mr-2" />
                    Save to Case
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Generation error (non quick-draft) */}
          {currentStep === 2 && !isGenerating && error && (
            <motion.div
              key="gen-error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[40vh]"
            >
              <div className="flex size-14 items-center justify-center rounded-xl bg-red-500/10 mb-4">
                <TriangleAlert className="size-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Generation Failed</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">{error}</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={goBack} className="rounded-xl">
                  <ArrowLeft className="size-4 mr-2" /> Go Back
                </Button>
                <Button onClick={() => { setError(null); handleGenerate() }} className="rounded-xl">
                  <Sparkles className="size-4 mr-2" /> Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
