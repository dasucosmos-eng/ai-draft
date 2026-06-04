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

/* ─── Sync status for UI feedback ─── */
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

/* ─── User-scoped Storage Adapter ─── */

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

  // Sync status — exposed to UI for user feedback
  syncStatus: SyncStatus
  lastSyncError: string | null
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
        // Immediately sync document content changes (not debounced)
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

      // Sync status for UI
      syncStatus: 'idle' as SyncStatus,
      lastSyncError: null as string | null,
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
        // Do NOT persist: dataLoaded, syncStatus, lastSyncError
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const currentUid = localStorage.getItem('aidraft_current_uid')
          if (state._activeUid && currentUid && state._activeUid !== currentUid) {
            console.warn(
              `[app-store] UID mismatch! localStorage uid=${state._activeUid} vs current uid=${currentUid}. Wiping stale data.`
            )
            state.cases = []
            state.timelineEvents = []
            state.tasks = []
            state.documents = []
            state.invoices = []
            state.chatMessages = []
            state.executionMatters = []
            state.civilMatters = []
            state._activeUid = currentUid
          } else {
            try {
              if (state.cases?.length) state.cases = sanitizeCases(state.cases)
              if (state.timelineEvents?.length) state.timelineEvents = sanitizeTimeline(state.timelineEvents)
              if (state.tasks?.length) state.tasks = sanitizeTasks(state.tasks)
              if (state.documents?.length) state.documents = sanitizeDocuments(state.documents)
              if (state.invoices?.length) state.invoices = sanitizeInvoices(state.invoices)
            } catch (e) {
              console.error('[app-store] Rehydration sanitization error:', e)
            }
          }
          state.dataLoaded = false
        }
      },
    }
  )
)



/* ═══════════════════════════════════════════════════════════════════
   Firestore Sync — SIMPLIFIED & ROBUST
   ═══════════════════════════════════════════════════════════════════
   
   Design principles:
   1. Firestore is the source of truth
   2. On login: load everything from Firestore → populate stores
   3. On mutation: debounce (3s) → save everything to Firestore
   4. On tab hide/unload: flush immediately (fetch keepalive, NOT sendBeacon)
   5. On tab visible: check for unsynced changes and sync
   6. Errors are VISIBLE to the user via syncStatus
   7. Manual "save now" available via forceSaveToFirestore()
   
   Key fix: BEFORE this rewrite, beforeunload used navigator.sendBeacon
   which doesn't reliably set Content-Type: application/json on all
   browsers. Firebase Cloud Functions' body-parser then failed to
   parse req.body.action → returned "Unknown action: undefined" → 
   data silently lost. Now we use fetch with keepalive:true instead.
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Sanitization helpers ─── */

