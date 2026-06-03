import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ViewType = 
  | 'dashboard' 
  | 'cases' 
  | 'case-detail' 
  | 'intake' 
  | 'drafting' 
  | 'documents' 
  | 'research' 
  | 'timeline' 
  | 'billing' 
  | 'clients'
  | 'litigation' 
  | 'defense-builder' 
  | 'argument-analyzer' 
  | 'execution'
  | 'civil-original'
  | 'criminal'
  | 'family'
  | 'pricing' 
  | 'settings'

export interface CaseItem {
  id: string
  caseNumber?: string
  title: string
  description?: string
  caseType: string
  subType?: string
  status: string
  priority: string
  jurisdiction?: string
  courtName?: string
  judgeName?: string
  filingDate?: string
  nextHearing?: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  // Detailed case fields (populated from AI intake extraction)
  accusedName?: string
  accusedPhone?: string
  accusedEmail?: string
  accusedAddress?: string
  victimNames?: string[]
  opposingParty?: string
  opposingPartyPhone?: string
  opposingPartyEmail?: string
  opposingPartyAddress?: string
  clientAdvocate?: string
  opposingAdvocate?: string
  firNumber?: string
  policeStation?: string
  crrNumber?: string
  causeOfAction?: string
  reliefSought?: string
  underSections?: string[]
  opposingCounsel?: string
  tasksCount?: number
  documentsCount?: number
  upcomingEvents?: number
  aiInsights?: string
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  eventType: string
  eventDate: string
  isCompleted: boolean
  isMilestone: boolean
  reminderSet: boolean
}

export interface TaskItem {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  assignee?: string
  taskType?: string
}

export interface DocumentItem {
  id: string
  name: string
  type: string
  category: string
  content?: string
  summary?: string
  metadata?: string
  caseId?: string
  createdAt: string
}

export interface InvoiceItem {
  id: string
  invoiceNumber: string
  description?: string
  amount: number
  gstAmount: number
  totalAmount: number
  status: string
  issuedDate: string
  dueDate: string
  paidDate?: string
  caseTitle?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  module?: string
}

/* ─── Execution Module Types ─── */

export interface ExecutionAsset {
  id: string
  type: 'IMMOVABLE' | 'MOVABLE' | 'SALARY' | 'BANK' | 'GARNISHEE'
  description: string
  valueEstimate?: string
  address?: string
  employerName?: string
  bankName?: string
  accountNumber?: string
}

export interface ExecutionDraftDocument {
  id: string
  docType: 'EP' | 'EA' | 'IA_CIVIL_ARREST' | 'IA_ATTACHMENT' | 'SCHEDULE' | 'MEMO'
  title: string
  content: string
  keyPoints?: string[]
  warnings?: string[]
  version: number
  createdAt: string
}

export interface ExecutionMatter {
  id: string
  caseId?: string
  decreeDate: string
  decreeType: string
  decreeAmount: string
  interestRate?: string
  interestFrom?: string
  interestTo?: string
  costs?: string
  courtName: string
  parties: { plaintiff: string; defendant: string; plaintiffCounsel?: string; defendantCounsel?: string }
 modes: string[]
 filedOn?: string
  limitationLastDate?: string
  status: 'DRAFT' | 'PENDING' | 'ALLOWED' | 'DISMISSED' | 'PARTLY_SATISFIED' | 'FULLY_SATISFIED'
  amountPaid?: string
  pendingAmount?: string
  executionCourt?: string
  condonationReason?: string
  assets: ExecutionAsset[]
  documents: ExecutionDraftDocument[]
  createdAt: string
  updatedAt: string
}

/* ─── Civil Original Side Types ─── */

export interface Issue {
  id: string
  issueNumber: number
  issueText: string
  type?: 'question_of_law' | 'question_of_fact' | 'mixed'
}

export interface EvidenceItem {
  id: string
  exhibitNumber: string
  description: string
  type: 'DOCUMENT' | 'ORAL'
  gist?: string
}

export interface CivilDraftDocument {
  id: string
  docType: 'PLAINT' | 'WRITTEN_STATEMENT' | 'IA_INJUNCTION' | 'WRITTEN_ARGUMENTS' | 'AFFIDAVIT'
  title: string
  content: string
  paraReplies?: { paraNumber: number; plainText: string; stance: string; replyDraft: string }[]
 preliminarySubmissions?: string[]
 issueArguments?: { issueNumber: number; heading: string; argumentDraft: string }[]
 keyPoints?: string[]
  warnings?: string[]
  version: number
  createdAt: string
}

