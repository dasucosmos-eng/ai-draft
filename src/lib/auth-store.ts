import { create } from 'zustand'

const API_BASE = typeof window !== 'undefined' && (window as any).__API_BASE__
  ? (window as any).__API_BASE__
  : 'https://aidraft.bond/api'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  phoneNumber: string | null
  photoURL: string | null
  provider: string
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  phoneSessionId: string | null
  phoneInProgress: boolean
  _restoring: boolean

  phoneOTP: string | null

  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  loginWithGoogle: () => Promise<void>
  handleGoogleCredential: (credential: string) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>
  sendPhoneOTP: (phoneNumber: string) => Promise<void>
  verifyPhoneOTP: (otp: string) => Promise<void>
  logout: () => Promise<void>
  syncToCRM: (user: AuthUser) => Promise<void>
  restoreSession: () => Promise<void>
}

async function apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data as T
}

interface AuthResponse {
  success: boolean
  token?: string
  user?: AuthUser
  error?: string
}

/* ─── Centralized post-auth data loading ─── */

async function loadUserDataAfterAuth(): Promise<void> {
  // Reset dataLoaded so UI shows loading state during fetch
  const { useAppStore } = await import('@/store/app-store')
  useAppStore.getState().setDataLoaded(false)

  // CRITICAL FIX: Register beforeunload/visibilitychange handlers to flush
  // pending Firestore syncs when the user closes the tab or switches away.
  // This prevents data loss — the root cause of cross-browser inconsistency.
  const { setupSyncOnUnload } = await import('@/store/app-store')
  setupSyncOnUnload()

  // Safety timeout: if all loads take more than 8s, force dataLoaded=true
  const safetyTimer = setTimeout(() => {
    if (!useAppStore.getState().dataLoaded) {
      console.warn('[auth-store] Safety timeout — forcing dataLoaded=true')
      useAppStore.getState().setDataLoaded(true)
    }
  }, 8000)

  try {
    // Fire all loads in parallel — each handles its own errors
    await Promise.allSettled([
      import('@/store/profile-store').then(m => m.loadProfileFromFirestore()),
      import('@/store/app-store').then(m => m.loadFromFirestore()),
      import('@/store/clients-store').then(m => m.loadClientsFromFirestore()),
    ])
  } finally {
    clearTimeout(safetyTimer)
    // Ensure dataLoaded is always true after allSettled resolves
    useAppStore.getState().setDataLoaded(true)
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  phoneSessionId: null,
  phoneOTP: null,

  setUser: (user) => set({ user, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clearError: () => set({ error: null }),

  restoreSession: async () => {
    if (get()._restoring) return
    set({ _restoring: true, loading: true })
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const urlToken = urlParams.get('token')
      const urlError = urlParams.get('error')
      const urlErrorDetail = urlParams.get('error_detail')

      // Clean URL params immediately to prevent re-processing
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      if (urlError) {
        if (urlError === 'oauth_not_configured') {
          set({ user: null, loading: false, _restoring: false, error: 'Google sign-in is being configured. Please use email or phone to sign in.' })
        } else {
          const detailMap: Record<string, string> = {
            'redirect_uri_mismatch': 'OAuth redirect URI mismatch. Add "https://aidraft.bond/api/auth-google-callback" in Google Cloud Console > APIs & Services > Credentials > OAuth client > Authorized redirect URIs.',
            'access_denied': 'Google sign-in was denied. You may need to be added as a test user if the app is in Testing mode.',
            'invalid_request': `Invalid OAuth request: ${urlErrorDetail || 'unknown'}`,
            'unauthorized_client': 'This OAuth client is not authorized. Check the client config in Google Cloud Console.',
            'token_exchange_failed': `Token exchange failed: ${urlErrorDetail || 'unknown'}`,
            'no_user_info': `Could not get user info from Google: ${urlErrorDetail || 'unknown'}`,
            'google_signin_failed': `Server error during sign-in: ${urlErrorDetail || 'unknown'}`,
            'missing_code': 'No authorization code received from Google.',
          }
          const message = detailMap[urlError] || `Google sign-in error: ${urlError}${urlErrorDetail ? ' — ' + urlErrorDetail : ''}`
          console.error('[restoreSession] Google OAuth error:', urlError, urlErrorDetail)
          set({ user: null, loading: false, _restoring: false, error: message })
        }
        return
      }

      // Handle OAuth callback: token from redirect flow
      if (urlToken) {
        localStorage.setItem('aidraft_auth_token', urlToken)
        try {
          const data = await apiPost<AuthResponse>('/auth-verify', { token: urlToken })
          if (data.success && data.user) {
            localStorage.setItem('aidraft_current_uid', data.user.uid)
            set({ user: data.user, loading: false, _restoring: false })
            get().syncToCRM(data.user)
            loadUserDataAfterAuth()
            return
          }
        } catch {
          localStorage.removeItem('aidraft_auth_token')
        }
      }

      // Restore session from localStorage token
      const token = localStorage.getItem('aidraft_auth_token')
      if (!token) {
        set({ user: null, loading: false, _restoring: false })
        return
      }
      const data = await apiPost<AuthResponse>('/auth-verify', { token })
      if (data.success && data.user) {
        localStorage.setItem('aidraft_current_uid', data.user.uid)
        set({ user: data.user, loading: false, _restoring: false })
        // Load profile and data from Firestore in background
        loadUserDataAfterAuth()
      } else {
        localStorage.removeItem('aidraft_auth_token')
        set({ user: null, loading: false, _restoring: false })
      }
    } catch (err) {
      console.error('[restoreSession] Unexpected error:', err)
      localStorage.removeItem('aidraft_auth_token')
      set({ user: null, loading: false, _restoring: false })
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null })
    try {
      window.location.href = `${API_BASE}/auth-google-url`
    } catch (err: any) {
      console.error('[loginWithGoogle]', err)
      set({ error: err?.message || 'Google sign-in failed', loading: false })
    }
  },

  handleGoogleCredential: async (credential: string) => {
    set({ loading: true, error: null })
    try {
      const data = await apiPost<AuthResponse>('/auth-google', { idToken: credential })
      if (data.success && data.token && data.user) {
        localStorage.setItem('aidraft_auth_token', data.token)
        localStorage.setItem('aidraft_current_uid', data.user.uid)
        set({ user: data.user, loading: false })
        get().syncToCRM(data.user)
        loadUserDataAfterAuth()
      } else {
        throw new Error(data.error || 'Google sign-in failed')
      }
    } catch (err: any) {
      console.error('[auth-google]', err)
      set({ error: err?.message || 'Google sign-in failed', loading: false })
    }
  },

  loginWithEmail: async (email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const data = await apiPost<AuthResponse>('/auth-email-signin', { email, password })
      if (data.success && data.token && data.user) {
        localStorage.setItem('aidraft_auth_token', data.token)
        localStorage.setItem('aidraft_current_uid', data.user.uid)
        set({ user: data.user, loading: false })
        get().syncToCRM(data.user)
        loadUserDataAfterAuth()
      } else {
        throw new Error(data.error || 'Sign-in failed')
      }
    } catch (err: any) {
      set({ error: err?.message || 'Sign-in failed', loading: false })
    }
  },

  signUpWithEmail: async (email: string, password: string, displayName?: string) => {
    set({ loading: true, error: null })
    try {
      const data = await apiPost<AuthResponse>('/auth-email-signup', { email, password, displayName })
      if (data.success && data.token && data.user) {
        localStorage.setItem('aidraft_auth_token', data.token)
        localStorage.setItem('aidraft_current_uid', data.user.uid)
        set({ user: data.user, loading: false })
        get().syncToCRM(data.user)
        loadUserDataAfterAuth()
      } else {
        throw new Error(data.error || 'Account creation failed')
      }
    } catch (err: any) {
      set({ error: err?.message || 'Account creation failed', loading: false })
    }
  },

  sendPhoneOTP: async (phoneNumber: string) => {
    set({ loading: true, error: null, phoneInProgress: true, phoneOTP: null })
    try {
      const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
      const data = await apiPost<{ success: boolean; sessionId: string; otp?: string; message: string }>('/auth-phone-send', { phoneNumber: formatted })
      if (data.success && data.sessionId) {
        set({ phoneSessionId: data.sessionId, phoneOTP: data.otp || null, loading: false })
      } else {
        throw new Error('Failed to send OTP')
      }
    } catch (err: any) {
      set({ error: err?.message || 'Failed to send OTP', loading: false, phoneInProgress: false })
    }
  },

  verifyPhoneOTP: async (otp: string) => {
    set({ loading: true, error: null })
    try {
      const { phoneSessionId: sessionId } = get()
      if (!sessionId) throw new Error('No verification in progress')
      const data = await apiPost<AuthResponse>('/auth-phone-verify', { sessionId, otp })
      if (data.success && data.token && data.user) {
        localStorage.setItem('aidraft_auth_token', data.token)
        localStorage.setItem('aidraft_current_uid', data.user.uid)
        set({ user: data.user, loading: false, phoneSessionId: null, phoneInProgress: false })
        get().syncToCRM(data.user)
        // CRITICAL FIX: was missing data load after phone login
        loadUserDataAfterAuth()
      } else {
        throw new Error(data.error || 'OTP verification failed')
      }
    } catch (err: any) {
      set({ error: err?.message || 'OTP verification failed', loading: false })
    }
  },

  logout: async () => {
    // CRITICAL: Flush any pending Firestore sync BEFORE clearing data
    // This ensures cases/documents created in this session are saved
    try {
      const appStore = await import('@/store/app-store')
      await appStore.flushSyncToFirestore()
    } catch { /* best effort — don't block logout */ }

    try {
      // Lazy-import firebase to avoid module-level initialization issues
      const { auth } = await import('./firebase')
      await auth.signOut()
    } catch { /* ignore */ }

    // Remove only auth-specific keys — do NOT wipe aidraft_app, aidraft_profile, aidraft_clients
    // Those stores will be rehydrated from Firestore on next login
    localStorage.removeItem('aidraft_auth_token')
    localStorage.removeItem('aidraft_current_uid')
    set({ user: null, phoneSessionId: null, phoneInProgress: false, phoneOTP: null, error: null })
  },

  syncToCRM: async (user: AuthUser) => {
    try {
      const crmData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        provider: user.provider,
        createdAt: new Date().toISOString(),
        source: 'aidraft-bond',
      }
      fetch('/api/crm-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmData),
      }).catch(() => {})
    } catch { /* CRM sync failure should not affect user */ }
  },
}))
