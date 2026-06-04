import { create } from 'zustand';
import type { CaseItem, DocumentItem, TaskItem, TimelineEvent, InvoiceItem, ChatMessage, UserDataPayload } from '@/lib/types';
import { apiCall, getAuthToken, getCurrentUid } from '@/lib/api-client';

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
    get().saveToFirestore();
  },
  updateCase: (id, updates) => {
    set((s) => ({
      cases: s.cases.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
    }));
    get().saveToFirestore();
  },
  deleteCase: (id) => {
    set((s) => ({ cases: s.cases.filter((c) => c.id !== id) }));
    get().saveToFirestore();
  },

  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (d) => {
    set((s) => ({ documents: [d, ...s.documents] }));
    get().saveToFirestore();
  },
  updateDocument: (id, updates) => {
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
    get().saveToFirestore();
  },
  deleteDocument: (id) => {
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    get().saveToFirestore();
  },

  setTasks: (tasks) => set({ tasks }),
  addTask: (t) => {
    set((s) => ({ tasks: [t, ...s.tasks] }));
    get().saveToFirestore();
  },
  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    get().saveToFirestore();
  },
  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    get().saveToFirestore();
  },

  setTimelineEvents: (events) => set({ timelineEvents: events }),
  addTimelineEvent: (e) => {
    set((s) => ({ timelineEvents: [e, ...s.timelineEvents] }));
    get().saveToFirestore();
  },
  updateTimelineEvent: (id, updates) => {
    set((s) => ({
      timelineEvents: s.timelineEvents.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)),
    }));
    get().saveToFirestore();
  },
  deleteTimelineEvent: (id) => {
    set((s) => ({ timelineEvents: s.timelineEvents.filter((ev) => ev.id !== id) }));
    get().saveToFirestore();
  },

  setInvoices: (invoices) => set({ invoices }),
  addInvoice: (inv) => {
    set((s) => ({ invoices: [inv, ...s.invoices] }));
    get().saveToFirestore();
  },
  updateInvoice: (id, updates) => {
    set((s) => ({
      invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
    }));
    get().saveToFirestore();
  },
  deleteInvoice: (id) => {
    set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }));
    get().saveToFirestore();
  },

  addChatMessage: (m) => {
    set((s) => ({ chatMessages: [...s.chatMessages, m] }));
    get().saveToFirestore();
  },
  clearChat: () => {
    set({ chatMessages: [] });
    get().saveToFirestore();
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

  saveToFirestore: async () => {
    const state = get();
    const token = getAuthToken();
    const uid = getCurrentUid();
    if (!token || !uid) return;

    try {
      const { useProfileStore } = await import('@/store/profile-store');
      const { useClientsStore } = await import('@/store/clients-store');
      const { useSubscriptionStore } = await import('@/store/subscription-store');

      const profile = useProfileStore.getState().profile;
      const clients = useClientsStore.getState().clients;
      const subscription = useSubscriptionStore.getState().subscription;

      await apiCall('/user-data', {
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
    } catch (err) {
      console.error('Failed to save to Firestore:', err);
    }
  },
}));
