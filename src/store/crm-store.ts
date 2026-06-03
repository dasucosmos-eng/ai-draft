import { create } from 'zustand'

/* ─── Types: User signup data fetched from Zoho CRM / Firestore ─── */

export interface CRMUser {
  id: string
  uid: string
  firstName: string
  lastName: string
  displayName: string
  email: string | null
  phone: string | null
  photoURL: string | null
  provider: string
  source: string
  createdAt: string
  lastLoginAt: string | null
  crmSynced: boolean
  zohoId?: string
}

export interface CRMStats {
  totalUsers: number
  totalContacts: number
  totalLeads: number
  todaySignups: number
  weekSignups: number
  byProvider: Record<string, number>
}

/* ─── CRM API Client ─── */

const API_BASE = typeof window !== 'undefined' && (window as any).__API_BASE__
  ? (window as any).__API_BASE__
  : 'https://aidraft.bond/api'

async function crmApi(action: string, data?: any): Promise<any> {
  const res = await fetch(`${API_BASE}/crm-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'CRM API request failed')
  return json
}

/* ─── Store ─── */

interface CRMState {
  users: CRMUser[]
  stats: CRMStats | null
  loading: boolean
  error: string | null
  crmConnected: boolean
  lastFetched: string | null

  fetchUsers: () => Promise<void>
  fetchStats: () => Promise<void>
  setError: (error: string | null) => void
}

export const useCRMStore = create<CRMState>()((set, get) => ({
  users: [],
  stats: null,
  loading: false,
  error: null,
  crmConnected: false,
  lastFetched: null,

  setError: (error) => set({ error }),

  fetchUsers: async () => {
    set({ loading: true, error: null })
    try {
      // Try Zoho CRM first — fetch all contacts (these are signed-up users)
      try {
        const res = await crmApi('list_contacts', {
          filters: { page: 1, perPage: 200 },
        })

        if (res.contacts && res.contacts.length >= 0) {
          const mapped: CRMUser[] = res.contacts.map((c: any) => {
            // Description field may contain "Signed up via <provider> on <date>"
            const desc = c.Description || ''
            const providerMatch = desc.match(/Signed up via (\w+)/i)
            const uidMatch = desc.match(/UID:\s*(\S+)/i) || desc.match(/uid['"]?\s*[:=]\s*['"]?(\S+)/i)

            return {
              id: c.id || `zoho-${Date.now()}-${Math.random()}`,
              uid: uidMatch?.[1] || c.id || '',
              firstName: c.First_Name || '',
              lastName: c.Last_Name || '',
              displayName: `${c.First_Name || ''} ${c.Last_Name || ''}`.trim(),
              email: c.Email || null,
              phone: c.Phone || null,
              photoURL: null,
              provider: providerMatch?.[1] || c.Lead_Source || '',
              source: c.Lead_Source || 'AI Draft Website',
              createdAt: c.Created_Time || '',
              lastLoginAt: null,
              crmSynced: true,
              zohoId: c.id,
            }
          })

          // Also fetch leads (users without email are stored as leads)
          const leadsRes = await crmApi('list_leads', {
            filters: { page: 1, perPage: 200 },
          })

          const leadUsers: CRMUser[] = (leadsRes.leads || []).map((l: any) => {
            const desc = l.Description || ''
            const providerMatch = desc.match(/Signed up via (\w+)/i)
            const uidMatch = desc.match(/UID:\s*(\S+)/i) || desc.match(/uid['"]?\s*[:=]\s*['"]?(\S+)/i)

            return {
              id: l.id || `zoho-${Date.now()}-${Math.random()}`,
              uid: uidMatch?.[1] || l.id || '',
              firstName: l.First_Name || '',
              lastName: l.Last_Name || '',
              displayName: `${l.First_Name || ''} ${l.Last_Name || ''}`.trim(),
              email: l.Email || null,
              phone: l.Phone || null,
              photoURL: null,
              provider: providerMatch?.[1] || l.Lead_Source || '',
              source: l.Lead_Source || 'AI Draft Website',
              createdAt: l.Created_Time || '',
              lastLoginAt: null,
              crmSynced: true,
              zohoId: l.id,
            }
          })

          // Merge contacts and leads, deduplicate by email
          const allUsers = [...mapped]
          leadUsers.forEach(lead => {
            if (!allUsers.find(u => u.email && u.email === lead.email && lead.email)) {
              allUsers.push(lead)
            }
          })

          set({
            users: allUsers,
            loading: false,
            crmConnected: true,
            lastFetched: new Date().toISOString(),
          })
          return
        }
      } catch (err: any) {
        console.log('[crm-store] Zoho fetch failed:', err.message)
        if (!err.message?.includes('not configured')) {
          set({ error: `Zoho CRM: ${err.message}`, loading: false })
          return
        }
      }

      // Fallback: try Firestore users
      try {
        const firestoreRes = await crmApi('list_firestore_users')
        if (firestoreRes.users && firestoreRes.users.length >= 0) {
          const mapped: CRMUser[] = firestoreRes.users.map((u: any) => ({
            id: u.uid,
            uid: u.uid,
            firstName: (u.displayName || '').split(' ')[0] || '',
            lastName: (u.displayName || '').split(' ').slice(1).join(' ') || '',
            displayName: u.displayName || '',
            email: u.email || null,
            phone: u.phoneNumber || null,
            photoURL: u.photoURL || null,
            provider: u.authProvider || '',
            source: u.source || 'AI Draft Website',
            createdAt: u.createdAt || '',
            lastLoginAt: u.lastLoginAt || null,
            crmSynced: u.crmSynced || false,
          }))
          set({
            users: mapped,
            loading: false,
            crmConnected: false,
            lastFetched: new Date().toISOString(),
          })
          return
        }
      } catch {
        // No Firestore data either
      }

      set({ loading: false, crmConnected: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchStats: async () => {
    try {
      // Compute stats from users if loaded, else try API
      const state = get()
      const users = state.users

      if (users.length > 0) {
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()

        const byProvider: Record<string, number> = {}
        users.forEach(u => {
          const p = u.provider || 'unknown'
          byProvider[p] = (byProvider[p] || 0) + 1
        })

        set({
          stats: {
            totalUsers: users.length,
            totalContacts: users.filter(u => u.email).length,
            totalLeads: users.filter(u => !u.email).length,
            todaySignups: users.filter(u => u.createdAt >= todayStart).length,
            weekSignups: users.filter(u => u.createdAt >= weekStart).length,
            byProvider,
          },
        })
        return
      }

      // Fallback API
      try {
        const res = await crmApi('get_stats')
        if (res.success && res.stats) {
          set({
            stats: {
              totalUsers: res.stats.totalContacts + res.stats.totalLeads,
              totalContacts: res.stats.totalContacts,
              totalLeads: res.stats.totalLeads,
              todaySignups: 0,
              weekSignups: 0,
              byProvider: {},
            },
            crmConnected: true,
          })
        }
      } catch {
        // No stats available
      }
    } catch (err: any) {
      set({ error: err.message })
    }
  },
}))