function safeStr(val: unknown): string | undefined {
  if (val == null) return undefined
  if (typeof val === 'string') return val
  if (typeof val === 'number') return new Date(val).toISOString() || String(val)
  if (typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    const secs = obj._seconds ?? obj.seconds
    if (typeof secs === 'number') {
      const ms = (obj._nanoseconds ?? obj.nanoseconds ?? 0) as number / 1e6
      return new Date((secs as number) * 1000 + ms).toISOString()
    }
    if (val instanceof Date) return val.toISOString()
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

/* ─── Sync State ─── */

let _syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
let _syncInProgress = false
let _lastSyncedHash = ''
let _dataInitialized = false // True ONLY after loadFromFirestore completes
let _unloadRegistered = false

/** Read clients from localStorage directly — avoids circular import */
function getClientsFromLocalStorage(): unknown[] {
  try {
    const raw = localStorage.getItem('aidraft_clients')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const clients = parsed?.state?.clients || parsed?.clients || []
    return Array.isArray(clients) ? clients : []
  } catch { return [] }
}

/** Read profile from localStorage directly — avoids circular import */
function getProfileFromLocalStorage(): unknown {
  try {
    const raw = localStorage.getItem('aidraft_profile')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.profile || parsed?.profile || null
  } catch { return null }
}

/** Build the full save payload from current store state */
function buildSavePayload(): Record<string, unknown> {
  const state = useAppStore.getState()
  const clients = getClientsFromLocalStorage()
  const profile = getProfileFromLocalStorage()
  return {
    action: 'save',
    cases: state.cases,
    documents: state.documents,
    tasks: state.tasks,
    timelineEvents: state.timelineEvents,
    invoices: state.invoices,
    clients,
    ...(profile ? { profile } : {}),
  }
}

/** Compute a hash of all syncable data to detect unsynced changes */
function computeDataHash(): string {
  try {
    const state = useAppStore.getState()
    const token = localStorage.getItem('aidraft_auth_token')
    if (!token) return ''
    const clients = getClientsFromLocalStorage()
    const profile = getProfileFromLocalStorage()
    return JSON.stringify({
      c: state.cases.length,
      d: state.documents.length,
      t: state.tasks.length,
      te: state.timelineEvents.length,
      i: state.invoices.length,
      cl: clients.length,
      cU: state.cases[0]?.updatedAt || '',
      dU: state.documents[0]?.updatedAt || '',
      tU: state.tasks[0]?.updatedAt || '',
      clU: clients[0]?.updatedAt || '',
      pC: profile?.isComplete || false,
      pN: profile?.fullName || '',
    })
  } catch { return '' }
}

/** Update the sync status in the store */
function setSyncStatus(status: SyncStatus, error?: string): void {
  useAppStore.setState({
    syncStatus: status,
    lastSyncError: error || null,
  })
  // Auto-clear 'saved' and 'error' status after 4 seconds
  if (status === 'saved' || status === 'error') {
    setTimeout(() => {
      if (useAppStore.getState().syncStatus === status) {
        setSyncStatus('idle')
      }
    }, 4000)
  }
}

/**
 * Core sync function — sends ALL user data to Firestore.
 * Uses fetch (NOT sendBeacon) for reliable Content-Type handling.
 * Retries up to 5 times with exponential backoff.
 * Updates syncStatus in the store so the UI can show feedback.
 */
export async function syncToFirestore(retryCount = 0): Promise<boolean> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token) return false
  if (_syncInProgress) return false
  if (!_dataInitialized) {
    console.warn('[sync] BLOCKED: data not initialized yet (loadFromFirestore not completed)')
    return false
  }

  _syncInProgress = true
  setSyncStatus('saving')

  try {
    const payload = buildSavePayload()
    const state = useAppStore.getState()

    console.log('[sync] Saving to Firestore:', {
      cases: state.cases.length,
      docs: state.documents.length,
      tasks: state.tasks.length,
      clients: Array.isArray(getClientsFromLocalStorage()) ? getClientsFromLocalStorage().length : 0,
      hasProfile: !!getProfileFromLocalStorage(),
      attempt: retryCount + 1,
    })

    const res = await fetch('/api/user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    // Read response body for debugging
    let responseBody: any = null
    try { responseBody = await res.json() } catch { /* ignore parse error */ }

    if (!res.ok) {
      const errMsg = `HTTP ${res.status}: ${responseBody?.error || 'Unknown'}`
      console.error('[sync] FAILED:', errMsg, responseBody)

      _syncInProgress = false

      if (retryCount < 5) {
        const delay = Math.pow(2, retryCount) * 1000
        console.warn(`[sync] Retrying in ${delay}ms (attempt ${retryCount + 2}/6)`)
        await new Promise(r => setTimeout(r, delay))
        return syncToFirestore(retryCount + 1)
      }

      // All retries exhausted — show error to user
      setSyncStatus('error', `Save failed: ${errMsg}`)
      return false
    }

    // Check for server-side warning (anti-data-loss block)
    if (responseBody?.warning) {
      console.warn('[sync] Server warning:', responseBody.warning)
    }

    _lastSyncedHash = computeDataHash()
    console.log('[sync] SUCCESS — data saved to Firestore')
    setSyncStatus('saved')
    _syncInProgress = false
    return true
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[sync] ERROR:', errMsg)

    _syncInProgress = false

    if (retryCount < 5) {
      const delay = Math.pow(2, retryCount) * 1000
      console.warn(`[sync] Retrying in ${delay}ms (attempt ${retryCount + 2}/6)`)
      await new Promise(r => setTimeout(r, delay))
      return syncToFirestore(retryCount + 1)
    }

    setSyncStatus('error', `Network error: ${errMsg}`)
    return false
  }
}

/** Debounced sync — 3 second delay to batch rapid edits */
function debouncedSync(): void {
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer)
  _syncDebounceTimer = setTimeout(() => {
    _syncDebounceTimer = null
    syncToFirestore().catch(() => {})
  }, 3000)
}

