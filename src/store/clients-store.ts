import { create } from 'zustand';
import type { Client } from '@/lib/types';
import { getAuthToken, getCurrentUid } from '@/lib/api-client';

interface ClientsState {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (c: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  clearClients: () => void;
  saveClientsToFirestore: () => Promise<void>;
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],

  setClients: (clients) => set({ clients }),
  addClient: (c) => {
    set((s) => ({ clients: [c, ...s.clients] }));
    get().saveClientsToFirestore();
  },
  updateClient: (id, updates) => {
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
    }));
    get().saveClientsToFirestore();
  },
  deleteClient: (id) => {
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
    get().saveClientsToFirestore();
  },
  clearClients: () => set({ clients: [] }),
  saveClientsToFirestore: async () => {
    const token = getAuthToken();
    const uid = getCurrentUid();
    if (!token || !uid) return;
    try {
      const { apiCall } = await import('@/lib/api-client');
      const { useAppStore } = await import('./app-store');
      const { useProfileStore } = await import('./profile-store');
      const { useSubscriptionStore } = await import('./subscription-store');
      const appState = useAppStore.getState();
      const profile = useProfileStore.getState().profile;
      const subscription = useSubscriptionStore.getState().subscription;

      await apiCall('/user-data', {
        action: 'save',
        uid,
        data: {
          cases: appState.cases,
          documents: appState.documents,
          tasks: appState.tasks,
          timelineEvents: appState.timelineEvents,
          invoices: appState.invoices,
          clients: get().clients,
          profile,
          chatMessages: appState.chatMessages,
          subscription,
        },
      }, token);
    } catch (err) {
      console.error('Failed to save clients:', err);
    }
  },
}));
