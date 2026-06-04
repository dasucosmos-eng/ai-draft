import { create } from 'zustand';
import type { Client } from '@/lib/types';
import { debouncedSave } from './app-store';

interface ClientsState {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (c: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  clearClients: () => void;
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],

  setClients: (clients) => set({ clients }),
  addClient: (c) => {
    set((s) => ({ clients: [c, ...s.clients] }));
    // Use the same debounced save from app-store — no separate save
    debouncedSave();
  },
  updateClient: (id, updates) => {
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
    }));
    debouncedSave();
  },
  deleteClient: (id) => {
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
    debouncedSave();
  },
  clearClients: () => set({ clients: [] }),
}));