export interface MatterFacts {
  parties: { name: string; address: string; role: 'plaintiff' | 'defendant'; counsel?: string }[]
  properties?: { description: string; surveyNumber?: string; address?: string }[]
  contracts?: { date: string; amount: string; terms: string; breach: string }[]
  events: { date: string; description: string }[]
  payments?: { date: string; amount: string; purpose: string }[]
  reliefs: string[]
  causeOfActionDate: string
}

export interface CivilMatter {
  id: string
  type: 'SUIT' | 'OS'
  subject: 'RECOVERY' | 'SPECIFIC_PERFORMANCE' | 'INJUNCTION' | 'DECLARATION' | 'POSSESSION' | 'PARTITION' | 'OTHER'
  stage: 'DRAFT' | 'PLAINT_FILED' | 'WS_FILED' | 'ISSUES_FRAMED' | 'EVIDENCE' | 'ARGUMENTS' | 'HEARING' | 'DECIDED'
  courtName: string
  jurisdiction: string
  valuation?: { suitValue: string; courtFeePaid: string }
  facts: MatterFacts
  documents: CivilDraftDocument[]
  issues: Issue[]
  evidence: EvidenceItem[]
  createdAt: string
  updatedAt: string
}

/* ─── User-scoped Storage Adapter ─── */

// No uid-scoped storage — uses plain localStorage with fixed keys

interface AppState {
  // Navigation
  currentView: ViewType
  selectedCaseId: string | null
  setCurrentView: (view: ViewType) => void
  setSelectedCaseId: (id: string | null) => void

  // Data
  cases: CaseItem[]
  setCases: (cases: CaseItem[]) => void
  addCase: (caseItem: CaseItem) => void
  updateCase: (id: string, updates: Partial<CaseItem>) => void

  // Timeline
  timelineEvents: TimelineEvent[]
  setTimelineEvents: (events: TimelineEvent[]) => void
  addTimelineEvent: (event: TimelineEvent) => void

  // Tasks
  tasks: TaskItem[]
  setTasks: (tasks: TaskItem[]) => void
  addTask: (task: TaskItem) => void
  updateTask: (id: string, updates: Partial<TaskItem>) => void

  // Documents
  documents: DocumentItem[]
  setDocuments: (docs: DocumentItem[]) => void
  addDocument: (doc: DocumentItem) => void
  updateDocument: (id: string, updates: Partial<DocumentItem>) => void

  // Invoices
  invoices: InvoiceItem[]
  setInvoices: (invoices: InvoiceItem[]) => void

  // Chat
  chatMessages: ChatMessage[]
  addChatMessage: (msg: ChatMessage) => void
  clearChat: () => void

  // Execution Module
  executionMatters: ExecutionMatter[]
  setExecutionMatters: (matters: ExecutionMatter[]) => void
  addExecutionMatter: (matter: ExecutionMatter) => void
  updateExecutionMatter: (id: string, updates: Partial<ExecutionMatter>) => void

  // Civil Module
  civilMatters: CivilMatter[]
  setCivilMatters: (matters: CivilMatter[]) => void
  addCivilMatter: (matter: CivilMatter) => void
  updateCivilMatter: (id: string, updates: Partial<CivilMatter>) => void

  // AI
  isAILoading: boolean
  setIsAILoading: (loading: boolean) => void
  aiSuggestions: string[]
  setAISuggestions: (suggestions: string[]) => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  commandBarOpen: boolean
  setCommandBarOpen: (open: boolean) => void

  // User data management
  _activeUid: string | null
  setActiveUid: (uid: string | null) => void
  clearAllData: () => void

