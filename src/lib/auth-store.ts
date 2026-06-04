import { apiCall, apiGet, getApiBaseUrl, setAuthToken, setCurrentUid, clearAuth } from '@/lib/api-client';
import { useAppStore } from '@/store/app-store';
import { useProfileStore } from '@/store/profile-store';
import { useClientsStore } from '@/store/clients-store';
import { useSubscriptionStore } from '@/store/subscription-store';

export async function loadAllUserData(uid: string, token: string): Promise<void> {
  try {
    const result = await apiCall('/user-data', { action: 'load', uid }, token);
    if (result.success && result.data) {
      useAppStore.getState().loadFromFirestoreData(result.data);
      useProfileStore.getState().loadProfile(result.data.profile);
      useClientsStore.getState().setClients(result.data.clients || []);
      useSubscriptionStore.getState().setSubscription(result.data.subscription);
    } else {
      // New user — no data yet, just mark as loaded
      useAppStore.getState().loadFromFirestoreData({});
      useProfileStore.getState().loadProfile(undefined);
      useClientsStore.getState().setClients([]);
      useSubscriptionStore.getState().setSubscription(undefined);
    }
  } catch (err) {
    // If load fails (e.g., new user, no Firestore doc yet), start fresh
    console.warn('Failed to load user data (may be new user):', err);
    useAppStore.getState().loadFromFirestoreData({});
    useProfileStore.getState().loadProfile(undefined);
    useClientsStore.getState().setClients([]);
    useSubscriptionStore.getState().setSubscription(undefined);
  }
}

export async function verifyAndRestore(): Promise<boolean> {
  const token = localStorage.getItem('aidraft_auth_token');
  const uid = localStorage.getItem('aidraft_current_uid');
  if (!token || !uid) return false;

  try {
    const result = await apiCall('/auth-verify', { token }, token);
    if (result.success) {
      await loadAllUserData(uid, token);
      return true;
    }
    clearAuth();
    return false;
  } catch {
    clearAuth();
    return false;
  }
}

export async function googleAuth(): Promise<void> {
  // The Cloud Function returns a 302 redirect directly — just navigate to it
  window.location.href = `${getApiBaseUrl()}/auth-google-url`;
}

export async function emailSignup(email: string, password: string, displayName: string): Promise<{ token: string; uid: string }> {
  const result = await apiCall('/auth-email-signup', { email, password, displayName });
  setAuthToken(result.token);
  setCurrentUid(result.user.uid);
  await loadAllUserData(result.user.uid, result.token);
  return { token: result.token, uid: result.user.uid };
}

export async function emailSignin(email: string, password: string): Promise<{ token: string; uid: string }> {
  const result = await apiCall('/auth-email-signin', { email, password });
  setAuthToken(result.token);
  setCurrentUid(result.user.uid);
  await loadAllUserData(result.user.uid, result.token);
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
  await loadAllUserData(result.user.uid, result.token);
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
      await loadAllUserData(result.user.uid, token);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function logout(): void {
  clearAuth();
  useAppStore.getState().clearAllData();
  useProfileStore.getState().clearProfile();
  useClientsStore.getState().clearClients();
  useSubscriptionStore.getState().clearSubscription();
}
