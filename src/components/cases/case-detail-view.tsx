'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore, type CaseItem, type TaskItem, type DocumentItem } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  Clock,
  Building2,
  User,
  Scale,
  FileText,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Plus,
  Upload,
  Eye,
  Download,
  FileDown,
  Trash2,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Gavel,
  Shield,
  Target,
  Lightbulb,
  StickyNote,
  ChevronRight,
  ExternalLink,
  Receipt,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DocumentViewer } from '@/components/shared/document-viewer'
import { generateBrandedPdf } from '@/lib/pdf-generator'
import { useProfileStore } from '@/store/profile-store'
import { toast } from 'sonner'

/* --- Animation --- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

/* --- Helpers --- */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function getPriorityBg(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'medium': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    case 'low': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

function getStatusBg(status: string): string {
  switch (status.toLowerCase()) {
    case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'closed': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

function getTaskStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed': return 'text-emerald-500'
    case 'in progress': return 'text-amber-500'
    case 'pending': return 'text-slate-400'
    case 'scheduled': return 'text-sky-500'
    default: return 'text-slate-400'
  }
}

function getTaskStatusBg(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'in progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'pending': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    case 'scheduled': return 'bg-sky-500/10 text-sky-500 border-sky-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

function getDocIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'pleading': return <FileText className="size-4 text-sky-500" />
    case 'evidence': return <Shield className="size-4 text-amber-500" />
    case 'application': return <Scale className="size-4 text-violet-500" />
    case 'affidavit': return <FileText className="size-4 text-emerald-500" />
    case 'correspondence': return <Mail className="size-4 text-pink-500" />
    default: return <FileText className="size-4 text-muted-foreground" />
  }
}

/* --- Info Row Component --- */

