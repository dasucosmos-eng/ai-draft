/**
 * Auth Store — handles authentication using Firebase Client Auth SDK.
 *
 * After auth succeeds:
 * 1. Gets Firebase ID token for API calls
 * 2. Initializes the sync layer (IndexedDB + Firestore sync)
 * 3. Loads data from IndexedDB (instant) and triggers background server pull
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type User,
  type ConfirmationResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { setAuthToken, setCurrentUid, clearAuth } from '@/lib/api-client';
import { initializeSync, flushAndClear } from '@/lib/sync-layer';
import { loadAllCachedData } from '@/lib/db';
import { initDataStoreBridge } from '@/store/data-store';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/* ─── Cache uid to detect account switches ─── */

function getCachedUid(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('aidraft_cached_uid');
}

function setCachedUid(uid: string): void {
  localStorage.setItem('aidraft_cached_uid', uid);
}

function clearCachedUid(): void {
  localStorage.removeItem('aidraft_cached_uid');
}

/* ─── Load all user data via sync layer ─── */

export async function loadAllUserData(uid: string): Promise<void> {
  try {
    await initializeSync(uid);
  } catch (err) {
    console.warn('[auth] Failed to initialize sync:', err);
  }
}

/* ─── Ensure compatibility stores get populated from IndexedDB ─── */

async function populateStores() {
  try {
    const data = await loadAllCachedData();

    // Initialize the data store bridge (keeps Zustand in sync with IndexedDB)
    await initDataStoreBridge();

    // Populate compatibility stores
    if (data.profile) {
      const { useProfileStore } = await import('@/store/profile-store');
      useProfileStore.getState().loadProfile(data.profile);
    }
    if (data.clients?.length) {
      const { useClientsStore } = await import('@/store/clients-store');
      useClientsStore.getState().setClients(data.clients);
    }
    if (data.subscription) {
      const { useSubscriptionStore } = await import('@/store/subscription-store');
      useSubscriptionStore.getState().setSubscription(data.subscription);
    }
  } catch (err) {
    console.warn('[auth] Failed to populate stores:', err);
  }
}

/* ─── Process Firebase user after sign-in ─── */

async function processFirebaseUser(user: User): Promise<{ uid: string; token: string }> {
  const uid = user.uid;
  const token = await user.getIdToken();

  // Store token and uid for API calls
  setAuthToken(token);
  setCurrentUid(uid);
  setCachedUid(uid);

  // Load user data
  await loadAllUserData(uid);
  await populateStores();

  return { uid, token };
}

/* ─── Token refresh handler ─── */

let _tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;

function startTokenRefresh(user: User) {
  stopTokenRefresh();
  // Refresh token every 55 minutes (Firebase ID tokens expire in 1 hour)
  _tokenRefreshTimer = setInterval(async () => {
    try {
      const newToken = await user.getIdToken(true); // force refresh
      setAuthToken(newToken);
    } catch (err) {
      console.warn('[auth] Token refresh failed:', err);
    }
  }, 55 * 60 * 1000);
}

function stopTokenRefresh() {
  if (_tokenRefreshTimer) {
    clearInterval(_tokenRefreshTimer);
    _tokenRefreshTimer = null;
  }
}

/* ─── Auth State Change Listener ─── */

let _authListenerUnsubscribe: (() => void) | null = null;

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();

  // Clean up any existing listener
  if (_authListenerUnsubscribe) {
    _authListenerUnsubscribe();
  }

  _authListenerUnsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      startTokenRefresh(user);
    } else {
      stopTokenRefresh();
    }
    callback(user);
  });

  return _authListenerUnsubscribe;
}

/* ─── Verify and restore session ─── */

export async function verifyAndRestore(): Promise<boolean> {
  const cachedUid = getCachedUid();
  if (!cachedUid) return false;

  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) return false;

    // Verify the user is still valid by forcing a token refresh
    const token = await user.getIdToken(true);
    setAuthToken(token);
    setCurrentUid(user.uid);
    setCachedUid(user.uid);

    await loadAllUserData(user.uid);
    await populateStores();
    startTokenRefresh(user);
    return true;
  } catch {
    clearAuth();
    clearCachedUid();
    return false;
  }
}

/* ─── Google Sign-In (popup) ─── */

