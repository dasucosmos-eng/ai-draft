'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useClientsStore,
  type Client,
  type ClientDocument,
  type ClientFeeRecord,
  type ClientActivity,
  type ClientImportantDate,
  type ClientCategory,
  type ClientReferenceSource,
} from '@/store/clients-store'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  Search,
  Plus,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  Briefcase,
  Tag,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Link2,
  Unlink,
  UserPlus,
  Upload,
  StickyNote,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Building2,
  CreditCard,
  CalendarClock,
  Activity,
  Clock,
  IndianRupee,
  PhoneCall,
  Mail as MailIcon,
  Handshake,
  Gavel,
  FileCheck,
  Banknote,
  Calendar,
  CalendarDays,
  Edit3,
  Save,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { DocumentViewer } from '@/components/shared/document-viewer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* ─── Animation ─── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

/* ─── Helpers ─── */

type SortType = 'name' | 'date' | 'cases'

function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getDocIcon(type: string): string {
  switch (type.toUpperCase()) {
    case 'PDF': return '📄'
    case 'DOCX':
    case 'DOC': return '📝'
    case 'JPG':
    case 'JPEG':
    case 'PNG': return '🖼️'
    default: return '📎'
  }
}

const categoryConfig: Record<ClientCategory, { label: string; color: string; icon: string }> = {
  individual: { label: 'Individual', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: '👤' },
  corporate: { label: 'Corporate', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: '🏢' },
  government: { label: 'Government', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🏛️' },
  ngo: { label: 'NGO', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '🌍' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📋' },
}

const referenceSourceLabels: Record<ClientReferenceSource, string> = {
  referral: 'Referral',
  website: 'Website',
  social_media: 'Social Media',
  advertisement: 'Advertisement',
  walk_in: 'Walk In',
  bar_association: 'Bar Association',
  other_lawyer: 'Other Lawyer',
  existing_client: 'Existing Client',
  other: 'Other',
}

const activityTypeConfig: Record<ClientActivity['type'], { label: string; icon: typeof PhoneCall; color: string }> = {
  call: { label: 'Call', icon: PhoneCall, color: 'text-sky-500 bg-sky-50' },
  email: { label: 'Email', icon: MailIcon, color: 'text-violet-500 bg-violet-50' },
  meeting: { label: 'Meeting', icon: Handshake, color: 'text-emerald-500 bg-emerald-50' },
  note: { label: 'Note', icon: StickyNote, color: 'text-amber-500 bg-amber-50' },
  court_visit: { label: 'Court Visit', icon: Gavel, color: 'text-red-500 bg-red-50' },
  document_sent: { label: 'Document Sent', icon: FileCheck, color: 'text-primary bg-primary/10' },
  payment_received: { label: 'Payment Received', icon: Banknote, color: 'text-emerald-600 bg-emerald-50' },
}

const feeStatusConfig: Record<ClientFeeRecord['status'], { label: string; color: string }> = {
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
}

const importantDateTypeConfig: Record<ClientImportantDate['type'], { label: string; color: string; icon: typeof Calendar }> = {
  hearing: { label: 'Hearing', color: 'border-l-red-500 bg-red-50/50', icon: Gavel },
  deadline: { label: 'Deadline', color: 'border-l-amber-500 bg-amber-50/50', icon: Clock },
  meeting: { label: 'Meeting', color: 'border-l-sky-500 bg-sky-50/50', icon: Handshake },
  payment_due: { label: 'Payment Due', color: 'border-l-emerald-500 bg-emerald-50/50', icon: CreditCard },
  document_filing: { label: 'Document Filing', color: 'border-l-violet-500 bg-violet-50/50', icon: FileCheck },
  other: { label: 'Other', color: 'border-l-gray-400 bg-gray-50/50', icon: Calendar },
}

/* ─── Add Client Dialog ─── */

interface AddClientFormData {
  name: string
  email: string
  phone: string
  alternatePhone: string
  address: string
  category: ClientCategory
  referenceSource: ClientReferenceSource
  company: string
  companyType: string
  panNumber: string
  gstNumber: string
}

function AddClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const addClient = useClientsStore((s) => s.addClient)
  const [form, setForm] = useState<AddClientFormData>({
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: '',
    category: 'individual',
    referenceSource: 'walk_in',
    company: '',
    companyType: '',
    panNumber: '',
    gstNumber: '',
  })

  const handleSubmit = () => {
    if (!form.name.trim()) return
    addClient({
      id: generateId(),
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      alternatePhone: form.alternatePhone.trim() || undefined,
      address: form.address.trim() || undefined,
      category: form.category,
      referenceSource: form.referenceSource,
      company: form.category === 'corporate' ? form.company.trim() || undefined : undefined,
      companyType: form.category === 'corporate' ? form.companyType.trim() || undefined : undefined,
      panNumber: form.panNumber.trim() || undefined,
      gstNumber: form.gstNumber.trim() || undefined,
      accused: [],
      victims: [],
      caseIds: [],
      documents: [],
      fees: [],
      activities: [],
      importantDates: [],
      notes: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setForm({
      name: '',
      email: '',
      phone: '',
      alternatePhone: '',
      address: '',
      category: 'individual',
      referenceSource: 'walk_in',
      company: '',
      companyType: '',
      panNumber: '',
      gstNumber: '',
    })
    toast.success('Client added successfully')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Add New Client
          </DialogTitle>
          <DialogDescription>Add a new client to manage their cases and documents.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic Info */}
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Client Name <span className="text-destructive">*</span></Label>
            <Input
              id="client-name"
              placeholder="e.g., Amit Sharma"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="h-10 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-alt-phone">Alternate Phone</Label>
              <Input
                id="client-alt-phone"
                type="tel"
                placeholder="+91 87654 32109"
                value={form.alternatePhone}
                onChange={(e) => setForm((p) => ({ ...p, alternatePhone: e.target.value }))}
                className="h-10 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="amit@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-address">Address</Label>
            <Textarea
              id="client-address"
              placeholder="Full address..."
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="text-sm min-h-[60px]"
            />
          </div>

          <Separator />

          {/* Category & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v as ClientCategory }))}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">👤 Individual</SelectItem>
                  <SelectItem value="corporate">🏢 Corporate</SelectItem>
                  <SelectItem value="government">🏛️ Government</SelectItem>
                  <SelectItem value="ngo">🌍 NGO</SelectItem>
                  <SelectItem value="other">📋 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference Source</Label>
              <Select
                value={form.referenceSource}
                onValueChange={(v) => setForm((p) => ({ ...p, referenceSource: v as ClientReferenceSource }))}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="advertisement">Advertisement</SelectItem>
                  <SelectItem value="walk_in">Walk In</SelectItem>
                  <SelectItem value="bar_association">Bar Association</SelectItem>
                  <SelectItem value="other_lawyer">Other Lawyer</SelectItem>
                  <SelectItem value="existing_client">Existing Client</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Corporate Fields */}
          {form.category === 'corporate' && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="client-company">Company Name</Label>
                  <Input
                    id="client-company"
                    placeholder="Acme Corp Pvt. Ltd."
                    value={form.company}
                    onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client-company-type">Company Type</Label>
                  <Input
                    id="client-company-type"
                    placeholder="Pvt. Ltd., LLP, etc."
                    value={form.companyType}
                    onChange={(e) => setForm((p) => ({ ...p, companyType: e.target.value }))}
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Tax Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-pan">PAN Number</Label>
              <Input
                id="client-pan"
                placeholder="e.g., ABCDE1234F"
                value={form.panNumber}
                onChange={(e) => setForm((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-gst">GST Number</Label>
              <Input
                id="client-gst"
                placeholder="e.g., 22AAAAA0000A1Z5"
                value={form.gstNumber}
                onChange={(e) => setForm((p) => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
                className="h-10 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()} className="gap-2 text-sm">
            <UserPlus className="size-4" />
            Add Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Client Detail Panel ─── */

function ClientDetailPanel({
  client,
  onClose,
}: {
  client: Client
  onClose: () => void
}) {
  const updateClient = useClientsStore((s) => s.updateClient)
  const deleteClient = useClientsStore((s) => s.deleteClient)
  const addDocumentToClient = useClientsStore((s) => s.addDocumentToClient)
  const removeDocumentFromClient = useClientsStore((s) => s.removeDocumentFromClient)
  const cases = useAppStore((s) => s.cases)

  // Parties state
  const [newAccused, setNewAccused] = useState('')
  const [newVictim, setNewVictim] = useState('')
  const [newTag, setNewTag] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(client.notes || '')
  const [viewingDoc, setViewingDoc] = useState<{ title: string; content: string; category: string; createdAt: string; docId?: string } | null>(null)
  const updateClientDocumentContent = useClientsStore((s) => s.updateClientDocumentContent)

  // Contact edit state
  const [editingContact, setEditingContact] = useState(false)
  const [contactForm, setContactForm] = useState({
    email: client.email || '',
    phone: client.phone || '',
    alternatePhone: client.alternatePhone || '',
    address: client.address || '',
    company: client.company || '',
    companyType: client.companyType || '',
    panNumber: client.panNumber || '',
    gstNumber: client.gstNumber || '',
  })

  // Activity state
  const [newActivityType, setNewActivityType] = useState<ClientActivity['type']>('call')
  const [newActivityDesc, setNewActivityDesc] = useState('')

  // Fee state
  const [newFeeDesc, setNewFeeDesc] = useState('')
  const [newFeeAmount, setNewFeeAmount] = useState('')
  const [newFeeStatus, setNewFeeStatus] = useState<ClientFeeRecord['status']>('pending')
  const [newFeeCaseId, setNewFeeCaseId] = useState('')

  // Important date state
  const [newDateTitle, setNewDateTitle] = useState('')
  const [newDateDate, setNewDateDate] = useState('')
  const [newDateType, setNewDateType] = useState<ClientImportantDate['type']>('hearing')
  const [newDateCaseId, setNewDateCaseId] = useState('')

  // Linked cases from app-store
  const linkedCases = useMemo(
    () => cases.filter((c) => client.caseIds?.includes(c.id)),
    [cases, client.caseIds]
  )
  const unlinkedCases = useMemo(
    () => cases.filter((c) => !client.caseIds?.includes(c.id)),
    [cases, client.caseIds]
  )

  // Computed stats
  const feeStats = useMemo(() => {
    const fees = client.fees || []
    const totalPaid = fees.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
    const totalPending = fees.filter((f) => f.status === 'pending').reduce((s, f) => s + f.amount, 0)
    const totalOverdue = fees.filter((f) => f.status === 'overdue').reduce((s, f) => s + f.amount, 0)
    const totalFees = fees.reduce((s, f) => s + f.amount, 0)
    return { totalPaid, totalPending, totalOverdue, totalFees }
  }, [client.fees])

  const upcomingDatesCount = useMemo(() => {
    const dates = client.importantDates || []
    const now = new Date()
    return dates.filter((d) => new Date(d.date) >= now).length
  }, [client.importantDates])

  // ── Party handlers ──

  const handleAddAccused = () => {
    if (!newAccused.trim()) return
    updateClient(client.id, {
      accused: [...(client.accused || []), newAccused.trim()],
    })
    setNewAccused('')
  }

  const handleRemoveAccused = (name: string) => {
    updateClient(client.id, {
      accused: (client.accused || []).filter((a) => a !== name),
    })
  }

  const handleAddVictim = () => {
    if (!newVictim.trim()) return
    updateClient(client.id, {
      victims: [...(client.victims || []), newVictim.trim()],
    })
    setNewVictim('')
  }

  const handleRemoveVictim = (name: string) => {
    updateClient(client.id, {
      victims: (client.victims || []).filter((v) => v !== name),
    })
  }

  const handleAddTag = () => {
    if (!newTag.trim()) return
    updateClient(client.id, {
      tags: [...(client.tags || []), newTag.trim()],
    })
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    updateClient(client.id, {
      tags: (client.tags || []).filter((t) => t !== tag),
    })
  }

  // ── Case handlers ──

  const handleLinkCase = (caseId: string) => {
    updateClient(client.id, {
      caseIds: [...(client.caseIds || []), caseId],
    })
    toast.success('Case linked to client')
  }

  const handleUnlinkCase = (caseId: string) => {
    updateClient(client.id, {
      caseIds: (client.caseIds || []).filter((id) => id !== caseId),
    })
    toast.info('Case unlinked from client')
  }

  // ── Notes handler ──

  const handleSaveNotes = () => {
    updateClient(client.id, { notes: notesValue })
    setEditingNotes(false)
    toast.success('Notes saved')
  }

  // ── Contact edit handler ──

  const handleSaveContact = () => {
    updateClient(client.id, {
      email: contactForm.email.trim() || undefined,
      phone: contactForm.phone.trim() || undefined,
      alternatePhone: contactForm.alternatePhone.trim() || undefined,
      address: contactForm.address.trim() || undefined,
      company: contactForm.company.trim() || undefined,
      companyType: contactForm.companyType.trim() || undefined,
      panNumber: contactForm.panNumber.trim() || undefined,
      gstNumber: contactForm.gstNumber.trim() || undefined,
    })
    setEditingContact(false)
    toast.success('Contact info updated')
  }

  // ── Activity handlers ──

  const handleAddActivity = () => {
    if (!newActivityDesc.trim()) return
    const activity: ClientActivity = {
      id: generateId(),
      type: newActivityType,
      description: newActivityDesc.trim(),
      date: new Date().toISOString(),
    }
    updateClient(client.id, {
      activities: [activity, ...(client.activities || [])],
    })
    setNewActivityDesc('')
    toast.success('Activity logged')
  }

  const handleDeleteActivity = (id: string) => {
    updateClient(client.id, {
      activities: (client.activities || []).filter((a) => a.id !== id),
    })
  }

  // ── Fee handlers ──

  const handleAddFee = () => {
    if (!newFeeDesc.trim() || !newFeeAmount) return
    const amount = parseFloat(newFeeAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    const fee: ClientFeeRecord = {
      id: generateId(),
      description: newFeeDesc.trim(),
      amount,
      date: new Date().toISOString(),
      status: newFeeStatus,
      caseId: newFeeCaseId || undefined,
    }
    updateClient(client.id, {
      fees: [fee, ...(client.fees || [])],
    })
    setNewFeeDesc('')
    setNewFeeAmount('')
    setNewFeeStatus('pending')
    setNewFeeCaseId('')
    toast.success('Fee record added')
  }

  const handleDeleteFee = (id: string) => {
    updateClient(client.id, {
      fees: (client.fees || []).filter((f) => f.id !== id),
    })
    toast.info('Fee record removed')
  }

  const handleToggleFeeStatus = (id: string) => {
    const fee = (client.fees || []).find((f) => f.id === id)
    if (!fee) return
    const nextStatus: Record<ClientFeeRecord['status'], ClientFeeRecord['status']> = {
      pending: 'paid',
      paid: 'overdue',
      overdue: 'pending',
    }
    updateClient(client.id, {
      fees: (client.fees || []).map((f) =>
        f.id === id ? { ...f, status: nextStatus[f.status] } : f
      ),
    })
  }

  // ── Important date handlers ──

  const handleAddImportantDate = () => {
    if (!newDateTitle.trim() || !newDateDate) return
    const date: ClientImportantDate = {
      id: generateId(),
      title: newDateTitle.trim(),
      date: new Date(newDateDate).toISOString(),
      type: newDateType,
      caseId: newDateCaseId || undefined,
    }
    updateClient(client.id, {
      importantDates: [date, ...(client.importantDates || [])],
    })
    setNewDateTitle('')
    setNewDateDate('')
    setNewDateType('hearing')
    setNewDateCaseId('')
    toast.success('Important date added')
  }

  const handleDeleteImportantDate = (id: string) => {
    updateClient(client.id, {
      importantDates: (client.importantDates || []).filter((d) => d.id !== id),
    })
    toast.info('Date removed')
  }

  // ── Document handlers ──

  const handleFileUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx,.csv'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files) return
      Array.from(files).forEach((file) => {
        const ext = file.name.split('.').pop()?.toUpperCase() || ''
        addDocumentToClient(client.id, {
          id: generateId(),
          name: file.name,
          type: ext,
          category: 'General',
          size: formatFileSize(file.size),
          uploadedAt: new Date().toISOString(),
          clientId: client.id,
        })
      })
      toast.success('Documents uploaded')
    }
    input.click()
  }

  const handleDeleteDocument = (docId: string) => {
    removeDocumentFromClient(client.id, docId)
    toast.info('Document removed')
  }

  // ── Delete client ──

  const handleDeleteClient = () => {
    if (confirm(`Delete client "${client.name}"? This action cannot be undone.`)) {
      deleteClient(client.id)
      toast.success('Client deleted')
      onClose()
    }
  }

  const initials = client.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const catConfig = categoryConfig[client.category || 'individual']
  const refLabel = client.referenceSource ? referenceSourceLabels[client.referenceSource] : null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight truncate">
                {client.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">
                  Added {formatDate(client.createdAt)}
                </span>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", catConfig.color)}>
                  {catConfig.icon} {catConfig.label}
                </Badge>
                {refLabel && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {refLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDeleteClient}
              aria-label="Delete client"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Quick info */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
          {client.phone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              {client.phone}
            </span>
          )}
          {client.email && (
            <span className="flex items-center gap-1">
              <Mail className="size-3" />
              {client.email}
            </span>
          )}
          {client.company && (
            <span className="flex items-center gap-1">
              <Building2 className="size-3" />
              {client.company}
            </span>
          )}
        </div>
      </div>

      {/* Tabbed content */}
      <ScrollArea className="flex-1">
        <Tabs defaultValue="overview" className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1 bg-muted/50">
              <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-background">Overview</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs data-[state=active]:bg-background">Contact</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-background">Activity</TabsTrigger>
              <TabsTrigger value="fees" className="text-xs data-[state=active]:bg-background">Fees</TabsTrigger>
              <TabsTrigger value="dates" className="text-xs data-[state=active]:bg-background">Dates</TabsTrigger>
              <TabsTrigger value="parties" className="text-xs data-[state=active]:bg-background">Parties</TabsTrigger>
              <TabsTrigger value="cases" className="text-xs data-[state=active]:bg-background">Cases</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs data-[state=active]:bg-background">Docs</TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════ Overview Tab ═══════ */}
          <TabsContent value="overview" className="px-6 pb-6 mt-4 space-y-5">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <IndianRupee className="size-4 text-emerald-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-700">₹{feeStats.totalPaid.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-emerald-600">Total Paid</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                <IndianRupee className="size-4 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-700">₹{feeStats.totalPending.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-amber-600">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-sky-50 border border-sky-100">
                <CalendarClock className="size-4 text-sky-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-sky-700">{upcomingDatesCount}</p>
                <p className="text-[11px] text-sky-600">Upcoming Dates</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-violet-50 border border-violet-100">
                <Activity className="size-4 text-violet-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-violet-700">{(client.activities || []).length}</p>
                <p className="text-[11px] text-violet-600">Activities</p>
              </div>
            </div>

            {/* Category & Reference */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={cn("text-xs gap-1.5 border", catConfig.color)}>
                {catConfig.icon} {catConfig.label}
              </Badge>
              {refLabel && (
                <Badge variant="secondary" className="text-xs">
                  Source: {refLabel}
                </Badge>
              )}
              {feeStats.totalOverdue > 0 && (
                <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100 gap-1">
                  <AlertTriangle className="size-3" />
                  ₹{feeStats.totalOverdue.toLocaleString('en-IN')} overdue
                </Badge>
              )}
            </div>

            <Separator />

            {/* Tags */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {(client.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs gap-1">
                    <Tag className="size-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="h-7 w-[100px] text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleAddTag}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</Label>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setEditingNotes(true); setNotesValue(client.notes || '') }}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    className="text-sm min-h-[100px]"
                    placeholder="Add notes about this client..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingNotes(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSaveNotes}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {client.notes || (
                    <span className="italic">No notes yet. Click Edit to add notes.</span>
                  )}
                </p>
              )}
            </div>

            {/* Stats */}
            <Separator />
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{linkedCases.length}</p>
                <p className="text-[11px] text-muted-foreground">Linked Cases</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{(client.documents || []).length}</p>
                <p className="text-[11px] text-muted-foreground">Documents</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{(client.accused || []).length + (client.victims || []).length}</p>
                <p className="text-[11px] text-muted-foreground">Parties</p>
              </div>
            </div>
          </TabsContent>

          {/* ═══════ Contact Tab ═══════ */}
          <TabsContent value="contact" className="px-6 pb-6 mt-4 space-y-5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</Label>
              {!editingContact ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setEditingContact(true)
                    setContactForm({
                      email: client.email || '',
                      phone: client.phone || '',
                      alternatePhone: client.alternatePhone || '',
                      address: client.address || '',
                      company: client.company || '',
                      companyType: client.companyType || '',
                      panNumber: client.panNumber || '',
                      gstNumber: client.gstNumber || '',
                    })
                  }}
                >
                  <Pencil className="size-3" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingContact(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveContact}>
                    <Save className="size-3" /> Save
                  </Button>
                </div>
              )}
            </div>

            {editingContact ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={contactForm.phone}
                      onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Alternate Phone</Label>
                    <Input
                      value={contactForm.alternatePhone}
                      onChange={(e) => setContactForm((p) => ({ ...p, alternatePhone: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="+91 87654 32109"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={contactForm.email}
                    onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Textarea
                    value={contactForm.address}
                    onChange={(e) => setContactForm((p) => ({ ...p, address: e.target.value }))}
                    className="text-sm min-h-[60px]"
                    placeholder="Full address..."
                  />
                </div>

                <Separator />

                {/* Company Details */}
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company & Tax Details</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company Name</Label>
                    <Input
                      value={contactForm.company}
                      onChange={(e) => setContactForm((p) => ({ ...p, company: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company Type</Label>
                    <Input
                      value={contactForm.companyType}
                      onChange={(e) => setContactForm((p) => ({ ...p, companyType: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="Pvt. Ltd., LLP, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">PAN Number</Label>
                    <Input
                      value={contactForm.panNumber}
                      onChange={(e) => setContactForm((p) => ({ ...p, panNumber: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="ABCDE1234F"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">GST Number</Label>
                    <Input
                      value={contactForm.gstNumber}
                      onChange={(e) => setContactForm((p) => ({ ...p, gstNumber: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Contact Items */}
                {client.phone && (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Phone</p>
                      <p className="text-sm text-foreground">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.alternatePhone && (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Alternate Phone</p>
                      <p className="text-sm text-foreground">{client.alternatePhone}</p>
                    </div>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Email</p>
                      <p className="text-sm text-foreground">{client.email}</p>
                    </div>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Address</p>
                      <p className="text-sm text-foreground">{client.address}</p>
                    </div>
                  </div>
                )}

                {/* Company & Tax */}
                {(client.company || client.panNumber || client.gstNumber) && (
                  <>
                    <Separator />
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company & Tax</Label>
                  </>
                )}
                {client.company && (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        Company{client.companyType ? ` (${client.companyType})` : ''}
                      </p>
                      <p className="text-sm text-foreground">{client.company}</p>
                    </div>
                  </div>
                )}
                {client.panNumber && (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <CreditCard className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">PAN</p>
                      <p className="text-sm text-foreground font-mono">{client.panNumber}</p>
                    </div>
                  </div>
                )}
                {client.gstNumber && (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">GST</p>
                      <p className="text-sm text-foreground font-mono">{client.gstNumber}</p>
                    </div>
                  </div>
                )}

                {!client.phone && !client.email && !client.alternatePhone && !client.address && !client.company && !client.panNumber && !client.gstNumber && (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    No contact details available.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ═══════ Activity Tab ═══════ */}
          <TabsContent value="activity" className="px-6 pb-6 mt-4 space-y-4">
            {/* Add Activity */}
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Log New Activity</Label>
              <div className="flex gap-2">
                <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as ClientActivity['type'])}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(activityTypeConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Describe the activity..."
                  value={newActivityDesc}
                  onChange={(e) => setNewActivityDesc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
                  className="h-9 text-sm flex-1"
                />
                <Button size="sm" className="h-9 text-xs gap-1 shrink-0" onClick={handleAddActivity}>
                  <Plus className="size-3.5" /> Log
                </Button>
              </div>
            </div>

            <Separator />

            {/* Activity Timeline */}
            <div className="space-y-2">
              {(client.activities || []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No activities logged yet.
                </p>
              ) : (
                (client.activities || []).map((activity) => {
                  const cfg = activityTypeConfig[activity.type]
                  const IconComp = cfg.icon
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors group"
                    >
                      <div className={cn("flex size-8 items-center justify-center rounded-lg shrink-0 mt-0.5", cfg.color)}>
                        <IconComp className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-foreground">{cfg.label}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDate(activity.date)}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => handleDeleteActivity(activity.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* ═══════ Fees Tab ═══════ */}
          <TabsContent value="fees" className="px-6 pb-6 mt-4 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-base font-bold text-foreground">₹{feeStats.totalFees.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-base font-bold text-emerald-700">₹{feeStats.totalPaid.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-emerald-600">Paid</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-base font-bold text-amber-700">₹{(feeStats.totalPending + feeStats.totalOverdue).toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-amber-600">Due</p>
              </div>
            </div>

            {/* Add Fee */}
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Fee Record</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Description (e.g., Consultation fee)"
                  value={newFeeDesc}
                  onChange={(e) => setNewFeeDesc(e.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  placeholder="Amount (₹)"
                  type="number"
                  value={newFeeAmount}
                  onChange={(e) => setNewFeeAmount(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Select value={newFeeStatus} onValueChange={(v) => setNewFeeStatus(v as ClientFeeRecord['status'])}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                {linkedCases.length > 0 && (
                  <Select value={newFeeCaseId} onValueChange={setNewFeeCaseId}>
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue placeholder="Link to case (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No case</SelectItem>
                      {linkedCases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button size="sm" className="h-9 text-xs gap-1 shrink-0" onClick={handleAddFee}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
            </div>

            <Separator />

            {/* Fee Table */}
            <div className="space-y-2">
              {(client.fees || []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No fee records yet.
                </p>
              ) : (
                (client.fees || []).map((fee) => {
                  const statusCfg = feeStatusConfig[fee.status]
                  const linkedCase = fee.caseId ? cases.find((c) => c.id === fee.caseId) : null
                  return (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{fee.description}</p>
                          <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", statusCfg.color)}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{formatDate(fee.date)}</span>
                          {linkedCase && (
                            <>
                              <span>·</span>
                              <span className="truncate">{linkedCase.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-sm font-bold text-foreground">₹{fee.amount.toLocaleString('en-IN')}</p>
                        <button
                          onClick={() => handleToggleFeeStatus(fee.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Toggle status"
                        >
                          <Edit3 className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteFee(fee.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* ═══════ Important Dates Tab ═══════ */}
          <TabsContent value="dates" className="px-6 pb-6 mt-4 space-y-4">
            {/* Add Date */}
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Important Date</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Title (e.g., Bail hearing)"
                  value={newDateTitle}
                  onChange={(e) => setNewDateTitle(e.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  type="date"
                  value={newDateDate}
                  onChange={(e) => setNewDateDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Select value={newDateType} onValueChange={(v) => setNewDateType(v as ClientImportantDate['type'])}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(importantDateTypeConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {linkedCases.length > 0 && (
                  <Select value={newDateCaseId} onValueChange={setNewDateCaseId}>
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue placeholder="Link to case (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No case</SelectItem>
                      {linkedCases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button size="sm" className="h-9 text-xs gap-1 shrink-0" onClick={handleAddImportantDate}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
            </div>

            <Separator />

            {/* Dates List */}
            <div className="space-y-2">
              {(client.importantDates || []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No important dates added yet.
                </p>
              ) : (
                [...(client.importantDates || [])]
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((dateItem) => {
                    const cfg = importantDateTypeConfig[dateItem.type]
                    const IconComp = cfg.icon
                    const isPast = new Date(dateItem.date) < new Date()
                    const linkedCase = dateItem.caseId ? cases.find((c) => c.id === dateItem.caseId) : null
                    return (
                      <div
                        key={dateItem.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border border-l-4 px-3 py-2.5 group transition-colors",
                          cfg.color,
                          isPast && "opacity-60"
                        )}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-background border shrink-0 mt-0.5">
                            <IconComp className="size-4 text-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{dateItem.title}</p>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{cfg.label}</Badge>
                              {isPast && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Past</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="size-3" />
                                {formatDate(dateItem.date)}
                              </span>
                              {linkedCase && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{linkedCase.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleDeleteImportantDate(dateItem.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )
                  })
              )}
            </div>
          </TabsContent>

          {/* ═══════ Parties Tab ═══════ */}
          <TabsContent value="parties" className="px-6 pb-6 mt-4 space-y-5">
            {/* Accused */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Accused
              </Label>
              <div className="space-y-1.5">
                {(client.accused || []).map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveAccused(name)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add accused name..."
                    value={newAccused}
                    onChange={(e) => setNewAccused(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAccused()}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={handleAddAccused}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Victims */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Victims
              </Label>
              <div className="space-y-1.5">
                {(client.victims || []).map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveVictim(name)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add victim name..."
                    value={newVictim}
                    onChange={(e) => setNewVictim(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddVictim()}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={handleAddVictim}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══════ Cases Tab ═══════ */}
          <TabsContent value="cases" className="px-6 pb-6 mt-4 space-y-4">
            {/* Linked Cases */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Linked Cases ({linkedCases.length})
              </Label>
              {linkedCases.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">
                  No cases linked yet. Link a case below.
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedCases.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.caseType} {c.status && `· ${c.status}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleUnlinkCase(c.id)}
                      >
                        <Unlink className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Link New Case */}
            {unlinkedCases.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Link a Case
                  </Label>
                  <Select onValueChange={handleLinkCase}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select a case to link..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unlinkedCases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title} ({c.caseType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {cases.length === 0 && (
              <div className="text-center py-4">
                <Briefcase className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No cases created yet. Create a case first, then link it here.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ═══════ Documents Tab ═══════ */}
          <TabsContent value="documents" className="px-6 pb-6 mt-4 space-y-4">
            {/* Upload area */}
            <button
              onClick={handleFileUpload}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors py-6 cursor-pointer"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="size-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Upload Document</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, JPG, PNG, etc.</p>
              </div>
            </button>

            {/* Documents list */}
            <div className="space-y-2">
              {(client.documents || []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No documents yet. AI-drafted documents from intake will appear here.
                </p>
              ) : (
                (client.documents || []).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <button
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      onClick={() => {
                        if (doc.content) {
                          setViewingDoc({ title: doc.name, content: doc.content, category: doc.category, createdAt: doc.uploadedAt, docId: doc.id })
                        }
                      }}
                    >
                      <span className="text-lg shrink-0">{doc.type === 'draft' ? '📄' : getDocIcon(doc.type)}</span>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium text-foreground truncate", doc.content && "text-primary hover:underline")}>{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category} {doc.size && `· ${doc.size}`} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.content && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-primary"
                          onClick={() => { if (doc.content) setViewingDoc({ title: doc.name, content: doc.content!, category: doc.category, createdAt: doc.uploadedAt, docId: doc.id }) }}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewer
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
          title={viewingDoc.title}
          content={viewingDoc.content}
          category={viewingDoc.category}
          createdAt={viewingDoc.createdAt}
          docId={viewingDoc.docId}
          clientId={client.id}
          onSaveContent={viewingDoc.docId ? (docId, newContent) => {
            updateClientDocumentContent(client.id, docId, newContent)
          } : undefined}
        />
      )}
    </div>
  )
}

/* ─── Client Card ─── */

function ClientCard({
  client,
  onClick,
}: {
  client: Client
  onClick: () => void
}) {
  const linkedCasesCount = (client.caseIds || []).length
  const docsCount = (client.documents || []).length
  const activitiesCount = (client.activities || []).length

  const feeTotal = useMemo(() => {
    const fees = client.fees || []
    return fees.reduce((s, f) => s + f.amount, 0)
  }, [client.fees])

  const catConfig = categoryConfig[client.category || 'individual']

  const initials = client.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md border-l-4 border-l-primary/40 hover:border-l-primary"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground truncate">{client.name}</h3>
              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border shrink-0", catConfig.color)}>
                {catConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {client.phone}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="size-3" />
                  {client.email}
                </span>
              )}
              {client.company && (
                <span className="flex items-center gap-1 truncate">
                  <Building2 className="size-3" />
                  {client.company}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tags */}
              {(client.tags || []).slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {(client.tags || []).length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{(client.tags || []).length - 2}
                </Badge>
              )}

              {/* Stats */}
              <div className="flex items-center gap-2 ml-auto">
                {feeTotal > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <IndianRupee className="size-3" />
                    {feeTotal.toLocaleString('en-IN')}
                  </span>
                )}
                {activitiesCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-violet-500">
                    <Activity className="size-3" />
                    {activitiesCount}
                  </span>
                )}
                {linkedCasesCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Briefcase className="size-3" />
                    {linkedCasesCount}
                  </span>
                )}
                {docsCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <FileText className="size-3" />
                    {docsCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Main Clients View ─── */

const ITEMS_PER_PAGE = 8

export default function ClientsView() {
  const clients = useClientsStore((s) => s.clients)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortType>('date')
  const [page, setPage] = useState(1)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  const filtered = useMemo(() => {
    let result = [...clients]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.alternatePhone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.panNumber?.toLowerCase().includes(q) ||
          c.gstNumber?.toLowerCase().includes(q) ||
          (c.accused || []).some((a) => a.toLowerCase().includes(q)) ||
          (c.victims || []).some((v) => v.toLowerCase().includes(q)) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    }

    // Sort
    switch (sort) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'date':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'cases':
        result.sort((a, b) => (b.caseIds?.length || 0) - (a.caseIds?.length || 0))
        break
    }

    return result
  }, [clients, search, sort])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleClientClick = (client: Client) => {
    setSelectedClient(client)
    setDetailSheetOpen(true)
  }

  const handleCloseDetail = () => {
    setDetailSheetOpen(false)
    setSelectedClient(null)
  }

  return (
    <motion.div
      className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Clients
              <Badge variant="secondary" className="text-xs font-semibold">
                {filtered.length}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Manage your clients, fees, activities, and linked cases</p>
          </div>
        </div>
        <Button className="gap-2 self-start" onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="size-4" />
          Add Client
        </Button>
      </motion.div>

      {/* ── Search & Sort ── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email, company, PAN..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Select value={sort} onValueChange={(v) => { setSort(v as SortType); setPage(1) }}>
            <SelectTrigger size="sm" className="w-[150px] h-8 text-xs">
              <ArrowUpDown className="size-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Recently Added</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="cases">Most Cases</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ── Client List ── */}
      <motion.div variants={containerVariants} className="space-y-3">
        <AnimatePresence mode="popLayout">
          {paginated.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              {clients.length === 0 ? (
                <>
                  <Users className="size-12 text-muted-foreground mb-4" />
                  <h3 className="text-base font-semibold text-foreground">No Clients Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Add your first client to start managing their legal matters, documents, and case links.
                  </p>
                  <Button className="mt-4 gap-2" onClick={() => setAddDialogOpen(true)}>
                    <UserPlus className="size-4" />
                    Add Your First Client
                  </Button>
                </>
              ) : (
                <>
                  <Search className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No clients match your search</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => { setSearch(''); setPage(1) }}
                  >
                    Clear Search
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            paginated.map((client) => (
              <motion.div
                key={client.id}
                variants={itemVariants}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <ClientCard client={client} onClick={() => handleClientClick(client)} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <motion.div variants={itemVariants} className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={page === p ? 'default' : 'outline'}
                size="icon"
                className="size-8 text-xs"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Add Client Dialog ── */}
      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* ── Client Detail Sheet (Mobile) ── */}
      {selectedClient && (
        <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[520px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Client Details</SheetTitle>
              <SheetDescription>View and manage client information</SheetDescription>
            </SheetHeader>
            <ClientDetailPanel client={selectedClient} onClose={handleCloseDetail} />
          </SheetContent>
        </Sheet>
      )}
    </motion.div>
  )
}
