/**
 * Auth Store — handles authentication and data initialization.
 *
 * After auth succeeds:
 * 1. Initializes the sync layer (IndexedDB + Firestore sync)
 * 2. Loads data from IndexedDB (instant) and triggers background server pull
 */

import { apiCall, setAuthToken, setCurrentUid, clearAuth } from '@/lib/api-client';
import { initializeSync, flushAndClear } from '@/lib/sync-layer';
import { loadAllCachedData } from '@/lib/db';
import { initDataStoreBridge } from '@/store/data-store';

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

/* ─── Auth functions ─── */

export async function verifyAndRestore(): Promise<boolean> {
  const token = localStorage.getItem('aidraft_auth_token');
  const uid = localStorage.getItem('aidraft_current_uid');
  if (!token || !uid) return false;

  try {
    const result = await apiCall('/auth-verify', { token }, token);
    if (result.success) {
      setCachedUid(uid);
      await loadAllUserData(uid);
      await populateStores();
      return true;
    }
    clearAuth();
    clearCachedUid();
    return false;
  } catch {
    clearAuth();
    clearCachedUid();
    return false;
  }
}

export async function googleAuth(): Promise<void> {
  window.location.href = `${getApiBaseUrl()}/auth-google-url`;
}

async function onAuthSuccess(uid: string, token: string) {
  // We still keep the existing token-based auth (for Cloud Functions / API usage),
  // but user data now syncs via Firestore.
  setCachedUid(uid);
  await loadAllUserData(uid);
  await populateStores();
}

export async function emailSignup(email: string, password: string, displayName: string): Promise<{ token: string; uid: string }> {
  const result = await apiCall('/auth-email-signup', { email, password, displayName });
  setAuthToken(result.token);
  setCurrentUid(result.user.uid);
  await onAuthSuccess(result.user.uid, result.token);
  return { token: result.token, uid: result.user.uid };
}

export async function emailSignin(email: string, password: string): Promise<{ token: string; uid: string }> {
  const result = await apiCall('/auth-email-signin', { email, password });
  setAuthToken(result.token);
  setCurrentUid(result.user.uid);
  await onAuthSuccess(result.user.uid, result.token);
  return { token: result.token, uid: result.user.uid };
}

export async function phoneSendOtp(phoneNumber: string): Promise<{ sessionId: string }> {
  const result = await apiCall('/auth-phone-send', { phoneNumber });
  return { sessionId: result.sessionId };
}

export async function phoneVerifyOtp(phoneNumber: string, otp: string, sessionId: string): Promise<{ token: string; uid: string }> {
  const result = await apiCall('/auth-phone-verify', { phoneNumber, otp, sessionId });
  setAuthToken(result.token);
  setCurrentUid(result.user.uid);
  await onAuthSuccess(result.user.uid, result.token);
  return { token: result.token, uid: result.user.uid };
}

export async function handleTokenFromUrl(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return false;

  try {
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

function getApiBaseUrl(): string {
  return 'https://aidraft.bond/api';
}

export async function logout(): Promise<void> {
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