function InfoRow({ icon: Icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="mt-0.5 text-muted-foreground">{Icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="text-sm text-foreground leading-snug">{value}</div>
      </div>
    </div>
  )
}

/* --- Main Component --- */

export default function CaseDetailView() {
  const storeCases = useAppStore((s) => s.cases)
  const storeTimeline = useAppStore((s) => s.timelineEvents)
  const storeTasks = useAppStore((s) => s.tasks)
  const storeDocuments = useAppStore((s) => s.documents)
  const selectedCaseId = useAppStore((s) => s.selectedCaseId)

  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSelectedCaseId = useAppStore((s) => s.setSelectedCaseId)
  const updateTask = useAppStore((s) => s.updateTask)
  const addTask = useAppStore((s) => s.addTask)
  const addDocument = useAppStore((s) => s.addDocument)

  const [activeTab, setActiveTab] = useState('overview')
  const [caseNotes, setCaseNotes] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')

  // Resolve case data from store only
  const caseItem = useMemo((): CaseItem | null => {
    if (selectedCaseId) {
      return storeCases.find((c) => c.id === selectedCaseId) || null
    }
    return null
  }, [storeCases, selectedCaseId])

  const timelineEvents = storeTimeline

  const tasks = storeTasks

  const documents = useMemo(
    () => storeDocuments.filter((d) => d.caseId === selectedCaseId),
    [storeDocuments, selectedCaseId]
  )

  if (!caseItem) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Case not found</p>
          <Button variant="outline" onClick={() => setCurrentView('cases')}>Back to Cases</Button>
        </div>
      </div>
    )
  }

  const completedTasks = tasks.filter((t) => t.status === 'Completed').length
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  const handleBack = () => {
    setSelectedCaseId(null)
    setCurrentView('cases')
  }

  const handleTaskToggle = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed'
    updateTask(taskId, { status: newStatus })
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !caseItem) return
    addTask({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      title: newTaskTitle.trim(),
      status: 'Pending',
      priority: newTaskPriority,
    })
    setNewTaskTitle('')
    setNewTaskPriority('medium')
  }

  const handleDownloadPdf = async (doc: DocumentItem) => {
    try {
      const profile = useProfileStore.getState().profile
      generateBrandedPdf({
        title: doc.name,
        content: doc.content || '',
        profile: profile || { fullName: '', email: '', phone: '', city: '', state: '', barCouncilNumber: '', firmName: '', firmAddress: '' },
      })
      toast.success('PDF downloaded successfully')
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  const handleDownloadWord = async (doc: DocumentItem) => {
    try {
      const profile = useProfileStore.getState().profile
      const header = profile?.firmName || profile?.fullName || 'Ai Draft'
      const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${doc.name}</title>
<style>
body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.6; margin: 1in; color: #1a1a1a; }
h1 { font-size: 16pt; text-align: center; margin-bottom: 12pt; }
h2 { font-size: 14pt; margin-top: 18pt; }
p { margin: 6pt 0; text-align: justify; }
.header { font-family: 'Arial', sans-serif; background: #1a2332; color: white; padding: 12px 20px; margin: -1in -1in 20pt -1in; }
.header h1 { font-size: 14pt; text-align: left; color: white; margin: 0; }
.header p { font-size: 9pt; color: #b4c8dc; margin: 2pt 0; }
.disclaimer { font-size: 8pt; color: #888; font-style: italic; border-top: 1px solid #ccc; margin-top: 24pt; padding-top: 8pt; }
</style></head>
<body>
<div class='header'>
<h1>${header}</h1>
${profile?.fullName ? `<p>Adv. ${profile.fullName}${profile.barCouncilNumber ? ' | ' + profile.barCouncilNumber : ''}</p>` : ''}
${profile?.firmAddress || profile?.city ? `<p>${[profile?.firmAddress, profile?.city].filter(Boolean).join(', ')}</p>` : ''}
${profile?.phone ? `<p>Ph: ${profile.phone}</p>` : ''}
${profile?.email ? `<p>Email: ${profile.email}</p>` : ''}
</div>
<h1>${doc.name}</h1>
<div>${(doc.content || '').replace(/\n/g, '<br/>')}</div>
<div class='disclaimer'>Disclaimer: This document has been generated using AI-powered tools by Ai Draft. It is intended as a draft for review by a qualified legal professional.</div>
</body></html>`

      const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeFileName = doc.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 60)
      a.download = `${safeFileName}.doc`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Word document downloaded successfully')
    } catch (err) {
      console.error('Failed to generate Word doc:', err)
      toast.error('Failed to generate Word document. Please try again.')
    }
  }

  const updateDocumentContent = (docId: string, newContent: string) => {
    const docs = useAppStore.getState().documents
    const updatedDocs = docs.map(d => d.id === docId ? { ...d, content: newContent } : d)
    useAppStore.getState().setDocuments(updatedDocs)
    toast.success('Document updated successfully')
  }

  const handleFileUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || !selectedCaseId) return
      Array.from(files).forEach((file) => {
        const ext = file.name.split('.').pop()?.toUpperCase() || ''
        addDocument({
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          name: file.name,
          type: ext,
          category: 'Received',
          caseId: selectedCaseId,
          createdAt: new Date().toISOString(),
        })
      })
    }
    input.click()
  }

  return (
    <motion.div
      className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* -- Header -- */}
      <motion.div variants={itemVariants} className="mb-5">
        {/* Back button + Actions */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            Back to Cases
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <MoreHorizontal className="size-3.5" />
              More
            </Button>
            <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              <Sparkles className="size-3.5" />
              AI Analyze
            </Button>
          </div>
        </div>

        {/* Case Title + Badges */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {caseItem.caseNumber && (
              <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {caseItem.caseNumber}
              </span>
            )}
            <Badge className={cn('border text-[11px]', getStatusBg(caseItem.status))}>
              {caseItem.status}
            </Badge>
            <Badge className={cn('border text-[11px]', getPriorityBg(caseItem.priority))}>
              {caseItem.priority}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {caseItem.caseType}
              {caseItem.subType && ` • ${caseItem.subType}`}
            </Badge>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{caseItem.title}</h1>
          {caseItem.description && (
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{caseItem.description}</p>
          )}
        </div>
      </motion.div>

      {/* -- Main Content: Tabs + Sidebar -- */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Tabs */}
        <motion.div variants={itemVariants} className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto mb-4">
              <TabsTrigger value="overview" className="text-xs gap-1.5"><Scale className="size-3.5" />Overview</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs gap-1.5"><Clock className="size-3.5" />Timeline</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs gap-1.5"><FileText className="size-3.5" />Documents</TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs gap-1.5"><CheckSquare className="size-3.5" />Tasks</TabsTrigger>
              <TabsTrigger value="ai-insights" className="text-xs gap-1.5"><Sparkles className="size-3.5" />AI Insights</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs gap-1.5"><StickyNote className="size-3.5" />Notes</TabsTrigger>
            </TabsList>

            {/* -- Overview Tab -- */}
            <TabsContent value="overview">
              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    <InfoRow icon={<Building2 className="size-4" />} label="Court" value={caseItem.courtName} />
                    <InfoRow icon={<User className="size-4" />} label="Judge" value={caseItem.judgeName} />
                    <InfoRow icon={<Gavel className="size-4" />} label="Jurisdiction" value={caseItem.jurisdiction} />
                    <InfoRow icon={<User className="size-4" />} label="Client" value={caseItem.clientName} />
                    <InfoRow icon={<Calendar className="size-4" />} label="Filing Date" value={caseItem.filingDate ? formatDate(caseItem.filingDate) : undefined} />
                    <InfoRow icon={<Calendar className="size-4" />} label="Next Hearing" value={caseItem.nextHearing ? `${formatDate(caseItem.nextHearing)} at ${formatTime(caseItem.nextHearing)}` : undefined} />
                    {caseItem.nextHearing && (
                      <InfoRow
                        icon={<AlertTriangle className="size-4" />}
                        label="Days to Hearing"
                        value={
                          <span className={cn(
                            'font-semibold',
                            getDaysUntil(caseItem.nextHearing) <= 1 ? 'text-red-500' : getDaysUntil(caseItem.nextHearing) <= 3 ? 'text-amber-500' : 'text-foreground'
                          )}>
                            {getDaysUntil(caseItem.nextHearing) <= 0 ? 'Today!' : getDaysUntil(caseItem.nextHearing) === 1 ? 'Tomorrow' : `${getDaysUntil(caseItem.nextHearing)} days`}
                          </span>
                        }
                      />
                    )}
                    <InfoRow icon={<FileText className="size-4" />} label="Case Type" value={`${caseItem.caseType}${caseItem.subType ? ` – ${caseItem.subType}` : ''}`} />
                    <InfoRow icon={<Phone className="size-4" />} label="Client Phone" value={caseItem.clientPhone} />
                    <InfoRow icon={<Mail className="size-4" />} label="Client Email" value={caseItem.clientEmail} />
                    {caseItem.accusedName && (
                      <InfoRow icon={<User className="size-4" />} label="Accused" value={caseItem.accusedName} />
                    )}
                    {caseItem.accusedPhone && (
                      <InfoRow icon={<Phone className="size-4" />} label="Accused Phone" value={caseItem.accusedPhone} />
                    )}
                    {caseItem.victimNames && caseItem.victimNames.length > 0 && (
                      <InfoRow icon={<User className="size-4" />} label="Victim(s)" value={caseItem.victimNames.join(', ')} />
                    )}
                    {caseItem.opposingParty && (
                      <InfoRow icon={<User className="size-4" />} label="Opposing Party" value={caseItem.opposingParty} />
                    )}
                    {caseItem.opposingPartyPhone && (
                      <InfoRow icon={<Phone className="size-4" />} label="Opposing Phone" value={caseItem.opposingPartyPhone} />
                    )}
                    {caseItem.clientAdvocate && (
                      <InfoRow icon={<Scale className="size-4" />} label="Client Advocate" value={caseItem.clientAdvocate} />
                    )}
                    {caseItem.opposingAdvocate && (
                      <InfoRow icon={<Scale className="size-4" />} label="Opposing Advocate" value={caseItem.opposingAdvocate} />
                    )}
                    {caseItem.firNumber && (
                      <InfoRow icon={<FileText className="size-4" />} label="FIR Number" value={caseItem.firNumber} />
                    )}
                    {caseItem.policeStation && (
                      <InfoRow icon={<Building2 className="size-4" />} label="Police Station" value={caseItem.policeStation} />
                    )}
                    {caseItem.crrNumber && (
                      <InfoRow icon={<FileText className="size-4" />} label="CRR Number" value={caseItem.crrNumber} />
                    )}
                    {caseItem.underSections && caseItem.underSections.length > 0 && (
                      <InfoRow icon={<Shield className="size-4" />} label="Under Sections" value={
                        <div className="flex flex-wrap gap-1">
                          {caseItem.underSections.map((s, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      } />
                    )}
                    {caseItem.causeOfAction && (
                      <InfoRow icon={<Gavel className="size-4" />} label="Cause of Action" value={caseItem.causeOfAction} />
                    )}
                    {caseItem.reliefSought && (
                      <InfoRow icon={<Target className="size-4" />} label="Relief Sought" value={caseItem.reliefSought} />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Task Progress */}
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Case Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{completedTasks} of {tasks.length} tasks completed</span>
                    <span className="font-semibold">{taskProgress}%</span>
                  </div>
                  <Progress value={taskProgress} className="h-2" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* -- Timeline Tab -- */}
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Case Timeline</CardTitle>
                    <Badge variant="outline" className="text-[11px]">
                      {timelineEvents.length} events
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {timelineEvents.map((event, idx) => (
                      <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                        {/* Vertical line + dot */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'flex size-8 items-center justify-center rounded-full shrink-0 border-2 z-10',
                            event.isCompleted
                              ? event.isMilestone
                                ? 'border-primary bg-primary/10'
                                : 'border-emerald-500 bg-emerald-500/10'
                              : event.isMilestone
                                ? 'border-amber-500 bg-amber-500/10'
                                : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
                          )}>
                            {event.isCompleted ? (
                              <CheckCircle2 className={cn('size-4', event.isMilestone ? 'text-primary' : 'text-emerald-500')} />
                            ) : (
                              <CircleDot className={cn('size-4', event.isMilestone ? 'text-amber-500' : 'text-slate-400')} />
                            )}
                          </div>
                          {idx < timelineEvents.length - 1 && (
                            <div className={cn(
                              'w-0.5 flex-1 mt-1',
                              event.isCompleted ? 'bg-primary/30' : 'bg-border'
                            )} />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-1 -mt-0.5">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className={cn('text-sm font-medium', event.isCompleted ? 'text-foreground' : 'text-foreground')}>
                              {event.title}
                            </h4>
                            {event.isMilestone && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 border text-[9px] h-4 px-1.5">
                                Milestone
                              </Badge>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mb-1.5">{event.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(event.eventDate)} {event.eventDate.includes('T') ? formatTime(event.eventDate) : ''}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {event.eventType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* -- Documents Tab -- */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Case Documents</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{documents.length} documents</CardDescription>
                    </div>
                    <Button size="sm" className="gap-1.5 text-xs h-8" onClick={handleFileUpload}>
                      <Upload className="size-3.5" />
                      Upload
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No documents yet. Documents generated during intake will appear here.</p>
                    ) : (
                      documents.map((doc) => (
                        <div
                          key={doc.id}
                          className={cn(
                            'flex items-center gap-3 rounded-lg p-3 transition-colors',
                            'bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border',
                            'group cursor-pointer'
                          )}
                        >
                          <div className="flex size-9 items-center justify-center rounded-lg bg-background shrink-0">
                            {getDocIcon(doc.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] h-4">{doc.category}</Badge>
                              <span className="text-[11px] text-muted-foreground">{formatDate(doc.createdAt)}</span>
                            </div>
                            {doc.summary && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{doc.summary}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => setViewingDoc(doc)} title="View document">
                              <Eye className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDownloadPdf(doc)} title="Download PDF">
                              <Download className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDownloadWord(doc)} title="Download Word">
                              <FileDown className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* -- Tasks Tab -- */}
            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Tasks</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{completedTasks} of {tasks.length} completed</CardDescription>
                    </div>
                    <Button size="sm" className="gap-1.5 text-xs h-8">
                      <Plus className="size-3.5" />
                      Add Task
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Add task form */}
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-secondary/30 border border-dashed border-border">
                    <Input placeholder="Add a new task..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} className="h-8 text-sm flex-1 border-0 shadow-none bg-transparent focus-visible:ring-0" />
                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                      <SelectTrigger size="sm" className="w-[100px] h-8 text-xs">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 text-xs" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>Add</Button>
                  </div>

                  {/* Task List */}
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg p-3 transition-colors',
                          'bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border',
                          task.status === 'Completed' && 'opacity-60'
                        )}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleTaskToggle(task.id, task.status)}
                          className={cn(
                            'flex size-5 items-center justify-center rounded-md border shrink-0 mt-0.5 transition-colors',
                            task.status === 'Completed'
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          {task.status === 'Completed' && <CheckCircle2 className="size-3.5" />}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium leading-snug',
                            task.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                          )}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge className={cn('border text-[10px]', getTaskStatusBg(task.status))}>
                              {task.status}
                            </Badge>
                            <Badge className={cn('border text-[10px]', getPriorityBg(task.priority))}>
                              {task.priority}
                            </Badge>
                            {task.taskType && (
                              <Badge variant="outline" className="text-[10px]">{task.taskType}</Badge>
                            )}
                            {task.dueDate && (
                              <span className={cn(
                                'text-[11px]',
                                getDaysUntil(task.dueDate) <= 1 && task.status !== 'Completed' ? 'text-red-500 font-medium' : 'text-muted-foreground'
                              )}>
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="text-[11px] text-muted-foreground">{task.assignee}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* -- AI Insights Tab -- */}
            <TabsContent value="ai-insights">
              <div className="space-y-4">
                {/* Risk Assessment */}
                <Card className="border-amber-500/20 dark:border-amber-500/10">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                        <AlertTriangle className="size-4 text-amber-500" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">AI Risk Assessment</CardTitle>
                        <CardDescription className="text-xs">Generated by AI Draft</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex size-6 items-center justify-center rounded-full bg-red-500/10 shrink-0">
                          <span className="text-xs font-bold text-red-500">!</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-500">High Risk: Injunction Hearing</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            The temporary injunction hearing on Jan 28 is critical. Based on similar cases, the court grants injunctions in ~62% of property disputes with registered sale deeds.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <div className="flex size-6 items-center justify-center rounded-full bg-amber-500/10 shrink-0">
                          <span className="text-xs font-bold text-amber-500">~</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-500">Medium Risk: Evidence Strength</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Property tax receipts strengthen the ownership claim but additional witness testimonies would improve chances by ~25%.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                          <span className="text-xs font-bold text-emerald-500">✓</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-500">Low Risk: Jurisdiction</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Filing in Gautam Buddh Nagar is appropriate. The property falls within the territorial jurisdiction of this court.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Strategy Suggestions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <Lightbulb className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">Strategy Suggestions</CardTitle>
                        <CardDescription className="text-xs">AI-recommended next steps</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { title: 'File supplementary affidavit on chain of title', desc: 'Attach all property tax receipts and previous sale deeds to establish clear title.', priority: 'High' },
                        { title: 'Prepare witness list for injunction hearing', desc: 'List 2-3 witnesses who can testify to continuous possession of the property since 2019.', priority: 'Urgent' },
                        { title: 'Research comparable injunction precedents', desc: 'Find Delhi HC and SC precedents where injunctions were granted in similar property disputes.', priority: 'Medium' },
                        { title: 'Explore settlement options', desc: 'Consider mediation as courts often encourage amicable resolution in property matters.', priority: 'Low' },
                      ].map((s, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-transparent hover:border-border transition-colors">
                          <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                            <Target className="size-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-medium text-foreground">{s.title}</p>
                              <Badge className={cn('border text-[10px]', getPriorityBg(s.priority))}>{s.priority}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* -- Notes Tab -- */}
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Case Notes</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Private notes and observations</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={caseNotes}
                    onChange={(e) => setCaseNotes(e.target.value)}
                    placeholder="Add your case notes here..."
                    className="min-h-[200px] text-sm"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[11px] text-muted-foreground">
                      Auto-saved • Last edited just now
                    </p>
                    <Button size="sm" className="text-xs h-8">
                      Save Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* -- Sidebar (right panel) -- */}
        <motion.div variants={itemVariants} className="w-full lg:w-[300px] shrink-0 space-y-4">
          {/* Case Info Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow icon={<Gavel className="size-3.5" />} label="Type" value={`${caseItem.caseType}${caseItem.subType ? ` – ${caseItem.subType}` : ''}`} />
              <InfoRow icon={<MapPin className="size-3.5" />} label="Jurisdiction" value={caseItem.jurisdiction} />
              <InfoRow icon={<Building2 className="size-3.5" />} label="Court" value={caseItem.courtName} />
              <InfoRow icon={<User className="size-3.5" />} label="Judge" value={caseItem.judgeName} />
              {caseItem.filingDate && (
                <InfoRow icon={<Calendar className="size-3.5" />} label="Filed" value={formatDate(caseItem.filingDate)} />
              )}
              {caseItem.updatedAt && (
                <InfoRow icon={<Clock className="size-3.5" />} label="Last Updated" value={formatDate(caseItem.updatedAt)} />
              )}
              {caseItem.clientPhone && (
                <InfoRow icon={<Phone className="size-3.5" />} label="Client Phone" value={caseItem.clientPhone} />
              )}
              {caseItem.clientEmail && (
                <InfoRow icon={<Mail className="size-3.5" />} label="Client Email" value={caseItem.clientEmail} />
              )}
              {caseItem.accusedName && (
                <InfoRow icon={<User className="size-3.5" />} label="Accused" value={caseItem.accusedName} />
              )}
              {caseItem.firNumber && (
                <InfoRow icon={<FileText className="size-3.5" />} label="FIR Number" value={caseItem.firNumber} />
              )}
            </CardContent>
          </Card>

          {/* Key Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {caseItem.nextHearing && (
                <InfoRow
                  icon={<Calendar className="size-3.5" />}
                  label="Next Hearing"
                  value={
                    <span className="flex items-center gap-1.5">
                      {formatDate(caseItem.nextHearing)}
                      <Badge className={cn(
                        'border text-[9px] h-4 px-1.5',
                        getDaysUntil(caseItem.nextHearing) <= 1
                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : getDaysUntil(caseItem.nextHearing) <= 3
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-secondary text-muted-foreground border-transparent'
                      )}>
                        {getDaysUntil(caseItem.nextHearing) <= 0 ? 'Today' : getDaysUntil(caseItem.nextHearing) === 1 ? 'Tomorrow' : `${getDaysUntil(caseItem.nextHearing)}d`}
                      </Badge>
                    </span>
                  }
                />
              )}
              <InfoRow icon={<Calendar className="size-3.5" />} label="Filing Date" value={caseItem.filingDate ? formatDate(caseItem.filingDate) : undefined} />
            </CardContent>
          </Card>

          {/* Client Contact */}
          {caseItem.clientName && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow icon={<User className="size-3.5" />} label="Name" value={caseItem.clientName} />
                {caseItem.clientEmail && (
                  <InfoRow
                    icon={<Mail className="size-3.5" />}
                    label="Email"
                    value={
                      <button className="text-primary hover:underline text-sm">{caseItem.clientEmail}</button>
                    }
                  />
                )}
                {caseItem.clientPhone && (
                  <InfoRow
                    icon={<Phone className="size-3.5" />}
                    label="Phone"
                    value={
                      <button className="text-primary hover:underline text-sm">{caseItem.clientPhone}</button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: FileText, label: 'Draft Document', action: () => setCurrentView('drafting') },
                { icon: Sparkles, label: 'AI Analysis', action: () => setActiveTab('ai-insights') },
                { icon: Scale, label: 'Research Case Law', action: () => setCurrentView('research') },
                { icon: Receipt, label: 'Create Invoice', action: () => setCurrentView('billing') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex items-center gap-2.5 w-full rounded-lg p-2.5 text-left transition-colors bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border cursor-pointer group"
                >
                  <item.icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">{item.label}</span>
                  <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* AI Suggestion */}
          <Card className="border-amber-500/20 dark:border-amber-500/10 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-500/5 dark:to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="size-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">AI Suggestion</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Based on similar property disputes in NCR courts, consider filing an application for appointment of a local commissioner to survey the property boundaries. This could strengthen your injunction request significantly.
              </p>
              <Button variant="ghost" size="sm" className="mt-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 gap-1 h-7 px-2">
                <ExternalLink className="size-3" />
                Learn More
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc?.name || 'Document'}
        content={viewingDoc?.content || ''}
        category={viewingDoc?.category}
        caseNumber={caseItem.caseNumber}
        docId={viewingDoc?.id}
        caseId={selectedCaseId ?? undefined}
        onSaveContent={(docId, newContent) => {
          updateDocumentContent(docId, newContent)
        }}
      />
    </motion.div>
  )
}
