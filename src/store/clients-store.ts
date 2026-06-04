/**
 * Clients Store — DELEGATED to sync-layer.
 *
 * This is a compatibility shim. New code should use `useClients()` from
 * `@/hooks/use-user-data.ts` instead.
 */

import { create } from 'zustand';
import type { Client } from '@/lib/types';
import { addClient as syncAdd, updateClient as syncUpdate, removeClient as syncRemove } from '@/lib/sync-layer';

interface ClientsState {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (c: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  clearClients: () => void;
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],

  setClients: (clients) => set({ clients }),
  addClient: (c) => {
    set((s) => ({ clients: [c, ...s.clients] }));
    syncAdd(c);
  },
  updateClient: (id, updates) => {
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
    }));
    syncUpdate(id, updates);
  },
  deleteClient: (id) => {
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
    syncRemove(id);
  },
  clearClients: () => set({ clients: [] }),
}));
