'use client'
import { generateBrandedPdf } from '@/lib/pdf-generator'
import { stripMarkdown } from '@/lib/ai-service'

import { useState, useCallback, useMemo,  } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfileStore } from '@/store/profile-store'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileDown,
  Edit3,
  FileText,
  Gavel,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Save,
  Scale,
  Search,
  Shield,
  Trash2,
  User,
  Building,
  BookOpen,
  Lock,
  Unlock,
  Badge as BadgeIcon,
  ChevronRight,
  Sparkles,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { DocumentUpload, type UploadedFile } from '@/components/shared/document-upload'
import type { LucideIcon } from 'lucide-react'

/* ════════════════════════════════════════════════════════════════
   Types
   ════════════════════════════════════════════════════════════════ */

type ModuleType = 'bail' | 'crp' | 'writ' | 'crlmp'
type ScreenType = 'list' | 'wizard' | 'preview'

interface CriminalModuleOption {
  id: ModuleType
  label: string
  icon: LucideIcon
  description: string
}

interface GeneratedDocument {
  id: string
  title: string
  content: string
  keyPoints: string[]
  warnings: string[]
  createdAt: string
}

interface CriminalMatter {
  id: string
  type: string
  module: ModuleType
  status: string
  data: Record<string, unknown>
  documents: GeneratedDocument[]
  createdAt: string
  updatedAt: string
}

interface SuggestedGround {
  text: string
  selected: boolean
}

/* ─── Bail Form ─── */

interface FIRDetails {
  firNumber: string
  policeStation: string
  firDate: string
  lawType: string
  sectionsCharged: string
}

interface AccusedDetails {
  name: string
  age: string
  address: string
  occupation: string
  arrested: boolean
  dateOfCustody: string
  custodyPeriod: string
}

interface CaseDetails {
  courtName: string
  caseNumber: string
  nextHearing: string
  offenceCategory: string
  punishmentRange: string
}

interface BailForm {
  fir: FIRDetails
  accused: AccusedDetails
  case: CaseDetails
  grounds: string
  suggestedGrounds: SuggestedGround[]
  suretyName: string
  suretyAddress: string
  suretyAmount: string
  suretyRelation: string
  bailType: string
}

/* ─── CRP Form ─── */

interface CRPForm {
  crpType: string
  courtName: string
  orderDate: string
  orderDetails: string
  petitionerName: string
  petitionerAddress: string
  petitionerAdvocate: string
  respondentName: string
  respondentAddress: string
  respondentAdvocate: string
  caseHistory: string
  grounds: string
  suggestedGrounds: SuggestedGround[]
}

/* ─── Writ Form ─── */

interface WritRespondent {
  id: string
  designation: string
  department: string
  address: string
}

interface WritForm {
  writType: string
  isPIL: boolean
  petitionerName: string
  petitionerAddress: string
  petitionerAdvocate: string
  respondents: WritRespondent[]
  fundamentalRight: string
  administrativeAction: string
  reliefSought: string
  facts: string
  jurisdiction: string
  highCourtName: string
}

/* ─── CRLMP Form ─── */

interface CRLMPForm {
  crlmpType: string
  caseNumber: string
  courtName: string
  orderDate: string
  petitionerName: string
  petitionerAddress: string
  petitionerAdvocate: string
  respondentName: string
  respondentAddress: string
  respondentAdvocate: string
  prayer: string
  grounds: string
}

/* ════════════════════════════════════════════════════════════════
   Constants
   ════════════════════════════════════════════════════════════════ */

const CRIMINAL_API = 'https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiCriminal'

