'use client'
import { stripMarkdown } from '@/lib/ai-service'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type ExecutionMatter, type ExecutionAsset, type ExecutionDraftDocument } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Brain,
  Building,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileDown,
  Upload,
  Edit3,
  FileText,
  Gavel,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Save,
  Shield,
  Trash2,
  User,
  Badge as BadgeIcon,
  ChevronRight,
  Sparkles,
  TriangleAlert,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import type { LucideIcon } from 'lucide-react'
import { DocumentUpload, type UploadedFile } from '@/components/shared/document-upload'
import { useProfileStore } from '@/store/profile-store'
import { generateBrandedPdf } from '@/lib/pdf-generator'

/* ─── Constants ─── */

const EXECUTION_API = 'https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiExecution'

const DECREE_TYPES = [
  { value: 'money_decree', label: 'Money Decree' },
  { value: 'specific_performance', label: 'Specific Performance' },
  { value: 'injunction', label: 'Injunction' },
  { value: 'possession', label: 'Possession' },
  { value: 'mandatory_injunction', label: 'Mandatory Injunction' },
  { value: 'other', label: 'Other' },
]

const EXECUTION_MODES = [
  { value: 'attach_property', label: 'Attach Property', icon: Building, description: 'Attachment of immovable or movable property' },
  { value: 'attach_salary', label: 'Attach Salary', icon: Banknote, description: 'Garnishment of salary or wages' },
  { value: 'civil_arrest', label: 'Civil Arrest', icon: Shield, description: 'Civil arrest of judgment debtor' },
  { value: 'garnishee_order', label: 'Garnishee Order', icon: Landmark, description: 'Order against third party holding debtor funds' },
]