  // Firestore data loading state
  dataLoaded: boolean
  setDataLoaded: (loaded: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentView: 'dashboard',
      selectedCaseId: null,
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedCaseId: (id) => set({ selectedCaseId: id }),

      // Data
      cases: [],
      setCases: (cases) => set({ cases }),
      addCase: (caseItem) => { set((state) => ({ cases: [caseItem, ...state.cases] })); debouncedSync(); },
      updateCase: (id, updates) => { set((state) => ({
        cases: state.cases.map(c => c.id === id ? { ...c, ...updates } : c)
      })); debouncedSync(); },

      // Timeline
      timelineEvents: [],
      setTimelineEvents: (events) => set({ timelineEvents: events }),
      addTimelineEvent: (event) => { set((state) => ({
        timelineEvents: [...state.timelineEvents, event]
      })); debouncedSync(); },

      // Tasks
      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => { set((state) => ({ tasks: [task, ...state.tasks] })); debouncedSync(); },
      updateTask: (id, updates) => { set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })); debouncedSync(); },

      // Documents
      documents: [],
      setDocuments: (docs) => set({ documents: docs }),
      addDocument: (doc) => { set((state) => ({ documents: [doc, ...state.documents] })); debouncedSync(); },
      updateDocument: (id, updates) => {
        set((state) => ({
          documents: state.documents.map(d => d.id === id ? { ...d, ...updates } : d)
        }))
        // Immediately sync document content changes to Firestore (not debounced)
        // to ensure edits are never lost on logout/navigation
        syncToFirestore()
      },

      // Invoices
      invoices: [],
      setInvoices: (invoices) => set({ invoices }),

      // Chat
      chatMessages: [],
      addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      clearChat: () => set({ chatMessages: [] }),

      // Execution Module
      executionMatters: [],
      setExecutionMatters: (matters) => set({ executionMatters: matters }),
      addExecutionMatter: (matter) => set((state) => ({ executionMatters: [matter, ...state.executionMatters] })),
      updateExecutionMatter: (id, updates) => set((state) => ({
        executionMatters: state.executionMatters.map(m => m.id === id ? { ...m, ...updates } : m)
      })),

      // Civil Module
      civilMatters: [],
      setCivilMatters: (matters) => set({ civilMatters: matters }),
      addCivilMatter: (matter) => set((state) => ({ civilMatters: [matter, ...state.civilMatters] })),
      updateCivilMatter: (id, updates) => set((state) => ({
        civilMatters: state.civilMatters.map(m => m.id === id ? { ...m, ...updates } : m)
      })),

      // AI
      isAILoading: false,
      setIsAILoading: (loading) => set({ isAILoading: loading }),
      aiSuggestions: [],
      setAISuggestions: (suggestions) => set({ aiSuggestions: suggestions }),

      // UI
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      commandBarOpen: false,
      setCommandBarOpen: (open) => set({ commandBarOpen: open }),

      // User data management
      _activeUid: null,
      setActiveUid: (uid) => set({ _activeUid: uid }),
      clearAllData: () => set({
        cases: [],
        timelineEvents: [],
        tasks: [],
        documents: [],
        invoices: [],
        chatMessages: [],
        executionMatters: [],
        civilMatters: [],
        dataLoaded: false,
      }),

      // Firestore data loading state
      dataLoaded: false,
      setDataLoaded: (loaded) => set({ dataLoaded: loaded }),
    }),
    {
      name: 'aidraft_app',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cases: state.cases,
        timelineEvents: state.timelineEvents,
        tasks: state.tasks,
        documents: state.documents,
        invoices: state.invoices,
        chatMessages: state.chatMessages,
        executionMatters: state.executionMatters,
        civilMatters: state.civilMatters,
        _activeUid: state._activeUid,
        // NOTE: Do NOT persist dataLoaded — it must always start as false
        // to prevent hydration mismatch (error #310) on hard refresh.
        // dataLoaded is set to true only after loadFromFirestore() completes.
      }),
      onRehydrateStorage: () => (state) => {
        // After hydration, sanitize all data to prevent React rendering errors
        // (e.g., Firestore Timestamps serialized as objects in localStorage)
        if (state) {
          try {
            if (state.cases?.length) state.cases = sanitizeCases(state.cases)
            if (state.timelineEvents?.length) state.timelineEvents = sanitizeTimeline(state.timelineEvents)
            if (state.tasks?.length) state.tasks = sanitizeTasks(state.tasks)
            if (state.documents?.length) state.documents = sanitizeDocuments(state.documents)
            if (state.invoices?.length) state.invoices = sanitizeInvoices(state.invoices)
          } catch (e) {
            console.error('[app-store] Rehydration sanitization error:', e)
          }
          // CRITICAL: After Zustand persist hydration, force dataLoaded back to false.
          // This ensures the dashboard shows its loading skeleton until loadFromFirestore()
          // completes, preventing React error #310 (hydration mismatch).
          // Without this, dataLoaded could be true from a prior session's runtime state,
          // causing the dashboard to render real data during hydration while the
          // pre-rendered HTML shows the skeleton → mismatch.
          state.dataLoaded = false
        }
      },
    }
  )
)



/* ─── Firestore Sync ─── */

// Firestore is the source of truth. On load, we REPLACE local with remote data.
// On mutation, we sync to Firestore after a debounce.
// This ensures all browsers/devices see the same data.