const MODULES: CriminalModuleOption[] = [
  {
    id: 'bail',
    label: 'Bail Application',
    icon: Gavel,
    description: 'Regular, Anticipatory, Default bail under CrPC/BNSS',
  },
  {
    id: 'crp',
    label: 'CRP / Quashing',
    icon: Scale,
    description: 'Criminal Revision, Section 482 quashing',
  },
  {
    id: 'crlmp',
    label: 'CRLMP',
    icon: FileText,
    description: 'Interim relief, suspension, modification',
  },
  {
    id: 'writ',
    label: 'Writ Petition',
    icon: Shield,
    description: 'Mandamus, Certiorari, Habeas Corpus, PIL',
  },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  },
  FILED: {
    label: 'Filed',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  PENDING: {
    label: 'Pending',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  },
  ALLOWED: {
    label: 'Allowed',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  DISMISSED: {
    label: 'Dismissed',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  },
  DISPOSED: {
    label: 'Disposed',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
  },
}

const BAIL_TYPES = [
  { value: 'regular', label: 'Regular Bail', description: 'Sec 439 CrPC / Sec 483 BNSS' },
  { value: 'anticipatory', label: 'Anticipatory Bail', description: 'Sec 438 CrPC / Sec 482 BNSS' },
  { value: 'default', label: 'Default / Statutory Bail', description: 'Sec 167(2) CrPC / Sec 187 BNSS' },
  { value: 'interim_transit', label: 'Interim / Transit Bail', description: 'Temporary protection' },
]

const MODULE_BADGE_COLORS: Record<ModuleType, string> = {
  bail: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700',
  crp: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700',
  writ: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  crlmp: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700',
}

/* ════════════════════════════════════════════════════════════════
   Animation Variants
   ════════════════════════════════════════════════════════════════ */

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
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

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

function getUid(): string {
  if (typeof window === 'undefined') return 'anonymous'
  return localStorage.getItem('aidraft_current_uid') || 'anonymous'
}

function loadMatters(uid: string): CriminalMatter[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`aidraft_criminal_matters_${uid}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMatters(uid: string, matters: CriminalMatter[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`aidraft_criminal_matters_${uid}`, JSON.stringify(matters))
}

function getModuleLabel(mod: ModuleType): string {
  return MODULES.find((m) => m.id === mod)?.label || mod.toUpperCase()
}

function getModuleIcon(mod: ModuleType): LucideIcon {
  return MODULES.find((m) => m.id === mod)?.icon || Gavel
}

/* ════════════════════════════════════════════════════════════════
   Section Wrapper
   ════════════════════════════════════════════════════════════════ */

function FormSection({
  title,
  icon: Icon,
  children,
  index,
}: {
  title: string
  icon: LucideIcon
  children: React.ReactNode
  index: number
}) {
  return (
    <motion.div variants={fadeInUp} custom={index}>
      <Card className="rounded-xl mb-5">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Icon className="size-4 text-primary" />
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">{children}</CardContent>
      </Card>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════ */

export default function CriminalView() {
  const user = useAppStore((s) => s._activeUid)

  // ── Matter list (localStorage) ──
  const [matters, setMatters] = useState<CriminalMatter[]>(() => {
    if (typeof window === 'undefined') return []
    return loadMatters(getUid())
  })

  // ── Screen ──
  const [screen, setScreen] = useState<ScreenType>('list')
  const [wizardStep, setWizardStep] = useState(0)
  const [selectedModule, setSelectedModule] = useState<ModuleType | null>(null)
  const [currentMatterId, setCurrentMatterId] = useState<string | null>(null)

  // ── Generation ──
  const [isGenerating, setIsGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genMessage, setGenMessage] = useState('')
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([])
  const [error, setError] = useState<string | null>(null)

  // ── Preview ──
  const [activeDocId, setActiveDocId] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  // ── AI Assist states ──
  const [isParsingFIR, setIsParsingFIR] = useState(false)
  const [firText, setFirText] = useState('')
  const [isSuggestingGrounds, setIsSuggestingGrounds] = useState(false)
  const [isSuggestingCRPGrounds, setIsSuggestingCRPGrounds] = useState(false)

  // ── Bail form ──
  const [bailForm, setBailForm] = useState<BailForm>({
    fir: { firNumber: '', policeStation: '', firDate: '', lawType: 'ipc', sectionsCharged: '' },
    accused: { name: '', age: '', address: '', occupation: '', arrested: false, dateOfCustody: '', custodyPeriod: '' },
    case: { courtName: '', caseNumber: '', nextHearing: '', offenceCategory: 'non_bailable', punishmentRange: '3-7yr' },
    grounds: '',
    suggestedGrounds: [],
    suretyName: '', suretyAddress: '', suretyAmount: '', suretyRelation: '',
    bailType: 'regular',
  })

  // ── CRP form ──
  const [crpForm, setCrpForm] = useState<CRPForm>({
    crpType: 'revision',
    courtName: '', orderDate: '', orderDetails: '',
    petitionerName: '', petitionerAddress: '', petitionerAdvocate: '',
    respondentName: '', respondentAddress: '', respondentAdvocate: '',
    caseHistory: '', grounds: '', suggestedGrounds: [],
  })

  // ── Writ form ──
  const [writForm, setWritForm] = useState<WritForm>({
    writType: 'mandamus', isPIL: false,
    petitionerName: '', petitionerAddress: '', petitionerAdvocate: '',
    respondents: [{ id: crypto.randomUUID(), designation: '', department: '', address: '' }],
    fundamentalRight: '', administrativeAction: '', reliefSought: '',
    facts: '', jurisdiction: 'high_court', highCourtName: '',
  })

  // ── CRLMP form ──
  const [crlmpForm, setCrlmpForm] = useState<CRLMPForm>({
    crlmpType: 'interim_relief',
    caseNumber: '', courtName: '', orderDate: '',
    petitionerName: '', petitionerAddress: '', petitionerAdvocate: '',
    respondentName: '', respondentAddress: '', respondentAdvocate: '',
    prayer: '', grounds: '',
  })

  /* ── Computed ── */

  const activeDoc = useMemo(
    () => generatedDocs.find((d) => d.id === activeDocId),
    [generatedDocs, activeDocId]
  )

  /* ── Persist matters ── */

  const persistMatters = useCallback(
    (updated: CriminalMatter[]) => {
      const uid = getUid()
      setMatters(updated)
      saveMatters(uid, updated)
    },
    []
  )

  /* ── Navigation ── */

  const startNewMatter = useCallback(() => {
    setScreen('wizard')
    setWizardStep(0)
    setSelectedModule(null)
    setCurrentMatterId(null)
    setGeneratedDocs([])
    setError(null)
    setIsEditing(false)
    setEditContent('')
    setFirText('')
    setBailForm({
      fir: { firNumber: '', policeStation: '', firDate: '', lawType: 'ipc', sectionsCharged: '' },
      accused: { name: '', age: '', address: '', occupation: '', arrested: false, dateOfCustody: '', custodyPeriod: '' },
      case: { courtName: '', caseNumber: '', nextHearing: '', offenceCategory: 'non_bailable', punishmentRange: '3-7yr' },
      grounds: '', suggestedGrounds: [],
      suretyName: '', suretyAddress: '', suretyAmount: '', suretyRelation: '',
      bailType: 'regular',
    })
    setCrpForm({
      crpType: 'revision', courtName: '', orderDate: '', orderDetails: '',
      petitionerName: '', petitionerAddress: '', petitionerAdvocate: '',
      respondentName: '', respondentAddress: '', respondentAdvocate: '',
      caseHistory: '', grounds: '', suggestedGrounds: [],
    })
    setWritForm({
      writType: 'mandamus', isPIL: false,
      petitionerName: '', petitionerAddress: '', petitionerAdvocate: '',
      respondents: [{ id: crypto.randomUUID(), designation: '', department: '', address: '' }],
      fundamentalRight: '', administrativeAction: '', reliefSought: '',
      facts: '', jurisdiction: 'high_court', highCourtName: '',
    })
    setCrlmpForm({
      crlmpType: 'interim_relief',
      caseNumber: '', courtName: '', orderDate: '',
      petitionerName: '', petitionerAddress: '', petitionerAdvocate: '',
      respondentName: '', respondentAddress: '', respondentAdvocate: '',
      prayer: '', grounds: '',
    })
  }, [])

  const deleteMatter = useCallback(
    (id: string) => {
      persistMatters(matters.filter((m) => m.id !== id))
    },
    [matters, persistMatters]
  )

  /* ── AI: Parse FIR ── */

  const handleParseFIR = useCallback(async () => {
    if (!firText.trim()) return
    setIsParsingFIR(true)
    setError(null)
    try {
      const response = await fetch(CRIMINAL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'parseFIR', firText: firText.trim() }),
      })
      if (!response.ok) throw new Error('Failed to parse FIR')
      const data = await response.json()
      if (data.data) {
        setBailForm((prev) => ({
          ...prev,
          fir: {
            ...prev.fir,
            firNumber: data.data.firNumber || prev.fir.firNumber,
            policeStation: data.data.policeStation || prev.fir.policeStation,
            firDate: data.data.firDate || prev.fir.firDate,
            sectionsCharged: data.data.sectionsCharged || prev.fir.sectionsCharged,
          },
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FIR parsing failed.')
    } finally {
      setIsParsingFIR(false)
    }
  }, [firText])

  /* ── AI: Suggest Bail Grounds ── */

  const handleSuggestBailGrounds = useCallback(async () => {
    setIsSuggestingGrounds(true)
    setError(null)
    try {
      const response = await fetch(CRIMINAL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'suggestBailGrounds',
          sectionsCharged: bailForm.fir.sectionsCharged,
          offenceCategory: bailForm.case.offenceCategory,
          punishmentRange: bailForm.case.punishmentRange,
          bailType: bailForm.bailType,
          arrested: bailForm.accused.arrested,
          custodyPeriod: bailForm.accused.custodyPeriod,
        }),
      })
      if (!response.ok) throw new Error('Failed to suggest grounds')
      const data = await response.json()
      if (data.data && Array.isArray(data.data.grounds)) {
        setBailForm((prev) => ({
          ...prev,
          suggestedGrounds: data.data.grounds.map((g: string) => ({ text: g, selected: false })),
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest grounds.')
    } finally {
      setIsSuggestingGrounds(false)
    }
  }, [bailForm])

  /* ── AI: Suggest CRP Grounds ── */

  const handleSuggestCRPGrounds = useCallback(async () => {
    setIsSuggestingCRPGrounds(true)
    setError(null)
    try {
      const response = await fetch(CRIMINAL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'suggestCRPGrounds',
          crpType: crpForm.crpType,
          orderDetails: crpForm.orderDetails,
          caseHistory: crpForm.caseHistory,
        }),
      })
      if (!response.ok) throw new Error('Failed to suggest grounds')
      const data = await response.json()
      if (data.data && Array.isArray(data.data.grounds)) {
        setCrpForm((prev) => ({
          ...prev,
          suggestedGrounds: data.data.grounds.map((g: string) => ({ text: g, selected: false })),
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest grounds.')
    } finally {
      setIsSuggestingCRPGrounds(false)
    }
  }, [crpForm])

  /* ── Writ: Respondent management ── */

  const addWritRespondent = useCallback(() => {
    setWritForm((prev) => ({
      ...prev,
      respondents: [...prev.respondents, { id: crypto.randomUUID(), designation: '', department: '', address: '' }],
    }))
  }, [])

  const removeWritRespondent = useCallback((id: string) => {
    setWritForm((prev) => ({
      ...prev,
      respondents: prev.respondents.filter((r) => r.id !== id),
    }))
  }, [])

  const updateWritRespondent = useCallback((id: string, field: keyof WritRespondent, value: string) => {
    setWritForm((prev) => ({
      ...prev,
      respondents: prev.respondents.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }))
  }, [])

  /* ── Generate Documents ── */

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setGenProgress(0)
    setError(null)

    const messages = [
      'Analyzing case details...',
      'Researching legal provisions...',
      'Drafting document...',
      'Formatting and finalizing...',
    ]

    let msgIdx = 0
    const msgInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, messages.length - 1)
      setGenMessage(messages[msgIdx])
    }, 1000)

    const progressInterval = setInterval(() => {
      setGenProgress((prev) => {
        if (prev >= 95) { clearInterval(progressInterval); return 95 }
        return prev + Math.random() * 12
      })
    }, 350)

    try {
      let payload: Record<string, unknown> = {}

      if (selectedModule === 'bail') {
        payload = { task: 'generateBail', ...bailForm }
      } else if (selectedModule === 'crp') {
        payload = { task: 'generateCRP', ...crpForm }
      } else if (selectedModule === 'writ') {
        payload = { task: 'generateWrit', ...writForm }
      } else if (selectedModule === 'crlmp') {
        payload = { task: 'generateCRLMP', ...crlmpForm }
      }

      const response = await fetch(CRIMINAL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      clearInterval(msgInterval)
      clearInterval(progressInterval)
      setGenProgress(100)
      setGenMessage('Document generated successfully!')

      const docs: GeneratedDocument[] = []

      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          const doc: GeneratedDocument = {
            id: crypto.randomUUID(),
            title: data.data.title || `${getModuleLabel(selectedModule!)} — ${bailForm.accused.name || crpForm.petitionerName || 'Draft'}`,
            content: typeof data.data.content === 'string' ? stripMarkdown(data.data.content) : JSON.stringify(data.data),
            keyPoints: data.data.keyPoints || [],
            warnings: data.data.warnings || ['AI-generated draft. Advocate review required before filing.'],
            createdAt: new Date().toISOString(),
          }
          docs.push(doc)
        }
      }

      // Fallback if API fails
      if (docs.length === 0) {
        const moduleLabel = getModuleLabel(selectedModule!)
        const accusedName = selectedModule === 'bail' ? bailForm.accused.name : crpForm.petitionerName
        docs.push({
          id: crypto.randomUUID(),
          title: `${moduleLabel} — ${accusedName || 'Draft'}`,
          content: buildFallbackDocument(selectedModule!, {
            bailForm,
            crpForm,
            writForm,
            crlmpForm,
          }),
          keyPoints: [`Module: ${moduleLabel}`, 'Draft prepared for review'],
          warnings: ['AI-generated draft. Advocate review required before filing.'],
          createdAt: new Date().toISOString(),
        })
      }

      setGeneratedDocs(docs)
      if (docs.length > 0) {
        setActiveDocId(docs[0].id)
        setEditContent(docs[0].content)
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
  }, [selectedModule, bailForm, crpForm, writForm, crlmpForm])

  /* ── Save Matter ── */

  const handleSaveMatter = useCallback(() => {
    const now = new Date().toISOString()
    let matterData: Record<string, unknown> = {}

    if (selectedModule === 'bail') matterData = bailForm
    else if (selectedModule === 'crp') matterData = crpForm
    else if (selectedModule === 'writ') matterData = writForm
    else if (selectedModule === 'crlmp') matterData = crlmpForm

    const matter: CriminalMatter = {
      id: currentMatterId || crypto.randomUUID(),
      type: getModuleLabel(selectedModule!),
      module: selectedModule!,
      status: 'DRAFT',
      data: matterData,
      documents: generatedDocs,
      createdAt: currentMatterId
        ? (matters.find((m) => m.id === currentMatterId)?.createdAt || now)
        : now,
      updatedAt: now,
    }

    if (currentMatterId) {
      persistMatters(matters.map((m) => (m.id === currentMatterId ? matter : m)))
    } else {
      persistMatters([matter, ...matters])
      setCurrentMatterId(matter.id)
    }
  }, [selectedModule, bailForm, crpForm, writForm, crlmpForm, generatedDocs, currentMatterId, matters, persistMatters])

  /* ── Copy / Download / Print ── */

  const handleCopy = useCallback(() => {
    if (!activeDoc) return
    navigator.clipboard.writeText(activeDoc.content)
  }, [activeDoc])

  

  const handlePdfDownload = useCallback(() => {
    const profile = useProfileStore.getState().profile
    const doc = activeDoc
    if (!doc?.content) return
    generateBrandedPdf({ title: doc.title || 'Legal Document', content: doc.content, profile })
  }, [activeDoc])
const handleDownload = useCallback(() => {
    if (!activeDoc) return
    const blobUrl = URL.createObjectURL(new Blob([activeDoc.content], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${activeDoc.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(blobUrl)
  }, [activeDoc])

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

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */

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
                      <Shield className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    Criminal Law
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
                    Bail, CRP, CRLMP, Writ Petitions
                  </p>
                </div>
              </motion.div>

              {/* New Criminal Matter Card */}
              <motion.div variants={fadeInUp} custom={1} className="mb-6">
                <motion.button
                  onClick={startNewMatter}
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
                    <span className="text-base font-bold text-foreground">New Criminal Matter</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Start a bail, CRP, writ, or CRLMP with AI-powered drafting
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              </motion.div>

              {/* Matter List */}
              {matters.length > 0 ? (
                <motion.div variants={fadeInUp} custom={2} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matters.map((matter, idx) => {
                    const statusCfg = STATUS_CONFIG[matter.status] || STATUS_CONFIG.DRAFT
                    const ModIcon = getModuleIcon(matter.module)

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
                          setSelectedModule(matter.module)
                          setGeneratedDocs(matter.documents)
                          if (matter.documents.length > 0) {
                            setActiveDocId(matter.documents[0].id)
                            setEditContent(matter.documents[0].content)
                            setScreen('preview')
                          } else {
                            setScreen('wizard')
                            setWizardStep(1)
                          }
                        }}
                      >
                        {/* Top row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                              <ModIcon className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{matter.type}</p>
                              <p className="text-xs text-muted-foreground truncate">{matter.module.toUpperCase()}</p>
                            </div>
                          </div>
                          <Badge className={cn('text-[10px] px-2 py-0.5 rounded-md border', statusCfg.bgColor, statusCfg.color)}>
                            {statusCfg.label}
                          </Badge>
                        </div>

                        {/* Module badge */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <Badge className={cn('text-[10px] px-2 py-0.5 rounded-md border', MODULE_BADGE_COLORS[matter.module])}>
                            {getModuleLabel(matter.module)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md">
                            {matter.documents.length} doc{matter.documents.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* Timestamp */}
                        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="size-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(matter.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); deleteMatter(matter.id) }}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-red-500" />
                          </Button>
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
                    <Shield className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">No Criminal Matters</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Create your first criminal matter. The AI will help you draft bail applications, CRPs, writs, and CRLMPs.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Wizard                                */}
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
                    <Shield className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h1 className="text-lg font-bold text-foreground">
                    {wizardStep === 0 ? 'Select Module' : getModuleLabel(selectedModule!)}
                  </h1>
                </div>
              </motion.div>

              <AnimatePresence mode="wait">
                {/* ════════════════════════════════ */}
                {/* WIZARD STEP 0: Module Selection  */}
                {/* ════════════════════════════════ */}
                {wizardStep === 0 && (
                  <motion.div
                    key="wiz-step-0"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={staggerContainer}
                  >
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Select Criminal Module
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Choose the type of criminal proceeding
                    </motion.p>

                    <motion.div variants={staggerContainer} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {MODULES.map((mod) => (
                        <motion.button
                          key={mod.id}
                          variants={fadeInUp}
                          custom={MODULES.indexOf(mod)}
                          onClick={() => {
                            setSelectedModule(mod.id)
                            setWizardStep(1)
                          }}
                          className={cn(
                            'flex flex-col items-start gap-3 rounded-xl p-4 sm:p-5 text-left transition-all duration-200',
                            'border border-border bg-card hover:border-primary/30 hover:bg-primary/5',
                            'group active:scale-[0.97]'
                          )}
                        >
                          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <mod.icon className="size-5 text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-foreground">{mod.label}</span>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mod.description}</p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground ml-auto mt-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {/* ════════════════════════════════ */}
                {/* WIZARD STEP 1: Bail Form        */}
                {/* ════════════════════════════════ */}
                {wizardStep === 1 && selectedModule === 'bail' && (
                  <motion.div
                    key="wiz-step-1-bail"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={staggerContainer}
                    className="max-w-2xl mx-auto space-y-0"
                  >
                    {/* FIR Details */}
                    <FormSection title="FIR Details" icon={Search} index={0}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">FIR Number</Label>
                          <Input
                            value={bailForm.fir.firNumber}
                            onChange={(e) => setBailForm((p) => ({ ...p, fir: { ...p.fir, firNumber: e.target.value } }))}
                            placeholder="e.g. FIR No. 123/2024"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Police Station</Label>
                          <Input
                            value={bailForm.fir.policeStation}
                            onChange={(e) => setBailForm((p) => ({ ...p, fir: { ...p.fir, policeStation: e.target.value } }))}
                            placeholder="e.g. Kothrud PS"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Date of FIR</Label>
                          <Input
                            type="date"
                            value={bailForm.fir.firDate}
                            onChange={(e) => setBailForm((p) => ({ ...p, fir: { ...p.fir, firDate: e.target.value } }))}
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Under Old or New Law</Label>
                          <Select
                            value={bailForm.fir.lawType}
                            onValueChange={(v) => setBailForm((p) => ({ ...p, fir: { ...p.fir, lawType: v } }))}
                          >
                            <SelectTrigger className="h-10 rounded-xl text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ipc">IPC / CrPC</SelectItem>
                              <SelectItem value="bns">BNS / BNSS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Sections Charged</Label>
                        <Input
                          value={bailForm.fir.sectionsCharged}
                          onChange={(e) => setBailForm((p) => ({ ...p, fir: { ...p.fir, sectionsCharged: e.target.value } }))}
                          placeholder="e.g. 302, 201, 34 IPC"
                          className="h-10 rounded-xl text-sm"
                        />
                      </div>

                      {/* Parse FIR with AI */}
                      <div className="space-y-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFirText(firText ? '' : ' ')}
                          className="text-xs rounded-lg"
                        >
                          <Brain className="size-3.5 mr-1.5" />
                          Parse FIR with AI
                        </Button>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <Upload className="size-3.5" />
                              Upload FIR / Case Documents
                            </Label>
                            <DocumentUpload module="criminal" maxFiles={5} compact
                              onFilesExtracted={(files) => {
                                const texts = files.filter((f) => f.extractedText).map((f) => f.extractedText || '')
                                if (texts.length > 0 && !firText.trim()) {
                                  setFirText(texts.join('\n\n'))
                                }
                              }}
                              onAiDataExtracted={(data) => {
                                if (!data) return
                                const d = data as Record<string, unknown>
                                if (d.firNumber) setBailForm((p) => ({ ...p, fir: { ...p.fir, firNumber: String(d.firNumber || '') } }))
                                if (d.policeStation) setBailForm((p) => ({ ...p, fir: { ...p.fir, policeStation: String(d.policeStation || '') } }))
                                if (d.firDate) setBailForm((p) => ({ ...p, fir: { ...p.fir, firDate: String(d.firDate || '') } }))
                                if (d.sections) setBailForm((p) => ({ ...p, fir: { ...p.fir, sectionsCharged: Array.isArray(d.sections) ? d.sections.map(String).join(', ') : String(d.sections || '') } }))
                                if (d.accusedName) setBailForm((p) => ({ ...p, accused: { ...p.accused, name: String(d.accusedName || '') } }))
                                if (d.complainantName) setBailForm((p) => ({ ...p, accused: { ...p.accused, address: String(d.complainantName || '') } }))
                                if (d.offenseDate) setBailForm((p) => ({ ...p, accused: { ...p.accused, dateOfCustody: String(d.offenseDate || '') } }))
                              }}
                            />
                          </div>
                        {firText !== '' && (
                          <div className="space-y-2">
                            <Textarea
                              value={firText}
                              onChange={(e) => setFirText(e.target.value)}
                              placeholder="Paste FIR text here for AI to extract details..."
                              className="min-h-[100px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                            />
                            <Button
                              onClick={handleParseFIR}
                              disabled={!firText.trim() || isParsingFIR}
                              className={cn(
                                'h-9 text-xs font-semibold rounded-lg',
                                'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white',
                                'disabled:opacity-50'
                              )}
                            >
                              {isParsingFIR ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
                              Extract Details
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormSection>

                    {/* Accused Details */}
                    <FormSection title="Accused Details" icon={User} index={1}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Name</Label>
                          <Input
                            value={bailForm.accused.name}
                            onChange={(e) => setBailForm((p) => ({ ...p, accused: { ...p.accused, name: e.target.value } }))}
                            placeholder="Accused name"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Age</Label>
                          <Input
                            value={bailForm.accused.age}
                            onChange={(e) => setBailForm((p) => ({ ...p, accused: { ...p.accused, age: e.target.value } }))}
                            placeholder="e.g. 32"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Address</Label>
                        <Input
                          value={bailForm.accused.address}
                          onChange={(e) => setBailForm((p) => ({ ...p, accused: { ...p.accused, address: e.target.value } }))}
                          placeholder="Full address"
                          className="h-10 rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Occupation</Label>
                        <Input
                          value={bailForm.accused.occupation}
                          onChange={(e) => setBailForm((p) => ({ ...p, accused: { ...p.accused, occupation: e.target.value } }))}
                          placeholder="e.g. Business"
                          className="h-10 rounded-xl text-sm"
                        />
                      </div>

                      {/* Arrested toggle */}
                      <div className="flex items-center justify-between py-2">
                        <Label className="text-xs font-semibold">Arrested?</Label>
                        <Button
                          type="button"
                          variant={bailForm.accused.arrested ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setBailForm((p) => ({ ...p, accused: { ...p.accused, arrested: !p.accused.arrested } }))}
                          className={cn(
                            'rounded-lg text-xs px-3 h-8 transition-all',
                            bailForm.accused.arrested
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'border-border text-muted-foreground'
                          )}
                        >
                          {bailForm.accused.arrested ? (
                            <><Lock className="size-3 mr-1" /> Yes, Arrested</>
                          ) : (
                            <><Unlock className="size-3 mr-1" /> Not Arrested</>
                          )}
                        </Button>
                      </div>

                      {bailForm.accused.arrested && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Date of Custody</Label>
                            <Input
                              type="date"
                              value={bailForm.accused.dateOfCustody}
                              onChange={(e) => setBailForm((p) => ({ ...p, accused: { ...p.accused, dateOfCustody: e.target.value } }))}
                              className="h-10 rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Custody Period so far</Label>
                            <Input
                              value={bailForm.accused.custodyPeriod}
                              onChange={(e) => setBailForm((p) => ({ ...p, accused: { ...p.accused, custodyPeriod: e.target.value } }))}
                              placeholder="e.g. 15 days"
                              className="h-10 rounded-xl text-sm"
                            />
                          </div>
                        </motion.div>
                      )}
                    </FormSection>

                    {/* Case Details */}
                    <FormSection title="Case Details" icon={BookOpen} index={2}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Court Name</Label>
                          <Input
                            value={bailForm.case.courtName}
                            onChange={(e) => setBailForm((p) => ({ ...p, case: { ...p.case, courtName: e.target.value } }))}
                            placeholder="e.g. District Court Pune"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Case Number</Label>
                          <Input
                            value={bailForm.case.caseNumber}
                            onChange={(e) => setBailForm((p) => ({ ...p, case: { ...p.case, caseNumber: e.target.value } }))}
                            placeholder="e.g. CC-452/2024"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Next Hearing Date</Label>
                          <Input
                            type="date"
                            value={bailForm.case.nextHearing}
                            onChange={(e) => setBailForm((p) => ({ ...p, case: { ...p.case, nextHearing: e.target.value } }))}
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Offence Category</Label>
                          <Select
                            value={bailForm.case.offenceCategory}
                            onValueChange={(v) => setBailForm((p) => ({ ...p, case: { ...p.case, offenceCategory: v } }))}
                          >
                            <SelectTrigger className="h-10 rounded-xl text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bailable">Bailable</SelectItem>
                              <SelectItem value="non_bailable">Non-Bailable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">Punishment Range</Label>
                          <Select
                            value={bailForm.case.punishmentRange}
                            onValueChange={(v) => setBailForm((p) => ({ ...p, case: { ...p.case, punishmentRange: v } }))}
                          >
                            <SelectTrigger className="h-10 rounded-xl text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="up_to_3yr">Up to 3 years</SelectItem>
                              <SelectItem value="3-7yr">3 to 7 years</SelectItem>
                              <SelectItem value="7yr_life">7 years to Life</SelectItem>
                              <SelectItem value="death">Death Penalty</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </FormSection>

                    {/* Grounds for Bail */}
                    <FormSection title="Grounds for Bail" icon={Gavel} index={3}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Grounds / Brief Facts</Label>
                        <Textarea
                          value={bailForm.grounds}
                          onChange={(e) => setBailForm((p) => ({ ...p, grounds: e.target.value }))}
                          placeholder="Describe grounds for bail, key facts supporting bail..."
                          className="min-h-[100px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>

                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSuggestBailGrounds}
                          disabled={isSuggestingGrounds}
                          className="text-xs rounded-lg"
                        >
                          {isSuggestingGrounds ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
                          Suggest Bail Grounds
                        </Button>

                        {/* Suggested grounds chips */}
                        {bailForm.suggestedGrounds.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {bailForm.suggestedGrounds.map((g, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setBailForm((prev) => ({
                                    ...prev,
                                    suggestedGrounds: prev.suggestedGrounds.map((sg) =>
                                      sg.text === g.text ? { ...sg, selected: !sg.selected } : sg
                                    ),
                                  }))
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                                  g.selected
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : 'bg-muted border-border text-muted-foreground hover:border-primary/20'
                                )}
                              >
                                {g.selected && <CheckCircle2 className="size-3" />}
                                {g.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormSection>

                    {/* Surety Details */}
                    <FormSection title="Surety Details (Optional)" icon={User} index={4}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Surety Name</Label>
                          <Input
                            value={bailForm.suretyName}
                            onChange={(e) => setBailForm((p) => ({ ...p, suretyName: e.target.value }))}
                            placeholder="Surety name"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Surety Amount</Label>
                          <Input
                            value={bailForm.suretyAmount}
                            onChange={(e) => setBailForm((p) => ({ ...p, suretyAmount: e.target.value }))}
                            placeholder="e.g. ₹50,000"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Address</Label>
                          <Input
                            value={bailForm.suretyAddress}
                            onChange={(e) => setBailForm((p) => ({ ...p, suretyAddress: e.target.value }))}
                            placeholder="Surety address"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Relation to Accused</Label>
                          <Input
                            value={bailForm.suretyRelation}
                            onChange={(e) => setBailForm((p) => ({ ...p, suretyRelation: e.target.value }))}
                            placeholder="e.g. Father, Friend"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </FormSection>

                    {/* Bail Type Selection */}
                    <FormSection title="Bail Type" icon={Gavel} index={5}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {BAIL_TYPES.map((bt) => (
                          <motion.button
                            key={bt.value}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setBailForm((p) => ({ ...p, bailType: bt.value }))}
                            className={cn(
                              'flex flex-col items-start gap-1 rounded-xl p-4 text-left transition-all duration-200 border-2',
                              bailForm.bailType === bt.value
                                ? 'border-primary/40 bg-primary/5 shadow-sm'
                                : 'border-border bg-card hover:border-primary/20'
                            )}
                          >
                            <span className="text-sm font-semibold text-foreground">{bt.label}</span>
                            <span className="text-xs text-muted-foreground">{bt.description}</span>
                          </motion.button>
                        ))}
                      </div>
                    </FormSection>

                    {/* Generate Button */}
                    <motion.div variants={fadeInUp} custom={6} className="pt-2">
                      <Button
                        onClick={handleGenerate}
                        disabled={!bailForm.accused.name || !bailForm.fir.firNumber}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                        )}
                      >
                        <Sparkles className="size-4 mr-2" />
                        Generate Bail Application
                        <ChevronRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {/* Error */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 mt-4 text-xs text-red-500"
                      >
                        <TriangleAlert className="size-3.5 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ════════════════════════════════ */}
                {/* WIZARD STEP 1: CRP / Quashing   */}
                {/* ════════════════════════════════ */}
                {wizardStep === 1 && selectedModule === 'crp' && (
                  <motion.div
                    key="wiz-step-1-crp"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={staggerContainer}
                    className="max-w-2xl mx-auto space-y-0"
                  >
                    {/* CRP Type */}
                    <FormSection title="CRP Type" icon={Scale} index={0}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Type</Label>
                        <Select
                          value={crpForm.crpType}
                          onValueChange={(v) => setCrpForm((p) => ({ ...p, crpType: v }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="revision">Criminal Revision</SelectItem>
                            <SelectItem value="quashing">Section 482 Quashing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormSection>

                    {/* Impugned Order */}
                    <FormSection title="Impugned Order" icon={BookOpen} index={1}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Court Name</Label>
                          <Input
                            value={crpForm.courtName}
                            onChange={(e) => setCrpForm((p) => ({ ...p, courtName: e.target.value }))}
                            placeholder="Court that passed the order"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Order Date</Label>
                          <Input
                            type="date"
                            value={crpForm.orderDate}
                            onChange={(e) => setCrpForm((p) => ({ ...p, orderDate: e.target.value }))}
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <Upload className="size-3.5" />
                              Upload Order / Judgment
                            </Label>
                            <DocumentUpload module="criminal" maxFiles={5} compact
                              onFilesExtracted={(files) => {
                                const texts = files.filter((f) => f.extractedText).map((f) => f.extractedText || '')
                                if (texts.length > 0 && !crpForm.orderDetails.trim()) {
                                  setCrpForm((p) => ({ ...p, orderDetails: texts.join('\n\n') }))
                                }
                              }}
                            />
                          </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Order Details</Label>
                        <Textarea
                          value={crpForm.orderDetails}
                          onChange={(e) => setCrpForm((p) => ({ ...p, orderDetails: e.target.value }))}
                          placeholder="Paste or describe the impugned order..."
                          className="min-h-[100px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>
                    </FormSection>

                    {/* Petitioner & Respondent */}
                    <FormSection title="Party Details" icon={User} index={2}>
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Petitioner</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Name</Label>
                              <Input value={crpForm.petitionerName} onChange={(e) => setCrpForm((p) => ({ ...p, petitionerName: e.target.value }))} placeholder="Petitioner name" className="h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Advocate</Label>
                              <Input value={crpForm.petitionerAdvocate} onChange={(e) => setCrpForm((p) => ({ ...p, petitionerAdvocate: e.target.value }))} placeholder="Advocate name" className="h-10 rounded-xl text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Address</Label>
                            <Input value={crpForm.petitionerAddress} onChange={(e) => setCrpForm((p) => ({ ...p, petitionerAddress: e.target.value }))} placeholder="Petitioner address" className="h-10 rounded-xl text-sm" />
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Respondent</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Name</Label>
                              <Input value={crpForm.respondentName} onChange={(e) => setCrpForm((p) => ({ ...p, respondentName: e.target.value }))} placeholder="Respondent name" className="h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Advocate</Label>
                              <Input value={crpForm.respondentAdvocate} onChange={(e) => setCrpForm((p) => ({ ...p, respondentAdvocate: e.target.value }))} placeholder="Advocate name" className="h-10 rounded-xl text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Address</Label>
                            <Input value={crpForm.respondentAddress} onChange={(e) => setCrpForm((p) => ({ ...p, respondentAddress: e.target.value }))} placeholder="Respondent address" className="h-10 rounded-xl text-sm" />
                          </div>
                        </div>
                      </div>
                    </FormSection>

                    {/* Case History & Grounds */}
                    <FormSection title="Case History & Grounds" icon={FileText} index={3}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Case History</Label>
                        <Textarea
                          value={crpForm.caseHistory}
                          onChange={(e) => setCrpForm((p) => ({ ...p, caseHistory: e.target.value }))}
                          placeholder="Brief case history and proceedings so far..."
                          className="min-h-[100px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Grounds</Label>
                        <Textarea
                          value={crpForm.grounds}
                          onChange={(e) => setCrpForm((p) => ({ ...p, grounds: e.target.value }))}
                          placeholder="Grounds for revision/quashing..."
                          className="min-h-[100px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>

                      <div className="space-y-2">
                        <Button variant="outline" size="sm" onClick={handleSuggestCRPGrounds} disabled={isSuggestingCRPGrounds} className="text-xs rounded-lg">
                          {isSuggestingCRPGrounds ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
                          Suggest Grounds
                        </Button>

                        {crpForm.suggestedGrounds.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {crpForm.suggestedGrounds.map((g, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setCrpForm((prev) => ({
                                    ...prev,
                                    suggestedGrounds: prev.suggestedGrounds.map((sg) =>
                                      sg.text === g.text ? { ...sg, selected: !sg.selected } : sg
                                    ),
                                  }))
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                                  g.selected
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : 'bg-muted border-border text-muted-foreground hover:border-primary/20'
                                )}
                              >
                                {g.selected && <CheckCircle2 className="size-3" />}
                                {g.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormSection>

                    {/* Generate Button */}
                    <motion.div variants={fadeInUp} custom={4} className="pt-2">
                      <Button
                        onClick={handleGenerate}
                        disabled={!crpForm.petitionerName || !crpForm.courtName}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                        )}
                      >
                        <Sparkles className="size-4 mr-2" />
                        Generate {crpForm.crpType === 'quashing' ? 'Quashing Petition' : 'Criminal Revision'}
                        <ChevronRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-4 text-xs text-red-500">
                        <TriangleAlert className="size-3.5 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ════════════════════════════════ */}
                {/* WIZARD STEP 1: Writ Petition     */}
                {/* ════════════════════════════════ */}
                {wizardStep === 1 && selectedModule === 'writ' && (
                  <motion.div
                    key="wiz-step-1-writ"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={staggerContainer}
                    className="max-w-2xl mx-auto space-y-0"
                  >
                    {/* Writ Type */}
                    <FormSection title="Writ Type" icon={Shield} index={0}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Type of Writ</Label>
                        <Select value={writForm.writType} onValueChange={(v) => setWritForm((p) => ({ ...p, writType: v }))}>
                          <SelectTrigger className="h-10 rounded-xl text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mandamus">Mandamus</SelectItem>
                            <SelectItem value="certiorari">Certiorari</SelectItem>
                            <SelectItem value="prohibition">Prohibition</SelectItem>
                            <SelectItem value="habeas_corpus">Habeas Corpus</SelectItem>
                            <SelectItem value="quo_warranto">Quo Warranto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <Label className="text-xs font-semibold">Is PIL?</Label>
                        <Button
                          type="button"
                          variant={writForm.isPIL ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setWritForm((p) => ({ ...p, isPIL: !p.isPIL }))}
                          className={cn(
                            'rounded-lg text-xs px-3 h-8 transition-all',
                            writForm.isPIL
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'border-border text-muted-foreground'
                          )}
                        >
                          {writForm.isPIL ? 'Yes — PIL' : 'No — Individual'}
                        </Button>
                      </div>
                    </FormSection>

                    {/* Petitioner */}
                    <FormSection title="Petitioner Details" icon={User} index={1}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Name</Label>
                          <Input value={writForm.petitionerName} onChange={(e) => setWritForm((p) => ({ ...p, petitionerName: e.target.value }))} placeholder="Petitioner name" className="h-10 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Advocate</Label>
                          <Input value={writForm.petitionerAdvocate} onChange={(e) => setWritForm((p) => ({ ...p, petitionerAdvocate: e.target.value }))} placeholder="Advocate name" className="h-10 rounded-xl text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Address</Label>
                        <Input value={writForm.petitionerAddress} onChange={(e) => setWritForm((p) => ({ ...p, petitionerAddress: e.target.value }))} placeholder="Petitioner address" className="h-10 rounded-xl text-sm" />
                      </div>
                    </FormSection>

                    {/* Respondents */}
                    <FormSection title="Respondent(s)" icon={Building} index={2}>
                      {writForm.respondents.map((resp, idx) => (
                        <div key={resp.id} className="relative p-4 rounded-xl border border-border bg-muted/30 mb-3">
                          {writForm.respondents.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 size-7"
                              onClick={() => removeWritRespondent(resp.id)}
                            >
                              <Trash2 className="size-3.5 text-muted-foreground hover:text-red-500" />
                            </Button>
                          )}
                          <p className="text-xs font-bold text-muted-foreground mb-3">Respondent {idx + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Designation</Label>
                              <Input value={resp.designation} onChange={(e) => updateWritRespondent(resp.id, 'designation', e.target.value)} placeholder="e.g. District Collector" className="h-9 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Department</Label>
                              <Input value={resp.department} onChange={(e) => updateWritRespondent(resp.id, 'department', e.target.value)} placeholder="e.g. Revenue Department" className="h-9 rounded-xl text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5 mt-3">
                            <Label className="text-xs font-semibold">Address</Label>
                            <Input value={resp.address} onChange={(e) => updateWritRespondent(resp.id, 'address', e.target.value)} placeholder="Office address" className="h-9 rounded-xl text-sm" />
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addWritRespondent} className="text-xs rounded-lg">
                        <Plus className="size-3.5 mr-1.5" /> Add Respondent
                      </Button>
                    </FormSection>

                    {/* Violation & Relief */}
                    <FormSection title="Violation & Relief" icon={AlertTriangle} index={3}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Fundamental Right Violated</Label>
                        <Select value={writForm.fundamentalRight} onValueChange={(v) => setWritForm((p) => ({ ...p, fundamentalRight: v }))}>
                          <SelectTrigger className="h-10 rounded-xl text-sm">
                            <SelectValue placeholder="Select article..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="art14">Article 14 — Equality</SelectItem>
                            <SelectItem value="art19">Article 19 — Freedom</SelectItem>
                            <SelectItem value="art21">Article 21 — Life & Liberty</SelectItem>
                            <SelectItem value="art22">Article 22 — Arrest Protection</SelectItem>
                            <SelectItem value="art32">Article 32 — SC Enforcement</SelectItem>
                            <SelectItem value="art226">Article 226 — HC Enforcement</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Administrative Action / Impugned Act</Label>
                        <Textarea
                          value={writForm.administrativeAction}
                          onChange={(e) => setWritForm((p) => ({ ...p, administrativeAction: e.target.value }))}
                          placeholder="Describe the administrative act or action being challenged..."
                          className="min-h-[80px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Relief Sought</Label>
                        <Textarea
                          value={writForm.reliefSought}
                          onChange={(e) => setWritForm((p) => ({ ...p, reliefSought: e.target.value }))}
                          placeholder="What relief is being sought..."
                          className="min-h-[80px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>
                    </FormSection>

                    {/* Facts */}
                    <FormSection title="Facts" icon={FileText} index={4}>
                      <Textarea
                        value={writForm.facts}
                        onChange={(e) => setWritForm((p) => ({ ...p, facts: e.target.value }))}
                        placeholder="Detailed factual narrative supporting the writ petition..."
                        className="min-h-[120px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                      />
                    </FormSection>

                    {/* Jurisdiction */}
                    <FormSection title="Jurisdiction" icon={Building} index={5}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Court</Label>
                        <Select value={writForm.jurisdiction} onValueChange={(v) => setWritForm((p) => ({ ...p, jurisdiction: v }))}>
                          <SelectTrigger className="h-10 rounded-xl text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high_court">High Court</SelectItem>
                            <SelectItem value="supreme_court">Supreme Court</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {writForm.jurisdiction === 'high_court' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">High Court Name</Label>
                          <Input
                            value={writForm.highCourtName}
                            onChange={(e) => setWritForm((p) => ({ ...p, highCourtName: e.target.value }))}
                            placeholder="e.g. Bombay High Court"
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                      )}
                    </FormSection>

                    {/* Generate Button */}
                    <motion.div variants={fadeInUp} custom={6} className="pt-2">
                      <Button
                        onClick={handleGenerate}
                        disabled={!writForm.petitionerName || !writForm.fundamentalRight}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                        )}
                      >
                        <Sparkles className="size-4 mr-2" />
                        Generate Writ Petition
                        <ChevronRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-4 text-xs text-red-500">
                        <TriangleAlert className="size-3.5 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ════════════════════════════════ */}
                {/* WIZARD STEP 1: CRLMP            */}
                {/* ════════════════════════════════ */}
                {wizardStep === 1 && selectedModule === 'crlmp' && (
                  <motion.div
                    key="wiz-step-1-crlmp"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={staggerContainer}
                    className="max-w-2xl mx-auto space-y-0"
                  >
                    {/* CRLMP Type */}
                    <FormSection title="CRLMP Type" icon={FileText} index={0}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Type</Label>
                        <Select value={crlmpForm.crlmpType} onValueChange={(v) => setCrlmpForm((p) => ({ ...p, crlmpType: v }))}>
                          <SelectTrigger className="h-10 rounded-xl text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="interim_relief">Interim Relief</SelectItem>
                            <SelectItem value="suspension">Suspension of Sentence</SelectItem>
                            <SelectItem value="modification">Modification</SelectItem>
                            <SelectItem value="directions">Directions</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                            <SelectItem value="expunction">Expunction</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormSection>

                    {/* Case Details */}
                    <FormSection title="Case Details" icon={BookOpen} index={1}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Case Number</Label>
                          <Input value={crlmpForm.caseNumber} onChange={(e) => setCrlmpForm((p) => ({ ...p, caseNumber: e.target.value }))} placeholder="e.g. CC-123/2024" className="h-10 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Court Name</Label>
                          <Input value={crlmpForm.courtName} onChange={(e) => setCrlmpForm((p) => ({ ...p, courtName: e.target.value }))} placeholder="Court name" className="h-10 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Order Date</Label>
                          <Input type="date" value={crlmpForm.orderDate} onChange={(e) => setCrlmpForm((p) => ({ ...p, orderDate: e.target.value }))} className="h-10 rounded-xl text-sm" />
                        </div>
                      </div>
                    </FormSection>

                    {/* Party Details */}
                    <FormSection title="Party Details" icon={User} index={2}>
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Petitioner</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Name</Label>
                              <Input value={crlmpForm.petitionerName} onChange={(e) => setCrlmpForm((p) => ({ ...p, petitionerName: e.target.value }))} placeholder="Petitioner name" className="h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Advocate</Label>
                              <Input value={crlmpForm.petitionerAdvocate} onChange={(e) => setCrlmpForm((p) => ({ ...p, petitionerAdvocate: e.target.value }))} placeholder="Advocate name" className="h-10 rounded-xl text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Address</Label>
                            <Input value={crlmpForm.petitionerAddress} onChange={(e) => setCrlmpForm((p) => ({ ...p, petitionerAddress: e.target.value }))} placeholder="Petitioner address" className="h-10 rounded-xl text-sm" />
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Respondent</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Name</Label>
                              <Input value={crlmpForm.respondentName} onChange={(e) => setCrlmpForm((p) => ({ ...p, respondentName: e.target.value }))} placeholder="Respondent name" className="h-10 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Advocate</Label>
                              <Input value={crlmpForm.respondentAdvocate} onChange={(e) => setCrlmpForm((p) => ({ ...p, respondentAdvocate: e.target.value }))} placeholder="Advocate name" className="h-10 rounded-xl text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Address</Label>
                            <Input value={crlmpForm.respondentAddress} onChange={(e) => setCrlmpForm((p) => ({ ...p, respondentAddress: e.target.value }))} placeholder="Respondent address" className="h-10 rounded-xl text-sm" />
                          </div>
                        </div>
                      </div>
                    </FormSection>

                    {/* Prayer & Grounds */}
                    <FormSection title="Prayer & Grounds" icon={Gavel} index={3}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Prayer Details</Label>
                        <Textarea
                          value={crlmpForm.prayer}
                          onChange={(e) => setCrlmpForm((p) => ({ ...p, prayer: e.target.value }))}
                          placeholder="What relief is being prayed for..."
                          className="min-h-[100px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Grounds</Label>
                        <Textarea
                          value={crlmpForm.grounds}
                          onChange={(e) => setCrlmpForm((p) => ({ ...p, grounds: e.target.value }))}
                          placeholder="Grounds supporting the application..."
                          className="min-h-[100px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                        />
                      </div>
                    </FormSection>

                    {/* Generate Button */}
                    <motion.div variants={fadeInUp} custom={4} className="pt-2">
                      <Button
                        onClick={handleGenerate}
                        disabled={!crlmpForm.petitionerName || !crlmpForm.caseNumber}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                        )}
                      >
                        <Sparkles className="size-4 mr-2" />
                        Generate CRLMP Application
                        <ChevronRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-4 text-xs text-red-500">
                        <TriangleAlert className="size-3.5 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Loading (AI Generating)              */}
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

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Preview                              */}
          {/* ════════════════════════════════════════════ */}
          {screen === 'preview' && (
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
                  <h2 className="text-lg font-bold text-foreground">{activeDoc?.title || 'Generated Document'}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generated by AI — Review and edit before filing
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={startNewMatter} className="rounded-lg">
                    <ArrowLeft className="size-3.5 mr-1.5" /> New Document
                  </Button>
                </div>
              </motion.div>

              {/* Tabs for multiple docs */}
              {generatedDocs.length > 1 && (
                <motion.div variants={fadeInUp} custom={1} className="mb-4">
                  <Tabs value={activeDocId} onValueChange={(v) => { setActiveDocId(v); const doc = generatedDocs.find((d) => d.id === v); if (doc) setEditContent(doc.content) }}>
                    <TabsList className="rounded-xl">
                      {generatedDocs.map((doc) => (
                        <TabsTrigger key={doc.id} value={doc.id} className="rounded-lg text-xs">
                          {doc.title.length > 30 ? doc.title.slice(0, 30) + '...' : doc.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* ── Document Preview ── */}
                <motion.div variants={fadeInUp} custom={generatedDocs.length > 1 ? 2 : 1}>
                  <Card className="rounded-xl border-2 border-border overflow-hidden">
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
                            setGeneratedDocs((prev) =>
                              prev.map((d) => (d.id === activeDocId ? { ...d, content: e.target.value } : d))
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
                  {/* Metadata */}
                  <Card className="rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        Document Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Module</span>
                        <Badge className={cn('text-[10px] px-2 py-0.5 rounded-md border', MODULE_BADGE_COLORS[selectedModule || 'bail'])}>
                          {selectedModule ? getModuleLabel(selectedModule) : 'Criminal'}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Status</span>
                        <Badge variant="outline" className="text-xs">Draft</Badge>
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
                        <span className="text-xs text-muted-foreground">Generated</span>
                        <span className="text-xs font-medium text-foreground">
                          {activeDoc
                            ? new Date(activeDoc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Points */}
                  {activeDoc && activeDoc.keyPoints.length > 0 && (
                    <Card className="rounded-xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-500" />
                          Key Points
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-2">
                          {activeDoc.keyPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                              <ChevronRight className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Warnings */}
                  {activeDoc && (
                    <Card className="rounded-xl border border-red-500/20 bg-red-500/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                          <TriangleAlert className="size-4" />
                          Warnings & Caveats
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                            AI-generated draft. Advocate review required before filing.
                          </span>
                        </div>
                        {activeDoc.warnings.length > 0 && (
                          <ul className="space-y-2">
                            {activeDoc.warnings.map((w, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-red-600/80 dark:text-red-300/80">
                                <ChevronRight className="size-3.5 mt-0.5 shrink-0" />
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Save & Actions */}
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
                    Save Matter
                  </Button>

                  <Button
                    variant="outline"
                    onClick={startNewMatter}
                    className="w-full h-11 text-sm font-semibold rounded-xl"
                  >
                    <Plus className="size-4 mr-2" />
                    New Document
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

/* ════════════════════════════════════════════════════════════════
   Fallback Document Builder
   ════════════════════════════════════════════════════════════════ */

function buildFallbackDocument(
  mod: ModuleType,
  forms: { bailForm: BailForm; crpForm: CRPForm; writForm: WritForm; crlmpForm: CRLMPForm },
): string {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  if (mod === 'bail') {
    const b = forms.bailForm
    const courtName = b.case.courtName.toUpperCase() || '[COURT NAME]'
    const section = b.bailType === 'anticipatory' ? 'SECTION 438 CrPC' : 'SECTION 439 CrPC'
    const caseNo = b.case.caseNumber || '[Case Number]'
    const partyLabel = b.accused.arrested ? 'Accused-Petitioner' : 'Applicant'
    const intro = b.accused.arrested
      ? 'The Accused-Petitioner above-named most respectfully submits:'
      : 'The Applicant above-named most respectfully submits:'
    const para1 = `1. That the ${partyLabel}, ${b.accused.name || '[Name]'}, aged ${b.accused.age || '[Age]'} years, ${b.accused.occupation ? 'occupation: ' + b.accused.occupation + ',' : ''} is a resident of ${b.accused.address || '[Address]'}.`
    const para2 = `2. That FIR No. ${b.fir.firNumber || '[FIR Number]'} has been registered at ${b.fir.policeStation || '[Police Station]'} on ${b.fir.firDate || '[date]'} under Sections ${b.fir.sectionsCharged || '[Sections]'} ${b.fir.lawType === 'bns' ? 'BNS' : 'IPC'}.`
    const para3 = b.accused.arrested
      ? `3. That the Accused-Petitioner was arrested on ${b.accused.dateOfCustody || '[date]'} and has been in custody for ${b.accused.custodyPeriod || '[period]'}.`
      : '3. That the Applicant is not under arrest.'
    const para4 = `4. That the next date of hearing is ${b.case.nextHearing || '[date]'}.`
    const para5 = `5. ${b.grounds || '[Grounds for bail]'}`
    const suretyText = b.suretyName
      ? `6. That the Applicant is ready to furnish surety through ${b.suretyName}, ${b.suretyRelation ? 'relation: ' + b.suretyRelation + ',' : ''} resident of ${b.suretyAddress || '[Surety Address]'}, in the sum of Rs. ${b.suretyAmount || '[Amount]'}.`
      : "6. That the Applicant is ready to furnish surety as directed by this Hon'ble Court."
    const bailLabel = b.bailType === 'anticipatory' ? 'anticipatory' : b.bailType === 'default' ? 'default/statutory' : 'regular'
    const prayer = `It is, therefore, most respectfully prayed that this Hon'ble Court may be pleased to grant ${bailLabel} bail to the ${partyLabel} on such terms and conditions as this Hon'ble Court may deem fit.`

    return [
      'IN THE COURT OF ' + courtName,
      '',
      'BAIL APPLICATION UNDER ' + section,
      '',
      'Case No. ' + caseNo,
      '',
      intro,
      '',
      para1,
      '',
      para2,
      '',
      para3,
      '',
      para4,
      '',
      para5,
      '',
      suretyText,
      '',
      'PRAYER',
      prayer,
      '',
      'Date: ' + date,
      '',
      '[' + partyLabel + ']',
      '',
      '[ADVOCATE FOR THE ' + (b.accused.arrested ? 'ACCUSED' : 'APPLICANT') + ']',
    ].join('\n')
  }

  if (mod === 'crp') {
    const c = forms.crpForm
    const sec = c.crpType === 'quashing' ? '482' : '397'
    const relief = c.crpType === 'quashing' ? 'quash the FIR/proceedings' : 'set aside the impugned order'

    return [
      'IN THE HIGH COURT OF [JURISDICTION]',
      '',
      'CRIMINAL REVISION / CRIMINAL WRIT PETITION',
      'UNDER SECTION ' + sec + ' CrPC',
      '',
      'PETITIONER: ' + (c.petitionerName || '[Petitioner Name]'),
      c.petitionerAdvocate ? 'Through Advocate: ' + c.petitionerAdvocate : '',
      '',
      'VERSUS',
      '',
      'RESPONDENT: ' + (c.respondentName || '[Respondent Name]'),
      c.respondentAdvocate ? 'Through Advocate: ' + c.respondentAdvocate : '',
      '',
      '1. That the Impugned Order was passed by ' + (c.courtName || '[Court Name]') + ' dated ' + (c.orderDate || '[date]') + '.',
      '',
      '2. ' + (c.orderDetails || '[Order details]'),
      '',
      '3. ' + (c.caseHistory || '[Case history]'),
      '',
      '4. ' + (c.grounds || '[Grounds for revision/quashing]'),
      '',
      'PRAYER',
      "It is, therefore, most respectfully prayed that this Hon'ble Court may be pleased to " + relief + " and grant such other relief as this Hon'ble Court may deem fit.",
      '',
      'Date: ' + date,
      '',
      '[PETITIONER THROUGH COUNSEL]',
    ].join('\n')
  }

  if (mod === 'writ') {
    const w = forms.writForm
    const courtName = w.jurisdiction === 'supreme_court'
      ? 'SUPREME COURT OF INDIA'
      : 'HIGH COURT OF ' + (w.highCourtName.toUpperCase() || '[HIGH COURT NAME]')
    const title = w.isPIL ? 'PUBLIC INTEREST LITIGATION' : 'WRIT PETITION'
    const article = w.fundamentalRight === 'art32' ? '32' : '226'
    const respondentsList = w.respondents
      .map((r, i) => 'RESPONDENT ' + (i + 1) + ': ' + (r.designation || '[Designation]') + ', ' + (r.department || '[Department]') + '\n' + (r.address || '[Address]'))
      .join('\n\n')

    return [
      'IN THE ' + courtName,
      '',
      title,
      'UNDER ARTICLE ' + article + ' OF THE CONSTITUTION OF INDIA',
      '',
      'WRIT OF ' + w.writType.toUpperCase(),
      '',
      'PETITIONER: ' + (w.petitionerName || '[Petitioner Name]'),
      w.petitionerAdvocate ? 'Through Advocate: ' + w.petitionerAdvocate : '',
      w.petitionerAddress || '[Petitioner Address]',
      '',
      'VERSUS',
      '',
      respondentsList,
      '',
      '1. ' + (w.facts || '[Facts of the case]'),
      '',
      '2. That the ' + (w.administrativeAction || '[administrative action]') + ' violates the fundamental rights of the Petitioner under ' + (w.fundamentalRight || '[Article]') + ' of the Constitution.',
      '',
      '3. ' + (w.reliefSought || '[Relief sought]'),
      '',
      'PRAYER',
      "It is, therefore, most respectfully prayed that this Hon'ble Court may be pleased to issue a Writ of " + w.writType.toUpperCase() + ' and grant such other relief as deemed fit.',
      '',
      'Date: ' + date,
      '',
      '[PETITIONER THROUGH COUNSEL]',
    ].join('\n')
  }

  if (mod === 'crlmp') {
    const c = forms.crlmpForm
    const typeLabel = c.crlmpType.replace(/_/g, ' ').toUpperCase()
    const sec = c.crlmpType === 'suspension' ? '389' : 'CrPC'

    return [
      'IN THE COURT OF ' + (c.courtName.toUpperCase() || '[COURT NAME]'),
      '',
      'APPLICATION UNDER SECTION ' + sec,
      '',
      'Case No. ' + (c.caseNumber || '[Case Number]'),
      '',
      'Type: ' + typeLabel,
      '',
      'PETITIONER: ' + (c.petitionerName || '[Petitioner Name]'),
      c.petitionerAdvocate ? 'Through Advocate: ' + c.petitionerAdvocate : '',
      '',
      'VERSUS',
      '',
      'RESPONDENT: ' + (c.respondentName || '[Respondent Name]'),
      '',
      '1. That the impugned order was passed on ' + (c.orderDate || '[date]') + '.',
      '',
      '2. ' + (c.prayer || '[Prayer details]'),
      '',
      '3. ' + (c.grounds || '[Grounds supporting the application]'),
      '',
      'PRAYER',
      "It is, therefore, most respectfully prayed that this Hon'ble Court may be pleased to grant the relief sought and pass such orders as deemed fit.",
      '',
      'Date: ' + date,
      '',
      '[PETITIONER THROUGH COUNSEL]',
    ].join('\n')
  }

  return ['[Generated Document - ' + mod.toUpperCase() + ']', '', 'Date: ' + date, '', '[Content to be generated by AI]'].join('\n')
}
