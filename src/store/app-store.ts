import { create } from 'zustand';
import type { CaseItem, DocumentItem, TaskItem, TimelineEvent, InvoiceItem, ChatMessage, UserDataPayload } from '@/lib/types';
import { apiCall, getAuthToken, getCurrentUid } from '@/lib/api-client';

/* ─── Save infrastructure: like social media's write-through cache ─── */
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _saveInProgress = false;
let _isLoading = false; // Prevents saves during initial data load
let _retryCount = 0;
const MAX_RETRIES = 3;

// Lock saves during data load — prevents writing empty data to Firestore
export function setSaveLock(locked: boolean) {
  _isLoading = locked;
}

async function flushSaveToFirestore() {
  if (_saveInProgress) {
    // If a save is already running, re-schedule after it completes
    _saveTimer = setTimeout(flushSaveToFirestore, 500);
    return;
  }

  // BLOCK saves during initial data load (prevents empty overwrite)
  if (_isLoading) {
    _saveTimer = setTimeout(flushSaveToFirestore, 2000);
    return;
  }

  // Clear any pending debounce timer
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }

  const state = useAppStore.getState();
  const token = getAuthToken();
  const uid = getCurrentUid();
  if (!token || !uid) return;
  // Don't save if data hasn't been loaded yet
  if (!state.dataLoaded) {
    return;
  }

  _saveInProgress = true;
  try {
    const profile = useProfileStore.getState().profile;
    const clients = useClientsStore.getState().clients;
    const subscription = useSubscriptionStore.getState().subscription;

    const payload = {
      action: 'save' as const,
      uid,
      cases: state.cases,
      documents: state.documents,
      tasks: state.tasks,
      timelineEvents: state.timelineEvents,
      invoices: state.invoices,
      clients,
      profile,
      chatMessages: state.chatMessages,
      subscription,
    };

    const res = await apiCall('/user-data', payload, token);

    if (res.success && !res.warning) {
      _retryCount = 0;
    }
    if (res.warning) {
      console.warn('[save] Firestore save warning:', res.warning);
    }
  } catch (err) {
    console.error('[save] ✗ Failed to save to Firestore:', err);
    _retryCount++;
    if (_retryCount <= MAX_RETRIES) {
      const delay = Math.min(3000 * _retryCount, 15000);
      console.log(`[save] Retrying (${_retryCount}/${MAX_RETRIES}) in ${delay}ms...`);
      _saveTimer = setTimeout(flushSaveToFirestore, delay);
    } else {
      console.error('[save] Max retries reached — data may be lost if page is closed');
    }
  } finally {
    _saveInProgress = false;
  }
}

function debouncedSave(delay = 1000) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSaveToFirestore, delay);
}

// Force immediate save (used by logout, page unload)
// BUG #8 FIX: Made async so callers can await completion
async function immediateSave() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  await flushSaveToFirestore();
}

// Also expose for other stores
export { debouncedSave, flushSaveToFirestore, immediateSave };

// Forward declarations for circular deps
import { useProfileStore } from '@/store/profile-store';
import { useClientsStore } from '@/store/clients-store';
import { useSubscriptionStore } from '@/store/subscription-store';

