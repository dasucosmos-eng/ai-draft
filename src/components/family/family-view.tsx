'use client'
import { generateBrandedPdf } from '@/lib/pdf-generator'
import { stripMarkdown } from '@/lib/ai-service'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfileStore } from '@/store/profile-store'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  Brain,
  Building,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileDown,
  Edit3,
  FileCheck,
  Gavel,
  Heart,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Save,
  Scale,
  Shield,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  Users,
  X,
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
import { DocumentUpload } from '@/components/shared/document-upload'
import type { LucideIcon } from 'lucide-react'

/* ═══════════════════════════════════════════════════════ */
/* Constants                                              */
/* ═══════════════════════════════════════════════════════ */

const FAMILY_API = 'https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiFamily'

const STORAGE_KEY_PREFIX = 'aidraft_family_data_'

type FamilyModule = 'divorce' | 'dop' | 'mvop' | 'succession' | 'guardian' | 'maintenance'

interface ModuleOption {
  id: FamilyModule
  label: string
  icon: LucideIcon
  description: string
  color: string
  bgColor: string
}

const MODULES: ModuleOption[] = [
  { id: 'divorce', label: 'Divorce (HMOP)', icon: Heart, description: 'Contested or Mutual Consent under Hindu Marriage Act', color: 'text-rose-500', bgColor: 'bg-rose-500/10 group-hover:bg-rose-500/20' },
  { id: 'dop', label: 'Domestic Violence (DOP)', icon: Shield, description: 'Protection, Residence, Monetary relief under PWDVA', color: 'text-amber-500', bgColor: 'bg-amber-500/10 group-hover:bg-amber-500/20' },
  { id: 'mvop', label: 'Motor Accident (MVOP)', icon: Car, description: 'Compensation claims under Motor Vehicles Act', color: 'text-sky-500', bgColor: 'bg-sky-500/10 group-hover:bg-sky-500/20' },
  { id: 'succession', label: 'Succession Certificate', icon: FileCheck, description: 'Certified copy of legal heir, probate, letters of administration', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10 group-hover:bg-emerald-500/20' },
  { id: 'guardian', label: 'Guardianship', icon: Users, description: 'Guardian & Wards Act — custody, guardianship petitions', color: 'text-violet-500', bgColor: 'bg-violet-500/10 group-hover:bg-violet-500/20' },
  { id: 'maintenance', label: 'Maintenance', icon: IndianRupee, description: 'CrPC 125 / HAMA maintenance claims', color: 'text-orange-500', bgColor: 'bg-orange-500/10 group-hover:bg-orange-500/20' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
  FILED: { label: 'Filed', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
  PENDING: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' },
  ALLOWED: { label: 'Allowed', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' },
  DISMISSED: { label: 'Dismissed', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
  SETTLED: { label: 'Settled', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
}

const DIVORCE_GROUNDS = [
  { id: 'cruelty', label: 'Cruelty', section: 'Sec 13(1)(ia)' },
  { id: 'desertion', label: 'Desertion', section: 'Sec 13(1)(ib)' },
  { id: 'adultery', label: 'Adultery', section: 'Sec 13(1)(i)' },
  { id: 'conversion', label: 'Conversion', section: 'Sec 13(1)(ii)' },
  { id: 'unsound_mind', label: 'Unsound Mind', section: 'Sec 13(1)(iii)' },
  { id: 'renunciation', label: 'Renunciation', section: 'Sec 13(1)(vi)' },
  { id: 'presumption_death', label: 'Presumption of Death', section: 'Sec 13(1)(vii)' },
  { id: 'no_resumption', label: 'No Resumption', section: 'Sec 13(1)(ig)' },
  { id: 'custom', label: 'Custom/Other grounds', section: '' },
]

const DOP_RELIEF_OPTIONS = [
  'Protection Order',
  'Residence Order',
  'Monetary Relief',
  'Custody Order',
  'Compensation Order',
]

const DOP_RELATIONS = ['Husband', 'Father-in-law', 'Mother-in-law', 'Other']

const MVOP_VEHICLE_TYPES = ['Two-wheeler', 'Car', 'Truck', 'Bus', 'Auto', 'Other']

const SUCCESSION_PERSONAL_LAWS = ['Hindu', 'Muslim', 'Christian', 'Parsi', 'Other']

const CUSTODY_OPTIONS = ['Father', 'Mother', 'Joint', 'Grandparent', 'Other']

/* ═══════════════════════════════════════════════════════ */
/* Animation Variants (exact match)                       */
/* ═══════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════ */
/* Types                                                  */
/* ═══════════════════════════════════════════════════════ */

interface ChildEntry { id: string; name: string; age: string; gender: string; custodyPreference: string }
interface IncidentEntry { id: string; date: string; description: string }
interface HeirEntry { id: string; name: string; relation: string; age: string; address: string; share: string }
interface DependentEntry { id: string; name: string; age: string; relation: string }

interface FamilyMatter {
  id: string
  type: string
  module: FamilyModule
  status: string
  data: Record<string, unknown>
  documents: GeneratedDoc[]
  createdAt: string
  updatedAt: string
}

interface GeneratedDoc {
  id: string
  title: string
  content: string
  keyPoints: string[]
  warnings: string[]
}

/* ═══════════════════════════════════════════════════════ */
/* LocalStorage helpers                                    */
/* ═══════════════════════════════════════════════════════ */

function getMatters(): FamilyMatter[] {
  if (typeof window === 'undefined') return []
  const uid = localStorage.getItem('aidraft_current_uid')
  if (!uid) return []
  const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`)
  return raw ? JSON.parse(raw) : []
}

function setMatters(matters: FamilyMatter[]) {
  if (typeof window === 'undefined') return
  const uid = localStorage.getItem('aidraft_current_uid')
  if (!uid) return
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(matters))
}

/* ═══════════════════════════════════════════════════════ */
/* Helpers                                                */
/* ═══════════════════════════════════════════════════════ */

function uid() { return crypto.randomUUID() }

function getModuleLabel(mod: FamilyModule): string {
  return MODULES.find((m) => m.id === mod)?.label || mod
}

function getModuleIcon(mod: FamilyModule): LucideIcon {
  return MODULES.find((m) => m.id === mod)?.icon || FileCheck
}

/* ═══════════════════════════════════════════════════════ */
/* Shared form field components                          */
/* ═══════════════════════════════════════════════════════ */

function FormField({ label, id, value, onChange, placeholder, type = 'text', required = false, className = '' }: {
  label: string; id: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-xs font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 rounded-xl text-sm" />
    </div>
  )
}

function SelectField({ label, value, onValueChange, options, placeholder }: {
  label: string; value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-10 rounded-xl text-sm"><SelectValue placeholder={placeholder || 'Select...'} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

function FormSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border p-4 sm:p-5 space-y-4', className)}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/* Main Component                                         */
/* ═══════════════════════════════════════════════════════ */

export default function FamilyView() {
  const cases = useAppStore((s) => s.cases)

  /* ─── Screen / Step ─── */
  const [screen, setScreen] = useState<'list' | 'wizard' | 'preview'>('list')
  const [wizardStep, setWizardStep] = useState(0)
  const [selectedModule, setSelectedModule] = useState<FamilyModule | null>(null)
  const [matters, setLocalMatters] = useState<FamilyMatter[]>(() => getMatters())
  const [currentMatterId, setCurrentMatterId] = useState<string | null>(null)

  /* ─── Generation ─── */
  const [isGenerating, setIsGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genMessage, setGenMessage] = useState('')
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([])
  const [error, setError] = useState<string | null>(null)

  /* ─── Preview ─── */
  const [activeTab, setActiveTab] = useState<string>('document')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  /* ─── Divorce ─── */
  const [divorce, setDivorce] = useState({
    petitionerName: '', petitionerGender: '', petitionerAddress: '', petitionerReligion: '', petitionerOccupation: '', petitionerIncome: '',
    respondentName: '', respondentGender: '', respondentAddress: '', respondentReligion: '', respondentOccupation: '', respondentIncome: '',
    marriageDate: '', marriagePlace: '',
    divorceType: 'contested',
    waiverCooling: false,
    grounds: [] as string[],
    customGrounds: '',
    section: '',
  })
  const [children, setChildren] = useState<ChildEntry[]>([])

  /* ─── DOP ─── */
  const [dop, setDop] = useState({
    applicantName: '', applicantGender: '', applicantAge: '', applicantAddress: '', applicantOccupation: '', applicantIncome: '',
    respondentName: '', respondentGender: '', respondentAddress: '', respondentRelation: '', respondentOccupation: '', respondentIncome: '',
    reliefSought: [] as string[],
    applicationType: 'protection',
    dopChildren: '' as string,
  })
  const [incidents, setIncidents] = useState<IncidentEntry[]>([])
  const [dopChildren, setDopChildren] = useState<{ name: string; age: string }[]>([])

  /* ─── MVOP ─── */
  const [mvop, setMvop] = useState({
    claimantName: '', claimantAge: '', claimantAddress: '', claimantOccupation: '', claimantIncome: '',
    vehicleType: '', vehicleRegNumber: '', insuranceCompany: '', insurancePolicyNumber: '',
    accidentDate: '', accidentTime: '', accidentPlace: '',
    policeStation: '', firNumber: '',
    injuryNature: '', disabilityPercent: '', hospitalDays: '', medicalExpenses: '',
    claimType: 'full',
    isFatal: false,
    deceasedName: '', deceasedAge: '', deceasedIncome: '',
    numDependents: '',
  })
  const [dependents, setDependents] = useState<DependentEntry[]>([])

  /* ─── Succession ─── */
  const [succession, setSuccession] = useState({
    deceasedName: '', deceasedAge: '', deceasedDate: '', deceasedPlace: '', deceasedReligion: '', deceasedAddress: '',
    propertyType: 'immovable', propertyDescription: '', propertyValue: '', debtsLiabilities: '',
    personalLaw: 'Hindu',
    petitionType: 'succession',
  })
  const [heirs, setHeirs] = useState<HeirEntry[]>([])

  /* ─── Guardian ─── */
  const [guardian, setGuardian] = useState({
    minorName: '', minorAge: '', minorGender: '', minorAddress: '',
    parentName: '', parentRelation: 'Father', parentStatus: 'Alive', parentAddress: '',
    applicantName: '', applicantAddress: '', applicantRelation: '', applicantIncome: '',
    grounds: '',
    petitionType: 'guardianship',
  })

  /* ─── Maintenance ─── */
  const [maintenance, setMaintenance] = useState({
    actUnder: 'CrPC 125',
    applicantName: '', applicantGender: '', applicantAge: '', applicantAddress: '', applicantOccupation: '', applicantIncome: '',
    respondentName: '', respondentGender: '', respondentAddress: '', respondentOccupation: '', respondentIncome: '',
    marriageDate: '', separationDate: '',
    grounds: '',
    amountClaimed: '',
  })
  const [maintenanceChildren, setMaintenanceChildren] = useState<{ name: string; age: string; custody: string }[]>([])

  /* ─── Computed ─── */
  const totalShare = useMemo(() => {
    return heirs.reduce((sum, h) => sum + (parseFloat(h.share) || 0), 0)
  }, [heirs])

  const activeDoc = useMemo(
    () => generatedDocs.find((d) => d.id === activeTab) || generatedDocs[0] || null,
    [generatedDocs, activeTab]
  )

  /* ═══════════════════════════════════════════════════════ */
  /* Navigation helpers                                     */
  /* ═══════════════════════════════════════════════════════ */

  const startNewMatter = useCallback((mod: FamilyModule) => {
    setSelectedModule(mod)
    setScreen('wizard')
    setWizardStep(1)
    setGeneratedDocs([])
    setError(null)
    setIsEditing(false)
    setEditContent('')
    setCurrentMatterId(null)
    // Reset forms
    setDivorce({ petitionerName: '', petitionerGender: '', petitionerAddress: '', petitionerReligion: '', petitionerOccupation: '', petitionerIncome: '', respondentName: '', respondentGender: '', respondentAddress: '', respondentReligion: '', respondentOccupation: '', respondentIncome: '', marriageDate: '', marriagePlace: '', divorceType: 'contested', waiverCooling: false, grounds: [], customGrounds: '', section: '' })
    setChildren([])
    setDop({ applicantName: '', applicantGender: '', applicantAge: '', applicantAddress: '', applicantOccupation: '', applicantIncome: '', respondentName: '', respondentGender: '', respondentAddress: '', respondentRelation: '', respondentOccupation: '', respondentIncome: '', reliefSought: [], applicationType: 'protection', dopChildren: '' })
    setIncidents([])
    setDopChildren([])
    setMvop({ claimantName: '', claimantAge: '', claimantAddress: '', claimantOccupation: '', claimantIncome: '', vehicleType: '', vehicleRegNumber: '', insuranceCompany: '', insurancePolicyNumber: '', accidentDate: '', accidentTime: '', accidentPlace: '', policeStation: '', firNumber: '', injuryNature: '', disabilityPercent: '', hospitalDays: '', medicalExpenses: '', claimType: 'full', isFatal: false, deceasedName: '', deceasedAge: '', deceasedIncome: '', numDependents: '' })
    setDependents([])
    setSuccession({ deceasedName: '', deceasedAge: '', deceasedDate: '', deceasedPlace: '', deceasedReligion: '', deceasedAddress: '', propertyType: 'immovable', propertyDescription: '', propertyValue: '', debtsLiabilities: '', personalLaw: 'Hindu', petitionType: 'succession' })
    setHeirs([])
    setGuardian({ minorName: '', minorAge: '', minorGender: '', minorAddress: '', parentName: '', parentRelation: 'Father', parentStatus: 'Alive', parentAddress: '', applicantName: '', applicantAddress: '', applicantRelation: '', applicantIncome: '', grounds: '', petitionType: 'guardianship' })
    setMaintenance({ actUnder: 'CrPC 125', applicantName: '', applicantGender: '', applicantAge: '', applicantAddress: '', applicantOccupation: '', applicantIncome: '', respondentName: '', respondentGender: '', respondentAddress: '', respondentOccupation: '', respondentIncome: '', marriageDate: '', separationDate: '', grounds: '', amountClaimed: '' })
    setMaintenanceChildren([])
  }, [])

  const handleDeleteMatter = useCallback((id: string) => {
    const updated = getMatters().filter((m) => m.id !== id)
    setMatters(updated)
    setLocalMatters(updated)
  }, [])

  /* ─── Dynamic array helpers ─── */

  const addChild = useCallback(() => {
    setChildren((prev) => [...prev, { id: uid(), name: '', age: '', gender: '', custodyPreference: '' }])
  }, [])
  const removeChild = useCallback((id: string) => {
    setChildren((prev) => prev.filter((c) => c.id !== id))
  }, [])
  const updateChild = useCallback((id: string, key: keyof ChildEntry, val: string) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: val } : c)))
  }, [])

  const addIncident = useCallback(() => {
    setIncidents((prev) => [...prev, { id: uid(), date: '', description: '' }])
  }, [])
  const removeIncident = useCallback((id: string) => {
    setIncidents((prev) => prev.filter((i) => i.id !== id))
  }, [])
  const updateIncident = useCallback((id: string, key: keyof IncidentEntry, val: string) => {
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, [key]: val } : i)))
  }, [])

  const addDopChild = useCallback(() => {
    setDopChildren((prev) => [...prev, { name: '', age: '' }])
  }, [])
  const removeDopChild = useCallback((idx: number) => {
    setDopChildren((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const addDependent = useCallback(() => {
    setDependents((prev) => [...prev, { id: uid(), name: '', age: '', relation: '' }])
  }, [])
  const removeDependent = useCallback((id: string) => {
    setDependents((prev) => prev.filter((d) => d.id !== id))
  }, [])
  const updateDependent = useCallback((id: string, key: keyof DependentEntry, val: string) => {
    setDependents((prev) => prev.map((d) => (d.id === id ? { ...d, [key]: val } : d)))
  }, [])

  const addHeir = useCallback(() => {
    setHeirs((prev) => [...prev, { id: uid(), name: '', relation: '', age: '', address: '', share: '' }])
  }, [])
  const removeHeir = useCallback((id: string) => {
    setHeirs((prev) => prev.filter((h) => h.id !== id))
  }, [])
  const updateHeir = useCallback((id: string, key: keyof HeirEntry, val: string) => {
    setHeirs((prev) => prev.map((h) => (h.id === id ? { ...h, [key]: val } : h)))
  }, [])

  const addMaintenanceChild = useCallback(() => {
    setMaintenanceChildren((prev) => [...prev, { name: '', age: '', custody: '' }])
  }, [])
  const removeMaintenanceChild = useCallback((idx: number) => {
    setMaintenanceChildren((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  /* ═══════════════════════════════════════════════════════ */
  /* Generate functions                                     */
  /* ═══════════════════════════════════════════════════════ */

  const runGeneration = useCallback(async (task: string, payload: Record<string, unknown>) => {
    setIsGenerating(true)
    setGenProgress(0)
    setError(null)

    const messages = ['Analyzing inputs...', 'Generating content...', 'Applying legal sections...', 'Finalizing document...']
    let msgIdx = 0
    const msgInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, messages.length - 1)
      setGenMessage(messages[msgIdx])
    }, 1000)
    const progressInterval = setInterval(() => {
      setGenProgress((prev) => { if (prev >= 95) { clearInterval(progressInterval); return 95 }; return prev + Math.random() * 11 })
    }, 350)

    try {
      const response = await fetch(FAMILY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, ...payload }),
      })
      clearInterval(msgInterval)
      clearInterval(progressInterval)

      if (response.ok) {
        const data = await response.json()
        return data
      }
      return null
    } catch {
      clearInterval(msgInterval)
      clearInterval(progressInterval)
      return null
    }
  }, [])

  const finishGeneration = useCallback((docs: GeneratedDoc[]) => {
    setGenProgress(100)
    setGenMessage('Documents generated successfully!')
    setGeneratedDocs(docs)
    if (docs.length > 0) {
      setEditContent(docs[0].content)
      setActiveTab(docs[0].id)
    }
    setTimeout(() => {
      setIsGenerating(false)
      setScreen('preview')
    }, 800)
  }, [])

  const handleGenerateDivorce = useCallback(async () => {
    setIsGenerating(true); setGenProgress(0); setError(null)

    const payload = {
      task: 'generateDivorce',
      divorce, children, grounds: divorce.grounds,
    }

    const messages = ['Analyzing marriage details...', 'Drafting petition...', 'Applying HMA sections...', 'Finalizing divorce petition...']
    let msgIdx = 0
    const msgInterval = setInterval(() => { msgIdx = Math.min(msgIdx + 1, messages.length - 1); setGenMessage(messages[msgIdx]) }, 1000)
    const progressInterval = setInterval(() => { setGenProgress((prev) => { if (prev >= 95) return 95; return prev + Math.random() * 11 }) }, 350)

    try {
      const response = await fetch(FAMILY_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      clearInterval(msgInterval); clearInterval(progressInterval)
      const data = response.ok ? await response.json() : null
      const docs: GeneratedDoc[] = []
      if (data?.data?.content) {
        docs.push({ id: uid(), title: `Divorce Petition — ${divorce.petitionerName} v. ${divorce.respondentName}`, content: stripMarkdown(data.data.content), keyPoints: data.data.keyPoints || [], warnings: data.data.warnings || [] })
      } else {
        docs.push({ id: uid(), title: `Divorce Petition — ${divorce.petitionerName} v. ${divorce.respondentName}`, content: buildFallbackDivorce(divorce, children), keyPoints: ['Petition drafted based on inputs'], warnings: ['AI-generated draft — advocate review required.'] })
      }
      finishGeneration(docs)
    } catch {
      clearInterval(msgInterval); clearInterval(progressInterval)
      finishGeneration([{ id: uid(), title: 'Divorce Petition', content: buildFallbackDivorce(divorce, children), keyPoints: ['Petition drafted'], warnings: ['AI-generated draft.'] }])
    }
  }, [divorce, children, finishGeneration])

  const handleGenerateDOP = useCallback(async () => {
    setIsGenerating(true); setGenProgress(0); setError(null)

    const payload = { task: 'generateDOP', dop, incidents, dopChildren }

    const messages = ['Analyzing incidents...', 'Drafting DV application...', 'Applying PWDVA sections...', 'Finalizing application...']
    let msgIdx = 0
    const msgInterval = setInterval(() => { msgIdx = Math.min(msgIdx + 1, messages.length - 1); setGenMessage(messages[msgIdx]) }, 1000)
    const progressInterval = setInterval(() => { setGenProgress((prev) => { if (prev >= 95) return 95; return prev + Math.random() * 11 }) }, 350)

    try {
      const response = await fetch(FAMILY_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      clearInterval(msgInterval); clearInterval(progressInterval)
      const data = response.ok ? await response.json() : null
      const docs: GeneratedDoc[] = []
      if (data?.data?.content) {
        docs.push({ id: uid(), title: `DV Application — ${dop.applicantName}`, content: stripMarkdown(data.data.content), keyPoints: data.data.keyPoints || [], warnings: data.data.warnings || [] })
      } else {
        docs.push({ id: uid(), title: `DV Application — ${dop.applicantName}`, content: buildFallbackDOP(dop, incidents), keyPoints: ['Application drafted'], warnings: ['AI-generated draft.'] })
      }
      finishGeneration(docs)
    } catch {
      clearInterval(msgInterval); clearInterval(progressInterval)
      finishGeneration([{ id: uid(), title: 'DV Application', content: buildFallbackDOP(dop, incidents), keyPoints: ['Application drafted'], warnings: ['AI-generated draft.'] }])
    }
  }, [dop, incidents, dopChildren, finishGeneration])

  const handleGenerateMVOP = useCallback(async () => {
    setIsGenerating(true); setGenProgress(0); setError(null)

    const payload = { task: 'generateMVOP', mvop, dependents }

    const messages = ['Analyzing accident details...', 'Drafting claim petition...', 'Applying MV Act sections...', 'Finalizing MVOP...']
    let msgIdx = 0
    const msgInterval = setInterval(() => { msgIdx = Math.min(msgIdx + 1, messages.length - 1); setGenMessage(messages[msgIdx]) }, 1000)
    const progressInterval = setInterval(() => { setGenProgress((prev) => { if (prev >= 95) return 95; return prev + Math.random() * 11 }) }, 350)

    try {
      const response = await fetch(FAMILY_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      clearInterval(msgInterval); clearInterval(progressInterval)
      const data = response.ok ? await response.json() : null
      const docs: GeneratedDoc[] = []
      if (data?.data?.content) {
        docs.push({ id: uid(), title: `MVOP — ${mvop.claimantName}`, content: stripMarkdown(data.data.content), keyPoints: data.data.keyPoints || [], warnings: data.data.warnings || [] })
      } else {
        docs.push({ id: uid(), title: `MVOP — ${mvop.claimantName}`, content: buildFallbackMVOP(mvop), keyPoints: ['Claim petition drafted'], warnings: ['AI-generated draft.'] })
      }
      finishGeneration(docs)
    } catch {
      clearInterval(msgInterval); clearInterval(progressInterval)
      finishGeneration([{ id: uid(), title: 'Motor Accident Claim', content: buildFallbackMVOP(mvop), keyPoints: ['Petition drafted'], warnings: ['AI-generated draft.'] }])
    }
  }, [mvop, dependents, finishGeneration])

  const handleGenerateSuccession = useCallback(async () => {
    setIsGenerating(true); setGenProgress(0); setError(null)

    const payload = { task: 'generateSuccession', succession, heirs }

    const messages = ['Analyzing heir details...', 'Drafting petition...', 'Applying ISA sections...', 'Finalizing succession petition...']
    let msgIdx = 0
    const msgInterval = setInterval(() => { msgIdx = Math.min(msgIdx + 1, messages.length - 1); setGenMessage(messages[msgIdx]) }, 1000)
    const progressInterval = setInterval(() => { setGenProgress((prev) => { if (prev >= 95) return 95; return prev + Math.random() * 11 }) }, 350)

    try {
      const response = await fetch(FAMILY_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      clearInterval(msgInterval); clearInterval(progressInterval)
      const data = response.ok ? await response.json() : null
      const docs: GeneratedDoc[] = []
      if (data?.data?.content) {
        docs.push({ id: uid(), title: `Succession Petition — ${succession.deceasedName}`, content: stripMarkdown(data.data.content), keyPoints: data.data.keyPoints || [], warnings: data.data.warnings || [] })
      } else {
        docs.push({ id: uid(), title: `Succession Petition — ${succession.deceasedName}`, content: buildFallbackSuccession(succession, heirs), keyPoints: ['Petition drafted'], warnings: ['AI-generated draft.'] })
      }
      finishGeneration(docs)
    } catch {
      clearInterval(msgInterval); clearInterval(progressInterval)
      finishGeneration([{ id: uid(), title: 'Succession Petition', content: buildFallbackSuccession(succession, heirs), keyPoints: ['Petition drafted'], warnings: ['AI-generated draft.'] }])
    }
  }, [succession, heirs, finishGeneration])

  const handleGenerateGuardian = useCallback(async () => {
    setIsGenerating(true); setGenProgress(0); setError(null)

    const payload = { task: 'generateGuardian', guardian }

    const messages = ['Analyzing guardianship details...', 'Drafting petition...', 'Applying G&W Act sections...', 'Finalizing petition...']
    let msgIdx = 0
    const msgInterval = setInterval(() => { msgIdx = Math.min(msgIdx + 1, messages.length - 1); setGenMessage(messages[msgIdx]) }, 1000)
    const progressInterval = setInterval(() => { setGenProgress((prev) => { if (prev >= 95) return 95; return prev + Math.random() * 11 }) }, 350)

    try {
      const response = await fetch(FAMILY_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      clearInterval(msgInterval); clearInterval(progressInterval)
      const data = response.ok ? await response.json() : null
      const docs: GeneratedDoc[] = []
      if (data?.data?.content) {
        docs.push({ id: uid(), title: `Guardianship Petition — ${guardian.minorName}`, content: stripMarkdown(data.data.content), keyPoints: data.data.keyPoints || [], warnings: data.data.warnings || [] })
      } else {
        docs.push({ id: uid(), title: `Guardianship Petition — ${guardian.minorName}`, content: buildFallbackGuardian(guardian), keyPoints: ['Petition drafted'], warnings: ['AI-generated draft.'] })
      }
      finishGeneration(docs)
    } catch {
      clearInterval(msgInterval); clearInterval(progressInterval)
      finishGeneration([{ id: uid(), title: 'Guardianship Petition', content: buildFallbackGuardian(guardian), keyPoints: ['Petition drafted'], warnings: ['AI-generated draft.'] }])
    }
  }, [guardian, finishGeneration])

  const handleGenerateMaintenance = useCallback(async () => {
    setIsGenerating(true); setGenProgress(0); setError(null)

    const payload = { task: 'generateMaintenance', maintenance, maintenanceChildren }

    const messages = ['Analyzing maintenance details...', 'Drafting application...', 'Applying legal sections...', 'Finalizing application...']
    let msgIdx = 0
    const msgInterval = setInterval(() => { msgIdx = Math.min(msgIdx + 1, messages.length - 1); setGenMessage(messages[msgIdx]) }, 1000)
    const progressInterval = setInterval(() => { setGenProgress((prev) => { if (prev >= 95) return 95; return prev + Math.random() * 11 }) }, 350)

    try {
      const response = await fetch(FAMILY_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      clearInterval(msgInterval); clearInterval(progressInterval)
      const data = response.ok ? await response.json() : null
      const docs: GeneratedDoc[] = []
      if (data?.data?.content) {
        docs.push({ id: uid(), title: `Maintenance Application — ${maintenance.applicantName}`, content: stripMarkdown(data.data.content), keyPoints: data.data.keyPoints || [], warnings: data.data.warnings || [] })
      } else {
        docs.push({ id: uid(), title: `Maintenance Application — ${maintenance.applicantName}`, content: buildFallbackMaintenance(maintenance, maintenanceChildren), keyPoints: ['Application drafted'], warnings: ['AI-generated draft.'] })
      }
      finishGeneration(docs)
    } catch {
      clearInterval(msgInterval); clearInterval(progressInterval)
      finishGeneration([{ id: uid(), title: 'Maintenance Application', content: buildFallbackMaintenance(maintenance, maintenanceChildren), keyPoints: ['Application drafted'], warnings: ['AI-generated draft.'] }])
    }
  }, [maintenance, maintenanceChildren, finishGeneration])

  /* ─── Save Matter ─── */
  const handleSaveMatter = useCallback(() => {
    const now = new Date().toISOString()
    const mod = selectedModule || 'divorce'
    const matterData: Record<string, unknown> = {}

    if (mod === 'divorce') matterData.divorce = { ...divorce, children }
    else if (mod === 'dop') matterData.dop = { ...dop, incidents, dopChildren }
    else if (mod === 'mvop') matterData.mvop = { ...mvop, dependents }
    else if (mod === 'succession') matterData.succession = { ...succession, heirs }
    else if (mod === 'guardian') matterData.guardian = guardian
    else if (mod === 'maintenance') matterData.maintenance = { ...maintenance, maintenanceChildren }

    const matter: FamilyMatter = {
      id: currentMatterId || uid(),
      type: getModuleLabel(mod),
      module: mod,
      status: generatedDocs.length > 0 ? 'FILED' : 'DRAFT',
      data: matterData,
      documents: generatedDocs,
      createdAt: currentMatterId ? (matters.find((m) => m.id === currentMatterId)?.createdAt || now) : now,
      updatedAt: now,
    }

    const existing = getMatters()
    const idx = existing.findIndex((m) => m.id === matter.id)
    if (idx >= 0) existing[idx] = matter
    else existing.unshift(matter)
    setMatters(existing)
    setLocalMatters(existing)
    setCurrentMatterId(matter.id)
  }, [selectedModule, divorce, children, dop, incidents, dopChildren, mvop, dependents, succession, heirs, guardian, maintenance, maintenanceChildren, generatedDocs, currentMatterId, matters])

  /* ─── Copy / Download / Print ─── */
  const handleCopy = useCallback(() => { if (activeDoc) navigator.clipboard.writeText(activeDoc.content) }, [activeDoc])
  

  const handlePdfDownload = useCallback(() => {
    const profile = useProfileStore.getState().profile
    const doc = activeDoc
    if (!doc?.content) return
    generateBrandedPdf({ title: doc.title || 'Legal Document', content: doc.content, profile })
  }, [activeDoc])
const handleDownload = useCallback(() => {
    if (!activeDoc) return
    const blob = new Blob([activeDoc.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeDoc.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeDoc])
  const handlePrint = useCallback(() => {
    if (!activeDoc) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>${activeDoc.title}</title><style>body{font-family:'Times New Roman',serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;white-space:pre-wrap;}</style></head><body>${activeDoc.content}</body></html>`)
    w.document.close()
    w.print()
  }, [activeDoc])

  /* ═══════════════════════════════════════════════════════ */
  /* RENDER                                                 */
  /* ═══════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Matter List                          */}
          {/* ════════════════════════════════════════════ */}
          {screen === 'list' && !isGenerating && (
            <motion.div key="screen-list" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
              {/* Header */}
              <motion.div variants={fadeInUp} custom={0} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                      <Scale className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    Family &amp; Motor Accident
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
                    HMOP, DOP, MVOP, Succession, Guardian, Maintenance
                  </p>
                </div>
              </motion.div>

              {/* New Matter Card */}
              <motion.div variants={fadeInUp} custom={1} className="mb-6">
                <motion.button
                  onClick={() => { setWizardStep(0); setScreen('wizard'); setSelectedModule(null) }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'w-full flex items-center gap-4 p-5 sm:p-6 rounded-xl text-left transition-all duration-200',
                    'border-2 border-dashed border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5',
                    'hover:border-amber-500/50 hover:from-amber-500/10 hover:to-orange-500/10 group'
                  )}
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow">
                    <Plus className="size-6 text-white" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">New Family/MV Matter</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Start a new family law or motor accident petition with AI-powered drafting
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              </motion.div>

              {/* Matter Cards */}
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
                          'border border-border bg-card hover:border-primary/30 hover:shadow-md group'
                        )}
                        onClick={() => {
                          setCurrentMatterId(matter.id)
                          setSelectedModule(matter.module)
                          if (matter.documents.length > 0) {
                            setGeneratedDocs(matter.documents)
                            setEditContent(matter.documents[0].content)
                            setActiveTab(matter.documents[0].id)
                            setScreen('preview')
                          } else {
                            setScreen('wizard')
                            setWizardStep(1)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                              <ModIcon className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{matter.type}</p>
                              <p className="text-xs text-muted-foreground truncate">{matter.module}</p>
                            </div>
                          </div>
                          <Badge className={cn('text-[10px] px-2 py-0.5 rounded-md border', statusCfg.bgColor, statusCfg.color)}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Status</span>
                            <span className="text-xs font-medium text-foreground">{matter.status}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Documents</span>
                            <span className="text-xs font-medium text-foreground">{matter.documents.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Created</span>
                            <span className="text-xs font-medium text-foreground">{new Date(matter.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="size-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(matter.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); handleDeleteMatter(matter.id) }}
                          >
                            <Trash2 className="size-3.5 text-red-500" />
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div variants={fadeInUp} custom={2} className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
                    <Scale className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">No Family Matters</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Create your first family law or motor accident matter. The AI will help you draft petitions, applications, and claims.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Wizard                               */}
          {/* ════════════════════════════════════════════ */}
          {screen === 'wizard' && !isGenerating && (
            <motion.div key="screen-wizard" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
              {/* Header */}
              <motion.div variants={fadeInUp} custom={0} className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" onClick={() => setScreen('list')} className="-ml-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-4 mr-1.5" /> Back
                </Button>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                    <Scale className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h1 className="text-lg font-bold text-foreground">
                    {wizardStep === 0 ? 'Select Module' : selectedModule ? getModuleLabel(selectedModule) : 'New Matter'}
                  </h1>
                </div>
              </motion.div>

              <AnimatePresence mode="wait">

                {/* ──── STEP 0: Module Selection ──── */}
                {wizardStep === 0 && (
                  <motion.div key="wiz-step-0" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Select Module
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Choose the type of family or motor accident matter you want to create
                    </motion.p>
                    <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {MODULES.map((mod, idx) => (
                        <motion.button
                          key={mod.id}
                          variants={fadeInUp}
                          custom={idx % 6}
                          onClick={() => startNewMatter(mod.id)}
                          className={cn(
                            'flex flex-col items-start gap-3 rounded-xl p-4 sm:p-5 text-left transition-all duration-200',
                            'border border-border bg-card hover:border-primary/30 hover:bg-primary/5',
                            'group active:scale-[0.97]'
                          )}
                        >
                          <div className={cn('flex size-11 items-center justify-center rounded-xl transition-colors', mod.bgColor)}>
                            <mod.icon className={cn('size-5', mod.color)} />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-foreground">{mod.label}</span>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mod.description}</p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {/* ──── STEP 1: Divorce Form ──── */}
                {wizardStep === 1 && selectedModule === 'divorce' && (
                  <motion.div key="wiz-step-divorce" initial="hidden" animate="visible" exit="exit" variants={staggerContainer} className="max-w-3xl mx-auto space-y-6">
                    {/* Upload Documents */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <div className="space-y-3 mb-2">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <Upload className="size-3.5" />
                              Upload Marriage Certificate / Documents
                            </Label>
                            <p className="text-[10px] text-muted-foreground">Upload marriage certificate, photos, or other documents. AI will extract details.</p>
                            <DocumentUpload module="family" maxFiles={5} compact
                              onFilesExtracted={(files) => {
                                const texts = files.filter((f) => f.extractedText).map((f) => f.extractedText || '')
                              }}
                              onAiDataExtracted={(data) => {
                                if (!data) return
                                const d = data as Record<string, unknown>
                                if (d.petitionerName) setDivorce((p) => ({ ...p, petitionerName: String(d.petitionerName || p.petitionerName) }))
                                if (d.respondentName) setDivorce((p) => ({ ...p, respondentName: String(d.respondentName || p.respondentName) }))
                                if (d.marriageDate) setDivorce((p) => ({ ...p, marriageDate: String(d.marriageDate || p.marriageDate) }))
                                if (d.marriagePlace) setDivorce((p) => ({ ...p, marriagePlace: String(d.marriagePlace || p.marriagePlace) }))
                                if (d.grounds) setDivorce((p) => ({ ...p, grounds: Array.isArray(d.grounds) ? d.grounds.map(String) : p.grounds }))
                              }}
                            />
                      </div>
                    </motion.div>
                    {/* Petitioner */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <FormSection>
                        <SectionHeader icon={User} title="Petitioner Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="pName" value={divorce.petitionerName} onChange={(v) => setDivorce((p) => ({ ...p, petitionerName: v }))} placeholder="Petitioner's name" required className="sm:col-span-2" />
                          <SelectField label="Gender" value={divorce.petitionerGender} onValueChange={(v) => setDivorce((p) => ({ ...p, petitionerGender: v }))} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} placeholder="Select gender" />
                          <FormField label="Religion" id="pReligion" value={divorce.petitionerReligion} onChange={(v) => setDivorce((p) => ({ ...p, petitionerReligion: v }))} placeholder="e.g., Hindu" />
                          <FormField label="Address" id="pAddress" value={divorce.petitionerAddress} onChange={(v) => setDivorce((p) => ({ ...p, petitionerAddress: v }))} placeholder="Full address" className="sm:col-span-2" />
                          <FormField label="Occupation" id="pOccupation" value={divorce.petitionerOccupation} onChange={(v) => setDivorce((p) => ({ ...p, petitionerOccupation: v }))} placeholder="e.g., Private Service" />
                          <FormField label="Monthly Income" id="pIncome" value={divorce.petitionerIncome} onChange={(v) => setDivorce((p) => ({ ...p, petitionerIncome: v }))} placeholder="e.g., 50000" type="number" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Respondent */}
                    <motion.div variants={fadeInUp} custom={1}>
                      <FormSection>
                        <SectionHeader icon={User} title="Respondent (Spouse) Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="rName" value={divorce.respondentName} onChange={(v) => setDivorce((p) => ({ ...p, respondentName: v }))} placeholder="Respondent's name" required className="sm:col-span-2" />
                          <SelectField label="Gender" value={divorce.respondentGender} onValueChange={(v) => setDivorce((p) => ({ ...p, respondentGender: v }))} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} placeholder="Select gender" />
                          <FormField label="Religion" id="rReligion" value={divorce.respondentReligion} onChange={(v) => setDivorce((p) => ({ ...p, respondentReligion: v }))} placeholder="e.g., Hindu" />
                          <FormField label="Address" id="rAddress" value={divorce.respondentAddress} onChange={(v) => setDivorce((p) => ({ ...p, respondentAddress: v }))} placeholder="Full address" className="sm:col-span-2" />
                          <FormField label="Occupation" id="rOccupation" value={divorce.respondentOccupation} onChange={(v) => setDivorce((p) => ({ ...p, respondentOccupation: v }))} placeholder="e.g., Business" />
                          <FormField label="Monthly Income" id="rIncome" value={divorce.respondentIncome} onChange={(v) => setDivorce((p) => ({ ...p, respondentIncome: v }))} placeholder="e.g., 75000" type="number" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Marriage Details */}
                    <motion.div variants={fadeInUp} custom={2}>
                      <FormSection>
                        <SectionHeader icon={Heart} title="Marriage Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Date of Marriage" id="mDate" value={divorce.marriageDate} onChange={(v) => setDivorce((p) => ({ ...p, marriageDate: v }))} type="date" required />
                          <FormField label="Place of Marriage" id="mPlace" value={divorce.marriagePlace} onChange={(v) => setDivorce((p) => ({ ...p, marriagePlace: v }))} placeholder="e.g., Chennai, Tamil Nadu" />
                        </div>

                        {/* Children */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-xs font-semibold">Children</Label>
                            <Button variant="outline" size="sm" onClick={addChild} className="h-8 rounded-lg text-xs">
                              <Plus className="size-3.5 mr-1" /> Add Child
                            </Button>
                          </div>
                          {children.length > 0 && (
                            <div className="space-y-3">
                              {children.map((child, idx) => (
                                <div key={child.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20">
                                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <FormField label="Name" id={`child-name-${idx}`} value={child.name} onChange={(v) => updateChild(child.id, 'name', v)} placeholder="Name" />
                                    <FormField label="Age" id={`child-age-${idx}`} value={child.age} onChange={(v) => updateChild(child.id, 'age', v)} placeholder="Age" type="number" />
                                    <SelectField label="Gender" value={child.gender} onValueChange={(v) => updateChild(child.id, 'gender', v)} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} placeholder="Gender" />
                                    <SelectField label="Custody Pref." value={child.custodyPreference} onValueChange={(v) => updateChild(child.id, 'custodyPreference', v)} options={CUSTODY_OPTIONS.map((c) => ({ value: c, label: c }))} placeholder="Custody" />
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => removeChild(child.id)} className="size-8 shrink-0 mt-4">
                                    <Trash2 className="size-3.5 text-red-500" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          {children.length === 0 && (
                            <p className="text-xs text-muted-foreground">No children added. Click &quot;Add Child&quot; to add.</p>
                          )}
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Divorce Type */}
                    <motion.div variants={fadeInUp} custom={3}>
                      <FormSection>
                        <SectionHeader icon={Gavel} title="Divorce Type" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { value: 'contested', label: 'Contested', desc: 'Sec 13 HMA' },
                            { value: 'mutual', label: 'Mutual Consent', desc: 'Sec 13-B HMA' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setDivorce((p) => ({ ...p, divorceType: opt.value }))}
                              className={cn(
                                'flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all duration-200',
                                divorce.divorceType === opt.value
                                  ? 'border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400'
                                  : 'border-border hover:border-primary/30'
                              )}
                            >
                              <span className="text-sm font-semibold">{opt.label}</span>
                              <span className="text-xs text-muted-foreground">{opt.desc}</span>
                            </button>
                          ))}
                        </div>

                        {/* Waiver toggle for mutual consent */}
                        {divorce.divorceType === 'mutual' && (
                          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                              <Label className="text-sm font-semibold">Waiver of 6-month cooling period?</Label>
                              <p className="text-xs text-muted-foreground">Under Sec 13-B(2) proviso, apply for waiver</p>
                            </div>
                            <Switch checked={divorce.waiverCooling} onCheckedChange={(v) => setDivorce((p) => ({ ...p, waiverCooling: v }))} />
                          </div>
                        )}
                      </FormSection>
                    </motion.div>

                    {/* Grounds (for contested) */}
                    {divorce.divorceType === 'contested' && (
                      <motion.div variants={fadeInUp} custom={4}>
                        <FormSection>
                          <SectionHeader icon={AlertTriangle} title="Grounds for Divorce" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {DIVORCE_GROUNDS.map((g) => (
                              <button
                                key={g.id}
                                onClick={() => setDivorce((p) => ({
                                  ...p,
                                  grounds: p.grounds.includes(g.id) ? p.grounds.filter((x) => x !== g.id) : [...p.grounds, g.id],
                                }))}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200',
                                  divorce.grounds.includes(g.id)
                                    ? 'border-primary/50 bg-primary/5'
                                    : 'border-border hover:border-primary/30'
                                )}
                              >
                                <div className={cn(
                                  'flex size-5 items-center justify-center rounded border-2 transition-colors shrink-0',
                                  divorce.grounds.includes(g.id) ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                                )}>
                                  {divorce.grounds.includes(g.id) && <CheckCircle2 className="size-3 text-primary-foreground" />}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-medium">{g.label}</span>
                                  {g.section && <span className="block text-xs text-muted-foreground">{g.section}</span>}
                                </div>
                              </button>
                            ))}
                          </div>
                          {divorce.grounds.includes('custom') && (
                            <div className="mt-3">
                              <FormField label="Describe custom grounds" id="customGrounds" value={divorce.customGrounds} onChange={(v) => setDivorce((p) => ({ ...p, customGrounds: v }))} placeholder="Describe the custom or other grounds for divorce..." />
                            </div>
                          )}
                        </FormSection>
                      </motion.div>
                    )}

                    {/* Section input */}
                    <motion.div variants={fadeInUp} custom={5}>
                      <FormField label="Section (auto-suggested or manual)" id="section" value={divorce.section} onChange={(v) => setDivorce((p) => ({ ...p, section: v }))} placeholder="e.g., Sec 13(1)(ia) HMA" />
                    </motion.div>

                    {/* Generate */}
                    <motion.div variants={fadeInUp} custom={6}>
                      <Button
                        onClick={handleGenerateDivorce}
                        disabled={!divorce.petitionerName || !divorce.respondentName}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                        )}
                      >
                        <Sparkles className="size-4 mr-2" />
                        Generate Divorce Petition
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-red-500">
                        <TriangleAlert className="size-3.5 shrink-0" />{error}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ──── STEP 1: DOP Form ──── */}
                {wizardStep === 1 && selectedModule === 'dop' && (
                  <motion.div key="wiz-step-dop" initial="hidden" animate="visible" exit="exit" variants={staggerContainer} className="max-w-3xl mx-auto space-y-6">
                    {/* Applicant */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <FormSection>
                        <SectionHeader icon={User} title="Applicant Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="aName" value={dop.applicantName} onChange={(v) => setDop((p) => ({ ...p, applicantName: v }))} placeholder="Applicant's name" required className="sm:col-span-2" />
                          <SelectField label="Gender" value={dop.applicantGender} onValueChange={(v) => setDop((p) => ({ ...p, applicantGender: v }))} options={[{ value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }, { value: 'Other', label: 'Other' }]} />
                          <FormField label="Age" id="aAge" value={dop.applicantAge} onChange={(v) => setDop((p) => ({ ...p, applicantAge: v }))} type="number" placeholder="Age" />
                          <FormField label="Address" id="aAddress" value={dop.applicantAddress} onChange={(v) => setDop((p) => ({ ...p, applicantAddress: v }))} placeholder="Full address" className="sm:col-span-2" />
                          <FormField label="Occupation" id="aOcc" value={dop.applicantOccupation} onChange={(v) => setDop((p) => ({ ...p, applicantOccupation: v }))} placeholder="Occupation" />
                          <FormField label="Income" id="aIncome" value={dop.applicantIncome} onChange={(v) => setDop((p) => ({ ...p, applicantIncome: v }))} placeholder="Monthly income" type="number" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Respondent */}
                    <motion.div variants={fadeInUp} custom={1}>
                      <FormSection>
                        <SectionHeader icon={User} title="Respondent Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="rName" value={dop.respondentName} onChange={(v) => setDop((p) => ({ ...p, respondentName: v }))} placeholder="Respondent's name" required className="sm:col-span-2" />
                          <SelectField label="Gender" value={dop.respondentGender} onValueChange={(v) => setDop((p) => ({ ...p, respondentGender: v }))} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
                          <SelectField label="Relation" value={dop.respondentRelation} onValueChange={(v) => setDop((p) => ({ ...p, respondentRelation: v }))} options={DOP_RELATIONS.map((r) => ({ value: r, label: r }))} placeholder="Relation" />
                          <FormField label="Address" id="rAddr" value={dop.respondentAddress} onChange={(v) => setDop((p) => ({ ...p, respondentAddress: v }))} placeholder="Address" className="sm:col-span-2" />
                          <FormField label="Occupation" id="rOcc" value={dop.respondentOccupation} onChange={(v) => setDop((p) => ({ ...p, respondentOccupation: v }))} placeholder="Occupation" />
                          <FormField label="Income" id="rIncome" value={dop.respondentIncome} onChange={(v) => setDop((p) => ({ ...p, respondentIncome: v }))} placeholder="Income" type="number" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Incidents */}
                    <motion.div variants={fadeInUp} custom={2}>
                      <FormSection>
                        <SectionHeader icon={AlertTriangle} title="Incidents of Domestic Violence" />
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-xs font-semibold">Incident Records</Label>
                          <Button variant="outline" size="sm" onClick={addIncident} className="h-8 rounded-lg text-xs">
                            <Plus className="size-3.5 mr-1" /> Add Incident
                          </Button>
                        </div>
                        {incidents.length > 0 ? (
                          <div className="space-y-3">
                            {incidents.map((inc, idx) => (
                              <div key={inc.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2">
                                  <FormField label="Date" id={`inc-date-${idx}`} value={inc.date} onChange={(v) => updateIncident(inc.id, 'date', v)} type="date" />
                                  <div className="space-y-1.5 sm:col-span-4">
                                    <Label className="text-xs font-semibold">Description</Label>
                                    <Textarea value={inc.description} onChange={(e) => updateIncident(inc.id, 'description', e.target.value)} placeholder="Describe the incident..." className="min-h-[60px] text-sm rounded-xl resize-y" />
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeIncident(inc.id)} className="size-8 shrink-0 mt-5">
                                  <Trash2 className="size-3.5 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No incidents added.</p>
                        )}
                      </FormSection>
                    </motion.div>

                    {/* DOP Children */}
                    <motion.div variants={fadeInUp} custom={3}>
                      <FormSection>
                        <SectionHeader icon={Baby} title="Children" />
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-xs font-semibold">Children Details</Label>
                          <Button variant="outline" size="sm" onClick={addDopChild} className="h-8 rounded-lg text-xs">
                            <Plus className="size-3.5 mr-1" /> Add Child
                          </Button>
                        </div>
                        {dopChildren.length > 0 ? (
                          <div className="space-y-2">
                            {dopChildren.map((c, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <FormField label="Name" id={`dop-ch-name-${idx}`} value={c.name} onChange={(v) => { const n = [...dopChildren]; n[idx] = { ...n[idx], name: v }; setDopChildren(n) }} placeholder="Name" className="flex-1" />
                                <FormField label="Age" id={`dop-ch-age-${idx}`} value={c.age} onChange={(v) => { const n = [...dopChildren]; n[idx] = { ...n[idx], age: v }; setDopChildren(n) }} type="number" placeholder="Age" className="w-24" />
                                <Button variant="ghost" size="icon" onClick={() => removeDopChild(idx)} className="size-8 shrink-0 mt-5"><Trash2 className="size-3.5 text-red-500" /></Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No children added.</p>
                        )}
                      </FormSection>
                    </motion.div>

                    {/* Relief Sought */}
                    <motion.div variants={fadeInUp} custom={4}>
                      <FormSection>
                        <SectionHeader icon={Shield} title="Relief Sought" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {DOP_RELIEF_OPTIONS.map((relief) => (
                            <button
                              key={relief}
                              onClick={() => setDop((p) => ({
                                ...p,
                                reliefSought: p.reliefSought.includes(relief) ? p.reliefSought.filter((r) => r !== relief) : [...p.reliefSought, relief],
                              }))}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200',
                                dop.reliefSought.includes(relief) ? 'border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400' : 'border-border hover:border-primary/30'
                              )}
                            >
                              <div className={cn(
                                'flex size-5 items-center justify-center rounded border-2 transition-colors shrink-0',
                                dop.reliefSought.includes(relief) ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/30'
                              )}>
                                {dop.reliefSought.includes(relief) && <CheckCircle2 className="size-3 text-white" />}
                              </div>
                              <span className="text-sm font-medium">{relief}</span>
                            </button>
                          ))}
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Application Type */}
                    <motion.div variants={fadeInUp} custom={5}>
                      <FormSection>
                        <SectionHeader icon={Gavel} title="Application Type" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {['Protection', 'Residence', 'Monetary', 'Custody', 'Compensation'].map((t) => (
                            <button
                              key={t}
                              onClick={() => setDop((p) => ({ ...p, applicationType: t.toLowerCase() }))}
                              className={cn(
                                'p-3 rounded-xl border-2 text-center text-sm font-medium transition-all duration-200',
                                dop.applicationType === t.toLowerCase() ? 'border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400' : 'border-border hover:border-primary/30'
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Generate */}
                    <motion.div variants={fadeInUp} custom={6}>
                      <Button onClick={handleGenerateDOP} disabled={!dop.applicantName || !dop.respondentName} className={cn('w-full h-12 text-sm font-semibold rounded-xl', 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700', 'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40', 'transition-all duration-200 active:scale-[0.98]', 'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none')}>
                        <Sparkles className="size-4 mr-2" /> Generate DV Application <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-red-500"><TriangleAlert className="size-3.5 shrink-0" />{error}</motion.div>}
                  </motion.div>
                )}

                {/* ──── STEP 1: MVOP Form ──── */}
                {wizardStep === 1 && selectedModule === 'mvop' && (
                  <motion.div key="wiz-step-mvop" initial="hidden" animate="visible" exit="exit" variants={staggerContainer} className="max-w-3xl mx-auto space-y-6">
                    {/* Claimant */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <FormSection>
                        <SectionHeader icon={User} title="Claimant Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="clName" value={mvop.claimantName} onChange={(v) => setMvop((p) => ({ ...p, claimantName: v }))} placeholder="Claimant's name" required className="sm:col-span-2" />
                          <FormField label="Age" id="clAge" value={mvop.claimantAge} onChange={(v) => setMvop((p) => ({ ...p, claimantAge: v }))} type="number" placeholder="Age" />
                          <FormField label="Occupation" id="clOcc" value={mvop.claimantOccupation} onChange={(v) => setMvop((p) => ({ ...p, claimantOccupation: v }))} placeholder="Occupation" />
                          <FormField label="Address" id="clAddr" value={mvop.claimantAddress} onChange={(v) => setMvop((p) => ({ ...p, claimantAddress: v }))} placeholder="Address" className="sm:col-span-2" />
                          <FormField label="Monthly Income" id="clInc" value={mvop.claimantIncome} onChange={(v) => setMvop((p) => ({ ...p, claimantIncome: v }))} type="number" placeholder="Income" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Vehicle */}
                    <motion.div variants={fadeInUp} custom={1}>
                      <FormSection>
                        <SectionHeader icon={Car} title="Vehicle Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <SelectField label="Vehicle Type" value={mvop.vehicleType} onValueChange={(v) => setMvop((p) => ({ ...p, vehicleType: v }))} options={MVOP_VEHICLE_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Select type" />
                          <FormField label="Registration Number" id="vReg" value={mvop.vehicleRegNumber} onChange={(v) => setMvop((p) => ({ ...p, vehicleRegNumber: v }))} placeholder="e.g., TN-01-AB-1234" />
                          <FormField label="Insurance Company" id="vIns" value={mvop.insuranceCompany} onChange={(v) => setMvop((p) => ({ ...p, insuranceCompany: v }))} placeholder="Insurance company" />
                          <FormField label="Policy Number" id="vPol" value={mvop.insurancePolicyNumber} onChange={(v) => setMvop((p) => ({ ...p, insurancePolicyNumber: v }))} placeholder="Policy number" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Accident */}
                    <motion.div variants={fadeInUp} custom={2}>
                      <FormSection>
                        <SectionHeader icon={Calendar} title="Accident Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Date" id="accDate" value={mvop.accidentDate} onChange={(v) => setMvop((p) => ({ ...p, accidentDate: v }))} type="date" required />
                          <FormField label="Time" id="accTime" value={mvop.accidentTime} onChange={(v) => setMvop((p) => ({ ...p, accidentTime: v }))} type="time" />
                          <FormField label="Place" id="accPlace" value={mvop.accidentPlace} onChange={(v) => setMvop((p) => ({ ...p, accidentPlace: v }))} placeholder="Location of accident" className="sm:col-span-2" />
                          <FormField label="Police Station" id="psName" value={mvop.policeStation} onChange={(v) => setMvop((p) => ({ ...p, policeStation: v }))} placeholder="Police station name" />
                          <FormField label="FIR Number" id="firNo" value={mvop.firNumber} onChange={(v) => setMvop((p) => ({ ...p, firNumber: v }))} placeholder="FIR number" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Injury */}
                    <motion.div variants={fadeInUp} custom={3}>
                      <FormSection>
                        <SectionHeader icon={AlertTriangle} title="Injury Details" />
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Nature of Injury</Label>
                          <Textarea value={mvop.injuryNature} onChange={(e) => setMvop((p) => ({ ...p, injuryNature: e.target.value }))} placeholder="Describe injuries sustained..." className="min-h-[80px] text-sm rounded-xl resize-y" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                          <FormField label="Disability %" id="disPct" value={mvop.disabilityPercent} onChange={(v) => setMvop((p) => ({ ...p, disabilityPercent: v }))} type="number" placeholder="e.g., 30" />
                          <FormField label="Hospital Days" id="hospDays" value={mvop.hospitalDays} onChange={(v) => setMvop((p) => ({ ...p, hospitalDays: v }))} type="number" placeholder="Days" />
                          <FormField label="Medical Expenses" id="medExp" value={mvop.medicalExpenses} onChange={(v) => setMvop((p) => ({ ...p, medicalExpenses: v }))} type="number" placeholder="Amount in INR" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Claim Type */}
                    <motion.div variants={fadeInUp} custom={4}>
                      <FormSection>
                        <SectionHeader icon={Gavel} title="Claim Type" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { value: 'full', label: 'Full Compensation', desc: 'Sec 166 MVA' },
                            { value: 'interim', label: 'Interim Compensation', desc: 'Sec 140 MVA' },
                          ].map((opt) => (
                            <button key={opt.value} onClick={() => setMvop((p) => ({ ...p, claimType: opt.value }))}
                              className={cn('flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all duration-200',
                                mvop.claimType === opt.value ? 'border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400' : 'border-border hover:border-primary/30'
                              )}>
                              <span className="text-sm font-semibold">{opt.label}</span>
                              <span className="text-xs text-muted-foreground">{opt.desc}</span>
                            </button>
                          ))}
                        </div>

                        {/* Fatal toggle */}
                        <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <Label className="text-sm font-semibold">Fatal Accident?</Label>
                            <p className="text-xs text-muted-foreground">If the accident resulted in death</p>
                          </div>
                          <Switch checked={mvop.isFatal} onCheckedChange={(v) => setMvop((p) => ({ ...p, isFatal: v }))} />
                        </div>

                        {mvop.isFatal && (
                          <div className="mt-4 space-y-4 border-t border-border pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <FormField label="Deceased Name" id="decName" value={mvop.deceasedName} onChange={(v) => setMvop((p) => ({ ...p, deceasedName: v }))} placeholder="Name" />
                              <FormField label="Deceased Age" id="decAge" value={mvop.deceasedAge} onChange={(v) => setMvop((p) => ({ ...p, deceasedAge: v }))} type="number" placeholder="Age" />
                              <FormField label="Monthly Income" id="decInc" value={mvop.deceasedIncome} onChange={(v) => setMvop((p) => ({ ...p, deceasedIncome: v }))} type="number" placeholder="Income" />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Dependents</Label>
                              <Button variant="outline" size="sm" onClick={addDependent} className="h-8 rounded-lg text-xs">
                                <Plus className="size-3.5 mr-1" /> Add Dependent
                              </Button>
                            </div>
                            {dependents.length > 0 ? (
                              <div className="space-y-2">
                                {dependents.map((dep) => (
                                  <div key={dep.id} className="flex items-center gap-2">
                                    <FormField label="Name" id={`dep-name-${dep.id}`} value={dep.name} onChange={(v) => updateDependent(dep.id, 'name', v)} placeholder="Name" className="flex-1" />
                                    <FormField label="Age" id={`dep-age-${dep.id}`} value={dep.age} onChange={(v) => updateDependent(dep.id, 'age', v)} type="number" placeholder="Age" className="w-20" />
                                    <FormField label="Relation" id={`dep-rel-${dep.id}`} value={dep.relation} onChange={(v) => updateDependent(dep.id, 'relation', v)} placeholder="Relation" className="w-32" />
                                    <Button variant="ghost" size="icon" onClick={() => removeDependent(dep.id)} className="size-8 shrink-0 mt-5"><Trash2 className="size-3.5 text-red-500" /></Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No dependents added.</p>
                            )}
                          </div>
                        )}
                      </FormSection>
                    </motion.div>

                    {/* Generate */}
                    <motion.div variants={fadeInUp} custom={5}>
                      <Button onClick={handleGenerateMVOP} disabled={!mvop.claimantName} className={cn('w-full h-12 text-sm font-semibold rounded-xl', 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700', 'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40', 'transition-all duration-200 active:scale-[0.98]', 'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none')}>
                        <Sparkles className="size-4 mr-2" /> Generate Motor Accident Claim <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-red-500"><TriangleAlert className="size-3.5 shrink-0" />{error}</motion.div>}
                  </motion.div>
                )}

                {/* ──── STEP 1: Succession Form ──── */}
                {wizardStep === 1 && selectedModule === 'succession' && (
                  <motion.div key="wiz-step-succession" initial="hidden" animate="visible" exit="exit" variants={staggerContainer} className="max-w-3xl mx-auto space-y-6">
                    {/* Upload Documents */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <div className="space-y-3 mb-2">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <Upload className="size-3.5" />
                              Upload Death Certificate / Legal Heir Documents
                            </Label>
                            <p className="text-[10px] text-muted-foreground">Upload death certificate, will, or other legal heir documents. AI will extract details.</p>
                            <DocumentUpload module="family" maxFiles={5} compact
                              onFilesExtracted={(files) => {
                                const texts = files.filter((f) => f.extractedText).map((f) => f.extractedText || '')
                              }}
                              onAiDataExtracted={(data) => {
                                if (!data) return
                                const d = data as Record<string, unknown>
                                if (d.petitionerName) setSuccession((p) => ({ ...p, applicantName: String(d.petitionerName || p.applicantName) }))
                                if (d.respondentName) setSuccession((p) => ({ ...p, deceasedName: String(d.respondentName || p.deceasedName) }))
                              }}
                            />
                      </div>
                    </motion.div>
                    {/* Deceased */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <FormSection>
                        <SectionHeader icon={User} title="Deceased Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="decName" value={succession.deceasedName} onChange={(v) => setSuccession((p) => ({ ...p, deceasedName: v }))} placeholder="Deceased's name" required className="sm:col-span-2" />
                          <FormField label="Age at Death" id="decAge" value={succession.deceasedAge} onChange={(v) => setSuccession((p) => ({ ...p, deceasedAge: v }))} type="number" placeholder="Age" />
                          <FormField label="Date of Death" id="decDate" value={succession.deceasedDate} onChange={(v) => setSuccession((p) => ({ ...p, deceasedDate: v }))} type="date" required />
                          <FormField label="Place of Death" id="decPlace" value={succession.deceasedPlace} onChange={(v) => setSuccession((p) => ({ ...p, deceasedPlace: v }))} placeholder="Place" />
                          <SelectField label="Religion" value={succession.deceasedReligion} onValueChange={(v) => setSuccession((p) => ({ ...p, deceasedReligion: v }))} options={SUCCESSION_PERSONAL_LAWS.map((l) => ({ value: l, label: l }))} placeholder="Religion" />
                          <FormField label="Last Address" id="decAddr" value={succession.deceasedAddress} onChange={(v) => setSuccession((p) => ({ ...p, deceasedAddress: v }))} placeholder="Last known address" className="sm:col-span-2" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Property */}
                    <motion.div variants={fadeInUp} custom={1}>
                      <FormSection>
                        <SectionHeader icon={Building} title="Property Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <SelectField label="Property Type" value={succession.propertyType} onValueChange={(v) => setSuccession((p) => ({ ...p, propertyType: v }))} options={[{ value: 'immovable', label: 'Immovable' }, { value: 'movable', label: 'Movable' }, { value: 'both', label: 'Both' }]} />
                          <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold">Description</Label>
                            <Textarea value={succession.propertyDescription} onChange={(e) => setSuccession((p) => ({ ...p, propertyDescription: e.target.value }))} placeholder="Describe the property in detail..." className="min-h-[80px] text-sm rounded-xl resize-y" />
                          </div>
                          <FormField label="Estimated Value" id="propVal" value={succession.propertyValue} onChange={(v) => setSuccession((p) => ({ ...p, propertyValue: v }))} type="number" placeholder="Value in INR" />
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Debts / Liabilities</Label>
                            <Textarea value={succession.debtsLiabilities} onChange={(e) => setSuccession((p) => ({ ...p, debtsLiabilities: e.target.value }))} placeholder="Any debts or liabilities..." className="min-h-[60px] text-sm rounded-xl resize-y" />
                          </div>
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Legal Heirs */}
                    <motion.div variants={fadeInUp} custom={2}>
                      <FormSection>
                        <SectionHeader icon={Users} title="Legal Heirs" />
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Label className="text-xs font-semibold">Heirs</Label>
                            {heirs.length > 0 && (
                              <Badge variant={totalShare === 100 ? 'default' : 'destructive'} className="text-[10px] px-2 py-0.5">
                                Total: {totalShare.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                          <Button variant="outline" size="sm" onClick={addHeir} className="h-8 rounded-lg text-xs">
                            <Plus className="size-3.5 mr-1" /> Add Heir
                          </Button>
                        </div>
                        {heirs.length > 0 ? (
                          <div className="space-y-3">
                            {heirs.map((heir) => (
                              <div key={heir.id} className="p-3 rounded-lg border border-border bg-muted/20">
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                                  <FormField label="Name" id={`heir-name-${heir.id}`} value={heir.name} onChange={(v) => updateHeir(heir.id, 'name', v)} placeholder="Name" />
                                  <FormField label="Relation" id={`heir-rel-${heir.id}`} value={heir.relation} onChange={(v) => updateHeir(heir.id, 'relation', v)} placeholder="Relation" />
                                  <FormField label="Age" id={`heir-age-${heir.id}`} value={heir.age} onChange={(v) => updateHeir(heir.id, 'age', v)} type="number" placeholder="Age" />
                                  <FormField label="Share %" id={`heir-share-${heir.id}`} value={heir.share} onChange={(v) => updateHeir(heir.id, 'share', v)} type="number" placeholder="%" />
                                  <FormField label="Address" id={`heir-addr-${heir.id}`} value={heir.address} onChange={(v) => updateHeir(heir.id, 'address', v)} placeholder="Address" className="col-span-1 sm:col-span-2" />
                                </div>
                                <div className="flex justify-end mt-2">
                                  <Button variant="ghost" size="icon" onClick={() => removeHeir(heir.id)} className="size-7"><Trash2 className="size-3.5 text-red-500" /></Button>
                                </div>
                              </div>
                            ))}
                            {totalShare > 0 && totalShare !== 100 && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-amber-500 p-2 rounded-lg bg-amber-500/10">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                Total share is {totalShare.toFixed(1)}% — should add up to 100%
                              </motion.div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No heirs added. Click &quot;Add Heir&quot; to add.</p>
                        )}
                      </FormSection>
                    </motion.div>

                    {/* Personal Law & Petition Type */}
                    <motion.div variants={fadeInUp} custom={3}>
                      <FormSection>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <SelectField label="Personal Law" value={succession.personalLaw} onValueChange={(v) => setSuccession((p) => ({ ...p, personalLaw: v }))} options={SUCCESSION_PERSONAL_LAWS.map((l) => ({ value: l, label: l }))} />
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Petition Type</Label>
                            <div className="grid grid-cols-1 gap-2 mt-1">
                              {[
                                { value: 'succession', label: 'Succession Certificate', desc: 'Sec 372 ISA' },
                                { value: 'probate', label: 'Probate of Will', desc: 'Sec 254 ISA' },
                                { value: 'legal_heir', label: 'Legal Heir Certificate', desc: 'Administrative' },
                              ].map((opt) => (
                                <button key={opt.value} onClick={() => setSuccession((p) => ({ ...p, petitionType: opt.value }))}
                                  className={cn('flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all duration-200',
                                    succession.petitionType === opt.value ? 'border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400' : 'border-border hover:border-primary/30'
                                  )}>
                                  <span className="text-sm font-medium">{opt.label}</span>
                                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Generate */}
                    <motion.div variants={fadeInUp} custom={4}>
                      <Button onClick={handleGenerateSuccession} disabled={!succession.deceasedName} className={cn('w-full h-12 text-sm font-semibold rounded-xl', 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700', 'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40', 'transition-all duration-200 active:scale-[0.98]', 'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none')}>
                        <Sparkles className="size-4 mr-2" /> Generate Succession Petition <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-red-500"><TriangleAlert className="size-3.5 shrink-0" />{error}</motion.div>}
                  </motion.div>
                )}

                {/* ──── STEP 1: Guardianship Form ──── */}
                {wizardStep === 1 && selectedModule === 'guardian' && (
                  <motion.div key="wiz-step-guardian" initial="hidden" animate="visible" exit="exit" variants={staggerContainer} className="max-w-3xl mx-auto space-y-6">
                    {/* Upload Documents */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <div className="space-y-3 mb-2">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <Upload className="size-3.5" />
                              Upload Child Documents / School Records
                            </Label>
                            <p className="text-[10px] text-muted-foreground">Upload child's birth certificate, school records, or other documents. AI will extract details.</p>
                            <DocumentUpload module="family" maxFiles={5} compact
                              onFilesExtracted={(files) => {
                                const texts = files.filter((f) => f.extractedText).map((f) => f.extractedText || '')
                              }}
                              onAiDataExtracted={(data) => {
                                if (!data) return
                                const d = data as Record<string, unknown>
                                if (d.petitionerName) setGuardian((p) => ({ ...p, applicantName: String(d.petitionerName || p.applicantName) }))
                                if (d.respondentName) setGuardian((p) => ({ ...p, minorName: String(d.respondentName || p.minorName) }))
                              }}
                            />
                      </div>
                    </motion.div>
                    {/* Minor */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <FormSection>
                        <SectionHeader icon={Baby} title="Minor Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="minName" value={guardian.minorName} onChange={(v) => setGuardian((p) => ({ ...p, minorName: v }))} placeholder="Minor's name" required className="sm:col-span-2" />
                          <FormField label="Age" id="minAge" value={guardian.minorAge} onChange={(v) => setGuardian((p) => ({ ...p, minorAge: v }))} type="number" placeholder="Age" />
                          <SelectField label="Gender" value={guardian.minorGender} onValueChange={(v) => setGuardian((p) => ({ ...p, minorGender: v }))} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
                          <FormField label="Address" id="minAddr" value={guardian.minorAddress} onChange={(v) => setGuardian((p) => ({ ...p, minorAddress: v }))} placeholder="Address" className="sm:col-span-2" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Parent */}
                    <motion.div variants={fadeInUp} custom={1}>
                      <FormSection>
                        <SectionHeader icon={User} title="Parent(s) Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Parent Name" id="parName" value={guardian.parentName} onChange={(v) => setGuardian((p) => ({ ...p, parentName: v }))} placeholder="Parent's name" required className="sm:col-span-2" />
                          <SelectField label="Relation" value={guardian.parentRelation} onValueChange={(v) => setGuardian((p) => ({ ...p, parentRelation: v }))} options={[{ value: 'Father', label: 'Father' }, { value: 'Mother', label: 'Mother' }]} />
                          <SelectField label="Status" value={guardian.parentStatus} onValueChange={(v) => setGuardian((p) => ({ ...p, parentStatus: v }))} options={[{ value: 'Alive', label: 'Alive' }, { value: 'Deceased', label: 'Deceased' }, { value: 'Absent', label: 'Absent' }]} />
                          <FormField label="Address" id="parAddr" value={guardian.parentAddress} onChange={(v) => setGuardian((p) => ({ ...p, parentAddress: v }))} placeholder="Address" className="sm:col-span-2" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Applicant */}
                    <motion.div variants={fadeInUp} custom={2}>
                      <FormSection>
                        <SectionHeader icon={User} title="Applicant Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="appGName" value={guardian.applicantName} onChange={(v) => setGuardian((p) => ({ ...p, applicantName: v }))} placeholder="Applicant's name" required className="sm:col-span-2" />
                          <FormField label="Relation to Minor" id="appGRel" value={guardian.applicantRelation} onChange={(v) => setGuardian((p) => ({ ...p, applicantRelation: v }))} placeholder="e.g., Grandmother, Uncle" />
                          <FormField label="Income" id="appGInc" value={guardian.applicantIncome} onChange={(v) => setGuardian((p) => ({ ...p, applicantIncome: v }))} type="number" placeholder="Monthly income" />
                          <FormField label="Address" id="appGAddr" value={guardian.applicantAddress} onChange={(v) => setGuardian((p) => ({ ...p, applicantAddress: v }))} placeholder="Address" className="sm:col-span-2" />
                          <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold">Grounds for Guardianship</Label>
                            <Textarea value={guardian.grounds} onChange={(e) => setGuardian((p) => ({ ...p, grounds: e.target.value }))} placeholder="Explain why guardianship is sought..." className="min-h-[80px] text-sm rounded-xl resize-y" />
                          </div>
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Petition Type */}
                    <motion.div variants={fadeInUp} custom={3}>
                      <FormSection>
                        <SectionHeader icon={Gavel} title="Petition Type" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { value: 'guardianship', label: 'Guardianship' },
                            { value: 'variation', label: 'Variation' },
                            { value: 'removal', label: 'Removal' },
                          ].map((opt) => (
                            <button key={opt.value} onClick={() => setGuardian((p) => ({ ...p, petitionType: opt.value }))}
                              className={cn('p-3 rounded-xl border-2 text-center text-sm font-medium transition-all duration-200',
                                guardian.petitionType === opt.value ? 'border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400' : 'border-border hover:border-primary/30'
                              )}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Generate */}
                    <motion.div variants={fadeInUp} custom={4}>
                      <Button onClick={handleGenerateGuardian} disabled={!guardian.minorName || !guardian.applicantName} className={cn('w-full h-12 text-sm font-semibold rounded-xl', 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700', 'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40', 'transition-all duration-200 active:scale-[0.98]', 'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none')}>
                        <Sparkles className="size-4 mr-2" /> Generate Guardianship Petition <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-red-500"><TriangleAlert className="size-3.5 shrink-0" />{error}</motion.div>}
                  </motion.div>
                )}

                {/* ──── STEP 1: Maintenance Form ──── */}
                {wizardStep === 1 && selectedModule === 'maintenance' && (
                  <motion.div key="wiz-step-maintenance" initial="hidden" animate="visible" exit="exit" variants={staggerContainer} className="max-w-3xl mx-auto space-y-6">
                    {/* Upload Documents */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <div className="space-y-3 mb-2">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <Upload className="size-3.5" />
                              Upload Maintenance Case Documents
                            </Label>
                            <p className="text-[10px] text-muted-foreground">Upload marriage certificate, income proof, or other supporting documents. AI will extract details.</p>
                            <DocumentUpload module="family" maxFiles={5} compact
                              onFilesExtracted={(files) => {
                                const texts = files.filter((f) => f.extractedText).map((f) => f.extractedText || '')
                              }}
                              onAiDataExtracted={(data) => {
                                if (!data) return
                                const d = data as Record<string, unknown>
                                if (d.petitionerName) setMaintenance((p) => ({ ...p, applicantName: String(d.petitionerName || p.applicantName) }))
                                if (d.respondentName) setMaintenance((p) => ({ ...p, respondentName: String(d.respondentName || p.respondentName) }))
                              }}
                            />
                      </div>
                    </motion.div>
                    {/* Act */}
                    <motion.div variants={fadeInUp} custom={0}>
                      <FormSection>
                        <SectionHeader icon={Gavel} title="Act & Section" />
                        <SelectField label="Act Under" value={maintenance.actUnder} onValueChange={(v) => setMaintenance((p) => ({ ...p, actUnder: v }))} options={[{ value: 'CrPC 125', label: 'CrPC 125' }, { value: 'HAMA', label: 'HAMA (Hindu Adoption & Maintenance Act)' }]} />
                      </FormSection>
                    </motion.div>

                    {/* Applicant */}
                    <motion.div variants={fadeInUp} custom={1}>
                      <FormSection>
                        <SectionHeader icon={User} title="Applicant Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="mName" value={maintenance.applicantName} onChange={(v) => setMaintenance((p) => ({ ...p, applicantName: v }))} placeholder="Applicant's name" required className="sm:col-span-2" />
                          <SelectField label="Gender" value={maintenance.applicantGender} onValueChange={(v) => setMaintenance((p) => ({ ...p, applicantGender: v }))} options={[{ value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }]} />
                          <FormField label="Age" id="mAge" value={maintenance.applicantAge} onChange={(v) => setMaintenance((p) => ({ ...p, applicantAge: v }))} type="number" placeholder="Age" />
                          <FormField label="Address" id="mAddr" value={maintenance.applicantAddress} onChange={(v) => setMaintenance((p) => ({ ...p, applicantAddress: v }))} placeholder="Address" className="sm:col-span-2" />
                          <FormField label="Occupation" id="mOcc" value={maintenance.applicantOccupation} onChange={(v) => setMaintenance((p) => ({ ...p, applicantOccupation: v }))} placeholder="Occupation" />
                          <FormField label="Income" id="mInc" value={maintenance.applicantIncome} onChange={(v) => setMaintenance((p) => ({ ...p, applicantIncome: v }))} type="number" placeholder="Monthly income" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Respondent */}
                    <motion.div variants={fadeInUp} custom={2}>
                      <FormSection>
                        <SectionHeader icon={User} title="Respondent Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Full Name" id="mrName" value={maintenance.respondentName} onChange={(v) => setMaintenance((p) => ({ ...p, respondentName: v }))} placeholder="Respondent's name" required className="sm:col-span-2" />
                          <SelectField label="Gender" value={maintenance.respondentGender} onValueChange={(v) => setMaintenance((p) => ({ ...p, respondentGender: v }))} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
                          <FormField label="Occupation" id="mrOcc" value={maintenance.respondentOccupation} onChange={(v) => setMaintenance((p) => ({ ...p, respondentOccupation: v }))} placeholder="Occupation" />
                          <FormField label="Address" id="mrAddr" value={maintenance.respondentAddress} onChange={(v) => setMaintenance((p) => ({ ...p, respondentAddress: v }))} placeholder="Address" className="sm:col-span-2" />
                          <FormField label="Income" id="mrInc" value={maintenance.respondentIncome} onChange={(v) => setMaintenance((p) => ({ ...p, respondentIncome: v }))} type="number" placeholder="Monthly income" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Marriage */}
                    <motion.div variants={fadeInUp} custom={3}>
                      <FormSection>
                        <SectionHeader icon={Calendar} title="Marriage Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField label="Date of Marriage" id="mmDate" value={maintenance.marriageDate} onChange={(v) => setMaintenance((p) => ({ ...p, marriageDate: v }))} type="date" />
                          <FormField label="Separation Date" id="mmSepDate" value={maintenance.separationDate} onChange={(v) => setMaintenance((p) => ({ ...p, separationDate: v }))} type="date" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Children */}
                    <motion.div variants={fadeInUp} custom={4}>
                      <FormSection>
                        <SectionHeader icon={Baby} title="Children" />
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-xs font-semibold">Children Details</Label>
                          <Button variant="outline" size="sm" onClick={addMaintenanceChild} className="h-8 rounded-lg text-xs">
                            <Plus className="size-3.5 mr-1" /> Add Child
                          </Button>
                        </div>
                        {maintenanceChildren.length > 0 ? (
                          <div className="space-y-2">
                            {maintenanceChildren.map((c, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <FormField label="Name" id={`mt-ch-name-${idx}`} value={c.name} onChange={(v) => { const n = [...maintenanceChildren]; n[idx] = { ...n[idx], name: v }; setMaintenanceChildren(n) }} placeholder="Name" className="flex-1" />
                                <FormField label="Age" id={`mt-ch-age-${idx}`} value={c.age} onChange={(v) => { const n = [...maintenanceChildren]; n[idx] = { ...n[idx], age: v }; setMaintenanceChildren(n) }} type="number" placeholder="Age" className="w-20" />
                                <FormField label="Current Custody" id={`mt-ch-cust-${idx}`} value={c.custody} onChange={(v) => { const n = [...maintenanceChildren]; n[idx] = { ...n[idx], custody: v }; setMaintenanceChildren(n) }} placeholder="Custody" className="w-32" />
                                <Button variant="ghost" size="icon" onClick={() => removeMaintenanceChild(idx)} className="size-8 shrink-0 mt-5"><Trash2 className="size-3.5 text-red-500" /></Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No children added.</p>
                        )}
                      </FormSection>
                    </motion.div>

                    {/* Grounds & Amount */}
                    <motion.div variants={fadeInUp} custom={5}>
                      <FormSection>
                        <SectionHeader icon={Scale} title="Grounds & Claim" />
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Grounds for Maintenance</Label>
                            <Textarea value={maintenance.grounds} onChange={(e) => setMaintenance((p) => ({ ...p, grounds: e.target.value }))} placeholder="Describe the grounds for claiming maintenance..." className="min-h-[80px] text-sm rounded-xl resize-y" />
                          </div>
                          <FormField label="Amount Claimed (INR)" id="mtAmt" value={maintenance.amountClaimed} onChange={(v) => setMaintenance((p) => ({ ...p, amountClaimed: v }))} type="number" placeholder="e.g., 25000" />
                        </div>
                      </FormSection>
                    </motion.div>

                    {/* Generate */}
                    <motion.div variants={fadeInUp} custom={6}>
                      <Button onClick={handleGenerateMaintenance} disabled={!maintenance.applicantName || !maintenance.respondentName} className={cn('w-full h-12 text-sm font-semibold rounded-xl', 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700', 'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40', 'transition-all duration-200 active:scale-[0.98]', 'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none')}>
                        <Sparkles className="size-4 mr-2" /> Generate Maintenance Application <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>

                    {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-red-500"><TriangleAlert className="size-3.5 shrink-0" />{error}</motion.div>}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Loading (Brain spinner)              */}
          {/* ════════════════════════════════════════════ */}
          {isGenerating && (
            <motion.div key="screen-loading" initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center min-h-[50vh]">
              <motion.div className="relative" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                  <Brain className="size-8 text-primary" />
                </div>
                <motion.div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-primary/20" animate={{ rotate: -360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg font-bold text-foreground mt-8">
                AI is drafting your petition...
              </motion.h2>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 w-full max-w-xs space-y-3">
                <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full" animate={{ width: `${genProgress}%` }} transition={{ duration: 0.4 }} />
                </div>
                <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />{genMessage}
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SCREEN: Preview                              */}
          {/* ════════════════════════════════════════════ */}
          {screen === 'preview' && !isGenerating && activeDoc && (
            <motion.div key="screen-preview" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
              {/* Header */}
              <motion.div variants={fadeInUp} custom={0} className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{activeDoc.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generated by AI — Review and edit before filing
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setScreen('list')} className="rounded-lg">
                  <ArrowLeft className="size-3.5 mr-1.5" /> Back to List
                </Button>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* Document Preview */}
                <motion.div variants={fadeInUp} custom={1}>
                  {/* Tabs for multiple docs */}
                  {generatedDocs.length > 1 && (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                      <TabsList className="rounded-xl">
                        {generatedDocs.map((doc) => (
                          <TabsTrigger key={doc.id} value={doc.id} className="rounded-lg text-xs">
                            {doc.title.split('—')[0].trim()}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}

                  <Card className="rounded-xl border-2 border-border overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setIsEditing(!isEditing); setEditContent(activeDoc.content) }} className="h-8 rounded-lg text-xs">
                          <Pencil className="size-3.5 mr-1.5" />
                          {isEditing ? 'Preview' : 'Edit'}
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handleCopy} className="size-8" title="Copy"><Copy className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={handlePdfDownload} className="size-8" title="Download PDF"><FileDown className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={handleDownload} className="size-8" title="Download"><Download className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={handlePrint} className="size-8" title="Print"><Printer className="size-3.5" /></Button>
                      </div>
                    </div>
                    <CardContent className="p-0">
                      {isEditing ? (
                        <Textarea
                          value={editContent}
                          onChange={(e) => {
                            setEditContent(e.target.value)
                            setGeneratedDocs((prev) => prev.map((d) => d.id === activeTab ? { ...d, content: e.target.value } : d))
                          }}
                          className="min-h-[500px] border-0 rounded-none resize-y text-sm font-mono leading-relaxed p-6"
                        />
                      ) : (
                        <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-muted/30 dark:from-card dark:to-card min-h-[500px]">
                          <div className="max-w-none">
                            {activeDoc?.content?.split('\n').map((line, idx) => (
                              <p key={idx} className={cn(
                                'text-sm leading-relaxed text-foreground/90',
                                line.trim() === '' && 'h-4',
                                line.startsWith('[') && 'font-semibold text-foreground',
                                idx === 0 && 'text-lg font-bold text-foreground mb-4'
                              )}>
                                {line || '\u00A0'}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Side Panel */}
                <motion.div variants={slideInRight} className="space-y-4">
                  {/* Metadata */}
                  <Card className="rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Gavel className="size-4 text-primary" />
                        Document Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Module</span>
                        <Badge variant="secondary" className="text-xs">{selectedModule ? getModuleLabel(selectedModule) : 'Family'}</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Words</span>
                        <span className="text-xs font-medium text-foreground">{activeDoc.content.split(/\s+/).filter(Boolean).length}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Generated</span>
                        <span className="text-xs font-medium text-foreground">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Points */}
                  {activeDoc.keyPoints.length > 0 && (
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
                  <Card className="rounded-xl border border-red-500/20 bg-red-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                        <TriangleAlert className="size-4" />
                        Warnings &amp; Caveats
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
                    Save Matter
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

/* ═══════════════════════════════════════════════════════ */
/* Fallback Document Builders                             */
/* ═══════════════════════════════════════════════════════ */

function buildFallbackDivorce(d: typeof divorce.prototype, ch: ChildEntry[]): string {
  const typeLabel = d.divorceType === 'mutual' ? 'Mutual Consent (Sec 13-B HMA)' : 'Contested (Sec 13 HMA)'
  const groundsList = d.grounds.map((g) => DIVORCE_GROUNDS.find((dg) => dg.id === g)?.label || g).join(', ')
  return `IN THE HON'BLE COURT OF [COURT NAME]

DIVORCE PETITION UNDER ${typeLabel}

PETITIONER:
${d.petitionerName}
${d.petitionerAddress}

RESPONDENT:
${d.respondentName}
${d.respondentAddress}

Most respectfully sheweth:

1. That the Petitioner is [age] years old, ${d.petitionerReligion} by religion, ${d.petitionerOccupation} by occupation, earning Rs. ${d.petitionerIncome}/- per month.

2. That the Respondent is [age] years old, ${d.respondentReligion} by religion, ${d.respondentOccupation} by occupation, earning Rs. ${d.respondentIncome}/- per month.

3. That the marriage between the Petitioner and the Respondent was solemnized on ${d.marriageDate} at ${d.marriagePlace} according to ${d.petitionerReligion} rites and ceremonies.

${ch.length > 0 ? `4. That the following children were born out of the wedlock:\n${ch.map((c, i) => `   (${i + 1}) ${c.name}, ${c.age} years, ${c.gender}, custody preference: ${c.custodyPreference}`).join('\n')}\n` : ''}

${d.divorceType === 'contested' && groundsList ? `5. That the marriage has irretrievably broken down on the following ground(s): ${groundsList}.\n` : ''}${d.divorceType === 'mutual' ? `5. That both parties have been living separately since [date] and there is no possibility of reconciliation.\n${d.waiverCooling ? '6. The parties hereby waive the statutory cooling period of six months under proviso to Sec 13-B(2) HMA.\n' : ''}` : ''}

PRAYER:
It is therefore most respectfully prayed that this Hon'ble Court may be pleased to grant a decree of divorce dissolving the marriage between the Petitioner and the Respondent, and pass such other orders as this Hon'ble Court may deem fit and proper.

Place: [City]
Date: [Date]

[Advocate Name]
Advocate for Petitioner`
}

function buildFallbackDOP(d: typeof dop.prototype, inc: IncidentEntry[]): string {
  const reliefList = d.reliefSought.length > 0 ? d.reliefSought.join(', ') : 'Protection, Residence, and Monetary Relief'
  return `IN THE HON'BLE COURT OF [COURT NAME]

APPLICATION UNDER SECTION 12 OF THE PROTECTION OF WOMEN FROM DOMESTIC VIOLENCE ACT, 2005

APPLICANT:
${d.applicantName}
Age: ${d.applicantAge}, ${d.applicantGender}
${d.applicantAddress}

RESPONDENT:
${d.respondentName}
${d.respondentRelation} of the Applicant
${d.respondentAddress}

Most respectfully sheweth:

1. That the Applicant is a ${d.applicantGender}, aged ${d.applicantAge} years, ${d.applicantOccupation} by occupation, residing at ${d.applicantAddress}.

2. That the Respondent is the ${d.respondentRelation} of the Applicant, ${d.respondentOccupation} by occupation, earning Rs. ${d.respondentIncome}/- per month.

3. That the Respondent has subjected the Applicant to domestic violence as detailed below:

${inc.map((i, idx) => `   Incident ${idx + 1}: On ${i.date} — ${i.description}`).join('\n\n')}

4. The Applicant is entitled to the following reliefs:
   - ${reliefList}

5. There is no other effective remedy available to the Applicant except approaching this Hon'ble Court.

PRAYER:
It is therefore prayed that this Hon'ble Court may grant the reliefs sought and pass such orders as deemed fit.

Place: [City]
Date: [Date]

[Advocate Name]
Advocate for Applicant`
}

function buildFallbackMVOP(m: typeof mvop.prototype): string {
  return `IN THE HON'BLE MOTOR ACCIDENT CLAIMS TRIBUNAL / COURT

CLAIM PETITION UNDER ${m.claimType === 'full' ? 'SECTION 166' : 'SECTION 140'} OF THE MOTOR VEHICLES ACT, 1988

CLAIMANT:
${m.claimantName}
Age: ${m.claimantAge}, ${m.claimantOccupation}
${m.claimantAddress}
Monthly Income: Rs. ${m.claimantIncome}/-

VEHICLE DETAILS:
Type: ${m.vehicleType}
Registration No: ${m.vehicleRegNumber}
Insurance Company: ${m.insuranceCompany}
Policy No: ${m.insurancePolicyNumber}

ACCIDENT DETAILS:
Date: ${m.accidentDate} at ${m.accidentTime}
Place: ${m.accidentPlace}
Police Station: ${m.policeStation}
FIR No: ${m.firNumber}

INJURY DETAILS:
Nature of Injury: ${m.injuryNature}
Disability: ${m.disabilityPercent ? m.disabilityPercent + '%' : 'Not assessed'}
Hospitalization: ${m.hospitalDays || 'N/A'} days
Medical Expenses: Rs. ${m.medicalExpenses || '0'}

${m.isFatal ? `FATAL ACCIDENT:
Deceased: ${m.deceasedName}, Age ${m.deceasedAge}
Monthly Income: Rs. ${m.deceasedIncome}/-` : ''}

PRAYER:
It is therefore prayed that this Hon'ble Tribunal may award fair compensation to the claimant.

Place: [City]
Date: [Date]

[Advocate Name]
Advocate for Claimant`
}

function buildFallbackSuccession(s: typeof succession.prototype, h: HeirEntry[]): string {
  return `IN THE HON'BLE COURT OF [COURT NAME]

PETITION FOR ${s.petitionType === 'succession' ? 'SUCCESSION CERTIFICATE' : s.petitionType === 'probate' ? 'PROBATE OF WILL' : 'LEGAL HEIR CERTIFICATE'}

PETITIONER: [Petitioner Name]

DECEASED:
Name: ${s.deceasedName}
Age at Death: ${s.deceasedAge}
Date of Death: ${s.deceasedDate}
Place of Death: ${s.deceasedPlace}
Religion: ${s.deceasedReligion}
Last Address: ${s.deceasedAddress}

PROPERTY DETAILS:
Type: ${s.propertyType}
Description: ${s.propertyDescription}
Estimated Value: Rs. ${s.propertyValue || 'To be assessed'}
Debts/Liabilities: ${s.debtsLiabilities || 'None known'}

LEGAL HEIRS:
${h.map((heir, idx) => `${idx + 1}. ${heir.name} — ${heir.relation}, Age ${heir.age}, Share ${heir.share}%\n   Address: ${heir.address}`).join('\n\n')}

PERSONAL LAW: ${s.personalLaw}

PRAYER:
It is therefore prayed that this Hon'ble Court may grant the ${s.petitionType === 'succession' ? 'Succession Certificate' : s.petitionType === 'probate' ? 'Probate of Will' : 'Legal Heir Certificate'} and pass such orders as deemed fit.

Place: [City]
Date: [Date]

[Advocate Name]
Advocate for Petitioner`
}

function buildFallbackGuardian(g: typeof guardian.prototype): string {
  return `IN THE HON'BLE COURT OF [COURT NAME]

PETITION UNDER THE GUARDIAN AND WARDS ACT, 1890

MINOR:
Name: ${g.minorName}
Age: ${g.minorAge}, ${g.minorGender}
Address: ${g.minorAddress}

PARENT(S):
${g.parentName} — ${g.parentRelation} (${g.parentStatus})
Address: ${g.parentAddress || 'N/A'}

APPLICANT:
Name: ${g.applicantName}
Relation to Minor: ${g.applicantRelation}
Address: ${g.applicantAddress}
Income: Rs. ${g.applicantIncome}/- per month

GROUNDS:
${g.grounds}

PRAYER:
It is therefore prayed that this Hon'ble Court may appoint the Applicant as guardian of the minor ${g.minorName} and pass such orders as deemed fit and proper in the interest of the minor.

Place: [City]
Date: [Date]

[Advocate Name]
Advocate for Applicant`
}

function buildFallbackMaintenance(m: typeof maintenance.prototype, ch: { name: string; age: string; custody: string }[]): string {
  return `IN THE HON'BLE COURT OF [COURT NAME]

APPLICATION UNDER ${m.actUpper || m.actUnder} FOR MAINTENANCE

APPLICANT:
${m.applicantName}
Age: ${m.applicantAge}, ${m.applicantGender}
${m.applicantOccupation}, Income: Rs. ${m.applicantIncome}/-
${m.applicantAddress}

RESPONDENT:
${m.respondentName}
${m.respondentGender}, ${m.respondentOccupation}
Income: Rs. ${m.respondentIncome}/-
${m.respondentAddress}

MARRIAGE DETAILS:
Date of Marriage: ${m.marriageDate}
Date of Separation: ${m.separationDate || 'N/A'}

${ch.length > 0 ? `CHILDREN:\n${ch.map((c, i) => `${i + 1}. ${c.name}, Age ${c.age}, Current Custody: ${c.custody || 'N/A'}`).join('\n')}\n` : ''}

GROUNDS:
${m.grounds}

AMOUNT CLAIMED: Rs. ${m.amountClaimed || 'To be determined by the Court'}/- per month

PRAYER:
It is therefore prayed that this Hon'ble Court may award maintenance at the rate claimed and pass such orders as deemed fit.

Place: [City]
Date: [Date]

[Advocate Name]
Advocate for Applicant`
}
