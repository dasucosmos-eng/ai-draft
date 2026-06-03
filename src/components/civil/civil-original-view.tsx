'use client'
import { stripMarkdown } from '@/lib/ai-service'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type CivilMatter, type MatterFacts, type CivilDraftDocument, type Issue, type EvidenceItem } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  Download as DownloadIcon,
  FileDown,
  Edit3,
  FileText,
  Gavel,
  BookOpen,
  Building,
  Calendar,
  ChevronRight,
  Loader2,
  Plus,
  Printer,
  Save,
  Scroll,
  Shield,
  Scale,
  Trash2,
  Badge as BadgeIcon,
  ListChecks,
  Users,
  Sparkles,
  Handshake,
  Ban,
  Home,
  Layers,
  Stamp,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LucideIcon } from 'lucide-react'
import { DocumentUpload, type UploadedFile } from '@/components/shared/document-upload'
import { useProfileStore } from '@/store/profile-store'
import { generateBrandedPdf } from '@/lib/pdf-generator'

/* ─── Constants ─── */

const CIVIL_API = 'https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiCivil'

/* ─── Subject Options ─── */

interface SubjectOption {
  id: CivilMatter['subject']
  label: string
  icon: LucideIcon
  description: string
  color: string
}

const subjectOptions: SubjectOption[] = [
  { id: 'RECOVERY', label: 'Money Recovery', icon: Scale, description: 'Recovery of money / dues', color: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  { id: 'SPECIFIC_PERFORMANCE', label: 'Specific Performance', icon: Handshake, description: 'Enforce contractual obligation', color: 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10' },
  { id: 'INJUNCTION', label: 'Injunction', icon: Ban, description: 'Stay or mandatory order', color: 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10' },
  { id: 'DECLARATION', label: 'Declaration', icon: Stamp, description: 'Court declaration of right', color: 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10' },
  { id: 'POSSESSION', label: 'Possession', icon: Home, description: 'Recovery of possession', color: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  { id: 'PARTITION', label: 'Partition', icon: Layers, description: 'Partition of property', color: 'border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/10' },
  { id: 'OTHER', label: 'Other', icon: FileText, description: 'Any other civil matter', color: 'border-gray-500/30 text-gray-600 dark:text-gray-400 bg-gray-500/10' },
]

const stageBadgeColors: Record<CivilMatter['stage'], string> = {
  DRAFT: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30',
  PLAINT_FILED: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  WS_FILED: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  ISSUES_FRAMED: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  EVIDENCE: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  ARGUMENTS: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  HEARING: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  DECIDED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
}

const stanceColors: Record<string, string> = {
  admit: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  deny: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  partly_admit: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  require_proof: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
}

const wizardStepLabels = [
  'Create Matter',
  'Capture Facts',
  'Draft Plaint',
  'Written Statement',
  'Injunction IA',
  'Arguments',
]

/* ─── Animation Variants ─── */

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

/* ─── Helpers ─── */

function genId() {
  return crypto.randomUUID()
}

function emptyFacts(): MatterFacts {
  return {
    parties: [],
    properties: [],
    contracts: [],
    events: [],
    payments: [],
    reliefs: [],
    causeOfActionDate: '',
  }
}

/* ─── Main Component ─── */

export default function CivilOriginalView() {
  const civilMatters = useAppStore((s) => s.civilMatters)
  const addCivilMatter = useAppStore((s) => s.addCivilMatter)
  const updateCivilMatter = useAppStore((s) => s.updateCivilMatter)
  const profile = useProfileStore((s) => s.profile)

  /* ── Top-level screen ── */
  const [screen, setScreen] = useState<'list' | 'wizard' | 'preview'>('list')

  /* ── Wizard step ── */
  const [wizardStep, setWizardStep] = useState(0)

  /* ── Step 0: Create matter ── */
  const [selectedSubject, setSelectedSubject] = useState<CivilMatter['subject'] | null>(null)
  const [courtName, setCourtName] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')

  /* ── Step 1: Facts ── */
  const [facts, setFacts] = useState<MatterFacts>(emptyFacts())
  const [valuation, setValuation] = useState({ suitValue: '', courtFeePaid: '' })
  const [extractText, setExtractText] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)

  /* ── Step 2: Plaint ── */
  const [isGeneratingPlaint, setIsGeneratingPlaint] = useState(false)
  const [genMessage, setGenMessage] = useState('')
  const [genProgress, setGenProgress] = useState(0)
  const [plaintDoc, setPlaintDoc] = useState<CivilDraftDocument | null>(null)

  /* ── Step 3: WS ── */
  const [plaintTextForWS, setPlaintTextForWS] = useState('')
  const [wsDefendantCounsel, setWsDefendantCounsel] = useState('')
  const [wsAdditionalPleas, setWsAdditionalPleas] = useState('')
  const [wsSetoffAmount, setWsSetoffAmount] = useState('')
  const [wsSetoffBasis, setWsSetoffBasis] = useState('')
  const [isGeneratingWS, setIsGeneratingWS] = useState(false)
  const [wsDoc, setWsDoc] = useState<CivilDraftDocument | null>(null)
  const [wsParaReplies, setWsParaReplies] = useState<
    { paraNumber: number; plainText: string; stance: string; replyDraft: string }[]
  >([])
  const [wsPrelimSubs, setWsPrelimSubs] = useState<string[]>([])
  const [wsEditReply, setWsEditReply] = useState<Record<number, string>>({})

  /* ── Step 4: Injunction IA ── */
  const [iaType, setIaType] = useState('')
  const [iaPropertyRight, setIaPropertyRight] = useState('')
  const [iaUrgency, setIaUrgency] = useState('')
  const [iaIrreparable, setIaIrreparable] = useState('')
  const [isGeneratingIA, setIsGeneratingIA] = useState(false)
  const [iaDoc, setIaDoc] = useState<CivilDraftDocument | null>(null)
  const [iaAffidavitDoc, setIaAffidavitDoc] = useState<CivilDraftDocument | null>(null)

  /* ── Step 5: Arguments ── */
  const [issuesOrderText, setIssuesOrderText] = useState('')
  const [isParsingIssues, setIsParsingIssues] = useState(false)
  const [issues, setIssues] = useState<Issue[]>([])
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [isGeneratingArgs, setIsGeneratingArgs] = useState(false)
  const [argsDoc, setArgsDoc] = useState<CivilDraftDocument | null>(null)

  /* ── Preview ── */
  const [previewTab, setPreviewTab] = useState('PLAINT')
  const [isEditingPreview, setIsEditingPreview] = useState(false)
  const [editPreviewContent, setEditPreviewContent] = useState('')
  const [currentMatterId, setCurrentMatterId] = useState<string | null>(null)

  /* ── General ── */
  const [error, setError] = useState<string | null>(null)

  /* ── Current working matter (for wizard) ── */
  const currentMatter = useMemo((): CivilMatter | null => {
    if (!currentMatterId) return null
    return civilMatters.find((m) => m.id === currentMatterId) ?? null
  }, [currentMatterId, civilMatters])

  const previewDocs = useMemo(() => {
    if (!currentMatter) return []
    return currentMatter.documents
  }, [currentMatter])

  /* ─── Navigation helpers ─── */

  const goNext = useCallback(() => setWizardStep((s) => Math.min(s + 1, 5)), [])
  const goBack = useCallback(() => setWizardStep((s) => Math.max(s - 1, 0)), [])

  /* ─── Helpers: add/remove parties, events, etc ─── */

  const addParty = useCallback(() => {
    setFacts((prev) => ({
      ...prev,
      parties: [...prev.parties, { name: '', address: '', role: 'plaintiff' as const, counsel: '' }],
    }))
  }, [])

  const removeParty = useCallback((idx: number) => {
    setFacts((prev) => ({ ...prev, parties: prev.parties.filter((_, i) => i !== idx) }))
  }, [])

  const updateParty = useCallback((idx: number, field: string, value: string) => {
    setFacts((prev) => ({
      ...prev,
      parties: prev.parties.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }))
  }, [])

  const addEvent = useCallback(() => {
    setFacts((prev) => ({
      ...prev,
      events: [...prev.events, { date: '', description: '' }],
    }))
  }, [])

  const removeEvent = useCallback((idx: number) => {
    setFacts((prev) => ({ ...prev, events: prev.events.filter((_, i) => i !== idx) }))
  }, [])

  const updateEvent = useCallback((idx: number, field: string, value: string) => {
    setFacts((prev) => ({
      ...prev,
      events: prev.events.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }))
  }, [])

  const addIssue = useCallback(() => {
    setIssues((prev) => [
      ...prev,
      { id: genId(), issueNumber: prev.length + 1, issueText: '' },
    ])
  }, [])

  const removeIssue = useCallback((id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateIssue = useCallback((id: string, field: string, value: string | number) => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }, [])

  const addEvidenceItem = useCallback(() => {
    setEvidence((prev) => [
      ...prev,
      { id: genId(), exhibitNumber: '', description: '', type: 'DOCUMENT' as const, gist: '' },
    ])
  }, [])

  const removeEvidenceItem = useCallback((id: string) => {
    setEvidence((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const updateEvidenceItem = useCallback((id: string, field: string, value: string) => {
    setEvidence((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  }, [])

  /* ─── AI API caller ─── */

  const callCivilAI = useCallback(async (task: string, payload: Record<string, unknown>) => {
    const res = await fetch(CIVIL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, ...payload }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `API call failed (${res.status})`)
    }
    return res.json()
  }, [])

  /* ─── Step 0: Create & Continue ─── */

  const handleCreateMatter = useCallback(() => {
    if (!selectedSubject || !courtName.trim()) return
    const matter: CivilMatter = {
      id: genId(),
      type: 'OS',
      subject: selectedSubject,
      stage: 'DRAFT',
      courtName: courtName.trim(),
      jurisdiction: jurisdiction.trim(),
      valuation: valuation.suitValue ? valuation : undefined,
      facts: { ...facts, reliefs: facts.reliefs },
      documents: [],
      issues: [],
      evidence: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addCivilMatter(matter)
    setCurrentMatterId(matter.id)
    setScreen('wizard')
    setWizardStep(1)
  }, [selectedSubject, courtName, jurisdiction, valuation, facts, addCivilMatter])

  /* ─── Step 1: AI Extract Facts ─── */

  const handleExtractFacts = useCallback(async () => {
    if (!extractText.trim()) return
    setIsExtracting(true)
    setError(null)
    try {
      const data = await callCivilAI('extractFacts', { text: extractText })
      if (data.parties) {
        setFacts((prev) => ({ ...prev, parties: data.parties }))
      }
      if (data.events) {
        setFacts((prev) => ({ ...prev, events: data.events }))
      }
      if (data.causeOfActionDate) {
        setFacts((prev) => ({ ...prev, causeOfActionDate: data.causeOfActionDate }))
      }
      if (data.reliefs) {
        setFacts((prev) => ({ ...prev, reliefs: data.reliefs }))
      }
      setExtractText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fact extraction failed')
    } finally {
      setIsExtracting(false)
    }
  }, [extractText, callCivilAI])

  /* ─── Step 1: Save facts and go to step 2 ─── */

  const handleSaveFacts = useCallback(() => {
    if (!currentMatterId) return
    const reliefs = (Array.isArray(facts.reliefs) ? facts.reliefs.join('\n') : (facts.reliefs || ''))
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)
    updateCivilMatter(currentMatterId, {
      facts: { ...facts, reliefs },
      valuation: valuation.suitValue ? valuation : undefined,
      stage: 'PLAINT_FILED',
    })
    setWizardStep(2)
  }, [currentMatterId, facts, valuation, updateCivilMatter])

  /* ─── Step 2: Generate Plaint ─── */

  const handleGeneratePlaint = useCallback(async () => {
    if (!currentMatterId) return
    setIsGeneratingPlaint(true)
    setError(null)
    setGenProgress(0)
    setGenMessage('Analyzing matter details...')

    const messages = [
      'Analyzing matter details...',
      'Drafting plaint narrative...',
      'Applying legal provisions...',
      'Finalizing plaint...',
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
      const matter = civilMatters.find((m) => m.id === currentMatterId)
      const data = await callCivilAI('generatePlaint', { matter: matter?.facts, subject: matter?.subject, courtName: matter?.courtName })
      clearInterval(msgInterval)
      clearInterval(progressInterval)
      setGenProgress(100)
      setGenMessage('Plaint generated!')

      const doc: CivilDraftDocument = {
        id: genId(),
        docType: 'PLAINT',
        title: `Plaint — ${matter?.subject || 'Civil Suit'}`,
        content: stripMarkdown(String(data.content || data.plaintText || '')),
        keyPoints: data.keyPoints || [],
        warnings: data.warnings || ['AI-generated draft — advocate review required.'],
        version: 1,
        createdAt: new Date().toISOString(),
      }
      setPlaintDoc(doc)

      const existing = matter?.documents || []
      updateCivilMatter(currentMatterId, { documents: [...existing, doc] })

      setTimeout(() => {
        setIsGeneratingPlaint(false)
      }, 600)
    } catch (err) {
      clearInterval(msgInterval)
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : 'Plaint generation failed')
      setIsGeneratingPlaint(false)
    }
  }, [currentMatterId, civilMatters, updateCivilMatter, callCivilAI])

  const handleSavePlaintAndContinue = useCallback(() => {
    setWizardStep(3)
    if (plaintDoc) setPlaintTextForWS(plaintDoc.content)
  }, [plaintDoc])

  /* ─── Step 3: Generate WS ─── */

  const handleGenerateWS = useCallback(async () => {
    if (!currentMatterId) return
    setIsGeneratingWS(true)
    setError(null)
    setGenProgress(0)
    setGenMessage('Analyzing plaint paragraphs...')

    const messages = ['Analyzing plaint paragraphs...', 'Drafting replies...', 'Applying legal defenses...', 'Finalizing WS...']
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
      const data = await callCivilAI('generateWS', {
        plaintText: plaintTextForWS,
        defendantCounsel: wsDefendantCounsel,
        additionalPleas: wsAdditionalPleas,
        setoffAmount: wsSetoffAmount,
        setoffBasis: wsSetoffBasis,
      })
      clearInterval(msgInterval)
      clearInterval(progressInterval)
      setGenProgress(100)
      setGenMessage('Written Statement generated!')

      if (data.paraReplies) setWsParaReplies(data.paraReplies)
      if (data.preliminarySubmissions) setWsPrelimSubs(data.preliminarySubmissions)

      const doc: CivilDraftDocument = {
        id: genId(),
        docType: 'WRITTEN_STATEMENT',
        title: 'Written Statement',
        content: stripMarkdown(String(data.content || data.wsText || '')),
        paraReplies: data.paraReplies || [],
        preliminarySubmissions: data.preliminarySubmissions || [],
        keyPoints: data.keyPoints || [],
        warnings: data.warnings || ['AI-generated draft — advocate review required.'],
        version: 1,
        createdAt: new Date().toISOString(),
      }
      setWsDoc(doc)

      const matter = civilMatters.find((m) => m.id === currentMatterId)
      const existing = matter?.documents || []
      updateCivilMatter(currentMatterId, { documents: [...existing, doc], stage: 'WS_FILED' })

      setTimeout(() => setIsGeneratingWS(false), 600)
    } catch (err) {
      clearInterval(msgInterval)
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : 'WS generation failed')
      setIsGeneratingWS(false)
    }
  }, [currentMatterId, plaintTextForWS, wsDefendantCounsel, wsAdditionalPleas, wsSetoffAmount, wsSetoffBasis, civilMatters, updateCivilMatter, callCivilAI])

  const handleRegenerateWS = useCallback(async () => {
    if (!currentMatterId || wsParaReplies.length === 0) return
    setIsGeneratingWS(true)
    setGenMessage('Regenerating with updated stances...')
    try {
      const data = await callCivilAI('regenerateWS', { paraReplies: wsParaReplies })
      if (data.content) {
        setWsDoc((prev) => prev ? { ...prev, content: data.content } : null)
      }
      if (data.paraReplies) {
        setWsParaReplies(data.paraReplies)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setIsGeneratingWS(false)
    }
  }, [currentMatterId, wsParaReplies, callCivilAI])

  const cycleStance = useCallback((paraNumber: number) => {
    setWsParaReplies((prev) => {
      const stances = ['admit', 'deny', 'partly_admit', 'require_proof']
      return prev.map((pr) => {
        if (pr.paraNumber === paraNumber) {
          const curIdx = stances.indexOf(pr.stance)
          return { ...pr, stance: stances[(curIdx + 1) % stances.length] }
        }
        return pr
      })
    })
  }, [])

  /* ─── Step 4: Injunction IA ─── */

  const handleGenerateIA = useCallback(async () => {
    if (!currentMatterId || !iaType) return
    setIsGeneratingIA(true)
    setError(null)
    try {
      const data = await callCivilAI('generateInjunctionIA', {
        injunctionType: iaType,
        propertyRight: iaPropertyRight,
        urgency: iaUrgency,
        irreparable: iaIrreparable,
        matter: civilMatters.find((m) => m.id === currentMatterId),
      })

      const doc: CivilDraftDocument = {
        id: genId(),
        docType: 'IA_INJUNCTION',
        title: `IA — ${iaType}`,
        content: stripMarkdown(String(data.content || data.iaText || '')),
        keyPoints: data.keyPoints || [],
        warnings: data.warnings || ['AI-generated draft — advocate review required.'],
        version: 1,
        createdAt: new Date().toISOString(),
      }
      setIaDoc(doc)

      if (data.affidavit) {
        const affDoc: CivilDraftDocument = {
          id: genId(),
          docType: 'AFFIDAVIT',
          title: 'Supporting Affidavit',
          content: data.affidavit,
          keyPoints: [],
          warnings: ['AI-generated draft — advocate review required.'],
          version: 1,
          createdAt: new Date().toISOString(),
        }
        setIaAffidavitDoc(affDoc)

        const matter = civilMatters.find((m) => m.id === currentMatterId)
        const existing = matter?.documents || []
        updateCivilMatter(currentMatterId, { documents: [...existing, doc, affDoc] })
      } else {
        const matter = civilMatters.find((m) => m.id === currentMatterId)
        const existing = matter?.documents || []
        updateCivilMatter(currentMatterId, { documents: [...existing, doc] })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'IA generation failed')
    } finally {
      setIsGeneratingIA(false)
    }
  }, [currentMatterId, iaType, iaPropertyRight, iaUrgency, iaIrreparable, civilMatters, updateCivilMatter, callCivilAI])

  /* ─── Step 5: Parse Issues ─── */

  const handleParseIssues = useCallback(async () => {
    if (!issuesOrderText.trim()) return
    setIsParsingIssues(true)
    setError(null)
    try {
      const data = await callCivilAI('parseIssues', { orderText: issuesOrderText })
      if (data.issues) {
        setIssues(
          data.issues.map((iss: { text: string; number: number; type?: string }, idx: number) => ({
            id: genId(),
            issueNumber: iss.number || idx + 1,
            issueText: iss.text,
            type: iss.type,
          }))
        )
      }
      setIssuesOrderText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Issue parsing failed')
    } finally {
      setIsParsingIssues(false)
    }
  }, [issuesOrderText, callCivilAI])

  /* ─── Step 5: Generate Arguments ─── */

  const handleGenerateArguments = useCallback(async () => {
    if (!currentMatterId || issues.length === 0) return
    setIsGeneratingArgs(true)
    setError(null)
    try {
      const data = await callCivilAI('generateArguments', {
        issues,
        evidence,
        matter: civilMatters.find((m) => m.id === currentMatterId),
      })

      const doc: CivilDraftDocument = {
        id: genId(),
        docType: 'WRITTEN_ARGUMENTS',
        title: 'Written Arguments',
        content: stripMarkdown(String(data.content || data.argumentsText || '')),
        issueArguments: data.issueArguments || [],
        keyPoints: data.keyPoints || [],
        warnings: data.warnings || ['AI-generated draft — advocate review required.'],
        version: 1,
        createdAt: new Date().toISOString(),
      }
      setArgsDoc(doc)

      const matter = civilMatters.find((m) => m.id === currentMatterId)
      updateCivilMatter(currentMatterId, {
        documents: [...(matter?.documents || []), doc],
        issues,
        evidence,
        stage: 'ARGUMENTS',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Argument generation failed')
    } finally {
      setIsGeneratingArgs(false)
    }
  }, [currentMatterId, issues, evidence, civilMatters, updateCivilMatter, callCivilAI])

  /* ─── Save civil matter & go to preview ─── */

  const handleSaveAndPreview = useCallback(() => {
    setScreen('preview')
    setPreviewTab('PLAINT')
  }, [])

  /* ─── Utility: copy / download / print ─── */

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  const handlePdfDownload = useCallback((title: string, content: string) => {
    const profile = useProfileStore.getState().profile
    if (!content) return
    generateBrandedPdf({ title, content, profile })
  }, [])

  const handleDownload = useCallback((title: string, content: string) => {
    generateBrandedPdf({
      title,
      content,
      profile,
    })
  }, [profile])

  // AI data extraction from uploaded documents
  const handleAiDataExtracted = useCallback((data: Record<string, unknown>, _file: UploadedFile) => {
    const fields = data as Record<string, unknown>
    // Extract parties
    if (fields.parties && Array.isArray(fields.parties)) {
      const parties = (fields.parties as Array<{ name?: string; address?: string; role?: string; counsel?: string }>)
        .filter((p) => p.name)
        .map((p) => ({ name: p.name || '', address: p.address || '', role: (p.role as 'plaintiff' | 'defendant') || 'plaintiff', counsel: p.counsel || '' }))
      if (parties.length > 0) {
        setFacts((prev) => ({ ...prev, parties }))
      }
    }
    // Extract events
    if (fields.events && Array.isArray(fields.events)) {
      const events = (fields.events as Array<{ date?: string; description?: string }>)
        .filter((e) => e.description)
        .map((e) => ({ date: e.date || '', description: e.description || '' }))
      if (events.length > 0) {
        setFacts((prev) => ({ ...prev, events }))
      }
    }
    // Extract cause of action date
    if (fields.causeOfActionDate && typeof fields.causeOfActionDate === 'string') {
      setFacts((prev) => ({ ...prev, causeOfActionDate: fields.causeOfActionDate as string }))
    }
    // Extract reliefs
    if (fields.reliefs && Array.isArray(fields.reliefs)) {
      const reliefs = fields.reliefs.filter((r) => typeof r === 'string').map((r) => r as string)
      if (reliefs.length > 0) {
        setFacts((prev) => ({ ...prev, reliefs }))
      }
    }
    // Extract properties
    if (fields.properties && Array.isArray(fields.properties)) {
      const properties = (fields.properties as Array<{ description?: string; surveyNumber?: string; address?: string }>)
        .filter((p) => p.description)
        .map((p) => ({ description: p.description || '', surveyNumber: p.surveyNumber || '', address: p.address || '' }))
      if (properties.length > 0) {
        setFacts((prev) => ({ ...prev, properties }))
      }
    }
    // Extract contracts
    if (fields.contracts && Array.isArray(fields.contracts)) {
      const contracts = (fields.contracts as Array<{ date?: string; amount?: string; terms?: string; breach?: string }>)
        .filter((c) => c.terms || c.breach)
        .map((c) => ({ date: c.date || '', amount: c.amount || '', terms: c.terms || '', breach: c.breach || '' }))
      if (contracts.length > 0) {
        setFacts((prev) => ({ ...prev, contracts }))
      }
    }
    // Extract court name
    if (fields.courtName && typeof fields.courtName === 'string') {
      setCourtName((prev) => prev || (fields.courtName as string))
    }
    // Extract payments
    if (fields.payments && Array.isArray(fields.payments)) {
      const payments = (fields.payments as Array<{ date?: string; amount?: string; purpose?: string }>)
        .filter((p) => p.amount)
        .map((p) => ({ date: p.date || '', amount: p.amount || '', purpose: p.purpose || '' }))
      if (payments.length > 0) {
        setFacts((prev) => ({ ...prev, payments }))
      }
    }
  }, [])

  const handlePrint = useCallback((title: string, content: string) => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:'Times New Roman',serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;white-space:pre-wrap;}</style></head><body>${content}</body></html>`)
    w.document.close()
    w.print()
  }, [])

  /* ─── Reset / New Case ─── */

  const handleResetWizard = useCallback(() => {
    setWizardStep(0)
    setSelectedSubject(null)
    setCourtName('')
    setJurisdiction('')
    setFacts(emptyFacts())
    setValuation({ suitValue: '', courtFeePaid: '' })
    setExtractText('')
    setPlaintDoc(null)
    setPlaintTextForWS('')
    setWsDefendantCounsel('')
    setWsAdditionalPleas('')
    setWsSetoffAmount('')
    setWsSetoffBasis('')
    setWsDoc(null)
    setWsParaReplies([])
    setWsPrelimSubs([])
    setWsEditReply({})
    setIaType('')
    setIaPropertyRight('')
    setIaUrgency('')
    setIaIrreparable('')
    setIaDoc(null)
    setIaAffidavitDoc(null)
    setIssuesOrderText('')
    setIssues([])
    setEvidence([])
    setArgsDoc(null)
    setError(null)
    setCurrentMatterId(null)
  }, [])

  const handleNewCase = useCallback(() => {
    handleResetWizard()
    setScreen('list')
  }, [handleResetWizard])

  const handleOpenExisting = useCallback((matter: CivilMatter) => {
    setCurrentMatterId(matter.id)
    setFacts(matter.facts)
    if (matter.valuation) setValuation(matter.valuation)
    setSelectedSubject(matter.subject)
    setCourtName(matter.courtName)
    setJurisdiction(matter.jurisdiction)
    if (matter.issues) setIssues(matter.issues)
    if (matter.evidence) setEvidence(matter.evidence)
    if (matter.documents) {
      const pd = matter.documents.find((d) => d.docType === 'PLAINT')
      if (pd) setPlaintDoc(pd)
      const wd = matter.documents.find((d) => d.docType === 'WRITTEN_STATEMENT')
      if (wd) {
        setWsDoc(wd)
        if (wd.paraReplies) setWsParaReplies(wd.paraReplies)
        if (wd.preliminarySubmissions) setWsPrelimSubs(wd.preliminarySubmissions)
      }
    }
    setScreen('preview')
    setPreviewTab('PLAINT')
  }, [])

  /* ═══════════════════ RENDER ═══════════════════ */

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <AnimatePresence mode="wait">

          {/* ═══════════════════ SCREEN: MATTER LIST ═══════════════════ */}
          {screen === 'list' && (
            <motion.div
              key="screen-list"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
            >
              {/* Header */}
              <motion.div variants={fadeInUp} custom={0} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                      <Scale className="size-5 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      Civil Original Side
                    </h1>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Plaint, Written Statement, Injunction, Written Arguments
                  </p>
                </div>
                <Button
                  onClick={() => { handleResetWizard(); setScreen('wizard'); }}
                  className={cn(
                    'h-11 text-sm font-semibold rounded-xl',
                    'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                    'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                    'transition-all duration-200 active:scale-[0.98]'
                  )}
                >
                  <Plus className="size-4 mr-2" />
                  New Civil Case
                </Button>
              </motion.div>

              {/* Matter cards */}
              {civilMatters.length > 0 ? (
                <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {civilMatters.map((matter, idx) => (
                    <motion.div
                      key={matter.id}
                      variants={fadeInUp}
                      custom={idx}
                      onClick={() => handleOpenExisting(matter)}
                      className={cn(
                        'flex flex-col rounded-xl border-2 border-border bg-card p-5 cursor-pointer',
                        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                        'transition-all duration-200 active:scale-[0.98]'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={cn('text-xs border', subjectOptions.find((s) => s.id === matter.subject)?.color || '')}>
                          {matter.subject.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={cn('text-xs border', stageBadgeColors[matter.stage])}>
                          {matter.stage.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1 truncate">
                        {matter.courtName || 'Untitled Matter'}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {matter.facts.parties
                          .slice(0, 3)
                          .map((p) => p.name || 'Unnamed')
                          .join(' vs ')}{' '}
                        {matter.facts.parties.length > 3 && 'et al.'}
                      </p>
                      <div className="flex items-center gap-3 mt-auto pt-3 border-t">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="size-3" /> {matter.documents.length}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ListChecks className="size-3" /> {matter.issues.length}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                          <Calendar className="size-3" />
                          {new Date(matter.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  variants={fadeInUp}
                  custom={1}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
                    <Scale className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No Civil Matters</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    Start by creating a new civil case to generate plaints, written statements, and more.
                  </p>
                  <Button
                    onClick={() => { handleResetWizard(); setScreen('wizard'); }}
                    className={cn(
                      'h-11 text-sm font-semibold rounded-xl',
                      'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                      'text-white shadow-lg shadow-amber-500/25',
                      'transition-all duration-200'
                    )}
                  >
                    <Plus className="size-4 mr-2" />
                    Create Your First Case
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════ SCREEN: WIZARD ═══════════════════ */}
          {screen === 'wizard' && (
            <motion.div
              key="screen-wizard"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
            >
              {/* Header */}
              <motion.div variants={fadeInUp} custom={0} className="flex items-center gap-3 mb-2">
                <Button variant="ghost" size="sm" onClick={() => setScreen('list')} className="-ml-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-4 mr-1.5" /> Back
                </Button>
                <Scale className="size-5 text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Civil Original Side</h1>
              </motion.div>

              {/* Step Indicator */}
              <motion.div variants={fadeInUp} custom={1} className="mb-8 overflow-x-auto pb-2">
                <div className="flex items-center justify-center min-w-[600px]">
                  {wizardStepLabels.map((label, idx) => (
                    <div key={label} className="flex items-center">
                      <button
                        onClick={() => idx <= wizardStep && setWizardStep(idx)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
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
                        <span className={cn('text-xs sm:text-sm font-medium hidden sm:inline', idx <= wizardStep ? 'text-foreground' : 'text-muted-foreground')}>
                          {label}
                        </span>
                      </button>
                      {idx < wizardStepLabels.length - 1 && (
                        <div className={cn('w-6 sm:w-10 h-0.5 mx-1 rounded-full transition-colors duration-300', idx < wizardStep ? 'bg-primary' : 'bg-border')} />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Wizard Step Content */}
              <AnimatePresence mode="wait">

                {/* ─── STEP 0: Create Civil Matter ─── */}
                {wizardStep === 0 && (
                  <motion.div key="ws-0" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Choose Subject & Court
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Select the subject matter and enter court details to create your civil case
                    </motion.p>

                    <motion.div variants={staggerContainer} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                      {subjectOptions.map((subj, idx) => (
                        <motion.button
                          key={subj.id}
                          variants={fadeInUp}
                          custom={idx}
                          onClick={() => setSelectedSubject(subj.id)}
                          className={cn(
                            'flex flex-col items-start gap-3 rounded-xl p-4 sm:p-5 text-left transition-all duration-200',
                            'border-2 bg-card group active:scale-[0.97]',
                            selectedSubject === subj.id
                              ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10'
                              : 'border-border hover:border-primary/30 hover:bg-primary/5'
                          )}
                        >
                          <div className={cn('flex size-11 items-center justify-center rounded-xl transition-colors', selectedSubject === subj.id ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/20')}>
                            <subj.icon className="size-5 text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-foreground">{subj.label}</span>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subj.description}</p>
                          </div>
                          <ChevronRight className={cn('size-4 ml-auto mt-auto transition-opacity', selectedSubject === subj.id ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100')} />
                        </motion.button>
                      ))}
                    </motion.div>

                    <motion.div variants={fadeInUp} custom={7} className="max-w-xl space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Court Name <span className="text-destructive">*</span></Label>
                        <Input value={courtName} onChange={(e) => setCourtName(e.target.value)} placeholder="e.g., District Court, Bangalore" className="rounded-xl border-2 border-border focus-visible:border-primary/40 h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Jurisdiction</Label>
                        <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g., Bangalore Urban District" className="rounded-xl border-2 border-border focus-visible:border-primary/40 h-11" />
                      </div>
                      <Button
                        onClick={handleCreateMatter}
                        disabled={!selectedSubject || !courtName.trim()}
                        className={cn(
                          'w-full h-12 text-sm font-semibold rounded-xl mt-2',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                          'transition-all duration-200 active:scale-[0.98]',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                        )}
                      >
                        <Sparkles className="size-4 mr-2" />
                        Create & Continue
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* ─── STEP 1: Fact Capture ─── */}
                {wizardStep === 1 && (
                  <motion.div key="ws-1" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Capture Facts
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Enter all relevant details about the civil matter step-by-step
                    </motion.p>

                    {/* Upload Documents for AI Extraction */}
                    <motion.div variants={fadeInUp} custom={2} className="space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Upload className="size-4" />
                        Upload Case Documents
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Upload plaints, agreements, notices, correspondence — AI will extract facts, parties, events, and auto-fill the form
                      </p>
                      <DocumentUpload
                        module="civil"
                        maxFiles={10}
                        compact
                        onAiDataExtracted={handleAiDataExtracted}
                      />
                    </motion.div>

                    {/* AI Extract Facts */}
                    <motion.div variants={fadeInUp} custom={3} className="mb-6">
                      <Card className="rounded-xl border-2 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-primary/5">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                              <Brain className="size-4 text-amber-500" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">AI Extract Facts</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">Paste narrative text to auto-fill parties, events, and cause of action</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Textarea
                              value={extractText}
                              onChange={(e) => setExtractText(e.target.value)}
                              placeholder="Paste client narration, FIR, notice, or any descriptive text..."
                              className="min-h-[80px] flex-1 text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y"
                            />
                            <Button
                              onClick={handleExtractFacts}
                              disabled={!extractText.trim() || isExtracting}
                              className="shrink-0 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                            >
                              {isExtracting ? <Loader2 className="size-4 animate-spin" /> : <Brain className="size-4 mr-2" />}
                              <span className="hidden sm:inline">Extract</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Section A: Parties */}
                    <motion.div variants={fadeInUp} custom={3} className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">Section A — Parties</h3>
                          <span className="text-xs text-muted-foreground">(min 1 plaintiff + 1 defendant)</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={addParty} className="rounded-lg text-xs h-8">
                          <Plus className="size-3.5 mr-1" /> Add Party
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {facts.parties.map((party, idx) => (
                          <Card key={idx} className="rounded-xl border border-border p-4">
                            <div className="flex items-start justify-between mb-3">
                              <Badge className={cn('text-xs border', party.role === 'plaintiff' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30')}>
                                {party.role === 'plaintiff' ? 'Plaintiff' : 'Defendant'}
                              </Badge>
                              <Button size="icon" variant="ghost" onClick={() => removeParty(idx)} className="size-7 text-muted-foreground hover:text-red-500">
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Name</Label>
                                <Input value={party.name} onChange={(e) => updateParty(idx, 'name', e.target.value)} placeholder="Full name" className="rounded-lg h-9 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold">Role</Label>
                                <Select value={party.role} onValueChange={(v) => updateParty(idx, 'role', v)}>
                                  <SelectTrigger className="rounded-lg h-9 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="plaintiff">Plaintiff</SelectItem>
                                    <SelectItem value="defendant">Defendant</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1 mt-3">
                              <Label className="text-xs font-semibold">Address</Label>
                              <Textarea value={party.address} onChange={(e) => updateParty(idx, 'address', e.target.value)} placeholder="Address" className="rounded-lg text-sm min-h-[50px] resize-y" />
                            </div>
                            <div className="space-y-1 mt-3">
                              <Label className="text-xs font-semibold">Counsel <span className="text-muted-foreground font-normal">(optional)</span></Label>
                              <Input value={party.counsel || ''} onChange={(e) => updateParty(idx, 'counsel', e.target.value)} placeholder="Advocate name" className="rounded-lg h-9 text-sm" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </motion.div>

                    {/* Section B: Transaction / Contract Details */}
                    {(selectedSubject === 'RECOVERY' || selectedSubject === 'SPECIFIC_PERFORMANCE') && (
                      <motion.div variants={fadeInUp} custom={4} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="size-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">Section B — Transaction / Contract Details</h3>
                        </div>
                        <Card className="rounded-xl border border-border p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Agreement Date</Label>
                              <Input type="date" value={facts.contracts?.[0]?.date || ''} onChange={(e) => setFacts((prev) => ({ ...prev, contracts: prev.contracts?.length ? prev.contracts.map((c, i) => i === 0 ? { ...c, date: e.target.value } : c) : [{ date: e.target.value, amount: '', terms: '', breach: '' }] }))} className="rounded-lg h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Amount</Label>
                              <Input value={facts.contracts?.[0]?.amount || ''} onChange={(e) => setFacts((prev) => ({ ...prev, contracts: prev.contracts?.length ? prev.contracts.map((c, i) => i === 0 ? { ...c, amount: e.target.value } : c) : [{ date: '', amount: e.target.value, terms: '', breach: '' }] }))} placeholder="₹ Amount" className="rounded-lg h-9 text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Terms</Label>
                            <Textarea value={facts.contracts?.[0]?.terms || ''} onChange={(e) => setFacts((prev) => ({ ...prev, contracts: prev.contracts?.length ? prev.contracts.map((c, i) => i === 0 ? { ...c, terms: e.target.value } : c) : [{ date: '', amount: '', terms: e.target.value, breach: '' }] }))} placeholder="Terms of the agreement..." className="rounded-lg text-sm min-h-[60px] resize-y" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Breach Description</Label>
                            <Textarea value={facts.contracts?.[0]?.breach || ''} onChange={(e) => setFacts((prev) => ({ ...prev, contracts: prev.contracts?.length ? prev.contracts.map((c, i) => i === 0 ? { ...c, breach: e.target.value } : c) : [{ date: '', amount: '', terms: '', breach: e.target.value }] }))} placeholder="Describe the breach..." className="rounded-lg text-sm min-h-[60px] resize-y" />
                          </div>
                        </Card>
                      </motion.div>
                    )}

                    {/* Section C: Property Details */}
                    {(selectedSubject === 'POSSESSION' || selectedSubject === 'INJUNCTION' || selectedSubject === 'PARTITION' || selectedSubject === 'DECLARATION') && (
                      <motion.div variants={fadeInUp} custom={4} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Building className="size-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">Section C — Property Details</h3>
                        </div>
                        <Card className="rounded-xl border border-border p-4 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Property Description</Label>
                            <Textarea value={facts.properties?.[0]?.description || ''} onChange={(e) => setFacts((prev) => ({ ...prev, properties: prev.properties?.length ? prev.properties.map((p, i) => i === 0 ? { ...p, description: e.target.value } : p) : [{ description: e.target.value, surveyNumber: '', address: '' }] }))} placeholder="Description of the property..." className="rounded-lg text-sm min-h-[60px] resize-y" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Survey Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                              <Input value={facts.properties?.[0]?.surveyNumber || ''} onChange={(e) => setFacts((prev) => ({ ...prev, properties: prev.properties?.length ? prev.properties.map((p, i) => i === 0 ? { ...p, surveyNumber: e.target.value } : p) : [{ description: '', surveyNumber: e.target.value, address: '' }] }))} placeholder="Survey No." className="rounded-lg h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Address</Label>
                              <Input value={facts.properties?.[0]?.address || ''} onChange={(e) => setFacts((prev) => ({ ...prev, properties: prev.properties?.length ? prev.properties.map((p, i) => i === 0 ? { ...p, address: e.target.value } : p) : [{ description: '', surveyNumber: '', address: e.target.value }] }))} placeholder="Property address" className="rounded-lg h-9 text-sm" />
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )}

                    {/* Section D: Events Timeline */}
                    <motion.div variants={fadeInUp} custom={5} className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">Section D — Events Timeline</h3>
                        </div>
                        <Button size="sm" variant="outline" onClick={addEvent} className="rounded-lg text-xs h-8">
                          <Plus className="size-3.5 mr-1" /> Add Event
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {facts.events
                          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                          .map((event, idx) => {
                            const origIdx = facts.events.indexOf(event)
                            return (
                              <Card key={origIdx} className="rounded-xl border border-border p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <Badge className="text-xs border bg-muted">Event {origIdx + 1}</Badge>
                                  <Button size="icon" variant="ghost" onClick={() => removeEvent(origIdx)} className="size-7 text-muted-foreground hover:text-red-500">
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Date</Label>
                                    <Input type="date" value={event.date} onChange={(e) => updateEvent(origIdx, 'date', e.target.value)} className="rounded-lg h-9 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Description</Label>
                                    <Textarea value={event.description} onChange={(e) => updateEvent(origIdx, 'description', e.target.value)} placeholder="What happened..." className="rounded-lg text-sm min-h-[50px] resize-y" />
                                  </div>
                                </div>
                              </Card>
                            )
                          })}
                      </div>
                    </motion.div>

                    {/* Section E: Cause of Action */}
                    <motion.div variants={fadeInUp} custom={6} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Gavel className="size-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">Section E — Cause of Action & Reliefs</h3>
                      </div>
                      <Card className="rounded-xl border border-border p-4 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Cause of Action Date</Label>
                          <Input type="date" value={facts.causeOfActionDate} onChange={(e) => setFacts((prev) => ({ ...prev, causeOfActionDate: e.target.value }))} className="rounded-lg h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Reliefs Sought <span className="text-muted-foreground font-normal">(one per line)</span></Label>
                          <Textarea value={facts.reliefs.join('\n')} onChange={(e) => setFacts((prev) => ({ ...prev, reliefs: e.target.value.split('\n') }))} placeholder={"Decree for recovery of ₹5,00,000\nInterest at 18% p.a.\nCosts of the suit"} className="rounded-lg text-sm min-h-[80px] resize-y" />
                        </div>
                      </Card>
                    </motion.div>

                    {/* Section F: Valuation */}
                    <motion.div variants={fadeInUp} custom={7} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <BadgeIcon className="size-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">Section F — Valuation <span className="text-muted-foreground font-normal">(optional)</span></h3>
                      </div>
                      <Card className="rounded-xl border border-border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Suit Value</Label>
                            <Input value={valuation.suitValue} onChange={(e) => setValuation((prev) => ({ ...prev, suitValue: e.target.value }))} placeholder="₹ Total suit value" className="rounded-lg h-9 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Court Fee Paid</Label>
                            <Input value={valuation.courtFeePaid} onChange={(e) => setValuation((prev) => ({ ...prev, courtFeePaid: e.target.value }))} placeholder="₹ Court fee" className="rounded-lg h-9 text-sm" />
                          </div>
                        </div>
                      </Card>
                    </motion.div>

                    {/* Error */}
                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex items-center gap-2 text-xs text-red-500">
                        <AlertTriangle className="size-3.5 shrink-0" /> {error}
                      </motion.div>
                    )}

                    {/* Navigation */}
                    <motion.div variants={fadeInUp} custom={8} className="flex items-center justify-between pt-4 border-t">
                      <Button variant="outline" onClick={goBack} disabled={wizardStep === 0} className="rounded-xl">
                        <ArrowLeft className="size-4 mr-2" /> Back
                      </Button>
                      <Button
                        onClick={handleSaveFacts}
                        className={cn(
                          'h-11 px-6 text-sm font-semibold rounded-xl',
                          'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                          'text-white shadow-lg shadow-amber-500/25',
                          'transition-all duration-200 active:scale-[0.98]'
                        )}
                      >
                        Save & Continue <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* ─── STEP 2: Draft Plaint ─── */}
                {wizardStep === 2 && (
                  <motion.div key="ws-2" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Draft Plaint
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Review captured facts and generate the plaint
                    </motion.p>

                    {/* Facts Summary */}
                    <motion.div variants={fadeInUp} custom={2} className="mb-6">
                      <Card className="rounded-xl border border-border p-4 sm:p-5">
                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                          <Scroll className="size-4 text-primary" /> Facts Summary
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Plaintiffs:</span>{' '}
                            <span className="font-medium text-foreground">{facts.parties.filter((p) => p.role === 'plaintiff').map((p) => p.name || 'Unnamed').join(', ') || 'None'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Defendants:</span>{' '}
                            <span className="font-medium text-foreground">{facts.parties.filter((p) => p.role === 'defendant').map((p) => p.name || 'Unnamed').join(', ') || 'None'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cause of Action:</span>{' '}
                            <span className="font-medium text-foreground">{facts.causeOfActionDate || 'Not set'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Events:</span>{' '}
                            <span className="font-medium text-foreground">{facts.events.length} recorded</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-muted-foreground">Reliefs:</span>{' '}
                            <span className="font-medium text-foreground">{facts.reliefs.filter(Boolean).join('; ') || 'None specified'}</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>

                    {/* Generate or show result */}
                    {!plaintDoc && !isGeneratingPlaint && (
                      <motion.div variants={fadeInUp} custom={3} className="flex justify-center">
                        <Button
                          onClick={handleGeneratePlaint}
                          className={cn(
                            'h-12 px-8 text-sm font-semibold rounded-xl',
                            'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                            'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                            'transition-all duration-200 active:scale-[0.98]'
                          )}
                        >
                          <Sparkles className="size-4 mr-2" />
                          Generate Plaint
                        </Button>
                      </motion.div>
                    )}

                    {/* AI Loading */}
                    {isGeneratingPlaint && (
                      <motion.div key="plaint-loading" className="flex flex-col items-center justify-center py-16">
                        <motion.div className="relative" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                          <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                            <Brain className="size-8 text-primary" />
                          </div>
                          <motion.div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-primary/20" animate={{ rotate: -360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
                        </motion.div>
                        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg font-bold text-foreground mt-8">
                          AI is drafting your plaint...
                        </motion.h2>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 w-full max-w-xs space-y-3">
                          <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full" animate={{ width: `${genProgress}%` }} transition={{ duration: 0.4 }} />
                          </div>
                          <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                            <Loader2 className="size-3.5 animate-spin" /> {genMessage}
                          </p>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Plaint Preview */}
                    {plaintDoc && !isGeneratingPlaint && (
                      <motion.div variants={fadeInUp} custom={4}>
                        <Card className="rounded-xl border-2 border-border overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                            <span className="text-sm font-semibold text-foreground">{plaintDoc.title}</span>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleCopy(plaintDoc.content)} className="size-8" title="Copy"><Copy className="size-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handlePdfDownload(plaintDoc.title, plaintDoc.content)} className="size-8" title="Download PDF"><FileDown className="size-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(plaintDoc.title, plaintDoc.content)} className="size-8" title="Download TXT"><DownloadIcon className="size-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handlePrint(plaintDoc.title, plaintDoc.content)} className="size-8" title="Print"><Printer className="size-3.5" /></Button>
                            </div>
                          </div>
                          <CardContent className="p-0">
                            <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-muted/30 dark:from-card dark:to-card min-h-[400px] max-h-[500px] overflow-y-auto">
                              {plaintDoc?.content?.split('\n').map((line, idx) => (
                                <p key={idx} className={cn('text-sm leading-relaxed text-foreground/90', line.trim() === '' && 'h-4', idx === 0 && 'text-base font-bold text-foreground mb-4')}>
                                  {line || '\u00A0'}
                                </p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <div className="flex items-center justify-between pt-6">
                          <Button variant="outline" onClick={goBack} className="rounded-xl">
                            <ArrowLeft className="size-4 mr-2" /> Back
                          </Button>
                          <Button
                            onClick={handleSavePlaintAndContinue}
                            className={cn(
                              'h-11 px-6 text-sm font-semibold rounded-xl',
                              'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                              'text-white shadow-lg shadow-amber-500/25',
                              'transition-all duration-200 active:scale-[0.98]'
                            )}
                          >
                            Save & Continue <ArrowRight className="size-4 ml-2" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ─── STEP 3: Written Statement ─── */}
                {wizardStep === 3 && (
                  <motion.div key="ws-3" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Draft Written Statement
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Provide plaint details and generate para-wise written statement
                    </motion.p>

                    {/* Plaint Input */}
                    <motion.div variants={fadeInUp} custom={2} className="mb-6">
                      <Card className="rounded-xl border border-border p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Scroll className="size-4 text-primary" /> Plaint Text
                          </h3>
                          {plaintDoc && (
                            <Button size="sm" variant="outline" onClick={() => setPlaintTextForWS(plaintDoc.content)} className="rounded-lg text-xs h-8">
                              <FileText className="size-3.5 mr-1" /> Use Generated Plaint
                            </Button>
                          )}
                        </div>
                        <Textarea value={plaintTextForWS} onChange={(e) => setPlaintTextForWS(e.target.value)} placeholder="Paste or enter the plaint text here..." className="min-h-[120px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y" />
                      </Card>
                    </motion.div>

                    {/* Defendant Details & Additional Pleas */}
                    <motion.div variants={fadeInUp} custom={3} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <Card className="rounded-xl border border-border p-4 space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Users className="size-4 text-primary" /> Defendant Details
                        </h3>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Counsel Name</Label>
                          <Input value={wsDefendantCounsel} onChange={(e) => setWsDefendantCounsel(e.target.value)} placeholder="Advocate for defendant" className="rounded-lg h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Additional Pleas <span className="text-muted-foreground font-normal">(optional)</span></Label>
                          <Textarea value={wsAdditionalPleas} onChange={(e) => setWsAdditionalPleas(e.target.value)} placeholder="Any additional pleas or defenses..." className="rounded-lg text-sm min-h-[60px] resize-y" />
                        </div>
                      </Card>
                      <Card className="rounded-xl border border-border p-4 space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Shield className="size-4 text-primary" /> Set-off / Counter-claim <span className="text-muted-foreground font-normal">(optional)</span>
                        </h3>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Amount</Label>
                          <Input value={wsSetoffAmount} onChange={(e) => setWsSetoffAmount(e.target.value)} placeholder="₹ Counter-claim amount" className="rounded-lg h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Basis</Label>
                          <Textarea value={wsSetoffBasis} onChange={(e) => setWsSetoffBasis(e.target.value)} placeholder="Basis for counter-claim..." className="rounded-lg text-sm min-h-[60px] resize-y" />
                        </div>
                      </Card>
                    </motion.div>

                    {/* Generate WS */}
                    {!wsDoc && !isGeneratingWS && (
                      <motion.div variants={fadeInUp} custom={4} className="flex justify-center mb-6">
                        <Button
                          onClick={handleGenerateWS}
                          disabled={!plaintTextForWS.trim()}
                          className={cn(
                            'h-12 px-8 text-sm font-semibold rounded-xl',
                            'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                            'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                            'transition-all duration-200 active:scale-[0.98]',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                          )}
                        >
                          <Sparkles className="size-4 mr-2" />
                          Generate Written Statement
                        </Button>
                      </motion.div>
                    )}

                    {/* AI Loading WS */}
                    {isGeneratingWS && (
                      <motion.div className="flex flex-col items-center justify-center py-12 mb-6">
                        <motion.div className="relative" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                            <Brain className="size-6 text-primary" />
                          </div>
                          <motion.div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-primary/20" animate={{ rotate: -360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
                        </motion.div>
                        <div className="mt-6 w-full max-w-xs space-y-3">
                          <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full" animate={{ width: `${genProgress}%` }} transition={{ duration: 0.4 }} />
                          </div>
                          <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                            <Loader2 className="size-3.5 animate-spin" /> {genMessage}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Para-wise View */}
                    {wsDoc && wsParaReplies.length > 0 && !isGeneratingWS && (
                      <motion.div variants={fadeInUp} custom={5}>
                        <Card className="rounded-xl border-2 border-border overflow-hidden mb-6">
                          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                            <span className="text-sm font-semibold text-foreground">Para-wise Written Statement</span>
                            <Button size="sm" variant="outline" onClick={handleRegenerateWS} className="rounded-lg text-xs h-8">
                              <Sparkles className="size-3.5 mr-1" /> Regenerate Full WS
                            </Button>
                          </div>
                          <CardContent className="p-4 sm:p-5 space-y-4 max-h-[500px] overflow-y-auto">
                            {/* Preliminary Submissions */}
                            {wsPrelimSubs.length > 0 && (
                              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wider">Preliminary Submissions</h4>
                                <ul className="space-y-1">
                                  {wsPrelimSubs.map((sub, idx) => (
                                    <li key={idx} className="text-xs text-foreground/80 flex items-start gap-2">
                                      <ChevronRight className="size-3 text-amber-500 mt-0.5 shrink-0" />
                                      {sub}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Para Replies */}
                            {wsParaReplies.map((pr) => (
                              <div key={pr.paraNumber} className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-card">
                                {/* Plaint paragraph */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="text-xs border bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">Para {pr.paraNumber}</Badge>
                                    <span className="text-xs text-muted-foreground">Plaint</span>
                                  </div>
                                  <p className="text-xs text-foreground/80 leading-relaxed">{pr.plainText}</p>
                                </div>
                                {/* WS reply */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={cn('text-xs border cursor-pointer transition-colors', stanceColors[pr.stance] || stanceColors.deny)} onClick={() => cycleStance(pr.paraNumber)}>
                                      {pr.stance.replace(/_/g, ' ')}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">Reply</span>
                                  </div>
                                  <Textarea
                                    value={wsEditReply[pr.paraNumber] ?? pr.replyDraft}
                                    onChange={(e) => setWsEditReply((prev) => ({ ...prev, [pr.paraNumber]: e.target.value }))}
                                    className="min-h-[50px] text-xs rounded-lg resize-y"
                                  />
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <Button variant="outline" onClick={goBack} className="rounded-xl">
                            <ArrowLeft className="size-4 mr-2" /> Back
                          </Button>
                          <Button
                            onClick={goNext}
                            className={cn(
                              'h-11 px-6 text-sm font-semibold rounded-xl',
                              'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                              'text-white shadow-lg shadow-amber-500/25',
                              'transition-all duration-200 active:scale-[0.98]'
                            )}
                          >
                            Save & Continue <ArrowRight className="size-4 ml-2" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ─── STEP 4: Injunction IA ─── */}
                {wizardStep === 4 && (
                  <motion.div key="ws-4" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Injunction IA
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Generate injunction application and supporting affidavit
                    </motion.p>

                    <motion.div variants={fadeInUp} custom={2} className="max-w-xl space-y-4 mb-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Injunction Type <span className="text-destructive">*</span></Label>
                        <Select value={iaType} onValueChange={setIaType}>
                          <SelectTrigger className="w-full rounded-xl h-11"><SelectValue placeholder="Select type..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Temporary Injunction">Temporary Injunction</SelectItem>
                            <SelectItem value="Mandatory Injunction">Mandatory Injunction</SelectItem>
                            <SelectItem value="Status Quo">Status Quo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Property / Nature of Right Threatened</Label>
                        <Textarea value={iaPropertyRight} onChange={(e) => setIaPropertyRight(e.target.value)} placeholder="Describe the property or right..." className="min-h-[80px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Urgency Facts</Label>
                        <Textarea value={iaUrgency} onChange={(e) => setIaUrgency(e.target.value)} placeholder="What makes this urgent..." className="min-h-[80px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Irreparable Injury Facts</Label>
                        <Textarea value={iaIrreparable} onChange={(e) => setIaIrreparable(e.target.value)} placeholder="Why would the injury be irreparable..." className="min-h-[80px] text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y" />
                      </div>

                      {!iaDoc && !isGeneratingIA && (
                        <Button
                          onClick={handleGenerateIA}
                          disabled={!iaType || !iaPropertyRight.trim()}
                          className={cn(
                            'w-full h-12 text-sm font-semibold rounded-xl',
                            'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                            'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                            'transition-all duration-200 active:scale-[0.98]',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                          )}
                        >
                          <Sparkles className="size-4 mr-2" />
                          Generate Injunction IA
                        </Button>
                      )}
                    </motion.div>

                    {/* Loading */}
                    {isGeneratingIA && (
                      <motion.div className="flex flex-col items-center justify-center py-12 mb-6">
                        <motion.div className="relative" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                            <Brain className="size-6 text-primary" />
                          </div>
                          <motion.div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-primary/20" animate={{ rotate: -360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
                        </motion.div>
                        <p className="text-sm text-muted-foreground mt-6 flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Generating Injunction IA...</p>
                      </motion.div>
                    )}

                    {/* Generated IA + Affidavit */}
                    {(iaDoc || iaAffidavitDoc) && !isGeneratingIA && (
                      <motion.div variants={fadeInUp} custom={3}>
                        <div className="space-y-4">
                          {iaDoc && (
                            <Card className="rounded-xl border-2 border-border overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                                <span className="text-sm font-semibold text-foreground">IA Application</span>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleCopy(iaDoc.content)} className="size-8"><Copy className="size-3.5" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDownload(iaDoc.title, iaDoc.content)} className="size-8"><DownloadIcon className="size-3.5" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handlePrint(iaDoc.title, iaDoc.content)} className="size-8"><Printer className="size-3.5" /></Button>
                                </div>
                              </div>
                              <CardContent className="p-0">
                                <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-muted/30 dark:from-card dark:to-card min-h-[300px] max-h-[400px] overflow-y-auto">
                                  {iaDoc?.content?.split('\n').map((line, idx) => (
                                    <p key={idx} className={cn('text-sm leading-relaxed text-foreground/90', line.trim() === '' && 'h-4', idx === 0 && 'text-base font-bold text-foreground mb-4')}>
                                      {line || '\u00A0'}
                                    </p>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {iaAffidavitDoc && (
                            <Card className="rounded-xl border-2 border-border overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                                <span className="text-sm font-semibold text-foreground">Supporting Affidavit</span>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleCopy(iaAffidavitDoc.content)} className="size-8"><Copy className="size-3.5" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDownload(iaAffidavitDoc.title, iaAffidavitDoc.content)} className="size-8"><DownloadIcon className="size-3.5" /></Button>
                                </div>
                              </div>
                              <CardContent className="p-0">
                                <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-muted/30 dark:from-card dark:to-card min-h-[300px] max-h-[400px] overflow-y-auto">
                                  {iaAffidavitDoc?.content?.split('\n').map((line, idx) => (
                                    <p key={idx} className={cn('text-sm leading-relaxed text-foreground/90', line.trim() === '' && 'h-4', idx === 0 && 'text-base font-bold text-foreground mb-4')}>
                                      {line || '\u00A0'}
                                    </p>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-6">
                          <Button variant="outline" onClick={goBack} className="rounded-xl">
                            <ArrowLeft className="size-4 mr-2" /> Back
                          </Button>
                          <Button
                            onClick={goNext}
                            className={cn(
                              'h-11 px-6 text-sm font-semibold rounded-xl',
                              'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                              'text-white shadow-lg shadow-amber-500/25',
                              'transition-all duration-200 active:scale-[0.98]'
                            )}
                          >
                            Save & Continue <ArrowRight className="size-4 ml-2" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ─── STEP 5: Written Arguments ─── */}
                {wizardStep === 5 && (
                  <motion.div key="ws-5" initial="hidden" animate="visible" exit="exit" variants={staggerContainer}>
                    <motion.h2 variants={fadeInUp} custom={0} className="text-lg font-bold text-foreground mb-1">
                      Written Arguments
                    </motion.h2>
                    <motion.p variants={fadeInUp} custom={1} className="text-sm text-muted-foreground mb-6">
                      Frame issues, add evidence, and generate issue-wise arguments
                    </motion.p>

                    {/* Issues Input */}
                    <motion.div variants={fadeInUp} custom={2} className="mb-6">
                      <Card className="rounded-xl border border-border p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <ListChecks className="size-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">Issues</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Textarea value={issuesOrderText} onChange={(e) => setIssuesOrderText(e.target.value)} placeholder="Paste the issues framed order text..." className="min-h-[80px] flex-1 text-sm rounded-xl border-2 border-border focus-visible:border-primary/40 resize-y" />
                            <Button
                              onClick={handleParseIssues}
                              disabled={!issuesOrderText.trim() || isParsingIssues}
                              className="shrink-0 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                            >
                              {isParsingIssues ? <Loader2 className="size-4 animate-spin" /> : <Brain className="size-4 mr-2" />}
                              <span className="hidden sm:inline">Parse</span>
                            </Button>
                          </div>

                          <div className="flex items-center gap-2">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground">OR add manually</span>
                            <Separator className="flex-1" />
                          </div>

                          <Button size="sm" variant="outline" onClick={addIssue} className="rounded-lg text-xs h-8">
                            <Plus className="size-3.5 mr-1" /> Add Issue
                          </Button>

                          {issues.length > 0 && (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {issues.map((issue) => (
                                <div key={issue.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                                    {issue.issueNumber}
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <Input value={issue.issueText} onChange={(e) => updateIssue(issue.id, 'issueText', e.target.value)} placeholder="Issue description..." className="rounded-lg h-9 text-sm" />
                                  </div>
                                  <Button size="icon" variant="ghost" onClick={() => removeIssue(issue.id)} className="size-7 text-muted-foreground hover:text-red-500 shrink-0">
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>

                    {/* Evidence Input */}
                    <motion.div variants={fadeInUp} custom={3} className="mb-6">
                      <Card className="rounded-xl border border-border p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="size-4 text-primary" />
                            <h3 className="text-sm font-bold text-foreground">Evidence</h3>
                          </div>
                          <Button size="sm" variant="outline" onClick={addEvidenceItem} className="rounded-lg text-xs h-8">
                            <Plus className="size-3.5 mr-1" /> Add Evidence
                          </Button>
                        </div>
                        {evidence.length > 0 && (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {evidence.map((ev) => (
                              <div key={ev.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_100px] gap-2 flex-1">
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Exhibit</Label>
                                      <Input value={ev.exhibitNumber} onChange={(e) => updateEvidenceItem(ev.id, 'exhibitNumber', e.target.value)} placeholder="P1, D1..." className="rounded-lg h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Description</Label>
                                      <Input value={ev.description} onChange={(e) => updateEvidenceItem(ev.id, 'description', e.target.value)} placeholder="Document name..." className="rounded-lg h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Type</Label>
                                      <Select value={ev.type} onValueChange={(v) => updateEvidenceItem(ev.id, 'type', v)}>
                                        <SelectTrigger className="rounded-lg h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="DOCUMENT">Document</SelectItem>
                                          <SelectItem value="ORAL">Oral</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <Button size="icon" variant="ghost" onClick={() => removeEvidenceItem(ev.id)} className="size-7 text-muted-foreground hover:text-red-500 shrink-0 ml-2">
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold">Gist <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                  <Textarea value={ev.gist || ''} onChange={(e) => updateEvidenceItem(ev.id, 'gist', e.target.value)} placeholder="Brief gist..." className="rounded-lg text-sm min-h-[40px] resize-y" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </motion.div>

                    {/* Generate Arguments */}
                    {!argsDoc && !isGeneratingArgs && (
                      <motion.div variants={fadeInUp} custom={4} className="flex justify-center mb-6">
                        <Button
                          onClick={handleGenerateArguments}
                          disabled={issues.length === 0}
                          className={cn(
                            'h-12 px-8 text-sm font-semibold rounded-xl',
                            'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                            'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                            'transition-all duration-200 active:scale-[0.98]',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                          )}
                        >
                          <Sparkles className="size-4 mr-2" />
                          Generate Written Arguments
                        </Button>
                      </motion.div>
                    )}

                    {/* Loading */}
                    {isGeneratingArgs && (
                      <motion.div className="flex flex-col items-center justify-center py-12 mb-6">
                        <motion.div className="relative" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                            <Brain className="size-6 text-primary" />
                          </div>
                          <motion.div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-primary/20" animate={{ rotate: -360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
                        </motion.div>
                        <p className="text-sm text-muted-foreground mt-6 flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Generating issue-wise arguments...</p>
                      </motion.div>
                    )}

                    {/* Arguments result */}
                    {argsDoc && !isGeneratingArgs && (
                      <motion.div variants={fadeInUp} custom={5}>
                        <Card className="rounded-xl border-2 border-border overflow-hidden mb-6">
                          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                            <span className="text-sm font-semibold text-foreground">{argsDoc.title}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleCopy(argsDoc.content)} className="size-8"><Copy className="size-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(argsDoc.title, argsDoc.content)} className="size-8"><DownloadIcon className="size-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handlePrint(argsDoc.title, argsDoc.content)} className="size-8"><Printer className="size-3.5" /></Button>
                            </div>
                          </div>
                          <CardContent className="p-4 sm:p-5 max-h-[500px] overflow-y-auto">
                            {argsDoc.issueArguments && argsDoc.issueArguments.length > 0 ? (
                              <div className="space-y-4">
                                {argsDoc.issueArguments.map((ia) => (
                                  <div key={ia.issueNumber} className="p-4 rounded-lg border border-border bg-card">
                                    <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                      <Badge className="text-xs bg-primary/15 text-primary border-primary/30">Issue {ia.issueNumber}</Badge>
                                      {ia.heading}
                                    </h4>
                                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{ia.argumentDraft}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-muted/30 dark:from-card dark:to-card">
                                {argsDoc?.content?.split('\n').map((line, idx) => (
                                  <p key={idx} className={cn('text-sm leading-relaxed text-foreground/90', line.trim() === '' && 'h-4', idx === 0 && 'text-base font-bold text-foreground mb-4')}>
                                    {line || '\u00A0'}
                                  </p>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <Button variant="outline" onClick={goBack} className="rounded-xl">
                            <ArrowLeft className="size-4 mr-2" /> Back
                          </Button>
                          <Button
                            onClick={handleSaveAndPreview}
                            className={cn(
                              'h-11 px-6 text-sm font-semibold rounded-xl',
                              'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                              'text-white shadow-lg shadow-amber-500/25',
                              'transition-all duration-200 active:scale-[0.98]'
                            )}
                          >
                            <Save className="size-4 mr-2" /> Save & Preview All
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══════════════════ SCREEN: PREVIEW ═══════════════════ */}
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
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                      <Scale className="size-5 text-primary" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Document Preview</h1>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review all generated documents for your civil matter
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setScreen('wizard')} className="rounded-xl text-sm">
                    <ArrowLeft className="size-4 mr-2" /> Back to Wizard
                  </Button>
                  <Button
                    onClick={handleNewCase}
                    variant="outline"
                    className="rounded-xl text-sm"
                  >
                    <Plus className="size-4 mr-2" /> New Case
                  </Button>
                </div>
              </motion.div>

              {/* Tabs */}
              <motion.div variants={fadeInUp} custom={1}>
                <Tabs value={previewTab} onValueChange={setPreviewTab} className="w-full">
                  <TabsList className="mb-6 flex-wrap h-auto gap-1">
                    <TabsTrigger value="PLAINT" className="text-xs sm:text-sm rounded-lg">Plaint</TabsTrigger>
                    <TabsTrigger value="WRITTEN_STATEMENT" className="text-xs sm:text-sm rounded-lg">Written Statement</TabsTrigger>
                    <TabsTrigger value="IA_INJUNCTION" className="text-xs sm:text-sm rounded-lg">Injunction IA</TabsTrigger>
                    <TabsTrigger value="WRITTEN_ARGUMENTS" className="text-xs sm:text-sm rounded-lg">Written Arguments</TabsTrigger>
                  </TabsList>

                  {/* Plaint Tab */}
                  <TabsContent value="PLAINT">
                    <PreviewTabContent
                      docs={previewDocs}
                      docType="PLAINT"
                      isEditing={isEditingPreview}
                      editContent={editPreviewContent}
                      onToggleEdit={() => {
                        setIsEditingPreview(!isEditingPreview)
                        const d = previewDocs.find((dd) => dd.docType === 'PLAINT')
                        if (d) setEditPreviewContent(d.content)
                      }}
                      onEditChange={setEditPreviewContent}
                      onCopy={handleCopy}
                      onDownload={handleDownload}
                      onPrint={handlePrint}
                    />
                  </TabsContent>

                  {/* WS Tab */}
                  <TabsContent value="WRITTEN_STATEMENT">
                    <PreviewTabContent
                      docs={previewDocs}
                      docType="WRITTEN_STATEMENT"
                      isEditing={isEditingPreview}
                      editContent={editPreviewContent}
                      onToggleEdit={() => {
                        setIsEditingPreview(!isEditingPreview)
                        const d = previewDocs.find((dd) => dd.docType === 'WRITTEN_STATEMENT')
                        if (d) setEditPreviewContent(d.content)
                      }}
                      onEditChange={setEditPreviewContent}
                      onCopy={handleCopy}
                      onDownload={handleDownload}
                      onPrint={handlePrint}
                    />
                  </TabsContent>

                  {/* IA Tab */}
                  <TabsContent value="IA_INJUNCTION">
                    <PreviewTabContent
                      docs={previewDocs}
                      docType="IA_INJUNCTION"
                      isEditing={isEditingPreview}
                      editContent={editPreviewContent}
                      onToggleEdit={() => {
                        setIsEditingPreview(!isEditingPreview)
                        const d = previewDocs.find((dd) => dd.docType === 'IA_INJUNCTION')
                        if (d) setEditPreviewContent(d.content)
                      }}
                      onEditChange={setEditPreviewContent}
                      onCopy={handleCopy}
                      onDownload={handleDownload}
                      onPrint={handlePrint}
                    />
                  </TabsContent>

                  {/* Arguments Tab */}
                  <TabsContent value="WRITTEN_ARGUMENTS">
                    <PreviewTabContent
                      docs={previewDocs}
                      docType="WRITTEN_ARGUMENTS"
                      isEditing={isEditingPreview}
                      editContent={editPreviewContent}
                      onToggleEdit={() => {
                        setIsEditingPreview(!isEditingPreview)
                        const d = previewDocs.find((dd) => dd.docType === 'WRITTEN_ARGUMENTS')
                        if (d) setEditPreviewContent(d.content)
                      }}
                      onEditChange={setEditPreviewContent}
                      onCopy={handleCopy}
                      onDownload={handleDownload}
                      onPrint={handlePrint}
                    />
                  </TabsContent>
                </Tabs>
              </motion.div>

              {/* Save button */}
              <motion.div variants={fadeInUp} custom={2} className="mt-8 pt-6 border-t flex items-center justify-between">
                <Button variant="outline" onClick={() => setScreen('wizard')} className="rounded-xl">
                  <ArrowLeft className="size-4 mr-2" /> Back to Wizard
                </Button>
                <Button
                  onClick={() => {
                    if (currentMatterId) {
                      updateCivilMatter(currentMatterId, { stage: 'HEARING', updatedAt: new Date().toISOString() })
                    }
                  }}
                  className={cn(
                    'h-11 px-6 text-sm font-semibold rounded-xl',
                    'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                    'text-white shadow-lg shadow-amber-500/25',
                    'transition-all duration-200 active:scale-[0.98]'
                  )}
                >
                  <Save className="size-4 mr-2" />
                  Save Civil Matter
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ═══════════════════ PREVIEW TAB COMPONENT ═══════════════════ */

interface PreviewTabContentProps {
  docs: CivilDraftDocument[]
  docType: CivilDraftDocument['docType']
  isEditing: boolean
  editContent: string
  onToggleEdit: () => void
  onEditChange: (v: string) => void
  onCopy: (content: string) => void
  onDownload: (title: string, content: string) => void
  onPrint: (title: string, content: string) => void
}

function PreviewTabContent({ docs, docType, isEditing, editContent, onToggleEdit, onEditChange, onCopy, onDownload, onPrint }: PreviewTabContentProps) {
  const doc = docs.find((d) => d.docType === docType)

  if (!doc) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="flex size-14 items-center justify-center rounded-xl bg-muted mb-4">
          <FileText className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-2">No Document Generated</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          This document hasn&apos;t been generated yet. Go back to the wizard to generate it.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* Document */}
      <Card className="rounded-xl border-2 border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleEdit} className="h-8 rounded-lg text-xs">
              <Edit3 className="size-3.5 mr-1.5" />
              {isEditing ? 'Preview' : 'Edit'}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onCopy(doc.content)} className="size-8" title="Copy">
              <Copy className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDownload(doc.title, doc.content)} className="size-8" title="Download">
              <DownloadIcon className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onPrint(doc.title, doc.content)} className="size-8" title="Print">
              <Printer className="size-3.5" />
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={(e) => onEditChange(e.target.value)}
              className="min-h-[500px] border-0 rounded-none resize-y text-sm font-mono leading-relaxed p-6"
            />
          ) : (
            <div className="p-6 sm:p-8 bg-gradient-to-b from-white to-muted/30 dark:from-card dark:to-card min-h-[500px] max-h-[600px] overflow-y-auto">
              {doc?.content?.split('\n').map((line, idx) => (
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
          )}
        </CardContent>
      </Card>

      {/* Side Panel */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        {/* Metadata */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Type</span>
              <Badge variant="secondary" className="text-xs">{doc.docType.replace(/_/g, ' ')}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Words</span>
              <span className="text-xs font-medium text-foreground">{doc.content.split(/\s+/).filter(Boolean).length}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Version</span>
              <span className="text-xs font-medium text-foreground">v{doc.version}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Generated</span>
              <span className="text-xs font-medium text-foreground">
                {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Key Points */}
        {doc.keyPoints && doc.keyPoints.length > 0 && (
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Key Points
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {doc.keyPoints.map((point, idx) => (
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
              <AlertTriangle className="size-4" />
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
            {doc.warnings && doc.warnings.length > 0 && (
              <ul className="space-y-2">
                {doc.warnings.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-red-600/80 dark:text-red-300/80">
                    <ChevronRight className="size-3.5 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

/* ─── Missing import alias for ClipboardList ─── */
function ClipboardList(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  )
}