export async function googleAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await processFirebaseUser(result.user);
  } catch (err: any) {
    console.error('[auth] Google sign-in failed:', err?.code, err?.message);
    // Re-throw with a user-friendly message based on error code
    if (err?.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
    }
    if (err?.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in popup was closed before completing.');
    }
    if (err?.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in. Please contact support.');
    }
    if (err?.code === 'auth/invalid-api-key' || err?.code === 'auth/api-key-not-authorized') {
      throw new Error('Firebase configuration error. Please check your API key.');
    }
    if (err?.code?.includes('are-blocked') || err?.message?.includes('identitytoolkit')?.includes('are-blocked')) {
      throw new Error('Identity Toolkit API is blocked. Go to Google Cloud Console > APIs & Services > ensure "Identity Toolkit API" is enabled and not restricted.');
    }
    throw new Error(err?.message || 'Google sign-in failed');
  }
}

/* ─── Email Sign-Up ─── */

export async function emailSignup(
  email: string,
  password: string,
  displayName: string
): Promise<{ token: string; uid: string }> {
  const auth = getFirebaseAuth();
  const result = await createUserWithEmailAndPassword(auth, email, password);

  // Update display name if provided
  if (displayName) {
    await result.user.updateProfile({ displayName });
  }

  return processFirebaseUser(result.user);
}

/* ─── Email Sign-In ─── */

export async function emailSignin(
  email: string,
  password: string
): Promise<{ token: string; uid: string }> {
  const auth = getFirebaseAuth();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return processFirebaseUser(result.user);
}

/* ─── Phone OTP ─── */

let _recaptchaVerifier: RecaptchaVerifier | null = null;
let _confirmationResult: ConfirmationResult | null = null;

export function initRecaptcha(containerId: string): void {
  const auth = getFirebaseAuth();
  _recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
  });
}

export async function phoneSendOtp(phoneNumber: string): Promise<{ confirmationResult: ConfirmationResult }> {
  const auth = getFirebaseAuth();

  // Clear previous reCAPTCHA verifier to prevent stale state errors
  if (_recaptchaVerifier) {
    try {
      _recaptchaVerifier.clear();
    } catch {
      // Ignore if already cleared
    }
    _recaptchaVerifier = null;
  }

  // Create invisible reCAPTCHA verifier if not already created
  if (!_recaptchaVerifier) {
    // Use a hidden div element as the container
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      document.body.appendChild(container);
    }
    _recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        console.log('[auth] reCAPTCHA verified');
      },
    });
  }

  _confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, _recaptchaVerifier);
  return { confirmationResult: _confirmationResult };
}

export async function phoneVerifyOtp(
  _phoneNumber: string,
  otp: string,
  _sessionId?: string
): Promise<{ token: string; uid: string }> {
  if (!_confirmationResult) {
    throw new Error('No phone verification in progress. Please request an OTP first.');
  }

  const result = await _confirmationResult.confirm(otp);
  _confirmationResult = null;

  // Clear reCAPTCHA verifier after successful verification
  if (_recaptchaVerifier) {
    try {
      _recaptchaVerifier.clear();
    } catch {
      // Ignore if already cleared
    }
    _recaptchaVerifier = null;
  }

  return processFirebaseUser(result.user);
}

/* ─── Handle token from URL (backward compat for old Google OAuth callback) ─── */

export async function handleTokenFromUrl(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const error = params.get('error');

  // If there's an error from the old OAuth flow, show it and redirect
  if (error) {
    console.warn('[auth] OAuth error from URL:', error);
    window.history.replaceState({}, '', window.location.pathname);
    return false;
  }

  if (!token) return false;

  try {
    // Old tokens were custom JWT. Try to verify via the server
    const { apiCall } = await import('@/lib/api-client');
    const result = await apiCall('/auth-verify', { token }, token);
    if (result.success) {
      setAuthToken(token);
      setCurrentUid(result.user.uid);
      setCachedUid(result.user.uid);
      await loadAllUserData(result.user.uid);
      await populateStores();
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* ─── Logout ─── */

export async function logout(): Promise<void> {
  try {
    stopTokenRefresh();
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[logout] Firebase signOut failed:', err);
  }

  try {
    await flushAndClear();
  } catch (err) {
    console.warn('[logout] Failed to flush:', err);
  }

  clearAuth();
  clearCachedUid();

  // Clear compatibility stores
  try {
    const { useAppStore } = await import('@/store/app-store');
    useAppStore.getState().setCurrentView('dashboard');
    useAppStore.getState().setSelectedCaseId(null);

    const { useProfileStore } = await import('@/store/profile-store');
    useProfileStore.getState().clearProfile();

    const { useClientsStore } = await import('@/store/clients-store');
    useClientsStore.getState().clearClients();

    const { useSubscriptionStore } = await import('@/store/subscription-store');
    useSubscriptionStore.getState().clearSubscription();
  } catch {
    /* best effort */
  }
}
