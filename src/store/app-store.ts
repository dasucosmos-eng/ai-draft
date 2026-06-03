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
        if (state) {
          // CRITICAL: Check if the hydrated data belongs to the CURRENT logged-in user.
          // If localStorage has data from a DIFFERENT user (different _activeUid),
          // wipe it all to prevent cross-user data contamination.
          const currentUid = localStorage.getItem('aidraft_current_uid')
          if (state._activeUid && currentUid && state._activeUid !== currentUid) {
            console.warn(
              `[app-store] UID mismatch! localStorage has uid=${state._activeUid} but current user is uid=${currentUid}.`,
              'Wiping stale data to prevent cross-user contamination.'
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
            // Same user or first login — sanitize as before
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
          // Force dataLoaded=false to prevent hydration mismatch (#310)
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

/**
 * Merge two arrays by ID — remote is source of truth, local-only items are preserved.
 * Firestore items take precedence; local items not in Firestore are kept (they may
 * not have synced yet from this browser).
 */
function mergeById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const remoteIds = new Set(remote.map(item => item.id))
  // Start with all remote items (source of truth)
  const merged = [...remote]
  // Add local items NOT in remote (unsynced local data)
  for (const localItem of local) {
    if (!remoteIds.has(localItem.id)) {
      merged.push(localItem)
    }
  }
  return merged
}

export async function syncToFirestore(retryCount = 0): Promise<boolean> {
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
      // Retry up to 3 times on server errors (5xx) with exponential backoff
      if (res.status >= 500 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000
        console.warn(`[app-store] Retrying sync in ${delay}ms (attempt ${retryCount + 1}/3)`)
        await new Promise(r => setTimeout(r, delay))
        return syncToFirestore(retryCount + 1)
      }
      return false
    }
    console.log('[app-store] Synced to Firestore successfully')
    _syncInProgress = false
    return true
  } catch (err) {
    console.error('[app-store] Sync error:', err)
    _syncInProgress = false
    // Retry up to 3 times on network errors with exponential backoff
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000
      console.warn(`[app-store] Retrying sync in ${delay}ms (attempt ${retryCount + 1}/3)`)
      await new Promise(r => setTimeout(r, delay))
      return syncToFirestore(retryCount + 1)
    }
    return false
  }
}

function debouncedSync(): void {
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer)
  _syncDebounceTimer = setTimeout(syncToFirestore, 2000)
}

/** Flush pending sync immediately — call before logout or page unload */
export async function flushSyncToFirestore(): Promise<void> {
  if (_syncDebounceTimer) {
    clearTimeout(_syncDebounceTimer)
    _syncDebounceTimer = null
  }
  await syncToFirestore()
}

/**
 * CRITICAL FIX: Register a beforeunload handler to flush pending syncs
 * when the user closes the tab/browser or navigates away.
 * Without this, debounced syncs (2s delay) are LOST if the browser closes
 * before the timer fires. This is the ROOT CAUSE of data not appearing on
 * other browsers — data was only in localStorage, never reached Firestore.
 */
let _unloadRegistered = false

export function setupSyncOnUnload(): void {
  if (_unloadRegistered || typeof window === 'undefined') return
  _unloadRegistered = true

  // Use sendBeacon for reliable sync during page unload.
  // Unlike fetch(), sendBeacon guarantees the request is sent even if the page
  // is closing. However, it doesn't support Authorization headers well,
  // so we use a synchronous approach for the beforeunload event.
  const handler = (e: BeforeUnloadEvent) => {
    if (_syncDebounceTimer) {
      // There's a pending debounced sync — try to flush it
      clearTimeout(_syncDebounceTimer)
      _syncDebounceTimer = null
      // Use sendBeacon for the sync (fire-and-forget, no Authorization header issue
      // since we include token in the body).
      // CRITICAL FIX: Use Blob with explicit 'application/json' Content-Type.
      // Without this, sendBeacon defaults to 'text/plain' and the server
      // (Express body-parser) won't parse the JSON body → data silently lost.
      const token = localStorage.getItem('aidraft_auth_token')
      if (token) {
        const state = useAppStore.getState()
        const payload = JSON.stringify({
          action: 'save',
          cases: state.cases,
          documents: state.documents,
          tasks: state.tasks,
          timelineEvents: state.timelineEvents,
          invoices: state.invoices,
          _token: token, // Include token in body for sendBeacon
        })
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/user-data', blob)
      }
    }
  }

  window.addEventListener('beforeunload', handler)

  // Also use visibilitychange to sync when tab becomes hidden (e.g., mobile switch)
  const visibilityHandler = () => {
    if (document.visibilityState === 'hidden' && _syncDebounceTimer) {
      clearTimeout(_syncDebounceTimer)
      _syncDebounceTimer = null
      syncToFirestore().catch(() => {})
    }
  }

  document.addEventListener('visibilitychange', visibilityHandler)
}

export async function loadFromFirestore(retryCount = 0): Promise<void> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token) {
    useAppStore.getState().setDataLoaded(true)
    return
  }

  // CRITICAL: Before loading from Firestore, update _activeUid to the current user.
  // This ensures the store knows which user's data it should hold, and on next
  // hydration (page refresh), it can detect if a different user logged in.
  const currentUid = localStorage.getItem('aidraft_current_uid')
  if (currentUid) {
    useAppStore.getState().setActiveUid(currentUid)
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
