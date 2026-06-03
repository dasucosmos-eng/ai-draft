'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { DocumentUpload, type UploadedFile } from '@/components/shared/document-upload'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import { useClientsStore } from '@/store/clients-store'
import { useProfileStore } from '@/store/profile-store'
import { generateBrandedPdf } from '@/lib/pdf-generator'
import { stripMarkdown } from '@/lib/ai-service'
import { cn } from '@/lib/utils'
import {
  Brain,
  Sparkles,
  Upload,
  Mic,
  MicOff,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Building,
  Banknote,
  Heart,
  ShoppingCart,
  Briefcase,
  Shield,
  FileCheck,
  Unlock,
  MapPin,
  Scale,
  Users,
  Calendar,
  Info,
  ListChecks,
  ChevronRight,
  Loader2,
  GripVertical,
  X,
  PartyPopper,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { LucideIcon } from 'lucide-react'

/* ─── Types ─── */

interface CaseClassification {
  caseType: string
  caseTypeIcon: string
  subType?: string
  priority: string
  priorityColor: string
  jurisdiction: string
  courtName?: string
  relevantSections: string[]
}

interface ExtractedInfo {
  parties: { role: string; name: string; phone?: string; email?: string; address?: string }[]
  opposingParties?: { role: string; name: string; phone?: string; email?: string; address?: string; advocate?: string }[]
  victims?: string[]
  advocate?: { clientAdvocate?: string; opposingAdvocate?: string }
  caseDetails?: {
    firNumber?: string
    policeStation?: string
    crrNumber?: string
    filingDate?: string
    nextHearingDate?: string
    causeOfAction?: string
    reliefSought?: string
    facts: string[]
    judgeName?: string
    underSections?: string[]
  }
  keyDates: { label: string; date: string }[]
  facts: string[]
  missingInfo: string[]
  documentLanguage?: string
}

interface SuggestedDocument {
  name: string
  type: string
}

interface NextStep {
  step: number
  action: string
  timeline: string
}

interface IntakeResult {
  caseClassification: CaseClassification
  extractedInfo: ExtractedInfo
  suggestedDocuments: SuggestedDocument[]
  nextSteps: NextStep[]
}

interface TemplateItem {
  label: string
  icon: LucideIcon
  description: string
}

/* ─── Templates ─── */

const templates: TemplateItem[] = [
  {
    label: 'Property Dispute',
    icon: Building,
    description: 'Client is involved in a property ownership dispute. The opposing party is claiming adverse possession of a residential property located in Bangalore, Karnataka. Need to file a suit for declaration and possession.',
  },
  {
    label: 'Cheque Bounce',
    icon: Banknote,
    description: 'Client issued a cheque of ₹5,00,000 to a supplier for goods delivered. The cheque was dishonoured due to insufficient funds on 15th January 2025. Need to send legal notice under Section 138 of the Negotiable Instruments Act.',
  },
  {
    label: 'Divorce Petition',
    icon: Heart,
    description: 'Client has been married for 3 years and is seeking mutual consent divorce. There are no children from the marriage. Both parties have agreed on alimony and asset division.',
  },
  {
    label: 'Consumer Complaint',
    icon: ShoppingCart,
    description: 'Client purchased a defective laptop from an electronics store costing ₹85,000. Despite multiple complaints, the seller has not provided repair or replacement for 6 months. Need to file a consumer complaint before the Consumer Disputes Redressal Commission.',
  },
  {
    label: 'Employment Issue',
    icon: Briefcase,
    description: 'Client was terminated from their position at a tech company without proper notice period or severance pay. They were employed for 4 years and are seeking compensation for wrongful termination.',
  },
  {
    label: 'Criminal Defense',
    icon: Shield,
    description: 'Client has been falsely accused of theft under Section 380 IPC. The alleged incident occurred at their workplace. Client maintains innocence and has CCTV footage as evidence. Need bail application and defense strategy.',
  },
  {
    label: 'Contract Review',
    icon: FileCheck,
    description: 'Client needs review of a service agreement with an IT vendor. The contract duration is 2 years with a monthly payment of ₹2,50,000. Client wants to ensure proper exit clauses and IP protection.',
  },
  {
    label: 'Bail Application',
    icon: Unlock,
    description: 'Client was arrested under Section 498A IPC in a dowry harassment case. The client claims the allegations are false and filed after a family dispute. Family members have also been named as accused. Need urgent bail application.',
  },
]

/* ─── Priority Config ─── */

const priorityConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  High: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
  Medium: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  Low: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
}

/* ─── Icon Map ─── */

const iconMap: Record<string, LucideIcon> = {
  Building, Banknote, Heart, ShoppingCart, Briefcase, Shield, FileText, Unlock,
}

