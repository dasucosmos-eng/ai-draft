/**
 * Data Store Bridge — provides reactive Zustand state backed by IndexedDB.
 *
 * This is the bridge between the sync-layer (IndexedDB) and components
 * that still use Zustand selectors. It subscribes to sync-layer changes
 * and updates Zustand state accordingly.
 *
 * Components should gradually migrate to using hooks from `@/hooks/use-user-data.ts`
 * directly, but this bridge allows the migration to be incremental.
 */

import { create } from 'zustand';
import {
  loadAllCachedData, type CachedData,
} from '@/lib/db';
import {
  onDataChange, pullFromServer,
  addCase as syncAddCase, updateCase as syncUpdateCase, removeCase as syncRemoveCase,
  addClient as syncAddClient, updateClient as syncUpdateClient, removeClient as syncRemoveClient,
  addDocument as syncAddDocument, updateDocument as syncUpdateDocument, removeDocument as syncRemoveDocument,
  addTask as syncAddTask, updateTask as syncUpdateTask, removeTask as syncRemoveTask,
  addTimelineEvent as syncAddTimelineEvent, updateTimelineEvent as syncUpdateTimelineEvent, removeTimelineEvent as syncRemoveTimelineEvent,
  addInvoice as syncAddInvoice, updateInvoice as syncUpdateInvoice, removeInvoice as syncRemoveInvoice,
  addChatMessage as syncAddChatMessage, clearChat as syncClearChat,
  updateProfile as syncUpdateProfile, saveProfileDirect as syncSaveProfileDirect,
} from '@/lib/sync-layer';
import type {
  CaseItem, Client, ProfileData, DocumentItem, TaskItem,
  TimelineEvent, InvoiceItem, ChatMessage, SubscriptionData,
} from '@/lib/types';

interface DataState extends CachedData {
  dataLoaded: boolean;
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
  loadFromFirestoreData: (data: Partial<CachedData>) => void;
}

let _subscribed = false;
let _updateScheduled = false;

function scheduleStoreUpdate() {
  if (_updateScheduled) return;
  _updateScheduled = true;
  // Use queueMicrotask to batch updates within the same tick
  queueMicrotask(async () => {
    _updateScheduled = false;
    try {
      const data = await loadAllCachedData();
      useDataStore.setState(data);
    } catch { /* ignore */ }
  });
}

export const useDataStore = create<DataState>((set, get) => ({
  profile: null,
  cases: [],
  clients: [],
  documents: [],
  tasks: [],
  timelineEvents: [],
  invoices: [],
  chatMessages: [],
  subscription: null,
  dataLoaded: false,

  // Set methods (used during initial load — no sync)
  setCases: (cases) => set({ cases }),
  setDocuments: (docs) => set({ documents: docs }),
  setTasks: (tasks) => set({ tasks }),
  setTimelineEvents: (events) => set({ timelineEvents: events }),
  setInvoices: (invoices) => set({ invoices }),

  // Mutation methods — update Zustand state + sync to IndexedDB/server
  addCase: (c) => {
    set((s) => ({ cases: [c, ...s.cases] }));
    syncAddCase(c);
  },
  updateCase: (id, updates) => {
    set((s) => ({
      cases: s.cases.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
    }));
    syncUpdateCase(id, updates);
  },
  deleteCase: (id) => {
    set((s) => ({ cases: s.cases.filter((c) => c.id !== id) }));
    syncRemoveCase(id);
  },

  addDocument: (d) => {
    set((s) => ({ documents: [d, ...s.documents] }));
    syncAddDocument(d);
  },
  updateDocument: (id, updates) => {
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
    syncUpdateDocument(id, updates);
  },
  deleteDocument: (id) => {
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    syncRemoveDocument(id);
  },

  addTask: (t) => {
    set((s) => ({ tasks: [t, ...s.tasks] }));
    syncAddTask(t);
  },
  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    syncUpdateTask(id, updates);
  },
  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    syncRemoveTask(id);
  },

  addTimelineEvent: (e) => {
    set((s) => ({ timelineEvents: [e, ...s.timelineEvents] }));
    syncAddTimelineEvent(e);
  },
  updateTimelineEvent: (id, updates) => {
    set((s) => ({
      timelineEvents: s.timelineEvents.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)),
    }));
    syncUpdateTimelineEvent(id, updates);
  },
  deleteTimelineEvent: (id) => {
    set((s) => ({ timelineEvents: s.timelineEvents.filter((ev) => ev.id !== id) }));
    syncRemoveTimelineEvent(id);
  },

  addInvoice: (inv) => {
    set((s) => ({ invoices: [inv, ...s.invoices] }));
    syncAddInvoice(inv);
  },
  updateInvoice: (id, updates) => {
    set((s) => ({
      invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
    }));
    syncUpdateInvoice(id, updates);
  },
  deleteInvoice: (id) => {
    set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }));
    syncRemoveInvoice(id);
  },

  addChatMessage: (m) => {
    set((s) => ({ chatMessages: [...s.chatMessages, m] }));
    syncAddChatMessage(m);
  },
  clearChat: () => {
    set({ chatMessages: [] });
    syncClearChat();
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
}));

/**
 * Initialize the data store bridge.
 * Call this once after auth succeeds. Subscribes to sync-layer changes
 * and keeps the Zustand store in sync with IndexedDB.
 */
export async function initDataStoreBridge(): Promise<void> {
  if (_subscribed) return;
  _subscribed = true;

  // Initial load from IndexedDB
  try {
    const data = await loadAllCachedData();
    useDataStore.setState({
      ...data,
      dataLoaded: true,
    });
  } catch (err) {
    console.warn('[data-store] Failed to load from IndexedDB:', err);
    useDataStore.setState({ dataLoaded: true });
  }

  // Subscribe to future changes from sync-layer (debounced to prevent re-render loops)
  onDataChange(() => {
    scheduleStoreUpdate();
  });
}