/**
 * Sanitize data loaded from Firestore to prevent React rendering errors.
 * Ensures all fields expected to be primitives are primitives (not objects/undefined).
 * Firestore Timestamps are converted to ISO strings.
 */
/** Convert Firestore Timestamp-like objects to ISO strings */
function safeStr(val: unknown): string | undefined {
  if (val == null) return undefined
  if (typeof val === 'string') return val
  if (typeof val === 'number') return new Date(val).toISOString() || String(val)
  if (typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    // Firestore Timestamp serialized as { _seconds, _nanoseconds } or { seconds, nanoseconds }
    const obj = val as Record<string, unknown>
    const secs = obj._seconds ?? obj.seconds
    if (typeof secs === 'number') {
      const ms = (obj._nanoseconds ?? obj.nanoseconds ?? 0) as number / 1e6
      return new Date((secs as number) * 1000 + ms).toISOString()
    }
    // Date object
    if (val instanceof Date) return val.toISOString()
    // Fallback
    return undefined
  }
  return String(val)
}

function sanitizeCases(cases: any[]): CaseItem[] {
  return cases.map((c: any) => ({
    ...c,
    id: String(c.id || ''),
    title: String(c.title || ''),
    caseType: String(c.caseType || ''),
    status: String(c.status || ''),
    priority: String(c.priority || 'Medium'),
    jurisdiction: safeStr(c.jurisdiction),
    courtName: safeStr(c.courtName),
    judgeName: safeStr(c.judgeName),
    caseNumber: safeStr(c.caseNumber),
    nextHearing: safeStr(c.nextHearing),
    clientName: safeStr(c.clientName),
    clientEmail: safeStr(c.clientEmail),
    clientPhone: safeStr(c.clientPhone),
    filingDate: safeStr(c.filingDate),
    description: safeStr(c.description),
    accusedName: safeStr(c.accusedName),
    accusedPhone: safeStr(c.accusedPhone),
    accusedEmail: safeStr(c.accusedEmail),
    accusedAddress: safeStr(c.accusedAddress),
    opposingParty: safeStr(c.opposingParty),
    opposingPartyPhone: safeStr(c.opposingPartyPhone),
    opposingPartyEmail: safeStr(c.opposingPartyEmail),
    opposingPartyAddress: safeStr(c.opposingPartyAddress),
    clientAdvocate: safeStr(c.clientAdvocate),
    opposingAdvocate: safeStr(c.opposingAdvocate),
    opposingCounsel: safeStr(c.opposingCounsel),
    firNumber: safeStr(c.firNumber),
    policeStation: safeStr(c.policeStation),
    crrNumber: safeStr(c.crrNumber),
    causeOfAction: safeStr(c.causeOfAction),
    reliefSought: safeStr(c.reliefSought),
    createdAt: safeStr(c.createdAt) || new Date().toISOString(),
    updatedAt: safeStr(c.updatedAt) || new Date().toISOString(),
    // Arrays: filter to ensure strings only
    underSections: Array.isArray(c.underSections) ? c.underSections.map(String) : undefined,
    victimNames: Array.isArray(c.victimNames) ? c.victimNames.map(String) : undefined,
  }))
}

function sanitizeTimeline(events: any[]): TimelineEvent[] {
  return events.map((e: any) => ({
    ...e,
    id: String(e.id || ''),
    title: String(e.title || ''),
    description: safeStr(e.description),
    eventType: String(e.eventType || ''),
    eventDate: safeStr(e.eventDate) || '',
    isCompleted: Boolean(e.isCompleted),
    isMilestone: Boolean(e.isMilestone),
    reminderSet: Boolean(e.reminderSet),
  }))
}

function sanitizeTasks(tasks: any[]): TaskItem[] {
  return tasks.map((t: any) => ({
    ...t,
    id: String(t.id || ''),
    title: String(t.title || ''),
    status: String(t.status || 'Pending'),
    priority: String(t.priority || 'Medium'),
    dueDate: safeStr(t.dueDate),
    description: safeStr(t.description),
    assignee: safeStr(t.assignee),
    taskType: safeStr(t.taskType),
  }))
}

function sanitizeDocuments(docs: any[]): DocumentItem[] {
  return docs.map((d: any) => ({
    ...d,
    id: String(d.id || ''),
    name: String(d.name || ''),
    type: String(d.type || ''),
    category: String(d.category || ''),
    content: d.content != null ? String(d.content) : '',
    summary: safeStr(d.summary),
    metadata: safeStr(d.metadata),
    createdAt: safeStr(d.createdAt) || new Date().toISOString(),
  }))
}