interface AppState {
  currentView: string;
  selectedCaseId: string | null;
  cases: CaseItem[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  timelineEvents: TimelineEvent[];
  invoices: InvoiceItem[];
  chatMessages: ChatMessage[];
  sidebarOpen: boolean;
  dataLoaded: boolean;

  setCurrentView: (view: string) => void;
  setSelectedCaseId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;

  setCases: (cases: CaseItem[]) => void;
  addCase: (c: CaseItem) => void;
  updateCase: (id: string, updates: Partial<CaseItem>) => void;
  deleteCase: (id: string) => void;

  setDocuments: (docs: DocumentItem[]) => void;
  addDocument: (d: DocumentItem) => void;
  updateDocument: (id: string, updates: Partial<DocumentItem>) => void;
  deleteDocument: (id: string) => void;

  setTasks: (tasks: TaskItem[]) => void;
  addTask: (t: TaskItem) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;

  setTimelineEvents: (events: TimelineEvent[]) => void;
  addTimelineEvent: (e: TimelineEvent) => void;
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  deleteTimelineEvent: (id: string) => void;

  setInvoices: (invoices: InvoiceItem[]) => void;
  addInvoice: (inv: InvoiceItem) => void;
  updateInvoice: (id: string, updates: Partial<InvoiceItem>) => void;
  deleteInvoice: (id: string) => void;

  addChatMessage: (m: ChatMessage) => void;
  clearChat: () => void;

  loadFromFirestoreData: (data: UserDataPayload) => void;
  clearAllData: () => void;
  saveToFirestore: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'dashboard',
  selectedCaseId: null,
  cases: [],
  documents: [],
  tasks: [],
  timelineEvents: [],
  invoices: [],
  chatMessages: [],
  sidebarOpen: true,
  dataLoaded: false,

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedCaseId: (id) => set({ selectedCaseId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Set* methods are used during data load — they do NOT trigger saves
  setCases: (cases) => set({ cases }),
  addCase: (c) => {
    set((s) => ({ cases: [c, ...s.cases] }));
    debouncedSave();
  },
  updateCase: (id, updates) => {
    set((s) => ({
      cases: s.cases.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
    }));
    debouncedSave();
  },
  deleteCase: (id) => {
    set((s) => ({ cases: s.cases.filter((c) => c.id !== id) }));
    debouncedSave();
  },

  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (d) => {
    set((s) => ({ documents: [d, ...s.documents] }));
    debouncedSave();
  },
  updateDocument: (id, updates) => {
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
    debouncedSave();
  },
  deleteDocument: (id) => {
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    debouncedSave();
  },

  setTasks: (tasks) => set({ tasks }),
  addTask: (t) => {
    set((s) => ({ tasks: [t, ...s.tasks] }));
    debouncedSave();
  },
  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    debouncedSave();
  },
  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    debouncedSave();
  },

  setTimelineEvents: (events) => set({ timelineEvents: events }),
  addTimelineEvent: (e) => {
    set((s) => ({ timelineEvents: [e, ...s.timelineEvents] }));
    debouncedSave();
  },
  updateTimelineEvent: (id, updates) => {
    set((s) => ({
      timelineEvents: s.timelineEvents.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)),
    }));
    debouncedSave();
  },
  deleteTimelineEvent: (id) => {
    set((s) => ({ timelineEvents: s.timelineEvents.filter((ev) => ev.id !== id) }));
    debouncedSave();
  },

  setInvoices: (invoices) => set({ invoices }),
  addInvoice: (inv) => {
    set((s) => ({ invoices: [inv, ...s.invoices] }));
    debouncedSave();
  },
  updateInvoice: (id, updates) => {
    set((s) => ({
      invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
    }));
    debouncedSave();
  },
  deleteInvoice: (id) => {
    set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }));
    debouncedSave();
  },

  addChatMessage: (m) => {
    set((s) => ({ chatMessages: [...s.chatMessages, m] }));
    debouncedSave();
  },
  clearChat: () => {
    set({ chatMessages: [] });
    debouncedSave();
  },

  loadFromFirestoreData: (data) => {
    set({
      cases: data.cases || [],
      documents: data.documents || [],
      tasks: data.tasks || [],
      timelineEvents: data.timelineEvents || [],
      invoices: data.invoices || [],
      chatMessages: data.chatMessages || [],
      dataLoaded: true,
    });
  },

  clearAllData: () => {
    set({
      cases: [],
      documents: [],
      tasks: [],
      timelineEvents: [],
      invoices: [],
      chatMessages: [],
      dataLoaded: false,
      currentView: 'dashboard',
      selectedCaseId: null,
    });
  },

  // Immediate save (used by logout, beforeunload)
  saveToFirestore: async () => {
    await flushSaveToFirestore();
  },
}));
