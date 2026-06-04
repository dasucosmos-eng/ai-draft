import { create } from 'zustand';
import type { CaseItem, DocumentItem, TaskItem, TimelineEvent, InvoiceItem, ChatMessage, UserDataPayload } from '@/lib/types';
import { apiCall, getAuthToken, getCurrentUid } from '@/lib/api-client';

/* ─── Debounced save: batches all mutations into one Firestore write ─── */
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _saveInProgress = false;

async function flushSaveToFirestore() {
  if (_saveInProgress) {
    // If a save is already running, re-schedule after it completes
    _saveTimer = setTimeout(flushSaveToFirestore, 500);
    return;
  }

  // Clear any pending debounce timer
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }

  const { useAppStore } = await import('./app-store');
  const state = useAppStore.getState();
  const token = getAuthToken();
  const uid = getCurrentUid();
  if (!token || !uid) return;

  _saveInProgress = true;
  try {
    const { useProfileStore } = await import('@/store/profile-store');
    const { useClientsStore } = await import('@/store/clients-store');
    const { useSubscriptionStore } = await import('@/store/subscription-store');

    const profile = useProfileStore.getState().profile;
    const clients = useClientsStore.getState().clients;
    const subscription = useSubscriptionStore.getState().subscription;

    const res = await apiCall('/user-data', {
      action: 'save',
      uid,
      data: {
        cases: state.cases,
        documents: state.documents,
        tasks: state.tasks,
        timelineEvents: state.timelineEvents,
        invoices: state.invoices,
        clients,
        profile,
        chatMessages: state.chatMessages,
        subscription,
      },
    }, token);

    if (res.warning) {
      console.warn('Firestore save warning:', res.warning);
    }
  } catch (err) {
    console.error('Failed to save to Firestore:', err);
    // Retry once after 3 seconds
    _saveTimer = setTimeout(flushSaveToFirestore, 3000);
  } finally {
    _saveInProgress = false;
  }
}

function debouncedSave(delay = 1000) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSaveToFirestore, delay);
}

// Also expose for clients-store to use
export { debouncedSave, flushSaveToFirestore };

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

  // Immediate save (used by logout, etc.)
  saveToFirestore: async () => {
    await flushSaveToFirestore();
  },
}));
