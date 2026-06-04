/**
 * React hooks for accessing IndexedDB-cached data with reactive updates.
 *
 * These hooks replace Zustand stores for business data. Zustand is used ONLY
 * for UI state (currentView, selectedCaseId, sidebarOpen).
 *
 * Each hook:
 * - Reads from IndexedDB on mount (instant, works offline)
 * - Subscribes to sync-layer change events
 * - Returns { data, loading, error, refresh }
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadAllCachedData,
  getCases, getClients, getDocuments, getTasks,
  getTimelineEvents, getInvoices, getChatMessages, getProfile, getSubscription,
  type CachedData,
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
  saveSubscription as syncSaveSubscription,
  type CachedData as SyncCachedData,
} from '@/lib/sync-layer';
import type {
  CaseItem, Client, ProfileData, DocumentItem, TaskItem,
  TimelineEvent, InvoiceItem, ChatMessage, SubscriptionData,
} from '@/lib/types';

/* ─── Master data hook — reads all data reactively ─── */

export function useAllData(): CachedData & { refresh: () => Promise<void>; loading: boolean } {
  const [data, setData] = useState<CachedData>({
    profile: null,
    cases: [],
    clients: [],
    documents: [],
    tasks: [],
    timelineEvents: [],
    invoices: [],
    chatMessages: [],
    subscription: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const fresh = await loadAllCachedData();
      setData(fresh);
    } catch (err) {
      console.error('[useAllData] Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial load
    loadAllCachedData().then(fresh => {
      if (mounted) {
        setData(fresh);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Subscribe to sync-layer changes
    const unsub = onDataChange(async () => {
      if (!mounted) return;
      try {
        const fresh = await loadAllCachedData();
        if (mounted) setData(fresh);
      } catch { /* ignore */ }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return { ...data, refresh, loading };
}

/* ─── Profile hook ─── */

export function useProfile() {
  const all = useAllData();
  const update = useCallback(async (updates: Partial<ProfileData>) => {
    await syncUpdateProfile(updates);
  }, []);
  const save = useCallback(async (profile: ProfileData) => {
    await syncSaveProfileDirect(profile);
  }, []);
  return {
    profile: all.profile,
    loading: all.loading,
    updateProfile: update,
    saveProfile: save,
  };
}

/* ─── Cases hooks ─── */

export function useCases() {
  const all = useAllData();
  const add = useCallback(async (c: CaseItem) => {
    await syncAddCase(c);
  }, []);
  const update = useCallback(async (id: string, updates: Partial<CaseItem>) => {
    await syncUpdateCase(id, updates);
  }, []);
  const remove = useCallback(async (id: string) => {
    await syncRemoveCase(id);
  }, []);
  return {
    cases: all.cases,
    loading: all.loading,
    addCase: add,
    updateCase: update,
    deleteCase: remove,
  };
}

/* ─── Clients hooks ─── */

export function useClients() {
  const all = useAllData();
  const add = useCallback(async (c: Client) => {
    await syncAddClient(c);
  }, []);
  const update = useCallback(async (id: string, updates: Partial<Client>) => {
    await syncUpdateClient(id, updates);
  }, []);
  const remove = useCallback(async (id: string) => {
    await syncRemoveClient(id);
  }, []);
  return {
    clients: all.clients,
    loading: all.loading,
    addClient: add,
    updateClient: update,
    deleteClient: remove,
  };
}

/* ─── Documents hooks ─── */

export function useDocuments() {
  const all = useAllData();
  const add = useCallback(async (d: DocumentItem) => {
    await syncAddDocument(d);
  }, []);
  const update = useCallback(async (id: string, updates: Partial<DocumentItem>) => {
    await syncUpdateDocument(id, updates);
  }, []);
  const remove = useCallback(async (id: string) => {
    await syncRemoveDocument(id);
  }, []);
  return {
    documents: all.documents,
    loading: all.loading,
    addDocument: add,
    updateDocument: update,
    deleteDocument: remove,
  };
}

/* ─── Tasks hooks ─── */

export function useTasks() {
  const all = useAllData();
  const add = useCallback(async (t: TaskItem) => {
    await syncAddTask(t);
  }, []);
  const update = useCallback(async (id: string, updates: Partial<TaskItem>) => {
    await syncUpdateTask(id, updates);
  }, []);
  const remove = useCallback(async (id: string) => {
    await syncRemoveTask(id);
  }, []);
  return {
    tasks: all.tasks,
    loading: all.loading,
    addTask: add,
    updateTask: update,
    deleteTask: remove,
  };
}

/* ─── Timeline events hooks ─── */

export function useTimelineEvents() {
  const all = useAllData();
  const add = useCallback(async (e: TimelineEvent) => {
    await syncAddTimelineEvent(e);
  }, []);
  const update = useCallback(async (id: string, updates: Partial<TimelineEvent>) => {
    await syncUpdateTimelineEvent(id, updates);
  }, []);
  const remove = useCallback(async (id: string) => {
    await syncRemoveTimelineEvent(id);
  }, []);
  return {
    timelineEvents: all.timelineEvents,
    loading: all.loading,
    addTimelineEvent: add,
    updateTimelineEvent: update,
    deleteTimelineEvent: remove,
  };
}

/* ─── Invoices hooks ─── */

export function useInvoices() {
  const all = useAllData();
  const add = useCallback(async (inv: InvoiceItem) => {
    await syncAddInvoice(inv);
  }, []);
  const update = useCallback(async (id: string, updates: Partial<InvoiceItem>) => {
    await syncUpdateInvoice(id, updates);
  }, []);
  const remove = useCallback(async (id: string) => {
    await syncRemoveInvoice(id);
  }, []);
  return {
    invoices: all.invoices,
    loading: all.loading,
    addInvoice: add,
    updateInvoice: update,
    deleteInvoice: remove,
  };
}

/* ─── Chat messages hooks ─── */

export function useChatMessages() {
  const all = useAllData();
  const add = useCallback(async (m: ChatMessage) => {
    await syncAddChatMessage(m);
  }, []);
  const clear = useCallback(async () => {
    await syncClearChat();
  }, []);
  return {
    chatMessages: all.chatMessages,
    loading: all.loading,
    addChatMessage: add,
    clearChat: clear,
  };
}

/* ─── Subscription hook ─── */

export function useSubscription() {
  const all = useAllData();
  const save = useCallback(async (sub: SubscriptionData) => {
    await syncSaveSubscription(sub);
  }, []);
  return {
    subscription: all.subscription,
    loading: all.loading,
    saveSubscription: save,
  };
}

/* ─── Convenience: combined hook for case detail view ─── */

export function useCaseData(caseId: string | null) {
  const all = useAllData();

  const caseData = caseId ? all.cases.find(c => c.id === caseId) : null;
  const caseTasks = caseId ? all.tasks.filter(t => t.caseId === caseId) : [];
  const caseEvents = caseId
    ? all.timelineEvents
        .filter(e => e.caseId === caseId)
        .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    : [];
  const caseDocs = caseId ? all.documents.filter(d => d.caseId === caseId) : [];

  return {
    caseData,
    caseTasks,
    caseEvents,
    caseDocs,
    loading: all.loading,
    // Mutations from the parent hooks
    updateCase: syncUpdateCase,
    addTask: syncAddTask,
    updateTask: syncUpdateTask,
    deleteTask: syncRemoveTask,
    addTimelineEvent: syncAddTimelineEvent,
    updateTimelineEvent: syncUpdateTimelineEvent,
    deleteTimelineEvent: syncRemoveTimelineEvent,
    addDocument: syncAddDocument,
  };
}
