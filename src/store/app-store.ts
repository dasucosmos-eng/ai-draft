/**
 * App Store — UI state ONLY.
 *
 * All business data (cases, documents, tasks, etc.) lives in IndexedDB
 * and is accessed via hooks in `@/hooks/use-user-data.ts`.
 *
 * This store only manages: currentView, selectedCaseId, sidebarOpen.
 */

import { create } from 'zustand';

interface AppState {
  currentView: string;
  selectedCaseId: string | null;
  sidebarOpen: boolean;

  setCurrentView: (view: string) => void;
  setSelectedCaseId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  selectedCaseId: null,
  sidebarOpen: true,

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedCaseId: (id) => set({ selectedCaseId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