/* ─── Animation Variants ─── */

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
  exit: { opacity: 0, y: -12, transition: { duration: 0.3 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

/* ─── Build rich case context from analysis result ─── */
function buildCaseContext(analysisResult: IntakeResult, fileDescription: string): string {
  const ei = analysisResult.extractedInfo
  const cc = analysisResult.caseClassification
  const parts: string[] = []

  // Client / parties
  if (ei.parties?.length > 0) {
    parts.push('PARTIES INVOLVED:')
    ei.parties.forEach(p => {
      let line = `  - ${p.name || 'Unknown'} (Role: ${p.role || 'Not specified'})`
      if (p.phone) line += `, Phone: ${p.phone}`
      if (p.email) line += `, Email: ${p.email}`
      if (p.address) line += `, Address: ${p.address}`
      parts.push(line)
    })
  }

  // Opposing parties
  if (ei.opposingParties?.length > 0) {
    parts.push('OPPOSING PARTIES:')
    ei.opposingParties.forEach(p => {
      let line = `  - ${p.name || 'Unknown'} (Role: ${p.role || 'Not specified'})`
      if (p.phone) line += `, Phone: ${p.phone}`
      if (p.email) line += `, Email: ${p.email}`
      if (p.address) line += `, Address: ${p.address}`
      if (p.advocate) line += `, Advocate: ${p.advocate}`
      parts.push(line)
    })
  }

  // Victims
  if (ei.victims?.length > 0) {
    parts.push(`VICTIMS: ${ei.victims.join(', ')}`)
  }

  // Advocates
  if (ei.advocate?.clientAdvocate || ei.advocate?.opposingAdvocate) {
    parts.push(`ADVOCATES: Client Advocate: ${ei.advocate.clientAdvocate || 'Not specified'}, Opposing Advocate: ${ei.advocate.opposingAdvocate || 'Not specified'}`)
  }

  // Case details
  const cd = ei.caseDetails || {}
  if (cd.firNumber) parts.push(`FIR Number: ${cd.firNumber}`)
  if (cd.policeStation) parts.push(`Police Station: ${cd.policeStation}`)
  if (cd.crrNumber) parts.push(`CRR Number: ${cd.crrNumber}`)
  if (cd.filingDate) parts.push(`Filing Date: ${cd.filingDate}`)
  if (cd.nextHearingDate) parts.push(`Next Hearing Date: ${cd.nextHearingDate}`)
  if (cd.judgeName) parts.push(`Judge: ${cd.judgeName}`)
  if (cd.causeOfAction) parts.push(`Cause of Action: ${cd.causeOfAction}`)
  if (cd.reliefSought) parts.push(`Relief Sought: ${cd.reliefSought}`)
  if (cd.underSections?.length > 0) parts.push(`Sections: ${cd.underSections.join(', ')}`)
  if (cc.relevantSections?.length > 0) parts.push(`Relevant Sections: ${cc.relevantSections.join(', ')}`)

  // Facts
  if (cd.facts?.length > 0) {
    parts.push('CASE FACTS:')
    cd.facts.forEach((f, i) => parts.push(`  ${i + 1}. ${f}`))
  }
  if (ei.facts?.length > 0) {
    parts.push('ADDITIONAL FACTS:')
    ei.facts.forEach((f, i) => parts.push(`  ${i + 1}. ${f}`))
  }

  // Key dates
  if (ei.keyDates?.length > 0) {
    parts.push('KEY DATES:')
    ei.keyDates.forEach(d => parts.push(`  - ${d.label}: ${d.date}`))
  }

  return parts.join('\n')
}

/* ─── Generate a single document via apiAiDraft ─── */
async function generateDocument(
  docName: string,
  caseType: string,
  richDetails: string,
  caseContext: string
): Promise<string> {
  const res = await fetch('https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiDraft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentType: docName,
      details: richDetails,
      caseType,
      caseContext,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Draft failed (${res.status})`)
  }
  const data = await res.json()
  return data.data?.content || data.data || ''
}

/* ─── Normalize AI result to prevent undefined crashes ─── */
function normalizeIntakeResult(raw: any): IntakeResult {
  const ei = raw?.extractedInfo || {}
  const cc = raw?.caseClassification || {}
  return {
    caseClassification: {
      caseType: cc.caseType || 'Unknown',
      caseTypeIcon: cc.caseTypeIcon || 'civil',
      subType: cc.subType || undefined,
      priority: cc.priority || 'Medium',
      priorityColor: cc.priorityColor || 'yellow',
      jurisdiction: cc.jurisdiction || '',
      courtName: cc.courtName || undefined,
      relevantSections: Array.isArray(cc.relevantSections) ? cc.relevantSections : [],
    },
    extractedInfo: {
      parties: Array.isArray(ei.parties) ? ei.parties : [],
      opposingParties: Array.isArray(ei.opposingParties) ? ei.opposingParties : [],
      victims: Array.isArray(ei.victims) ? ei.victims : [],
      advocate: ei.advocate || {},
      caseDetails: {
        facts: Array.isArray(ei.caseDetails?.facts) ? ei.caseDetails.facts : [],
        underSections: Array.isArray(ei.caseDetails?.underSections) ? ei.caseDetails.underSections : [],
        ...ei.caseDetails,
      },
      keyDates: Array.isArray(ei.keyDates) ? ei.keyDates : [],
      facts: Array.isArray(ei.facts) ? ei.facts : [],
      missingInfo: Array.isArray(ei.missingInfo) ? ei.missingInfo : [],
      documentLanguage: ei.documentLanguage || undefined,
    },
    suggestedDocuments: Array.isArray(raw?.suggestedDocuments) ? raw.suggestedDocuments : [],
    nextSteps: Array.isArray(raw?.nextSteps) ? raw.nextSteps : [],
  }
}

/* ─── Main Component ─── */

export default function AIIntakeView() {
  const addCase = useAppStore((s) => s.addCase)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSelectedCaseId = useAppStore((s) => s.setSelectedCaseId)

  const [description, setDescription] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [extractedTexts, setExtractedTexts] = useState<string[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [result, setResult] = useState<IntakeResult | null>(null)
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [isAutoDrafting, setIsAutoDrafting] = useState(false)
  const [autoDraftProgress, setAutoDraftProgress] = useState('')
  const [generatedDocNames, setGeneratedDocNames] = useState<string[]>([])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const addClient = useClientsStore((s) => s.addClient)
  const addDocumentToClient = useClientsStore((s) => s.addDocumentToClient)
  const addDocument = useAppStore((s) => s.addDocument)

  // ── File handling ──
  const handleFilesExtracted = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files)
    const texts = files.filter((f) => f.extractedText).map((f) => f.extractedText || '')
    setExtractedTexts(texts)
  }, [])

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      const texts = updated.filter((f) => f.extractedText).map((f) => f.extractedText || '')
      setExtractedTexts(texts)
      return updated
    })
  }, [])

  // ── Template selection ──
  const selectTemplate = useCallback((template: TemplateItem) => {
    setDescription(template.description)
  }, [])

  // ── Voice input ──
  const toggleListening = useCallback(() => {
    if (isListening) {
      setIsListening(false)
      return
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition as typeof globalThis.SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof globalThis.SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-IN'
      recognition.interimResults = true
      recognition.continuous = true

      recognition.onresult = (event: Event) => {
        const speechEvent = event as unknown as SpeechRecognitionEvent
        const transcript = Array.from(speechEvent.results)
          .map((r) => r[0].transcript)
          .join('')
        setDescription(transcript)
      }

      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)

      recognition.start()
      setIsListening(true)
    }
  }, [isListening])

  // ── Analyze ──
  const handleAnalyze = useCallback(async () => {
    // Allow analysis if there's a description OR uploaded files
    if (!description.trim() && extractedTexts.length === 0) return

    setError(null)
    setIsAnalyzing(true)
    setAnalyzeProgress(0)
    setResult(null)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setAnalyzeProgress((prev) => {
        if (prev >= 90) { clearInterval(progressInterval); return 90 }
        return prev + Math.random() * 15
      })
    }, 400)

    try {
      // Send as JSON — backend expects { description, filesContent: string[] }
      const response = await fetch('https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiIntake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          filesContent: extractedTexts,
        }),
      })

      clearInterval(progressInterval)
      setAnalyzeProgress(100)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const backendError = data.error || data.details || `Server error (${response.status})`
        throw new Error(backendError)
      }

      const data = await response.json()
      if (!data.data) {
        throw new Error('No analysis data returned. Please try again.')
      }
      const normalized = normalizeIntakeResult(data.data)
      setResult(normalized)
      setSelectedDocs(new Set(normalized.suggestedDocuments.map((d) => d.name)))
      // Auto-fill client details from extracted parties (use normalized data)
      const parties = normalized.extractedInfo.parties || []
      const clientParty = parties.find(
        (p: { role: string; name: string }) =>
          ['client', 'petitioner', 'complainant', 'applicant', 'plaintiff'].includes(p.role?.toLowerCase())
      ) || parties[0]
      if (clientParty?.name) {
        setClientName(clientParty.name)
      }
      if (clientParty?.phone) {
        setClientPhone(clientParty.phone)
      }
      if (clientParty?.email) {
        setClientEmail(clientParty.email)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed. Please try again.'
      // Provide user-friendly error messages
      if (message.includes('Description') || message.includes('documents required') || message.includes('provide')) {
        setError('Please enter a description of at least 10 characters or upload a document to analyze.')
      } else if (message.includes('AI analysis failed') || message.includes('All providers failed')) {
        setError('AI service is temporarily unavailable. Please try again in a moment.')
      } else if (message.includes('rate limit') || message.includes('429')) {
        setError('Too many requests. Please wait a moment and try again.')
      } else {
        setError(message)
      }
    } finally {
      setTimeout(() => setIsAnalyzing(false), 600)
    }
  }, [description, extractedTexts])

  // ── Auto-trigger analysis after file extraction completes ──
  // When files are uploaded and text is extracted, automatically start AI analysis
  // without requiring the user to click "Analyze with AI"
  const autoAnalysisTriggeredRef = useRef(false)
  useEffect(() => {
    if (
      extractedTexts.length > 0 &&
      !isAnalyzing &&
      !result &&
      !autoAnalysisTriggeredRef.current
    ) {
      // Debounce: wait 2s so all files finish extracting, then auto-analyze
      const timer = setTimeout(() => {
        autoAnalysisTriggeredRef.current = true
        handleAnalyze()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [extractedTexts, isAnalyzing, result]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Document toggle ──
  const toggleDoc = useCallback((name: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  // ── Auto-draft all docs after analysis (triggered automatically) ──
  const handleAutoDraft = useCallback(async (analysisResult: IntakeResult) => {
    if (!analysisResult) return

    // Extract enriched fields from AI analysis
    const parties = analysisResult.extractedInfo.parties || []
    const clientParty = parties.find(
      (p: { role: string }) =>
        ['client', 'petitioner', 'complainant', 'applicant', 'plaintiff'].includes(p.role?.toLowerCase())
    ) || parties[0]
    const opposingParties = analysisResult.extractedInfo.opposingParties || []
    const caseDetails = analysisResult.extractedInfo.caseDetails || {}
    const advocate = analysisResult.extractedInfo.advocate || {}
    const victims = analysisResult.extractedInfo.victims || []

    const newCase = {
      id: crypto.randomUUID(),
      caseNumber: `LEX-${String(Date.now()).slice(-6)}`,
      title: analysisResult.caseClassification.caseType,
      description,
      caseType: analysisResult.caseClassification.caseType,
      subType: analysisResult.caseClassification.subType,
      status: 'Active',
      priority: analysisResult.caseClassification.priority,
      jurisdiction: analysisResult.caseClassification.jurisdiction,
      courtName: analysisResult.caseClassification.courtName,
      tasksCount: analysisResult.nextSteps.length,
      documentsCount: analysisResult.suggestedDocuments.length,
      upcomingEvents: 1,
      aiInsights: [...(caseDetails.facts || []), ...(analysisResult.extractedInfo.facts || [])].join('. '),
      // Client details
      clientName: clientName || clientParty?.name || '',
      clientEmail: clientEmail || clientParty?.email || '',
      clientPhone: clientPhone || clientParty?.phone || '',
      // Accused / opposing party
      accusedName: opposingParties[0]?.name || '',
      accusedPhone: opposingParties[0]?.phone || '',
      accusedEmail: opposingParties[0]?.email || '',
      accusedAddress: opposingParties[0]?.address || '',
      opposingParty: opposingParties[0]?.name || '',
      opposingPartyPhone: opposingParties[0]?.phone || '',
      opposingPartyEmail: opposingParties[0]?.email || '',
      opposingPartyAddress: opposingParties[0]?.address || '',
      // Victims
      victimNames: victims.length > 0 ? victims : undefined,
      // Advocate details
      clientAdvocate: advocate.clientAdvocate || '',
      opposingAdvocate: advocate.opposingAdvocate || opposingParties[0]?.advocate || '',
      opposingCounsel: advocate.opposingAdvocate || opposingParties[0]?.advocate || '',
      // Case identifiers
      firNumber: caseDetails.firNumber || '',
      policeStation: caseDetails.policeStation || '',
      crrNumber: caseDetails.crrNumber || '',
      // Case details
      causeOfAction: caseDetails.causeOfAction || '',
      reliefSought: caseDetails.reliefSought || '',
      underSections: caseDetails.underSections || analysisResult.caseClassification.relevantSections || [],
      // Dates
      filingDate: caseDetails.filingDate || undefined,
      nextHearing: caseDetails.nextHearingDate || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addCase(newCase)
    setSelectedCaseId(newCase.id)

    // Create client entry with auto-filled details
    const hasClientInfo = clientParty?.name
    let clientId = ''
    if (hasClientInfo) {
      clientId = crypto.randomUUID()
      addClient({
        id: clientId,
        name: clientName || clientParty.name || '',
        email: clientEmail || clientParty.email || '',
        phone: clientPhone || clientParty.phone || '',
        address: clientParty.address || '',
        caseIds: [newCase.id],
        accused: opposingParties.map((p: { name: string }) => p.name).filter(Boolean),
        victims: victims.length > 0 ? victims : undefined,
        notes: `Case: ${analysisResult.caseClassification.caseType}\nPriority: ${analysisResult.caseClassification.priority}${caseDetails.firNumber ? '\nFIR: ' + caseDetails.firNumber : ''}${caseDetails.causeOfAction ? '\nCause: ' + caseDetails.causeOfAction : ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // Save uploaded files as documents to the case and client profile
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop()?.toUpperCase() || ''
        const fileDocId = crypto.randomUUID()
        addDocument({
          id: fileDocId,
          name: file.name,
          type: fileExt,
          category: 'Uploaded',
          content: file.extractedText || '',
          summary: 'Uploaded during case intake',
          caseId: newCase.id,
          createdAt: new Date().toISOString(),
        })
        if (clientId) {
          addDocumentToClient(clientId, {
            id: fileDocId,
            name: file.name,
            type: fileExt,
            category: 'Uploaded',
            uploadedAt: new Date().toISOString(),
            clientId,
            content: file.extractedText || '',
          })
        }
      }
    }

    // Auto-draft ALL suggested documents using generic apiAiDraft with rich context
    if (analysisResult.suggestedDocuments.length > 0) {
      setIsAutoDrafting(true)
      setAutoDraftProgress('Preparing document generation...')
      setGeneratedDocNames([])

      // Build rich context from ALL extracted info
      const richContext = buildCaseContext(analysisResult, description || '')
      const richDetails = description || richContext // Use description if available, else full context

      const docsToGenerate = analysisResult.suggestedDocuments

      for (let i = 0; i < docsToGenerate.length; i++) {
        const doc = docsToGenerate[i]
        setAutoDraftProgress(`Generating: ${doc.name} (${i + 1}/${docsToGenerate.length})...`)

        try {
          const genContent = await generateDocument(
            doc.name,
            analysisResult.caseClassification.caseType,
            richDetails,
            richContext,
          )

          if (genContent && typeof genContent === 'string') {
            // Strip markdown from content for clean output
            const cleanContent = stripMarkdown(genContent)
            const docId = crypto.randomUUID()

            // Save to global documents with caseId
            addDocument({
              id: docId,
              name: doc.name,
              type: 'draft',
              content: cleanContent,
              summary: `Auto-generated for case ${newCase.caseNumber}`,
              category: 'AI Generated',
              caseId: newCase.id,
              createdAt: new Date().toISOString(),
            })

            // Also save to client documents
            if (clientId) {
              addDocumentToClient(clientId, {
                id: docId,
                name: doc.name,
                type: 'draft',
                category: 'AI Generated',
                uploadedAt: new Date().toISOString(),
                clientId,
                content: cleanContent,
              })
            }

            setGeneratedDocNames(prev => [...prev, doc.name])
          }
        } catch (err) {
          console.error(`Failed to generate ${doc.name}:`, err)
        }
      }

      setIsAutoDrafting(false)
      setAutoDraftProgress('')
    }

    setCurrentView('case-detail')
  }, [description, clientEmail, clientPhone, clientName, addCase, setSelectedCaseId, addClient, addDocument, addDocumentToClient, uploadedFiles])

  // ── Auto-start drafting after analysis completes ──
  const autoDraftStartedRef = useRef(false)
  useEffect(() => {
    if (result && !isAutoDrafting && !autoDraftStartedRef.current) {
      autoDraftStartedRef.current = true
      const timer = setTimeout(() => {
        handleAutoDraft(result)
      }, 1500) // Brief delay so user sees analysis results
      return () => clearTimeout(timer)
    }
  }, [result]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create case (manual fallback, kept for compatibility) ──
  const handleCreateCase = useCallback(async () => {
    if (!result) return

    const newCase = {
      id: crypto.randomUUID(),
      caseNumber: `LEX-${String(Date.now()).slice(-6)}`,
      title: result.caseClassification.caseType,
      description,
      caseType: result.caseClassification.caseType,
      status: 'Active',
      priority: result.caseClassification.priority,
      jurisdiction: result.caseClassification.jurisdiction,
      tasksCount: result.nextSteps?.length || 0,
      documentsCount: selectedDocs.size,
      upcomingEvents: 1,
      aiInsights: (result.extractedInfo.facts || []).join('. '),
      clientName: result.extractedInfo.parties?.[0]?.name || '',
      clientEmail: clientEmail,
      clientPhone: clientPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addCase(newCase)
    setSelectedCaseId(newCase.id)

    // Create client entry if parties detected
    const parties = result.extractedInfo.parties || []
    const hasClientInfo = parties.length > 0 && parties[0].name
    let clientId = ''
    if (hasClientInfo) {
      clientId = crypto.randomUUID()
      addClient({
        id: clientId,
        name: clientName || parties[0].name || '',
        email: clientEmail || '',
        phone: clientPhone || '',
        caseIds: [newCase.id],
        notes: `Case: ${result.caseClassification.caseType}\nPriority: ${result.caseClassification.priority}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // Auto-draft selected documents
    if (selectedDocs.size > 0) {
      setIsAutoDrafting(true)
      setAutoDraftProgress('Preparing document generation...')
      setGeneratedDocNames([])

      const docsToGenerate = result.suggestedDocuments.filter(d => selectedDocs.has(d.name))
      const caseTypeLower = result.caseClassification.caseType.toLowerCase()

      for (let i = 0; i < docsToGenerate.length; i++) {
        const doc = docsToGenerate[i]
        setAutoDraftProgress(`Generating: ${doc.name} (${i + 1}/${docsToGenerate.length})...`)

        try {
          let genContent = ''
          if (caseTypeLower.includes('criminal') || caseTypeLower.includes('fir') || caseTypeLower.includes('bail') || caseTypeLower.includes('crpc')) {
            const task = guessCriminalTask(doc)
            const res = await fetch('https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiCriminal', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task, description, caseType: result.caseClassification.caseType })
            })
            const data = await res.json()
            genContent = data.data?.content || data.data || ''
          } else if (caseTypeLower.includes('civil') || caseTypeLower.includes('property') || caseTypeLower.includes('contract')) {
            const task = guessCivilTask(doc)
            const res = await fetch('https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiCivil', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task, description, caseType: result.caseClassification.caseType })
            })
            const data = await res.json()
            genContent = data.content || data.data?.content || data.data || ''
          } else if (caseTypeLower.includes('family') || caseTypeLower.includes('divorce') || caseTypeLower.includes('maintenance') || caseTypeLower.includes('dv')) {
            const task = guessFamilyTask(doc)
            const res = await fetch('https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiFamily', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task, description, caseType: result.caseClassification.caseType })
            })
            const data = await res.json()
            genContent = data.data?.content || data.data || ''
          } else {
            const res = await fetch('https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiDraft', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ documentType: doc.name, details: description, caseType: result.caseClassification.caseType })
            })
            const data = await res.json()
            genContent = data.data?.content || data.data || ''
          }

          if (genContent && typeof genContent === 'string') {
            const cleanContent = stripMarkdown(genContent)
            const docId = crypto.randomUUID()

            addDocument({
              id: docId,
              name: doc.name,
              type: 'draft',
              content: cleanContent,
              summary: `Auto-generated for case ${newCase.caseNumber}`,
              category: 'AI Generated',
              caseId: newCase.id,
              createdAt: new Date().toISOString(),
            })

            if (clientId) {
              addDocumentToClient(clientId, {
                id: docId,
                name: doc.name,
                type: 'draft',
                category: 'AI Generated',
                uploadedAt: new Date().toISOString(),
                clientId,
                content: cleanContent,
              })
            }

            setGeneratedDocNames(prev => [...prev, doc.name])
          }
        } catch (err) {
          console.error(`Failed to generate ${doc.name}:`, err)
        }
      }

      setIsAutoDrafting(false)
      setAutoDraftProgress('')
    }

    setCurrentView('case-detail')
  }, [result, description, selectedDocs, addCase, setCurrentView, setSelectedCaseId, addClient, addDocument, addDocumentToClient, clientName, clientEmail, clientPhone])

  // ── Task guessers ──
  const guessCriminalTask = (doc: { name: string }) => {
    const n = doc.name.toLowerCase()
    if (n.includes('bail')) return 'generateBail'
    if (n.includes('quash') || n.includes('498a')) return 'generateCRP'
    if (n.includes('writ') || n.includes('habeas') || n.includes('mandamus')) return 'generateWrit'
    return 'generateBail'
  }

  const guessCivilTask = (doc: { name: string }) => {
    const n = doc.name.toLowerCase()
    if (n.includes('plaint') || n.includes('suit')) return 'generatePlaint'
    if (n.includes('written statement')) return 'generateWS'
    if (n.includes('injunction') || n.includes('ia')) return 'generateInjunctionIA'
    if (n.includes('argument')) return 'generateArguments'
    return 'generatePlaint'
  }

  const guessFamilyTask = (doc: { name: string }) => {
    const n = doc.name.toLowerCase()
    if (n.includes('divorce')) return 'generateDivorce'
    if (n.includes('domestic') || n.includes('dv')) return 'generateDOP'
    if (n.includes('maintenance')) return 'generateMaintenance'
    if (n.includes('succession')) return 'generateSuccession'
    if (n.includes('guardian')) return 'generateGuardian'
    if (n.includes('mvop') || n.includes('motor')) return 'generateMVOP'
    return 'generateDivorce'
  }

  // ── Reset ──
  const handleReset = useCallback(() => {
    setResult(null)
    setDescription('')
    setUploadedFiles([])
    setExtractedTexts([])
    setSelectedDocs(new Set())
    setError(null)
    setShowClientDialog(false)
    setIsAutoDrafting(false)
    setAutoDraftProgress('')
    setGeneratedDocNames([])
    setClientName('')
    setClientPhone('')
    setClientEmail('')
    autoDraftStartedRef.current = false
    autoAnalysisTriggeredRef.current = false
  }, [])

  /* ─── RENDER ─── */

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          {/* ── Hero Section ── */}
          {!result && !isAnalyzing && (
            <motion.div
              key="hero"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={staggerContainer}
            >
              {/* Title */}
              <motion.div variants={fadeInUp} custom={0} className="text-center mb-8 sm:mb-10">
                <div className="inline-flex items-center justify-center size-16 sm:size-20 rounded-2xl bg-primary/10 mb-5 relative">
                  <Brain className="size-8 sm:size-10 text-primary" />
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-2xl border border-primary/20"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-3">
                  New Case Intake
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Describe the legal matter or upload documents.{' '}
                  <span className="text-primary font-medium">AI will handle the rest.</span>
                </p>
              </motion.div>

              {/* ── Textarea ── */}
              <motion.div variants={fadeInUp} custom={1} className="mb-6">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the legal matter in detail... e.g., 'Client's tenant has not paid rent for 5 months. Need to file eviction notice under Section 106 of the Transfer of Property Act. Monthly rent is ₹25,000. Property located in Mumbai.'"
                  className="min-h-[160px] sm:min-h-[180px] text-sm sm:text-base resize-y rounded-xl border-2 border-border focus-visible:border-primary/40 focus-visible:ring-primary/20 transition-all duration-200 bg-card"
                  disabled={isAnalyzing}
                />
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-xs text-muted-foreground">
                    {uploadedFiles.length > 0
                      ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} uploaded. ${description.length > 0 ? `${description.length} characters added.` : 'Add a description or analyze with just the uploaded files.'}`
                      : description.length > 0
                        ? `${description.length} characters`
                        : 'Type a description or upload documents'}
                  </span>
                </div>
              </motion.div>

              {/* ── Quick Templates ── */}
              <motion.div variants={fadeInUp} custom={2} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Quick Templates</span>
                  <span className="text-xs text-muted-foreground">— Click to pre-fill</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.label}
                      onClick={() => selectTemplate(template)}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-xl p-3 sm:p-4 text-left transition-all duration-200',
                        'border border-border bg-card hover:border-primary/30 hover:bg-primary/5',
                        'group active:scale-[0.98]'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <template.icon className="size-4 text-primary" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">
                          {template.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* ── File Upload Zone ── */}
              <motion.div variants={fadeInUp} custom={3} className="mb-6">
                <DocumentUpload
                  module="general"
                  maxFiles={10}
                  onFilesExtracted={handleFilesExtracted}
                />
              </motion.div>

              {/* ── Action Bar ── */}
              <motion.div variants={fadeInUp} custom={4} className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={(description.trim().length < 10 && extractedTexts.length === 0) || isAnalyzing}
                  className={cn(
                    'w-full sm:w-auto min-w-[240px] h-12 text-sm font-semibold rounded-xl',
                    'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                    'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                    'transition-all duration-200 active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                  )}
                >
                  <Sparkles className="size-4 mr-2" />
                  Analyze with AI
                  <ArrowRight className="size-4 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  onClick={toggleListening}
                  disabled={isAnalyzing}
                  className={cn(
                    'h-12 rounded-xl transition-all duration-200',
                    isListening && 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400'
                  )}
                >
                  {isListening ? (
                    <>
                      <MicOff className="size-4 mr-2" />
                      <span>Listening...</span>
                      <motion.span
                        className="ml-2 flex size-2"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <span className="size-full rounded-full bg-red-500" />
                      </motion.span>
                    </>
                  ) : (
                    <>
                      <Mic className="size-4 mr-2" />
                      <span>Voice Input</span>
                    </>
                  )}
                </Button>
              </motion.div>

              {/* ── Error ── */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">Analysis Failed</p>
                        <p className="text-xs text-red-500/70 mt-1">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Analyzing Animation ── */}
          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <div className="flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20">
                  <Brain className="size-10 text-primary" />
                </div>
                <motion.div
                  className="absolute -inset-3 rounded-2xl border-2 border-dashed border-primary/30"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-foreground mt-8"
              >
                AI is analyzing your case...
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 w-full max-w-sm space-y-3"
              >
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${analyzeProgress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>

                {/* Steps */}
                {[
                  'Classifying case type...',
                  'Extracting parties and facts...',
                  'Identifying legal sections...',
                  'Recommending documents...',
                ].map((step, idx) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: analyzeProgress > idx * 22 ? 1 : 0.3, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.3 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    {analyzeProgress > idx * 22 ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <Loader2 className="size-4 text-muted-foreground animate-spin" />
                    )}
                    <span className={analyzeProgress > idx * 22 ? 'text-foreground' : 'text-muted-foreground'}>
                      {step}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ── Results ── */}
          {result && !isAnalyzing && (
            <motion.div
              key="results"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* Success header */}
              <motion.div variants={fadeInUp} custom={0} className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-500/10 mb-4"
                >
                  <PartyPopper className="size-8 text-emerald-500" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
                  Analysis Complete
                </h2>
                <p className="text-sm text-muted-foreground">
                  AI has classified your case and generated recommendations
                </p>
              </motion.div>

              {/* ── 1. Case Classification Card ── */}
              <motion.div variants={fadeInUp} custom={1} className="mb-6">
                <Card className="rounded-xl border-2 border-primary/10 overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <Scale className="size-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Case Classification</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">AI-detected case type and details</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Case Type */}
                      <div className="rounded-lg bg-muted/50 p-4">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Case Type</span>
                        <div className="flex items-center gap-2 mt-1.5">
                          {(() => {
                            const Icon = iconMap[result.caseClassification.caseTypeIcon] || FileText
                            return <Icon className="size-5 text-primary" />
                          })()}
                          <span className="text-sm font-semibold text-foreground">
                            {result.caseClassification.caseType}
                          </span>
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="rounded-lg bg-muted/50 p-4">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Priority Level</span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            className={cn(
                              'px-2.5 py-0.5 text-xs font-bold',
                              priorityConfig[result.caseClassification.priority]?.bg,
                              priorityConfig[result.caseClassification.priority]?.text,
                              priorityConfig[result.caseClassification.priority]?.border
                            )}
                            style={{ borderWidth: 1, borderStyle: 'solid' }}
                          >
                            <span className={cn(
                              'inline-block size-1.5 rounded-full mr-1.5',
                              priorityConfig[result.caseClassification.priority]?.dot
                            )} />
                            {result.caseClassification.priority} Priority
                          </Badge>
                        </div>
                      </div>

                      {/* Jurisdiction */}
                      <div className="rounded-lg bg-muted/50 p-4">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Suggested Jurisdiction</span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <MapPin className="size-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            {result.caseClassification.jurisdiction}
                          </span>
                        </div>
                      </div>

                      {/* Legal Sections */}
                      <div className="rounded-lg bg-muted/50 p-4">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Relevant Sections</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {result.caseClassification.relevantSections.map((section) => (
                            <Badge key={section} variant="outline" className="text-xs font-medium">
                              {section}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── 2. Extracted Information Card ── */}
              <motion.div variants={fadeInUp} custom={2} className="mb-6">
                <Card className="rounded-xl border border-border overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Info className="size-5 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Extracted Information</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Key details identified from your description</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Parties */}
                    {result.extractedInfo.parties.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
                          <Users className="size-3.5" /> Parties Involved
                        </h4>
                        <div className="space-y-2">
                          {result.extractedInfo.parties.map((party, idx) => (
                            <div key={idx} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                              <Badge variant="secondary" className="text-xs shrink-0">{party.role}</Badge>
                              <span className="text-sm text-foreground">{party.name || 'Not specified'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Dates */}
                    {result.extractedInfo.keyDates.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
                          <Calendar className="size-3.5" /> Key Dates
                        </h4>
                        <div className="space-y-2">
                          {result.extractedInfo.keyDates.map((date, idx) => (
                            <div key={idx} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                              <Clock className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm text-foreground">
                                <span className="font-medium">{date.label}:</span>{' '}
                                {date.date || 'Not specified'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Facts */}
                    {result.extractedInfo.facts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
                          <FileText className="size-3.5" /> Important Facts
                        </h4>
                        <div className="space-y-2">
                          {result.extractedInfo.facts.map((fact, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
                              <GripVertical className="size-3.5 text-primary mt-0.5 shrink-0" />
                              <span>{fact}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Info */}
                    {result.extractedInfo.missingInfo.length > 0 && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                          <AlertTriangle className="size-3.5" /> Missing Information
                        </h4>
                        <div className="space-y-1.5">
                          {result.extractedInfo.missingInfo.map((info, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300/80">
                              <ChevronRight className="size-3.5 mt-0.5 shrink-0" />
                              <span>{info}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── 3. Suggested Documents Card ── */}
              <motion.div variants={fadeInUp} custom={3} className="mb-6">
                <Card className="rounded-xl border border-border overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
                        <ListChecks className="size-5 text-violet-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">AI Suggested Documents</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Select documents to generate</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.suggestedDocuments.map((doc) => (
                        <label
                          key={doc.name}
                          className={cn(
                            'flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-all duration-150',
                            'hover:bg-muted/50 border border-transparent',
                            selectedDocs.has(doc.name) && 'bg-primary/5 border-primary/20'
                          )}
                        >
                          <Checkbox
                            checked={selectedDocs.has(doc.name)}
                            onCheckedChange={() => toggleDoc(doc.name)}
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">{doc.name}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">{doc.type}</Badge>
                          </div>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── 4. Next Steps Card ── */}
              <motion.div variants={fadeInUp} custom={4} className="mb-8">
                <Card className="rounded-xl border border-border overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                        <ArrowRight className="size-5 text-emerald-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Action items with suggested timelines</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.nextSteps.map((item) => (
                        <div key={item.step} className="flex items-start gap-4">
                          <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.step}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{item.action}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="size-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{item.timeline}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Client Info Dialog ── */}
              {result && result.extractedInfo.parties.length > 0 && !showClientDialog && !isAutoDrafting && (
                <motion.div variants={fadeInUp} custom={5} className="mb-6">
                  <Card className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="size-5 text-amber-600" />
                        <span className="text-sm font-semibold text-foreground">Add Client Details</span>
                        <span className="text-xs text-muted-foreground">(optional)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <Input placeholder="Client name" value={clientName} onChange={e => setClientName(e.target.value)} className="h-9 text-sm" />
                        <Input placeholder="Phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="h-9 text-sm" />
                        <Input placeholder="Email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pre-filled from extracted info: {result.extractedInfo.parties[0].name}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── Auto-Drafting Progress ── */}
              {isAutoDrafting && (
                <motion.div variants={fadeInUp} custom={5} className="mb-6">
                  <Card className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="size-5 text-primary animate-spin" />
                        <span className="text-sm font-semibold text-foreground">Auto-Generating Documents...</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{autoDraftProgress}</p>
                      {generatedDocNames.length > 0 && (
                        <div className="space-y-1.5">
                          {generatedDocNames.map(name => (
                            <div key={name} className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5" />
                              <span>{name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── Action Buttons ── */}
              <motion.div
                variants={fadeInUp}
                custom={5}
                className="flex flex-col sm:flex-row items-center gap-3"
              >
                {isAutoDrafting ? (
                  <div className="w-full sm:w-auto min-w-[240px] h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm font-semibold">Auto-Generating All Documents...</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleCreateCase}
                    className={cn(
                      'w-full sm:w-auto min-w-[240px] h-12 text-sm font-semibold rounded-xl',
                      'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                      'text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                      'transition-all duration-200 active:scale-[0.98]',
                    )}
                  >
                    <Sparkles className="size-4 mr-2" />
                    Create Case & Generate Docs
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="h-12 rounded-xl"
                  disabled={isAutoDrafting}
                >
                  <RotateCcw className="size-4 mr-2" />
                  Start Over
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