/** Flush any pending debounced sync + sync immediately */
export async function flushSyncToFirestore(): Promise<void> {
  if (_syncDebounceTimer) {
    clearTimeout(_syncDebounceTimer)
    _syncDebounceTimer = null
  }
  await syncToFirestore()
}

/**
 * Force save — for manual "Save Now" button.
 * Always syncs regardless of hash or initialization state.
 */
export async function forceSaveToFirestore(): Promise<boolean> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token) {
    setSyncStatus('error', 'Not logged in')
    return false
  }

  // Force initialization so the guard doesn't block us
  _dataInitialized = true

  _syncInProgress = false // Reset to allow this sync
  return syncToFirestore()
}

/**
 * Register unload/visibility handlers.
 * CRITICAL FIX: Uses fetch with keepalive:true instead of navigator.sendBeacon.
 * sendBeacon doesn't reliably set Content-Type on all browsers, causing
 * the Firebase Cloud Function to fail parsing req.body → "Unknown action".
 * fetch with keepalive:true properly sets Content-Type: application/json.
 */
export function setupSyncOnUnload(): void {
  if (_unloadRegistered || typeof window === 'undefined') return
  _unloadRegistered = true

  // BEFOREUNLOAD: flush via fetch+keepalive (NOT sendBeacon)
  const handler = () => {
    const token = localStorage.getItem('aidraft_auth_token')
    if (!token || !_dataInitialized) return

    const currentHash = computeDataHash()
    if (currentHash === _lastSyncedHash) return // nothing to save

    const payload = buildSavePayload()
    // Use fetch with keepalive — reliable Content-Type header
    fetch('/api/user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      keepalive: true, // survive page unload
    }).catch((err) => {
      console.error('[sync] beforeunload fetch failed:', err)
    })

    console.log('[sync] beforeunload: flush initiated')
    if (_syncDebounceTimer) {
      clearTimeout(_syncDebounceTimer)
      _syncDebounceTimer = null
    }
  }
  window.addEventListener('beforeunload', handler)

  // VISIBILITYCHANGE: sync on hidden, check on visible
  const visibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      // Flush debounced sync immediately
      if (_syncDebounceTimer) {
        clearTimeout(_syncDebounceTimer)
        _syncDebounceTimer = null
      }
      // Sync with keepalive (survives if tab is closed while hidden)
      const token = localStorage.getItem('aidraft_auth_token')
      if (token && _dataInitialized) {
        const currentHash = computeDataHash()
        if (currentHash !== _lastSyncedHash) {
          const payload = buildSavePayload()
          fetch('/api/user-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {})
        }
      }
    } else if (document.visibilityState === 'visible') {
      const token = localStorage.getItem('aidraft_auth_token')
      if (token && _dataInitialized) {
        const currentHash = computeDataHash()
        if (currentHash !== _lastSyncedHash && !_syncInProgress) {
          console.log('[sync] Tab visible: syncing unsynced data')
          syncToFirestore().catch(() => {})
        }
      }
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)
}

/**
 * Load ALL user data from Firestore and populate stores.
 * This is the SINGLE entry point for loading data after auth.
 */
