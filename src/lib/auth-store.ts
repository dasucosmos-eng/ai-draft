import { apiCall, apiGet, getApiBaseUrl, setAuthToken, setCurrentUid, clearAuth } from '@/lib/api-client';
import { useAppStore, setSaveLock } from '@/store/app-store';
import { useProfileStore } from '@/store/profile-store';
import { useClientsStore } from '@/store/clients-store';
import { useSubscriptionStore } from '@/store/subscription-store';

// Track whether data persistence handlers are installed
let _persistenceInstalled = false;

function installPersistenceHandlers() {
  if (_persistenceInstalled || typeof window === 'undefined') return;
  _persistenceInstalled = true;

  // BUG #3 FIX: Save on page close/navigate away
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon approach: fire-and-forget, like social media apps
    const token = localStorage.getItem('aidraft_auth_token');
    const uid = localStorage.getItem('aidraft_current_uid');
    if (!token || !uid || !useAppStore.getState().dataLoaded) return;

    // Synchronous save attempt via sendBeacon (fire-and-forget, like social media)
    const state = useAppStore.getState();
    const profile = useProfileStore.getState().profile;
    const clients = useClientsStore.getState().clients;
    const subscription = useSubscriptionStore.getState().subscription;

    const payload = JSON.stringify({
      action: 'save',
      _token: token, // sendBeacon can't set headers, so pass token in body
      uid,
      cases: state.cases,
      documents: state.documents,
      tasks: state.tasks,
      timelineEvents: state.timelineEvents,
      invoices: state.invoices,
      clients,
      profile,
      chatMessages: state.chatMessages,
      subscription,
    });

    try {
      navigator.sendBeacon(
        `${getApiBaseUrl()}/user-data`,
        new Blob([payload], { type: 'application/json' })
      );
      console.log('[persistence] Saved via sendBeacon on page unload');
    } catch {
      console.warn('[persistence] sendBeacon failed, data may not be saved');
    }
  });

  // BUG #5 FIX: Reload data when tab becomes visible again (multi-tab sync)
  let _lastReload = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    // Throttle: don't reload more than once every 30 seconds
    const now = Date.now();
    if (now - _lastReload < 30000) return;
    _lastReload = now;

    const token = localStorage.getItem('aidraft_auth_token');
    const uid = localStorage.getItem('aidraft_current_uid');
    if (!token || !uid) return;

    console.log('[persistence] Tab visible — reloading data for sync...');
    setSaveLock(true);
    loadAllUserData(uid, token).finally(() => {
      setSaveLock(false);
    });
  });
}

export async function loadAllUserData(uid: string, token: string): Promise<void> {
  // Lock saves during data load to prevent empty overwrite
  setSaveLock(true);

  try {
    const result = await apiCall('/user-data', { action: 'load', uid }, token);
    if (result.success && result.data) {
      useAppStore.getState().loadFromFirestoreData(result.data);
      useProfileStore.getState().loadProfile(result.data.profile);
      useClientsStore.getState().setClients(result.data.clients || []);
      useSubscriptionStore.getState().setSubscription(result.data.subscription);
      console.log(`[load] ✓ Loaded ${result.data.cases?.length || 0} cases, ${result.data.clients?.length || 0} clients, ${result.data.documents?.length || 0} docs`);
    } else {
      // New user — no data yet, just mark as loaded
      useAppStore.getState().loadFromFirestoreData({});
      useProfileStore.getState().loadProfile(undefined);
      useClientsStore.getState().setClients([]);
      useSubscriptionStore.getState().clearSubscription();
    }
  } catch (err) {
    // If load fails (e.g., new user, no Firestore doc yet), start fresh
    console.warn('[load] Failed to load user data (may be new user):', err);
    useAppStore.getState().loadFromFirestoreData({});
    useProfileStore.getState().loadProfile(undefined);
    useClientsStore.getState().setClients([]);
    useSubscriptionStore.getState().clearSubscription();
  } finally {
    // Unlock saves after data is loaded
    setSaveLock(false);
  }
}

export async function verifyAndRestore(): Promise<boolean> {
  const token = localStorage.getItem('aidraft_auth_token');
  const uid = localStorage.getItem('aidraft_current_uid');
  if (!token || !uid) return false;

  try {
    const result = await apiCall('/auth-verify', { token }, token);
    if (result.success) {
      installPersistenceHandlers(); // Install save/visibility handlers once
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
  installPersistenceHandlers();
  await loadAllUserData(result.user.uid, result.token);
  return { token: result.token, uid: result.user.uid };
}

export async function emailSignin(email: string, password: string): Promise<{ token: string; uid: string }> {
  const result = await apiCall('/auth-email-signin', { email, password });
  setAuthToken(result.token);
  setCurrentUid(result.user.uid);
  installPersistenceHandlers();
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
  installPersistenceHandlers();
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
      installPersistenceHandlers();
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

export async function logout(): Promise<void> {
  // BUG #4 FIX: Flush pending saves BEFORE clearing data
  try {
    const { flushSaveToFirestore } = await import('@/store/app-store');
    await flushSaveToFirestore();
    console.log('[logout] Saved pending data before logout');
  } catch (err) {
    console.warn('[logout] Failed to flush before logout:', err);
  }

  // Also fire a sendBeacon as backup
  const token = localStorage.getItem('aidraft_auth_token');
  const uid = localStorage.getItem('aidraft_current_uid');
  if (token && uid && useAppStore.getState().dataLoaded) {
    const state = useAppStore.getState();
    const profile = useProfileStore.getState().profile;
    const clients = useClientsStore.getState().clients;
    const subscription = useSubscriptionStore.getState().subscription;

    const payload = JSON.stringify({
      action: 'save',
      _token: token, // sendBeacon can't set headers, so pass token in body
      uid,
      cases: state.cases,
      documents: state.documents,
      tasks: state.tasks,
      timelineEvents: state.timelineEvents,
      invoices: state.invoices,
      clients,
      profile,
      chatMessages: state.chatMessages,
      subscription,
    });

    try {
      navigator.sendBeacon(
        `${getApiBaseUrl()}/user-data`,
        new Blob([payload], { type: 'application/json' })
      );
    } catch { /* best effort */ }
  }

  // NOW clear everything
  clearAuth();
  useAppStore.getState().clearAllData();
  useProfileStore.getState().clearProfile();
  useClientsStore.getState().clearClients();
  useSubscriptionStore.getState().clearSubscription();
}
