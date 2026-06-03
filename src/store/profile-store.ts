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
  _profileUid: string | null
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
      _profileUid: null,
      setFirestoreStatus: (s) => set({ firestoreStatus: s }),
      setProfile: (data) => {
        const state = useProfileStore.getState()
        const newProfile = { ...state.profile, ...data }
        const currentUid = localStorage.getItem('aidraft_current_uid')
        set({ profile: newProfile, _profileUid: currentUid })
        debouncedProfileSync(newProfile)
      },
      resetProfile: () => set({ profile: { ...defaultProfile }, _profileUid: null }),
    }),
    {
      name: 'aidraft_profile',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profile: state.profile, _profileUid: state._profileUid }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // CRITICAL FIX: Only wipe profile if a DIFFERENT user logged in.
        // Previously, we ALWAYS reset on rehydration, which meant:
        // 1. Profile was wiped from localStorage
        // 2. Firestore load had to succeed to restore it
        // 3. If Firestore load failed (network error, timeout, 401), profile was lost → popup every refresh
        // Now: keep localStorage data as fallback. Only reset if UID mismatch.
        const currentUid = localStorage.getItem('aidraft_current_uid')
        if (state._profileUid && currentUid && state._profileUid !== currentUid) {
          // Different user logged in — wipe to prevent cross-user contamination
          console.warn(
            `[profile-store] UID mismatch! localStorage has uid=${state._profileUid} but current user is uid=${currentUid}.`,
            'Wiping stale profile to prevent cross-user contamination.'
          )
          state.profile = { ...defaultProfile }
          state._profileUid = currentUid
        }
        // Same user or first login — KEEP the localStorage profile as fallback.
        // It will be updated by loadProfileFromFirestore() if Firestore has newer data.
        state.setFirestoreStatus('pending')
      },
    }
  )
)

/* ─── Firestore Sync ─── */

let _profileSyncTimer: ReturnType<typeof setTimeout> | null = null

/**
 * IMMEDIATELY save profile to Firestore (no debounce).
 * Used on form submit to guarantee the profile is persisted.
 */
export async function saveProfileToFirestore(profile: any): Promise<boolean> {
  const token = localStorage.getItem('aidraft_auth_token')
  if (!token) return false
  try {
    const res = await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'saveProfile', profile }),
    })
    if (!res.ok) {
      console.error('[profile-store] Immediate save failed:', res.status)
      return false
    }
    console.log('[profile-store] Profile saved to Firestore immediately')
    return true
  } catch (err) {
    console.error('[profile-store] Immediate save error:', err)
    return false
  }
}

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
      store.setFirestoreStatus('loaded')
      return store.profile
    }
    const data = await res.json()
    if (data.success && data.data?.profile) {
      const remote = data.data.profile
      const local = store.profile

      // CRITICAL: Only overwrite local profile if local is empty/default.
      // If the user has already filled profile (in this session or previous),
      // the local data is authoritative. Firestore data is stale or equal.
      // This prevents: user edits name → Firestore loads old name → name reverts.
      if (remote.isComplete && !local.isComplete) {
        // Local is empty, remote has data — use remote
        store.setProfile(remote)
        console.log('[profile-store] Loaded complete profile from Firestore (local was empty)')
      } else if (!local.isComplete && !local.fullName && remote.fullName) {
        // Local has no name, remote has partial data — use remote
        store.setProfile(remote)
        console.log('[profile-store] Loaded partial profile from Firestore')
      } else if (local.isComplete && !remote.isComplete) {
        // LOCAL has complete profile but Firestore doesn't — PUSH IT UP
        console.log('[profile-store] Local profile complete but Firestore empty — uploading migration')
        await saveProfileToFirestore(local)
      }
      // else: both have data — keep local (user's current session data wins)
    } else if (store.profile.isComplete) {
      // Firestore has NO profile at all, but local does — push migration
      console.log('[profile-store] No Firestore profile — uploading local as migration')
      await saveProfileToFirestore(store.profile)
    }
  } catch (err) {
    console.error('[profile-store] Firestore load error:', err)
  }

  store.setFirestoreStatus('loaded')
  return store.profile
}