export async function loadFromFirestore(retryCount = 0): Promise<void> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token) {
    useAppStore.getState().setDataLoaded(true)
    return
  }

  const currentUid = localStorage.getItem('aidraft_current_uid')
  if (currentUid) {
    useAppStore.getState().setActiveUid(currentUid)
  }

  let localHasDataToMigrate = false
  const localState = useAppStore.getState()

  if (localState.cases.length > 0 ||
      localState.documents.length > 0 ||
      localState.tasks.length > 0 ||
      localState.timelineEvents.length > 0 ||
      localState.invoices.length > 0) {
    localHasDataToMigrate = true
  }

  try {
    console.log('[load] Fetching user data from Firestore...')
    const res = await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'load' }),
    })

    if (!res.ok) {
      console.error('[load] HTTP error:', res.status)
      if (res.status === 401 || retryCount >= 3) {
        useAppStore.getState().setDataLoaded(true)
        return
      }
      await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1000))
      return loadFromFirestore(retryCount + 1)
    }

    const data = await res.json()
    console.log('[load] Response:', {
      success: data.success,
      hasData: !!data.data,
      casesCount: data.data?.cases?.length || 0,
      docsCount: data.data?.documents?.length || 0,
      tasksCount: data.data?.tasks?.length || 0,
      clientsCount: data.data?.clients?.length || 0,
      hasProfile: !!data.data?.profile,
    })

    if (data.success && data.data) {
      const d = data.data
      const state = useAppStore.getState()

      if (d.cases && d.cases.length > 0) {
        state.setCases(sanitizeCases(d.cases))
      } else if (localHasDataToMigrate && state.cases.length > 0) {
        console.log('[load] Local has', state.cases.length, 'cases not in Firestore — will migrate')
      }

      if (d.documents && d.documents.length > 0) {
        state.setDocuments(sanitizeDocuments(d.documents))
      } else if (localHasDataToMigrate && state.documents.length > 0) {
        console.log('[load] Local has', state.documents.length, 'documents not in Firestore — will migrate')
      }

      if (d.tasks && d.tasks.length > 0) {
        state.setTasks(sanitizeTasks(d.tasks))
      } else if (localHasDataToMigrate && state.tasks.length > 0) {
        console.log('[load] Local has', state.tasks.length, 'tasks not in Firestore — will migrate')
      }

      if (d.timelineEvents && d.timelineEvents.length > 0) {
        state.setTimelineEvents(sanitizeTimeline(d.timelineEvents))
      } else if (localHasDataToMigrate && state.timelineEvents.length > 0) {
        console.log('[load] Local has', state.timelineEvents.length, 'events not in Firestore — will migrate')
      }

      if (d.invoices && d.invoices.length > 0) {
        state.setInvoices(sanitizeInvoices(d.invoices))
      }

      // Load profile from the SAME response
      if (d.profile) {
        try {
          const { useProfileStore } = await import('./profile-store')
          const profileStore = useProfileStore.getState()
          if (d.profile.isComplete || d.profile.fullName) {
            profileStore.setProfile(d.profile)
            profileStore.setFirestoreStatus('loaded')
            console.log('[load] Profile loaded from Firestore (isComplete:', d.profile.isComplete, ')')
          }
        } catch (e) {
          console.error('[load] Failed to load profile:', e)
        }
      }

      // Load clients from the SAME response
      if (d.clients && d.clients.length > 0) {
        try {
          const { useClientsStore } = await import('./clients-store')
          useClientsStore.setState({ clients: d.clients })
          console.log('[load] Clients loaded from Firestore:', d.clients.length)
        } catch (e) {
          console.error('[load] Failed to load clients:', e)
        }
      }

      // MIGRATION: Push any local-only data to Firestore
      if (localHasDataToMigrate) {
        console.log('[load] Migrating local data to Firestore...')
        _dataInitialized = true // Allow sync during migration
        await syncToFirestore()
      }
    }

    // Mark data as initialized
    _dataInitialized = true
    _lastSyncedHash = computeDataHash()
    console.log('[load] Data initialized successfully')
  } catch (err) {
    console.error('[load] Error:', err)
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000
      console.warn(`[load] Retrying in ${delay}ms (attempt ${retryCount + 2}/4)`)
      await new Promise(r => setTimeout(r, delay))
      return loadFromFirestore(retryCount + 1)
    }
    console.error('[load] All retries exhausted — keeping local data')
    _dataInitialized = true
    _lastSyncedHash = computeDataHash()
  }

  useAppStore.getState().setDataLoaded(true)
}
