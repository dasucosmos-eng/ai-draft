import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ClientDocument {
  id: string; name: string; type: string; category: string
  size?: string; uploadedAt: string; clientId: string; content?: string
}

export interface ClientFeeRecord {
  id: string
  description: string
  amount: number
  date: string
  status: 'paid' | 'pending' | 'overdue'
  caseId?: string
}

export interface ClientActivity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'court_visit' | 'document_sent' | 'payment_received'
  description: string
  date: string
  caseId?: string
}

export interface ClientImportantDate {
  id: string
  title: string
  date: string
  type: 'hearing' | 'deadline' | 'meeting' | 'payment_due' | 'document_filing' | 'other'
  caseId?: string
}

export type ClientCategory = 'individual' | 'corporate' | 'government' | 'ngo' | 'other'
export type ClientReferenceSource = 'referral' | 'website' | 'social_media' | 'advertisement' | 'walk_in' | 'bar_association' | 'other_lawyer' | 'existing_client' | 'other'

export interface Client {
  id: string; name: string; email?: string; phone?: string; address?: string
  alternatePhone?: string
  category?: ClientCategory
  referenceSource?: ClientReferenceSource
  panNumber?: string
  company?: string
  companyType?: string
  gstNumber?: string
  accused?: string[]; victims?: string[]; caseIds?: string[]
  documents?: ClientDocument[]; notes?: string; tags?: string[]
  fees?: ClientFeeRecord[]
  activities?: ClientActivity[]
  importantDates?: ClientImportantDate[]
  createdAt: string; updatedAt: string
}

interface ClientsState {
  clients: Client[]
  _clientsUid: string | null
  addClient: (client: Client) => void
  updateClient: (id: string, updates: Partial<Client>) => void
  deleteClient: (id: string) => void
  addDocumentToClient: (clientId: string, doc: ClientDocument) => void
  removeDocumentFromClient: (clientId: string, docId: string) => void
  updateClientDocumentContent: (clientId: string, docId: string, newContent: string) => void
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set) => ({
      clients: [],
      _clientsUid: null,
      addClient: (client) => {
        const currentUid = localStorage.getItem('aidraft_current_uid')
        set((state) => ({ clients: [client, ...state.clients], _clientsUid: currentUid }))
      },
      updateClient: (id, updates) => set((state) => ({
        clients: state.clients.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        ),
      })),
      deleteClient: (id) => set((state) => ({ clients: state.clients.filter((c) => c.id !== id) })),
      addDocumentToClient: (clientId, doc) => set((state) => ({
        clients: state.clients.map((c) =>
          c.id === clientId
            ? { ...c, documents: [...(c.documents || []), doc], updatedAt: new Date().toISOString() }
            : c
        ),
      })),
      removeDocumentFromClient: (clientId, docId) => set((state) => ({
        clients: state.clients.map((c) =>
          c.id === clientId
            ? { ...c, documents: (c.documents || []).filter((d) => d.id !== docId), updatedAt: new Date().toISOString() }
            : c
        ),
      })),
      updateClientDocumentContent: (clientId, docId, newContent) => set((state) => ({
        clients: state.clients.map((c) =>
          c.id === clientId
            ? {
                ...c,
                documents: (c.documents || []).map((d) => d.id === docId ? { ...d, content: newContent } : d),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
      })),
    }),
    {
      name: 'aidraft_clients',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ clients: state.clients, _clientsUid: state._clientsUid }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // CRITICAL FIX: Only wipe clients if a DIFFERENT user logged in.
        // Previously, we ALWAYS wiped on rehydration, meaning if Firestore load
        // failed (network error, 401), the client list was lost entirely.
        // Now: keep localStorage data as fallback. Only wipe if UID mismatch.
        const currentUid = localStorage.getItem('aidraft_current_uid')
        if (state._clientsUid && currentUid && state._clientsUid !== currentUid) {
          console.warn(
            `[clients-store] UID mismatch! localStorage has uid=${state._clientsUid} but current user is uid=${currentUid}.`,
            'Wiping stale clients to prevent cross-user contamination.'
          )
          state.clients = []
          state._clientsUid = currentUid
        }
        // Same user or first login — KEEP localStorage clients as fallback.
        // They will be updated by loadClientsFromFirestore() if Firestore has newer data.
      },
    }
  )
)

/* ─── Firestore Sync ─── */

let _clientsSyncTimer: ReturnType<typeof setTimeout> | null = null
let _prevClientsJson = ''

function debouncedClientsSync(): void {
  if (_clientsSyncTimer) clearTimeout(_clientsSyncTimer)
  _clientsSyncTimer = setTimeout(syncClientsToFirestore, 2000)
}

async function syncClientsToFirestore(): Promise<void> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token) return
  try {
    const clients = useClientsStore.getState().clients
    await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'save', clients }),
    })
  } catch { /* silent */ }
}

export async function loadClientsFromFirestore(): Promise<void> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token) return
  try {
    const res = await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'load' }),
    })
    const data = await res.json()
    if (data.success && data.data?.clients && data.data.clients.length > 0) {
      useClientsStore.setState({ clients: data.data.clients })
      _prevClientsJson = JSON.stringify(data.data.clients)
      console.log('[clients-store] Loaded clients from Firestore:', data.data.clients.length)
    } else if (useClientsStore.getState().clients.length > 0) {
      // MIGRATION: local has clients, Firestore doesn't — push them up
      console.log('[clients-store] Migrating local clients to Firestore')
      await syncClientsToFirestore()
    }
  } catch { /* silent */ }
}

useClientsStore.subscribe((state) => {
  const json = JSON.stringify(state.clients)
  if (json !== _prevClientsJson) {
    _prevClientsJson = json
    debouncedClientsSync()
  }
})