function sanitizeInvoices(invoices: any[]): InvoiceItem[] {
  return invoices.map((i: any) => ({
    ...i,
    id: String(i.id || ''),
    invoiceNumber: String(i.invoiceNumber || ''),
    status: String(i.status || 'Pending'),
    amount: typeof i.amount === 'number' ? i.amount : 0,
    gstAmount: typeof i.gstAmount === 'number' ? i.gstAmount : 0,
    totalAmount: typeof i.totalAmount === 'number' ? i.totalAmount : 0,
    issuedDate: safeStr(i.issuedDate) || '',
    dueDate: safeStr(i.dueDate) || '',
    paidDate: safeStr(i.paidDate),
    description: safeStr(i.description),
    caseTitle: safeStr(i.caseTitle),
  }))
}

let _syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let _syncInProgress = false

export async function syncToFirestore(): Promise<boolean> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token || _syncInProgress) return false

  _syncInProgress = true
  try {
    const state = useAppStore.getState()
    const res = await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        action: 'save',
        cases: state.cases,
        documents: state.documents,
        tasks: state.tasks,
        timelineEvents: state.timelineEvents,
        invoices: state.invoices,
      }),
    })
    if (!res.ok) {
      console.error('[app-store] Sync HTTP error:', res.status)
      _syncInProgress = false
      return false
    }
    console.log('[app-store] Synced to Firestore')
    _syncInProgress = false
    return true
  } catch (err) {
    console.error('[app-store] Sync error:', err)
    _syncInProgress = false
    return false
  }
}

function debouncedSync(): void {
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer)
  _syncDebounceTimer = setTimeout(syncToFirestore, 2000)
}

/** Flush pending sync immediately — call before logout */
export async function flushSyncToFirestore(): Promise<void> {
  if (_syncDebounceTimer) {
    clearTimeout(_syncDebounceTimer)
    _syncDebounceTimer = null
  }
  await syncToFirestore()
}

export async function loadFromFirestore(retryCount = 0): Promise<void> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token) {
    useAppStore.getState().setDataLoaded(true)
    return
  }

  let needsMigration = false

  try {
    const res = await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'load' }),
    })

    if (!res.ok) {
      console.error('[app-store] Firestore load HTTP error:', res.status)
      // Retry once on transient error, but NOT on 401 (auth failure)
      if (res.status === 401 || retryCount >= 1) {
        // Don't retry auth failures or after 1 retry
        useAppStore.getState().setDataLoaded(true)
        return
      }
      await new Promise(r => setTimeout(r, 1500))
      return loadFromFirestore(retryCount + 1)
    }

    const data = await res.json()
    if (data.success && data.data) {
      const d = data.data
      const state = useAppStore.getState()

      if (d.cases && d.cases.length > 0) {
        state.setCases(sanitizeCases(d.cases))
      } else if (state.cases.length > 0) {
        // MIGRATION: local has cases but Firestore doesn't — push them up
        console.log('[app-store] Migrating', state.cases.length, 'local cases to Firestore')
        needsMigration = true
      }

      if (d.documents && d.documents.length > 0) {
        state.setDocuments(sanitizeDocuments(d.documents))
      } else if (state.documents.length > 0) {
        needsMigration = true
      }

      if (d.tasks && d.tasks.length > 0) {
        state.setTasks(sanitizeTasks(d.tasks))
      } else if (state.tasks.length > 0) {
        needsMigration = true
      }

      if (d.timelineEvents && d.timelineEvents.length > 0) {
        state.setTimelineEvents(sanitizeTimeline(d.timelineEvents))
      } else if (state.timelineEvents.length > 0) {
        needsMigration = true
      }

      if (d.invoices && d.invoices.length > 0) {
        state.setInvoices(sanitizeInvoices(d.invoices))
      } else if (state.invoices.length > 0) {
        needsMigration = true
      }

      console.log('[app-store] Loaded data from Firestore:', {
        cases: d.cases?.length || 0,
        documents: d.documents?.length || 0,
        tasks: d.tasks?.length || 0,
      })

      // If we detected local-only data, sync it to Firestore now
      if (needsMigration) {
        console.log('[app-store] Running migration — syncing local data to Firestore')
        await syncToFirestore()
      }
    }
  } catch (err) {
    console.error('[app-store] Firestore load error:', err)
  }

  // ALWAYS mark data as loaded, even on failure — prevents infinite loading
  useAppStore.getState().setDataLoaded(true)
}
