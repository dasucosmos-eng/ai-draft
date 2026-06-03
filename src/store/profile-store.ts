import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ProfileData {
  fullName: string
  email: string
  phone: string
  barCouncilNumber: string
  firmName: string
  city: string
  firmAddress: string
  practiceArea: string
  stampLine: string
  logoUrl: string
  isComplete: boolean
  completedAt: string | null
}

interface ProfileState {
  profile: ProfileData
  firestoreStatus: 'pending' | 'loading' | 'loaded'
  setFirestoreStatus: (s: 'pending' | 'loading' | 'loaded') => void
  setProfile: (data: Partial<ProfileData>) => void
  resetProfile: () => void
}

const defaultProfile: ProfileData = {
  fullName: '', email: '', phone: '', barCouncilNumber: '',
  firmName: '', city: '', firmAddress: '', practiceArea: '',
  stampLine: '', logoUrl: '', isComplete: false, completedAt: null,
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: { ...defaultProfile },
      firestoreStatus: 'pending',
      setFirestoreStatus: (s) => set({ firestoreStatus: s }),
      setProfile: (data) => {
        const newProfile = { ...useProfileStore.getState().profile, ...data }
        set({ profile: newProfile })
        debouncedProfileSync(newProfile)
      },
      resetProfile: () => set({ profile: { ...defaultProfile } }),
    }),
    {
      name: 'aidraft_profile',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profile: state.profile }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // CRITICAL: Check if the hydrated profile belongs to the CURRENT logged-in user.
        // Profile localStorage is NOT scoped by user — if a different user logs in,
        // the old profile data from the previous user would contaminate the new session.
        // Detect this by comparing with the current UID's expected profile data.
        // The safest approach: always reset profile on rehydration and let Firestore
        // provide the correct data. This prevents the profile popup from showing
        // old/incomplete data from a different user.
        const currentUid = localStorage.getItem('aidraft_current_uid')
        // Always reset to default on hydration — Firestore will set the real data.
        // This prevents cross-user profile contamination.
        // The cost is a brief flash of empty profile before Firestore loads,
        // but that's much better than showing the wrong user's profile.
        state.profile = { ...defaultProfile }
        state.setFirestoreStatus('pending')
      },
    }
  )
)

/* ─── Firestore Sync ─── */

let _profileSyncTimer: ReturnType<typeof setTimeout> | null = null

function debouncedProfileSync(profile: any): void {
  if (_profileSyncTimer) clearTimeout(_profileSyncTimer)
  _profileSyncTimer = setTimeout(async () => {
    const token = localStorage.getItem('aidraft_auth_token')
    if (!token) return
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'saveProfile', profile }),
      })
    } catch { /* silent */ }
  }, 1500)
}

export async function loadProfileFromFirestore(): Promise<ProfileData | null> {
  const token = localStorage.getItem('aidraft_auth_token')
  const store = useProfileStore.getState()
  store.setFirestoreStatus('loading')
  if (!token) { store.setFirestoreStatus('loaded'); return null }

  try {
    const res = await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'load' }),
    })
    if (!res.ok) {
      console.error('[profile-store] Firestore load HTTP error:', res.status)
      // Don't retry — just proceed with whatever we have
      store.setFirestoreStatus('loaded')
      return store.profile
    }
    const data = await res.json()
    if (data.success && data.data?.profile) {
      const remote = data.data.profile
      if (remote.isComplete) {
        // Remote has complete profile — use it (source of truth)
        store.setProfile(remote)
        console.log('[profile-store] Loaded complete profile from Firestore')
      } else if (!store.profile.isComplete && remote.fullName) {
        // Remote has partial profile, local has none — use remote
        store.setProfile(remote)
      } else if (store.profile.isComplete && !remote.isComplete) {
        // LOCAL has complete profile but Firestore doesn't — PUSH IT UP
        console.log('[profile-store] Local profile complete but Firestore empty — uploading migration')
        await fetch('/api/user-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ action: 'saveProfile', profile: store.profile }),
        })
      }
    } else if (store.profile.isComplete) {
      // Firestore has NO profile at all, but local does — push migration
      console.log('[profile-store] No Firestore profile — uploading local as migration')
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'saveProfile', profile: store.profile }),
      })
    }
  } catch (err) {
    console.error('[profile-store] Firestore load error:', err)
  }

  store.setFirestoreStatus('loaded')
  return store.profile
}