const ASSET_TYPES = [
  { value: 'IMMOVABLE', label: 'Immovable Property' },
  { value: 'MOVABLE', label: 'Movable Property' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'BANK', label: 'Bank Account' },
  { value: 'GARNISHEE', label: 'Garnishee' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
  PENDING: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' },
  ALLOWED: { label: 'Allowed', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' },
  DISMISSED: { label: 'Dismissed', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
  PARTLY_SATISFIED: { label: 'Partly Satisfied', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
  FULLY_SATISFIED: { label: 'Fully Satisfied', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
}

const MODE_BADGE_COLORS: Record<string, string> = {
  attach_property: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700',
  attach_salary: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  civil_arrest: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700',
  garnishee_order: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-700',
}

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

/* ─── Wizard Step Labels ─── */

const wizardStepLabels = ['Decree Details', 'Execution Details', 'Asset Details', 'Documents']

/* ─── Local Types ─── */

interface DecreeForm {
  caseNumber: string
  courtName: string
  plaintiffName: string
  defendantName: string
  decreeDate: string
  decreeType: string
  decreeAmount: string
  interestRate: string
  interestFrom: string
  interestTo: string
  costs: string
}

interface ExecutionForm {
  amountPaid: string
  pendingAmount: string
  executionCourt: string
  condonationReason: string
  includeInterest: boolean
}

interface GeneratedDoc {
  id: string
  docType: ExecutionDraftDocument['docType']
  title: string
  content: string
  keyPoints: string[]
  warnings: string[]
}

/* ─── Helper: Calculate limitation days ─── */

function calcLimitationDays(decreeDate: string, decreeType: string): { days: number; lastDate: string; urgent: boolean } {
  if (!decreeDate) return { days: 0, lastDate: '', urgent: false }

  const dDate = new Date(decreeDate)
  const now = new Date()
  // Generally 12 years for money decree, 3 years for others under CPC
  const yearsLimit = decreeType === 'money_decree' ? 12 : 3
  const lastDate = new Date(dDate)
  lastDate.setFullYear(lastDate.getFullYear() + yearsLimit)

  const diffMs = lastDate.getTime() - now.getTime()
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  return {
    days,
    lastDate: lastDate.toISOString().split('T')[0],
    urgent: days > 0 && days < 180,
  }
}

/* ─── Helper: Format currency ─── */

function formatCurrency(val: string): string {
  const num = parseFloat(val)
  if (isNaN(num)) return val
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num)
}

/* ─── Main Component ─── */

export default function ExecutionView() {
  // Store
  const cases = useAppStore((s) => s.cases)
  const executionMatters = useAppStore((s) => s.executionMatters)
  const addExecutionMatter = useAppStore((s) => s.addExecutionMatter)
  const updateExecutionMatter = useAppStore((s) => s.updateExecutionMatter)
  const profile = useProfileStore((s) => s.profile)

  // Top-level screen
  const [screen, setScreen] = useState<'list' | 'wizard' | 'preview'>('list')

  // Wizard step
  const [wizardStep, setWizardStep] = useState(0)

  // Decree form
  const [decree, setDecree] = useState<DecreeForm>({
    caseNumber: '',
    courtName: '',
    plaintiffName: '',
    defendantName: '',
    decreeDate: '',
    decreeType: '',
    decreeAmount: '',
    interestRate: '',
    interestFrom: '',
    interestTo: '',
    costs: '',
  })

  // Decree text for AI parsing
  const [decreeText, setDecreeText] = useState('')
  const [isParsing, setIsParsing] = useState(false)

  // Execution modes
  const [selectedModes, setSelectedModes] = useState<string[]>([])

  // Limitation result
  const [limitationResult, setLimitationResult] = useState<{ days: number; lastDate: string; urgent: boolean } | null>(null)
  const [isCalculatingLimitation, setIsCalculatingLimitation] = useState(false)

  // Execution form (step 2)
  const [execForm, setExecForm] = useState<ExecutionForm>({
    amountPaid: '',
    pendingAmount: '',
    executionCourt: '',
    condonationReason: '',
    includeInterest: true,
  })

  // Assets (step 3)
  const [assets, setAssets] = useState<ExecutionAsset[]>([])
  const [newAsset, setNewAsset] = useState<Partial<ExecutionAsset>>({
    type: 'IMMOVABLE',
    description: '',
    valueEstimate: '',
    address: '',
    employerName: '',
    bankName: '',
    accountNumber: '',
  })

  // Generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genMessage, setGenMessage] = useState('')
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([])
  const [error, setError] = useState<string | null>(null)

  // Preview state
  const [activeTab, setActiveTab] = useState<string>('EP')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  // Linked case id for pre-fill
  const [selectedCaseId, setSelectedCaseId] = useState('')

  // Current matter being edited (for "Generate More Documents")
  const [currentMatterId, setCurrentMatterId] = useState<string | null>(null)

  /* ─── Computed ─── */

  const hasAttachmentModes = useMemo(
    () => selectedModes.some((m) => m !== 'civil_arrest'),
    [selectedModes]
  )

  const limitationInfo = useMemo(
    () => calcLimitationDays(decree.decreeDate, decree.decreeType),
    [decree.decreeDate, decree.decreeType]
  )

  const activeDoc = useMemo(
    () => generatedDocs.find((d) => d.docType === activeTab),
    [generatedDocs, activeTab]
  )

  /* ─── Navigation ─── */

  const goNext = useCallback(() => setWizardStep((s) => Math.min(s + 1, 3)), [])
  const goBack = useCallback(() => {
    if (wizardStep > 0) setWizardStep((s) => s - 1)
  }, [wizardStep])

  const goToStep = useCallback(
    (step: number) => {
      if (step <= wizardStep) setWizardStep(step)
    },
    [wizardStep]
  )

  const startNewExecution = useCallback(() => {
    setScreen('wizard')
    setWizardStep(0)
    setDecree({
      caseNumber: '',
      courtName: '',
      plaintiffName: '',
      defendantName: '',
      decreeDate: '',
      decreeType: '',
      decreeAmount: '',
      interestRate: '',
      interestFrom: '',
      interestTo: '',
      costs: '',
    })
    setDecreeText('')
    setSelectedModes([])
    setLimitationResult(null)
    setExecForm({
      amountPaid: '',
      pendingAmount: '',
      executionCourt: '',
      condonationReason: '',
      includeInterest: true,
    })
    setAssets([])
    setNewAsset({
      type: 'IMMOVABLE',
      description: '',
      valueEstimate: '',
      address: '',
      employerName: '',
      bankName: '',
      accountNumber: '',
    })
    setGeneratedDocs([])
    setError(null)
    setIsEditing(false)
    setEditContent('')
    setCurrentMatterId(null)
    setSelectedCaseId('')
  }, [])

  /* ─── Parse Decree with AI ─── */

  const handleParseDecree = useCallback(async () => {
    if (!decreeText.trim()) return
    setIsParsing(true)
    setError(null)

    try {
      const response = await fetch(EXECUTION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'parseDecree', decreeText: decreeText.trim() }),
      })

      if (!response.ok) throw new Error('Failed to parse decree')

      const data = await response.json()
      if (data.data) {
        setDecree((prev) => ({
          ...prev,
          caseNumber: data.data.caseNumber || prev.caseNumber,
          courtName: data.data.courtName || prev.courtName,
          plaintiffName: data.data.plaintiffName || prev.plaintiffName,
          defendantName: data.data.defendantName || prev.defendantName,
          decreeDate: data.data.decreeDate || prev.decreeDate,
          decreeType: data.data.decreeType || prev.decreeType,
          decreeAmount: data.data.decreeAmount || prev.decreeAmount,
          interestRate: data.data.interestRate || prev.interestRate,
          costs: data.data.costs || prev.costs,
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decree parsing failed.')
    } finally {
      setIsParsing(false)
    }
  }, [decreeText])

  /* ─── Calculate Limitation ─── */

  const handleCalculateLimitation = useCallback(() => {
    if (!decree.decreeDate || !decree.decreeType) return
    setIsCalculatingLimitation(true)
    // Simulate brief API call
    setTimeout(() => {
      const result = calcLimitationDays(decree.decreeDate, decree.decreeType)
      setLimitationResult(result)
      setIsCalculatingLimitation(false)
    }, 1200)
  }, [decree.decreeDate, decree.decreeType])

  /* ─── Case Pre-fill ─── */

  const handleCaseSelect = useCallback(
    (caseId: string) => {
      setSelectedCaseId(caseId)
      if (!caseId) return
      const c = cases.find((item) => item.id === caseId)
      if (c) {
        setDecree((prev) => ({
          ...prev,
          caseNumber: c.caseNumber || prev.caseNumber,
          courtName: c.courtName || prev.courtName,
          plaintiffName: c.clientName || prev.plaintiffName,
        }))
      }
    },
    [cases]
  )

  /* ─── Mode Toggle ─── */

  const toggleMode = useCallback((mode: string) => {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    )
  }, [])

  /* ─── Asset Management ─── */

  const addAsset = useCallback(() => {
    if (!newAsset.description?.trim()) return
    const asset: ExecutionAsset = {
      id: crypto.randomUUID(),
      type: newAsset.type as ExecutionAsset['type'],
      description: newAsset.description.trim(),
      valueEstimate: newAsset.valueEstimate || undefined,
      address: newAsset.address || undefined,
      employerName: newAsset.employerName || undefined,
      bankName: newAsset.bankName || undefined,
      accountNumber: newAsset.accountNumber || undefined,
    }
    setAssets((prev) => [...prev, asset])
    setNewAsset({
      type: 'IMMOVABLE',
      description: '',
      valueEstimate: '',
      address: '',
      employerName: '',
      bankName: '',
      accountNumber: '',
    })
  }, [newAsset])

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }, [])

  /* ─── Generate Documents ─── */

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setGenProgress(0)
    setError(null)

    const messages = [
      'Analyzing decree...',
      'Generating Execution Petition...',
      'Drafting applications...',
      'Preparing schedules...',
    ]

    let msgIdx = 0
    const msgInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, messages.length - 1)
      setGenMessage(messages[msgIdx])
    }, 1100)

    const progressInterval = setInterval(() => {
      setGenProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + Math.random() * 10
      })
    }, 350)

    try {
      const docs: GeneratedDoc[] = []

      // 1. Generate EP
      const epPayload = {
        task: 'generateEP',
        decree: {
          caseNumber: decree.caseNumber,
          courtName: decree.courtName,
          plaintiffName: decree.plaintiffName,
          defendantName: decree.defendantName,
          decreeDate: decree.decreeDate,
          decreeType: decree.decreeType,
          decreeAmount: decree.decreeAmount,
          interestRate: decree.interestRate || undefined,
          interestFrom: decree.interestFrom || undefined,
          interestTo: decree.interestTo || undefined,
          costs: decree.costs || undefined,
        },
        execution: {
          amountPaid: execForm.amountPaid,
          pendingAmount: execForm.pendingAmount || decree.decreeAmount,
          executionCourt: execForm.executionCourt || undefined,
          condonationReason: execForm.condonationReason || undefined,
          includeInterest: execForm.includeInterest,
        },
        modes: selectedModes,
        assets,
      }

      try {
        const epResp = await fetch(EXECUTION_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(epPayload),
        })

        if (epResp.ok) {
          const epData = await epResp.json()
          if (epData.data) {
            docs.push({
              id: crypto.randomUUID(),
              docType: 'EP',
              title: epData.data.title || 'Execution Petition',
              content: stripMarkdown(String(epData.data.content || epData.data || '')),
              keyPoints: epData.data.keyPoints || [],
              warnings: epData.data.warnings || [],
            })
          }
        }
      } catch {
        // API failure — generate fallback content
      }

      // Ensure EP always exists
      if (!docs.find((d) => d.docType === 'EP')) {
        docs.push({
          id: crypto.randomUUID(),
          docType: 'EP',
          title: `Execution Petition — ${decree.caseNumber || 'EC'}`,
          content: buildFallbackEP(),
          keyPoints: ['Decree holder identified', 'Modes of execution selected'],
          warnings: ['AI-generated draft. Advocate review required.'],
        })
      }

      // 2. Generate EAs for each mode
      for (const mode of selectedModes) {
        const eaPayload = {
          task: 'generateEA',
          ...epPayload,
          mode,
        }
        try {
          const eaResp = await fetch(EXECUTION_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eaPayload),
          })
          if (eaResp.ok) {
            const eaData = await eaResp.json()
            if (eaData.data) {
              docs.push({
                id: crypto.randomUUID(),
                docType: 'EA',
                title: eaData.data.title || `Execution Application — ${mode}`,
                content: stripMarkdown(String(eaData.data.content || eaData.data || '')),
                keyPoints: eaData.data.keyPoints || [],
                warnings: eaData.data.warnings || [],
              })
            }
          }
        } catch {
          // Fallback
        }
      }

      // Ensure at least one EA if modes selected
      if (selectedModes.length > 0 && !docs.some((d) => d.docType === 'EA')) {
        docs.push({
          id: crypto.randomUUID(),
          docType: 'EA',
          title: `Execution Application — ${selectedModes[0]}`,
          content: buildFallbackEA(selectedModes[0]),
          keyPoints: ['Supporting application drafted'],
          warnings: ['AI-generated draft. Advocate review required.'],
        })
      }

      // 3. Generate schedule if assets exist
      if (assets.length > 0) {
        try {
          const schedResp = await fetch(EXECUTION_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: 'generateSchedule', ...epPayload, assets }),
          })
          if (schedResp.ok) {
            const schedData = await schedResp.json()
            if (schedData.data) {
              docs.push({
                id: crypto.randomUUID(),
                docType: 'SCHEDULE',
                title: schedData.data.title || 'Schedule of Properties',
                content: stripMarkdown(String(schedData.data.content || schedData.data || '')),
                keyPoints: schedData.data.keyPoints || [],
                warnings: schedData.data.warnings || [],
              })
            }
          }
        } catch {
          // Fallback
        }

        if (!docs.find((d) => d.docType === 'SCHEDULE')) {
          docs.push({
            id: crypto.randomUUID(),
            docType: 'SCHEDULE',
            title: 'Schedule of Attached Properties',
            content: buildFallbackSchedule(assets),
            keyPoints: [`${assets.length} asset(s) listed`],
            warnings: ['Verify property details before filing.'],
          })
        }

        // Memo
        if (!docs.find((d) => d.docType === 'MEMO')) {
          docs.push({
            id: crypto.randomUUID(),
            docType: 'MEMO',
            title: 'Memo of Calculation',
            content: buildFallbackMemo(decree, execForm),
            keyPoints: ['Amount calculated with interest'],
            warnings: ['Verify calculations independently.'],
          })
        }
      }

      clearInterval(msgInterval)
      clearInterval(progressInterval)
      setGenProgress(100)
      setGenMessage('Documents generated successfully!')

      setGeneratedDocs(docs)
      if (docs.length > 0) {
        setEditContent(docs[0].content)
        setActiveTab(docs[0].docType)
      }

      setTimeout(() => {
        setIsGenerating(false)
        setScreen('preview')
      }, 800)
    } catch (err) {
      clearInterval(msgInterval)
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      setIsGenerating(false)
    }
  }, [decree, execForm, selectedModes, assets])

  /* ─── Save Execution Matter ─── */

  const handleSaveMatter = useCallback(() => {
    const now = new Date().toISOString()
    const matter: ExecutionMatter = {
      id: currentMatterId || crypto.randomUUID(),
      caseId: selectedCaseId || undefined,
      decreeDate: decree.decreeDate,
      decreeType: decree.decreeType,
      decreeAmount: decree.decreeAmount,
      interestRate: decree.interestRate || undefined,
      interestFrom: decree.interestFrom || undefined,
      interestTo: decree.interestTo || undefined,
      costs: decree.costs || undefined,
      courtName: decree.courtName,
      parties: {
        plaintiff: decree.plaintiffName,
        defendant: decree.defendantName,
      },
      modes: selectedModes,
      limitationLastDate: limitationResult?.lastDate || limitationInfo.lastDate,
      status: 'DRAFT',
      amountPaid: execForm.amountPaid || undefined,
      pendingAmount: execForm.pendingAmount || undefined,
      executionCourt: execForm.executionCourt || undefined,
      condonationReason: execForm.condonationReason || undefined,
      assets,
      documents: generatedDocs.map((d) => ({
        id: d.id,
        docType: d.docType,
        title: d.title,
        content: d.content,
        keyPoints: d.keyPoints,
        warnings: d.warnings,
        version: 1,
        createdAt: now,
      })),
      createdAt: currentMatterId ? (executionMatters.find((m) => m.id === currentMatterId)?.createdAt || now) : now,
      updatedAt: now,
    }

    if (currentMatterId) {
      updateExecutionMatter(currentMatterId, matter)
    } else {
      addExecutionMatter(matter)
      setCurrentMatterId(matter.id)
    }
  }, [
    currentMatterId,
    selectedCaseId,
    decree,
    selectedModes,
    limitationResult,
    limitationInfo,
    execForm,
    assets,
    generatedDocs,
    addExecutionMatter,
    updateExecutionMatter,
    executionMatters,
  ])

  /* ─── Copy / Download / Print ─── */

  const handleCopy = useCallback(() => {
    if (!activeDoc) return
    navigator.clipboard.writeText(activeDoc.content)
  }, [activeDoc])

  const handleDownload = useCallback(() => {
    if (!activeDoc) return
    generateBrandedPdf({
      title: activeDoc.title,
      content: activeDoc.content,
      profile,
    })
  }, [activeDoc, profile])

  // AI data extraction from uploaded documents
  const handleAiDataExtracted = useCallback((data: Record<string, unknown>, _file: UploadedFile) => {
    const fields = data as Record<string, string>
    if (fields.caseNumber) setDecree((prev) => ({ ...prev, caseNumber: fields.caseNumber || prev.caseNumber }))
    if (fields.courtName) setDecree((prev) => ({ ...prev, courtName: fields.courtName || prev.courtName }))
    if (fields.plaintiffName) setDecree((prev) => ({ ...prev, plaintiffName: fields.plaintiffName || prev.plaintiffName }))
    if (fields.defendantName) setDecree((prev) => ({ ...prev, defendantName: fields.defendantName || prev.defendantName }))
    if (fields.decreeDate) setDecree((prev) => ({ ...prev, decreeDate: fields.decreeDate || prev.decreeDate }))
    if (fields.decreeType) setDecree((prev) => ({ ...prev, decreeType: fields.decreeType || prev.decreeType }))
    if (fields.decreeAmount) setDecree((prev) => ({ ...prev, decreeAmount: fields.decreeAmount || prev.decreeAmount }))
    if (fields.interestRate) setDecree((prev) => ({ ...prev, interestRate: fields.interestRate || prev.interestRate }))
    if (fields.costs) setDecree((prev) => ({ ...prev, costs: fields.costs || prev.costs }))
  }, [])

  const handlePrint = useCallback(() => {
    if (!activeDoc) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>${activeDoc.title}</title>
      <style>body{font-family:'Times New Roman',serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;white-space:pre-wrap;}</style>
      </head><body>${activeDoc.content}</body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }, [activeDoc])

  /* ─── RENDER ─── */

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Matter List                           */}
          {/* ════════════════════════════════════════════ */}
          {screen === 'list' && (
            <motion.div
              key="screen-list"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
            >
              {/* Header */}
              <motion.div
                variants={fadeInUp}
                custom={0}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
              >
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                      <Gavel className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    Execution Module
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
                    Generate EP, EA, Civil Arrest, Attachments
                  </p>
                </div>
              </motion.div>

              {/* New Execution Card */}
              <motion.div variants={fadeInUp} custom={1} className="mb-6">
                <motion.button
                  onClick={startNewExecution}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'w-full flex items-center gap-4 p-5 sm:p-6 rounded-xl text-left transition-all duration-200',
                    'border-2 border-dashed border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5',
                    'hover:border-amber-500/50 hover:from-amber-500/10 hover:to-orange-500/10',
                    'group'
                  )}
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow">
                    <Plus className="size-6 text-white" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">New Execution</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Start a new execution petition with AI-powered drafting
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              </motion.div>

              {/* Matter List */}
              {executionMatters.length > 0 ? (
                <motion.div variants={fadeInUp} custom={2} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {executionMatters.map((matter, idx) => {
                    const statusCfg = STATUS_CONFIG[matter.status] || STATUS_CONFIG.DRAFT
                    const limitDays = calcLimitationDays(matter.decreeDate, matter.decreeType)

                    return (
                      <motion.div
                        key={matter.id}
                        variants={fadeInUp}
                        custom={idx % 6}
                        whileHover={{ y: -2 }}
                        className={cn(
                          'flex flex-col rounded-xl p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer',
                          'border border-border bg-card hover:border-primary/30 hover:shadow-md',
                          'group'
                        )}
                        onClick={() => {
                          setCurrentMatterId(matter.id)
                          setDecree({
                            caseNumber: matter.caseId ? (cases.find((c) => c.id === matter.caseId)?.caseNumber || '') : '',
                            courtName: matter.courtName,
                            plaintiffName: matter.parties.plaintiff,
                            defendantName: matter.parties.defendant,
                            decreeDate: matter.decreeDate,
                            decreeType: matter.decreeType,
                            decreeAmount: matter.decreeAmount,
                            interestRate: matter.interestRate || '',
                            interestFrom: matter.interestFrom || '',
                            interestTo: matter.interestTo || '',
                            costs: matter.costs || '',
                          })
                          setSelectedModes(matter.modes)
                          setExecForm({
                            amountPaid: matter.amountPaid || '',
                            pendingAmount: matter.pendingAmount || '',
                            executionCourt: matter.executionCourt || '',
                            condonationReason: matter.condonationReason || '',
                            includeInterest: true,
                          })
                          setAssets(matter.assets)
                          setGeneratedDocs(
                            matter.documents.map((d) => ({
                              id: d.id,
                              docType: d.docType,
                              title: d.title,
                              content: d.content,
                              keyPoints: d.keyPoints || [],
                              warnings: d.warnings || [],
                            }))
                          )
                          setSelectedCaseId(matter.caseId || '')
                          setScreen(matter.documents.length > 0 ? 'preview' : 'wizard')
                          setWizardStep(matter.documents.length > 0 ? 0 : 0)
                        }}
                      >
                        {/* Top row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                              <Gavel className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {matter.parties.plaintiff} v. {matter.parties.defendant}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{matter.courtName}</p>
                            </div>
                          </div>
                          <Badge className={cn('text-[10px] px-2 py-0.5 rounded-md border', statusCfg.bgColor, statusCfg.color)}>
                            {statusCfg.label}
                          </Badge>
                        </div>

                        {/* Decree info */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Decree Type</span>
                            <span className="text-xs font-medium text-foreground capitalize">
                              {matter.decreeType.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Amount</span>
                            <span className="text-xs font-medium text-foreground">{formatCurrency(matter.decreeAmount)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Decree Date</span>
                            <span className="text-xs font-medium text-foreground">{matter.decreeDate}</span>
                          </div>
                        </div>

                        {/* Modes */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {matter.modes.map((mode) => (
                            <Badge
                              key={mode}
                              className={cn('text-[10px] px-2 py-0.5 rounded-md border', MODE_BADGE_COLORS[mode] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 border-gray-200')}
                            >
                              {mode.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>

                        {/* Limitation countdown */}
                        <div className="mt-auto pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <Clock className={cn('size-3.5', limitDays.urgent ? 'text-red-500' : 'text-muted-foreground')} />
                            <span className={cn('text-xs font-medium', limitDays.urgent ? 'text-red-500' : 'text-muted-foreground')}>
                              {limitDays.days > 0
                                ? `${Math.floor(limitDays.days / 365)}y ${Math.floor((limitDays.days % 365) / 30)}m remaining`
                                : 'Limitation expired'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div
                  variants={fadeInUp}
                  custom={2}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
                    <Gavel className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">No Execution Matters</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Create your first execution petition. The AI will help you draft EPs, EAs, and related applications.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Wizard                               */}
          {/* ════════════════════════════════════════════ */}
          {screen === 'wizard' && !isGenerating && (
            <motion.div
              key="screen-wizard"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
            >
              {/* Header */}
              <motion.div
                variants={fadeInUp}
                custom={0}
                className="flex items-center gap-3 mb-6"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreen('list')}
                  className="-ml-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4 mr-1.5" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                    <Gavel className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h1 className="text-lg font-bold text-foreground">Start Execution</h1>
                </div>
              </motion.div>

              {/* Step Indicator */}
              <motion.div variants={fadeInUp} custom={1} className="flex items-center justify-center mb-8 sm:mb-10">
                <div className="flex items-center gap-0">
                  {wizardStepLabels.map((label, idx) => (
                    <div key={label} className="flex items-center">
                      <button
                        onClick={() => goToStep(idx)}
                        className={cn(
                          'flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200',
                          idx <= wizardStep ? 'cursor-pointer' : 'cursor-default'
                        )}
                      >
                        <div
                          className={cn(
                            'flex size-7 sm:size-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                            idx < wizardStep && 'bg-primary text-primary-foreground',
                            idx === wizardStep && 'bg-primary/15 text-primary ring-2 ring-primary/30',
                            idx > wizardStep && 'bg-muted text-muted-foreground'
                          )}
                        >
                          {idx < wizardStep ? <CheckCircle2 className="size-4" /> : idx + 1}
                        </div>
                        <span
                          className={cn(
                            'text-xs sm:text-sm font-medium hidden sm:inline',
                            idx <= wizardStep ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {label}
                        </span>
                      </button>
                      {idx < wizardStepLabels.length - 1 && (
                        <div
                          className={cn(
                            'w-6 sm:w-10 h-0.5 mx-1 rounded-full transition-colors duration-300',
                            idx < wizardStep ? 'bg-primary' : 'bg-border'
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              <AnimatePresence mode="wait">
                {/* ──── STEP 0: Decree Details ──── */}
                {wizardStep === 0 && (
                  <motion.div
                    key="wiz-step-0"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={staggerContainer}
                    className="max-w-2xl mx-auto"
                  >
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Decree Details
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Enter the decree information or paste the decree text for AI parsing
                    </motion.p>

                    <motion.div variants={fadeInUp} custom={2} className="space-y-5">
                      {/* Case Selection */}
                      {cases.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            Link to Case <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <Select value={selectedCaseId} onValueChange={handleCaseSelect}>
                            <SelectTrigger className="w-full rounded-xl">
                              <SelectValue placeholder="Select a case to pre-fill..." />
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

                      {/* Upload Decree / Judgment Copy */}
                      <motion.div variants={fadeInUp} custom={4} className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Upload className="size-4" />
                          Upload Decree / Judgment Copy
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Upload the decree PDF, DOCX, or image — AI will extract decree details and auto-fill the form
                        </p>
                        <DocumentUpload
                          module="execution"
                          maxFiles={5}
                          compact
                          onAiDataExtracted={handleAiDataExtracted}
                        />
                      </motion.div>

                      {/* Decree Text Upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Decree Text</Label>
                        <Textarea
                          value={decreeText}
                          onChange={(e) => setDecreeText(e.target.value)}
                          placeholder="Paste the decree text or judgment extract here for AI to auto-fill the fields below..."
                          className="min-h-[100px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                        <Button
                          onClick={handleParseDecree}
                          disabled={!decreeText.trim() || isParsing}
                          variant="outline"
                          className="rounded-xl text-xs h-9"
                        >
                          {isParsing ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
                          Parse Decree with AI
                        </Button>
                      </div>

                      <Separator />

                      {/* Decree Form Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="caseNumber" className="text-xs font-semibold">Case Number</Label>
                          <Input
                            id="caseNumber"
                            value={decree.caseNumber}
                            onChange={(e) => setDecree((p) => ({ ...p, caseNumber: e.target.value }))}
                            placeholder="e.g., O.S. No. 123/2023"
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="courtName" className="text-xs font-semibold">Court Name</Label>
                          <Input
                            id="courtName"
                            value={decree.courtName}
                            onChange={(e) => setDecree((p) => ({ ...p, courtName: e.target.value }))}
                            placeholder="e.g., Principal District Court, Chennai"
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plaintiffName" className="text-xs font-semibold">Plaintiff Name</Label>
                          <Input
                            id="plaintiffName"
                            value={decree.plaintiffName}
                            onChange={(e) => setDecree((p) => ({ ...p, plaintiffName: e.target.value }))}
                            placeholder="Decree holder name"
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="defendantName" className="text-xs font-semibold">Defendant Name</Label>
                          <Input
                            id="defendantName"
                            value={decree.defendantName}
                            onChange={(e) => setDecree((p) => ({ ...p, defendantName: e.target.value }))}
                            placeholder="Judgment debtor name"
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="decreeDate" className="text-xs font-semibold">Decree Date <span className="text-destructive">*</span></Label>
                          <Input
                            id="decreeDate"
                            type="date"
                            value={decree.decreeDate}
                            onChange={(e) => setDecree((p) => ({ ...p, decreeDate: e.target.value }))}
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Decree Type <span className="text-destructive">*</span></Label>
                          <Select value={decree.decreeType} onValueChange={(v) => setDecree((p) => ({ ...p, decreeType: v }))}>
                            <SelectTrigger className="w-full h-10 rounded-xl">
                              <SelectValue placeholder="Select decree type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {DECREE_TYPES.map((dt) => (
                                <SelectItem key={dt.value} value={dt.value}>
                                  {dt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="decreeAmount" className="text-xs font-semibold">Decree Amount</Label>
                          <Input
                            id="decreeAmount"
                            type="number"
                            value={decree.decreeAmount}
                            onChange={(e) => setDecree((p) => ({ ...p, decreeAmount: e.target.value }))}
                            placeholder="e.g., 500000"
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interestRate" className="text-xs font-semibold">Interest Rate % <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                          <Input
                            id="interestRate"
                            type="number"
                            value={decree.interestRate}
                            onChange={(e) => setDecree((p) => ({ ...p, interestRate: e.target.value }))}
                            placeholder="e.g., 6"
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interestFrom" className="text-xs font-semibold">Interest From <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                          <Input
                            id="interestFrom"
                            type="date"
                            value={decree.interestFrom}
                            onChange={(e) => setDecree((p) => ({ ...p, interestFrom: e.target.value }))}
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interestTo" className="text-xs font-semibold">Interest To <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                          <Input
                            id="interestTo"
                            type="date"
                            value={decree.interestTo}
                            onChange={(e) => setDecree((p) => ({ ...p, interestTo: e.target.value }))}
                            className="h-10 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="costs" className="text-xs font-semibold">Costs <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                        <Input
                          id="costs"
                          value={decree.costs}
                          onChange={(e) => setDecree((p) => ({ ...p, costs: e.target.value }))}
                          placeholder="Litigation costs awarded"
                          className="h-10 rounded-xl"
                        />
                      </div>

                      {/* Calculate Limitation */}
                      {decree.decreeDate && decree.decreeType && (
                        <div className="rounded-xl border-2 border-border p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="size-4 text-muted-foreground" />
                              <span className="text-sm font-semibold text-foreground">Limitation Period</span>
                            </div>
                            <Button
                              onClick={handleCalculateLimitation}
                              disabled={isCalculatingLimitation}
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-xs h-8"
                            >
                              {isCalculatingLimitation ? <Loader2 className="size-3.5 animate-spin" /> : <Shield className="size-3.5 mr-1.5" />}
                              Calculate
                            </Button>
                          </div>
                          {limitationResult && (
                            <div className="mt-3 flex items-center gap-3">
                              <Badge
                                className={cn(
                                  'text-xs px-2.5 py-1 rounded-md border',
                                  limitationResult.urgent
                                    ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400'
                                    : limitationResult.days > 0
                                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400'
                                      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400'
                                )}
                              >
                                {limitationResult.days > 0
                                  ? `${Math.floor(limitationResult.days / 365)}y ${Math.floor((limitationResult.days % 365) / 30)}m remaining`
                                  : 'EXPIRED'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Last date: {limitationResult.lastDate}
                              </span>
                              {limitationResult.urgent && (
                                <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
                                  <AlertTriangle className="size-3" /> Less than 6 months!
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <Separator />

                      {/* Execution Modes */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Execution Modes</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {EXECUTION_MODES.map((mode) => (
                            <motion.button
                              key={mode.value}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => toggleMode(mode.value)}
                              className={cn(
                                'flex items-start gap-3 rounded-xl p-4 text-left transition-all duration-200 border-2',
                                selectedModes.includes(mode.value)
                                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                                  : 'border-border bg-card hover:border-primary/20'
                              )}
                            >
                              <div
                                className={cn(
                                  'flex size-9 items-center justify-center rounded-lg shrink-0 transition-colors',
                                  selectedModes.includes(mode.value) ? 'bg-primary/15' : 'bg-muted'
                                )}
                              >
                                <mode.icon className={cn('size-4', selectedModes.includes(mode.value) ? 'text-primary' : 'text-muted-foreground')} />
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-semibold text-foreground">{mode.label}</span>
                                <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                              </div>
                              <div
                                className={cn(
                                  'ml-auto mt-1 size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                                  selectedModes.includes(mode.value)
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'border-muted-foreground/30'
                                )}
                              >
                                {selectedModes.includes(mode.value) && <CheckCircle2 className="size-3" />}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Error */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2 text-xs text-red-500 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                        >
                          <TriangleAlert className="size-3.5 shrink-0" />
                          {error}
                        </motion.div>
                      )}

                      {/* Next button */}
                      <Button
                        onClick={goNext}
                        disabled={!decree.decreeDate || !decree.decreeType || selectedModes.length === 0}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl mt-4',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                        )}
                      >
                        Next
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* ──── STEP 1: Execution Details ──── */}
                {wizardStep === 1 && (
                  <motion.div
                    key="wiz-step-1"
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
                      <h2 className="text-lg font-bold text-foreground">Execution Details</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Provide execution-specific details and amounts
                      </p>
                    </motion.div>

                    <motion.div variants={fadeInUp} custom={1} className="space-y-5">
                      {/* Summary card */}
                      <Card className="rounded-xl border-2 border-border bg-muted/20">
                        <CardContent className="p-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Decree Summary</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-xs text-muted-foreground">Court</span>
                              <p className="text-sm font-medium text-foreground">{decree.courtName || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Decree Date</span>
                              <p className="text-sm font-medium text-foreground">{decree.decreeDate || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Plaintiff</span>
                              <p className="text-sm font-medium text-foreground">{decree.plaintiffName || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Defendant</span>
                              <p className="text-sm font-medium text-foreground">{decree.defendantName || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Decree Amount</span>
                              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(decree.decreeAmount)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Modes</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {selectedModes.map((m) => (
                                  <Badge key={m} className={cn('text-[10px] px-2 py-0 rounded-md border', MODE_BADGE_COLORS[m])}>
                                    {m.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Amount Paid */}
                      <div className="space-y-2">
                        <Label htmlFor="amountPaid" className="text-xs font-semibold">Amount Already Paid</Label>
                        <Input
                          id="amountPaid"
                          type="number"
                          value={execForm.amountPaid}
                          onChange={(e) => {
                            const paid = e.target.value
                            const decreeAmt = parseFloat(decree.decreeAmount) || 0
                            const paidAmt = parseFloat(paid) || 0
                            setExecForm((p) => ({
                              ...p,
                              amountPaid: paid,
                              pendingAmount: String(Math.max(0, decreeAmt - paidAmt)),
                            }))
                          }}
                          placeholder="e.g., 50000"
                          className="h-10 rounded-xl"
                        />
                      </div>

                      {/* Pending Amount */}
                      <div className="space-y-2">
                        <Label htmlFor="pendingAmount" className="text-xs font-semibold">Current Pending Amount</Label>
                        <Input
                          id="pendingAmount"
                          type="number"
                          value={execForm.pendingAmount}
                          onChange={(e) => setExecForm((p) => ({ ...p, pendingAmount: e.target.value }))}
                          placeholder="Auto-calculated or manual"
                          className="h-10 rounded-xl"
                        />
                        {execForm.pendingAmount && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {formatCurrency(execForm.pendingAmount)} pending
                          </p>
                        )}
                      </div>

                      {/* Execution Court */}
                      <div className="space-y-2">
                        <Label htmlFor="execCourt" className="text-xs font-semibold">
                          Preferred Execution Court <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                          id="execCourt"
                          value={execForm.executionCourt}
                          onChange={(e) => setExecForm((p) => ({ ...p, executionCourt: e.target.value }))}
                          placeholder="e.g., City Civil Court, Chennai"
                          className="h-10 rounded-xl"
                        />
                      </div>

                      {/* Condonation */}
                      <div className="space-y-2">
                        <Label htmlFor="condonation" className="text-xs font-semibold">
                          Condonation Reason <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Textarea
                          id="condonation"
                          value={execForm.condonationReason}
                          onChange={(e) => setExecForm((p) => ({ ...p, condonationReason: e.target.value }))}
                          placeholder="If filing after limitation period, state the reason for condonation of delay..."
                          className="min-h-[80px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>

                      {/* Interest Include */}
                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-border bg-card">
                        <div>
                          <Label className="text-sm font-semibold text-foreground">Include Interest</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Calculate interest in the execution amount
                          </p>
                        </div>
                        <Switch
                          checked={execForm.includeInterest}
                          onCheckedChange={(checked) => setExecForm((p) => ({ ...p, includeInterest: checked }))}
                        />
                      </div>

                      {/* Next */}
                      <Button
                        onClick={goNext}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl mt-4',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]'
                        )}
                      >
                        Next
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* ──── STEP 2: Asset Details ──── */}
                {wizardStep === 2 && (
                  <motion.div
                    key="wiz-step-2"
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
                      <h2 className="text-lg font-bold text-foreground">Asset Details</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {hasAttachmentModes
                          ? 'Add assets for attachment. Skip if only using Civil Arrest mode.'
                          : 'No attachment modes selected. You can skip this step.'}
                      </p>
                    </motion.div>

                    <motion.div variants={fadeInUp} custom={1} className="space-y-5">
                      {/* Asset list */}
                      {assets.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Added Assets ({assets.length})
                          </p>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {assets.map((asset) => (
                              <motion.div
                                key={asset.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card"
                              >
                                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                                  <Building className="size-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">{asset.type.replace(/_/g, ' ')}</span>
                                    {asset.valueEstimate && (
                                      <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-md">
                                        {formatCurrency(asset.valueEstimate)}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{asset.description}</p>
                                  {asset.address && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{asset.address}</p>
                                  )}
                                  {asset.employerName && (
                                    <p className="text-xs text-muted-foreground mt-0.5">Employer: {asset.employerName}</p>
                                  )}
                                  {asset.bankName && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{asset.bankName} — {asset.accountNumber}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeAsset(asset.id)}
                                  className="size-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Asset Form */}
                      {hasAttachmentModes && (
                        <Card className="rounded-xl border-2 border-border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Plus className="size-4 text-primary" />
                              Add Asset
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-0">
                            {/* Asset Type */}
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold">Asset Type</Label>
                              <Select
                                value={newAsset.type}
                                onValueChange={(v) => setNewAsset((p) => ({ ...p, type: v }))}
                              >
                                <SelectTrigger className="w-full h-10 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ASSET_TYPES.map((at) => (
                                    <SelectItem key={at.value} value={at.value}>
                                      {at.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold">Description</Label>
                              <Textarea
                                value={newAsset.description || ''}
                                onChange={(e) => setNewAsset((p) => ({ ...p, description: e.target.value }))}
                                placeholder="Describe the asset in detail..."
                                className="min-h-[60px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold">Value Estimate <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                                <Input
                                  value={newAsset.valueEstimate || ''}
                                  onChange={(e) => setNewAsset((p) => ({ ...p, valueEstimate: e.target.value }))}
                                  placeholder="e.g., 2000000"
                                  className="h-10 rounded-xl"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold">Address <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                                <Input
                                  value={newAsset.address || ''}
                                  onChange={(e) => setNewAsset((p) => ({ ...p, address: e.target.value }))}
                                  placeholder="Property address"
                                  className="h-10 rounded-xl"
                                />
                              </div>
                            </div>

                            {/* Type-specific fields */}
                            {newAsset.type === 'SALARY' && (
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold">Employer Name</Label>
                                <Input
                                  value={newAsset.employerName || ''}
                                  onChange={(e) => setNewAsset((p) => ({ ...p, employerName: e.target.value }))}
                                  placeholder="Name of employer / company"
                                  className="h-10 rounded-xl"
                                />
                              </div>
                            )}

                            {(newAsset.type === 'BANK' || newAsset.type === 'GARNISHEE') && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold">Bank Name</Label>
                                  <Input
                                    value={newAsset.bankName || ''}
                                    onChange={(e) => setNewAsset((p) => ({ ...p, bankName: e.target.value }))}
                                    placeholder="Bank name"
                                    className="h-10 rounded-xl"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold">Account Number</Label>
                                  <Input
                                    value={newAsset.accountNumber || ''}
                                    onChange={(e) => setNewAsset((p) => ({ ...p, accountNumber: e.target.value }))}
                                    placeholder="Account number"
                                    className="h-10 rounded-xl"
                                  />
                                </div>
                              </div>
                            )}

                            <Button
                              onClick={addAsset}
                              disabled={!newAsset.description?.trim()}
                              variant="outline"
                              className="w-full rounded-xl text-sm"
                            >
                              <Plus className="size-4 mr-2" />
                              Add Asset
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Generate button */}
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl mt-4',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]'
                        )}
                      >
                        {isGenerating ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="size-4 mr-2" />
                        )}
                        Generate EP &amp; Applications
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: AI Generation (loading)              */}
          {/* ════════════════════════════════════════════ */}
          {screen === 'wizard' && isGenerating && (
            <motion.div
              key="screen-generating"
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
                AI is drafting your execution documents...
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

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Document Preview                     */}
          {/* ════════════════════════════════════════════ */}
          {screen === 'preview' && generatedDocs.length > 0 && (
            <motion.div
              key="screen-preview"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
            >
              {/* Header */}
              <motion.div variants={fadeInUp} custom={0} className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Generated Documents</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review and edit before filing — {generatedDocs.length} document(s) generated
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScreen('wizard')
                      setWizardStep(2)
                    }}
                    className="rounded-lg text-xs"
                  >
                    <Edit3 className="size-3.5 mr-1.5" />
                    Generate More
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startNewExecution}
                    className="rounded-lg text-xs"
                  >
                    <ArrowLeft className="size-3.5 mr-1.5" />
                    New Execution
                  </Button>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* ── Document Preview ── */}
                <motion.div variants={fadeInUp} custom={1}>
                  <Card className="rounded-xl border-2 border-border overflow-hidden">
                    {/* Tab bar */}
                    <div className="border-b bg-muted/30">
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="h-11 bg-transparent p-0 gap-0 px-2 w-full justify-start overflow-x-auto">
                          {generatedDocs.map((doc) => (
                            <TabsTrigger
                              key={doc.docType}
                              value={doc.docType}
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-semibold px-3 py-3"
                            >
                              {doc.docType}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>

                    {/* Document toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditing(!isEditing)
                            if (activeDoc) setEditContent(activeDoc.content)
                          }}
                          className="h-8 rounded-lg text-xs"
                        >
                          <Pencil className="size-3.5 mr-1.5" />
                          {isEditing ? 'Preview' : 'Edit'}
                        </Button>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-md">
                          {activeDoc?.title || 'Document'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handleCopy} className="size-8" title="Copy">
                          <Copy className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDownload} className="size-8" title="Download Branded PDF">
                          <FileDown className="size-3.5" />
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
                            setGeneratedDocs((prev) =>
                              prev.map((d) =>
                                d.docType === activeTab ? { ...d, content: e.target.value } : d
                              )
                            )
                          }}
                          className="min-h-[500px] border-0 rounded-none resize-y text-sm font-mono leading-relaxed p-6"
                        />
                      ) : (
                        <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-muted/30 dark:from-card dark:to-card min-h-[500px]">
                          <div className="max-w-none">
                            {activeDoc?.content?.split('\n').map((line, idx) => (
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
                        <FileText className="size-4 text-primary" />
                        Document Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type</span>
                        <Badge variant="secondary" className="text-xs">{activeDoc?.docType || '—'}</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Words</span>
                        <span className="text-xs font-medium text-foreground">
                          {activeDoc?.content.split(/\s+/).filter(Boolean).length || 0}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Total Documents</span>
                        <span className="text-xs font-medium text-foreground">{generatedDocs.length}</span>
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
                        {activeDoc?.keyPoints.map((point, idx) => (
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
                        Warnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                          AI-generated draft. Advocate review required before filing.
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {activeDoc?.warnings.map((warning, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-red-600/80 dark:text-red-300/80">
                            <ChevronRight className="size-3.5 mt-0.5 shrink-0" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  <Button
                    onClick={handleSaveMatter}
                    className={cn(
                      'w-full h-11 text-sm font-semibold rounded-xl',
                      'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                      'text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30',
                      'transition-all duration-200 active:scale-[0.98]'
                    )}
                  >
                    <Save className="size-4 mr-2" />
                    Save Execution Matter
                  </Button>

                  <Button
                    onClick={() => {
                      setScreen('list')
                    }}
                    variant="outline"
                    className="w-full h-11 text-sm font-semibold rounded-xl"
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Back to Matter List
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── Fallback Document Builders ─── */

function buildFallbackEP(): string {
  return `[EXECUTION PETITION]

UNDER SECTION 51 READ WITH ORDER 21 RULE 11 OF THE CODE OF CIVIL PROCEDURE, 1908

In the Court of the [Court Name]

Execution Petition No. _____ of 20___

[Plaintiff Name]
Decree Holder
                                             ... Petitioner

Versus

[Defendant Name]
Judgment Debtor
                                             ... Respondent

PETITION FOR EXECUTION OF DECREE

Most respectfully sheweth:

1. This petition is filed for execution of the decree passed by this Hon'ble Court in [Case Number] dated [Decree Date].

2. That the decree was passed in favour of the petitioner/decree holder and against the respondent/judgment debtor.

3. That the decree debt amount along with interest and costs as detailed in the accompanying Memo of Calculation remains unpaid and unsatisfied.

4. That the respondent/judgment debtor has failed to satisfy the decree despite notice and demand.

5. That the decree is executable and the limitation period has not expired.

PRAYER

It is therefore most respectfully prayed that this Hon'ble Court may be pleased to:

a) Issue notice to the respondent/judgment debtor;
b) Direct execution of the decree for recovery of the decretal amount;
c) Pass such other orders as this Hon'ble Court deems fit and proper.

Place: ___________
Date: ___________

                                            ___________________
                                            Advocate for Petitioner
                                            [Court Name]`
}

function buildFallbackEA(mode: string): string {
  const modeLabel = mode.replace(/_/g, ' ').toUpperCase()
  return `[EXECUTION APPLICATION — ${modeLabel}]

UNDER SECTION [Relevant Section] READ WITH ORDER 21 RULE [Relevant Rule] OF THE CODE OF CIVIL PROCEDURE, 1908

In the Court of the [Court Name]

Application No. _____ in EP No. _____ of 20___

[Plaintiff Name]
Decree Holder
                                             ... Applicant

Versus

[Defendant Name]
Judgment Debtor
                                             ... Respondent

APPLICATION FOR ${modeLabel}

Most respectfully sheweth:

1. That the above-referenced Execution Petition is pending before this Hon'ble Court.

2. That the decree debt remains unsatisfied despite efforts to execute the decree.

3. That the applicant has reason to believe that the judgment debtor possesses assets/income as described herein, which are liable for attachment.

4. That it is just and necessary to issue a direction for ${modeLabel} to secure the decretal amount.

PRAYER

It is therefore most respectfully prayed that this Hon'ble Court may be pleased to:

a) Issue an order for ${modeLabel};
b) Direct the concerned authorities to comply forthwith;
c) Pass such other orders as deemed fit.

Place: ___________
Date: ___________

                                            ___________________
                                            Advocate for Applicant`
}

function buildFallbackSchedule(assets: ExecutionAsset[]): string {
  const lines = assets.map((a, i) => {
    let line = `${i + 1}. ${a.type.replace(/_/g, ' ')} — ${a.description}`
    if (a.address) line += `\n   Address: ${a.address}`
    if (a.valueEstimate) line += `\n   Estimated Value: ₹${a.valueEstimate}`
    if (a.employerName) line += `\n   Employer: ${a.employerName}`
    if (a.bankName) line += `\n   Bank: ${a.bankName}${a.accountNumber ? ` (A/C: ${a.accountNumber})` : ''}`
    return line
  })
  return `[SCHEDULE OF PROPERTIES/ASSETS FOR ATTACHMENT]

Attached to Execution Petition No. _____ of 20___

The following assets are liable for attachment in satisfaction of the decree:

${lines.join('\n\n')}

Total assets listed: ${assets.length}

Note: The decree holder reserves the right to add further assets to this schedule as and when discovered.

Place: ___________
Date: ___________`
}

function buildFallbackMemo(decree: DecreeForm, exec: ExecutionForm): string {
  const decreeAmt = parseFloat(decree.decreeAmount) || 0
  const interestRate = parseFloat(decree.interestRate) || 0
  const paidAmt = parseFloat(exec.amountPaid) || 0
  const pendingAmt = parseFloat(exec.pendingAmount) || (decreeAmt - paidAmt)

  return `[MEMO OF CALCULATION]

In respect of Execution Petition No. _____ of 20___

1. Principal Decree Amount:          ₹${decreeAmt.toLocaleString('en-IN')}

2. Interest:
   Rate: ${interestRate}% per annum
   Period: ${decree.interestFrom || 'N/A'} to ${decree.interestTo || 'Date of Realization'}
   ${interestRate > 0 ? `Interest Amount (approx.):      ₹${Math.round(decreeAmt * interestRate / 100).toLocaleString('en-IN')}` : 'Interest: Not quantified'}

3. Costs awarded by Court:            ₹${decree.costs || 'As per decree'}

4. Less: Amount already received:     ₹${paidAmt.toLocaleString('en-IN')}

5. Net Amount Payable:                ₹${pendingAmt.toLocaleString('en-IN')}

This memo is submitted for the purpose of execution proceedings. Actual interest calculation shall be verified at the time of realization.

Place: ___________
Date: ___________`
}
