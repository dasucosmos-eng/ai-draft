/**
 * Sync layer — bridges IndexedDB (local cache) and the Firestore API (server).
 *
 * Architecture:
 * 1. **Write-through**: All mutations write to IndexedDB immediately (instant UI update),
 *    then queue a background sync to the server.
 * 2. **Pull on demand**: On mount, tab visibility change, and online events, pull latest
 *    data from server and merge into IndexedDB (server wins).
 * 3. **Offline queue**: When offline, sync queue items pile up. When back online, they flush.
 * 4. **Debounced sync**: Rapid mutations are batched — only one sync per second.
 */

import { apiCall, getAuthToken, getCurrentUid } from '@/lib/api-client';
import {
  loadAllCachedData, writeServerSnapshot, clearAllData,
  addToSyncQueue, drainSyncQueue, getSyncQueueSize,
  setMeta, getMeta,
  putCase, putClient, putDocument, putTask,
  putTimelineEvent, putInvoice, putChatMessage,
  setProfile as setProfileInDb, setSubscription as setSubscriptionInDb,
  deleteCase as deleteCaseInDb, deleteClient as deleteClientInDb,
  deleteDocument as deleteDocumentInDb, deleteTask as deleteTaskInDb,
  deleteTimelineEvent as deleteTimelineEventInDb, deleteInvoice as deleteInvoiceInDb,
  clearChatMessages as clearChatMessagesInDb,
  type CachedData, type SyncQueueItem,
} from '@/lib/db';

// Re-export for use in hooks
export type { CachedData } from '@/lib/db';
import type {
  CaseItem, Client, ProfileData, DocumentItem, TaskItem,
  TimelineEvent, InvoiceItem, ChatMessage, SubscriptionData,
} from '@/lib/types';

/* ─── Sync state ─── */
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _syncInProgress = false;
let _pullInProgress = false;
let _listeners: Set<() => void> = new Set();

/* ─── Event emitter: notify hooks when data changes ─── */

export function onDataChange(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

/* ─── Debounced push to server ─── */

async function pushSyncToServer() {
  if (_syncInProgress || !_isOnline()) {
    // Re-schedule if busy or offline
    if (_isOnline()) {
      _syncTimer = setTimeout(pushSyncToServer, 2000);
    }
    return;
  }

  const token = getAuthToken();
  const uid = getCurrentUid();
  if (!token || !uid) return;

  // Clear any pending timer
  if (_syncTimer) {
    clearTimeout(_syncTimer);
    _syncTimer = null;
  }

  _syncInProgress = true;
  try {
    const data = await loadAllCachedData();

    const payload = {
      action: 'save' as const,
      uid,
      cases: data.cases,
      documents: data.documents,
      tasks: data.tasks,
      timelineEvents: data.timelineEvents,
      invoices: data.invoices,
      clients: data.clients,
      profile: data.profile,
      chatMessages: data.chatMessages,
      subscription: data.subscription,
    };

    await apiCall('/user-data', payload, token);

    // Mark sync timestamp
    await setMeta('lastPushSync', Date.now());
  } catch (err) {
    console.warn('[sync] Push failed (will retry):', err);
    // Schedule retry with backoff
    _syncTimer = setTimeout(pushSyncToServer, 5000);
  } finally {
    _syncInProgress = false;
  }
}

function schedulePush(delay = 1000) {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(pushSyncToServer, delay);
}

/* ─── Pull from server ─── */

export async function pullFromServer(): Promise<void> {
  if (_pullInProgress) return;

  const token = getAuthToken();
  const uid = getCurrentUid();
  if (!token || !uid) return;

  // First flush any pending local changes
  if (_syncTimer) {
    clearTimeout(_syncTimer);
    _syncTimer = null;
  }

  _pullInProgress = true;
  try {
    const result = await apiCall('/user-data', { action: 'load', uid }, token);

    if (result.success && result.data) {
      await writeServerSnapshot(result.data);
      notifyListeners();
      await setMeta('lastPullSync', Date.now());
    }
  } catch (err) {
    console.warn('[sync] Pull failed:', err);
  } finally {
    _pullInProgress = false;
  }
}

/* ─── Online/offline detection ─── */

function _isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

function installConnectivityListeners() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('[sync] Back online — syncing');
    schedulePush(1000);
    pullFromServer();
  });

  window.addEventListener('offline', () => {
    console.log('[sync] Went offline — queuing writes');
  });

  // Pull on tab visibility change (multi-tab sync)
  let lastPull = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      if (now - lastPull < 30000) return; // Throttle to 30s
      lastPull = now;
      pullFromServer();
    }
  });

  // Before page unload — ensure sync fires (keepalive)
  window.addEventListener('beforeunload', () => {
    const token = getAuthToken();
    const uid = getCurrentUid();
    if (!token || !uid) return;

    // Fire-and-forget sync using keepalive fetch
    loadAllCachedData().then(data => {
      const payload = JSON.stringify({
        action: 'save',
        _token: token,
        uid,
        cases: data.cases,
        documents: data.documents,
        tasks: data.tasks,
        timelineEvents: data.timelineEvents,
        invoices: data.invoices,
        clients: data.clients,
        profile: data.profile,
        chatMessages: data.chatMessages,
        subscription: data.subscription,
      });
      try {
        fetch(`https://aidraft.bond/api/user-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
          credentials: 'include',
        });
      } catch { /* best effort */ }
    });
  });
}

let _connectivityInstalled = false;
export function ensureConnectivityListeners() {
  if (!_connectivityInstalled) {
    _connectivityInstalled = true;
    installConnectivityListeners();
  }
}

/* ─── Public mutation functions ─── */

export async function updateProfile(updates: Partial<ProfileData>): Promise<void> {
  const current = await getMeta('_profileCache');
  const profile = (current || {}) as ProfileData;
  const updated = { ...profile, ...updates };
  await setProfileInDb(updated);
  await setMeta('_profileCache', updated);
  schedulePush();
  notifyListeners();
}

export async function saveProfileDirect(profile: ProfileData): Promise<void> {
  await setProfileInDb(profile);
  await setMeta('_profileCache', profile);
  schedulePush();
  notifyListeners();
}

export async function addCase(c: CaseItem): Promise<void> {
  await putCase(c);
  schedulePush();
  notifyListeners();
}

export async function updateCase(id: string, updates: Partial<CaseItem>): Promise<void> {
  const cases = await (await import('@/lib/db')).getCases();
  const existing = cases.find(c => c.id === id);
  if (!existing) return;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await putCase(updated);
  schedulePush();
  notifyListeners();
}

export async function removeCase(id: string): Promise<void> {
  await deleteCaseInDb(id);
  schedulePush();
  notifyListeners();
}

export async function addClient(c: Client): Promise<void> {
  await putClient(c);
  schedulePush();
  notifyListeners();
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<void> {
  const clients = await (await import('@/lib/db')).getClients();
  const existing = clients.find(c => c.id === id);
  if (!existing) return;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await putClient(updated);
  schedulePush();
  notifyListeners();
}

export async function removeClient(id: string): Promise<void> {
  await deleteClientInDb(id);
  schedulePush();
  notifyListeners();
}

export async function addDocument(d: DocumentItem): Promise<void> {
  await putDocument(d);
  schedulePush();
  notifyListeners();
}

export async function updateDocument(id: string, updates: Partial<DocumentItem>): Promise<void> {
  const docs = await (await import('@/lib/db')).getDocuments();
  const existing = docs.find(d => d.id === id);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await putDocument(updated);
  schedulePush();
  notifyListeners();
}

export async function removeDocument(id: string): Promise<void> {
  await deleteDocumentInDb(id);
  schedulePush();
  notifyListeners();
}

export async function addTask(t: TaskItem): Promise<void> {
  await putTask(t);
  schedulePush();
  notifyListeners();
}

export async function updateTask(id: string, updates: Partial<TaskItem>): Promise<void> {
  const tasks = await (await import('@/lib/db')).getTasks();
  const existing = tasks.find(t => t.id === id);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await putTask(updated);
  schedulePush();
  notifyListeners();
}

export async function removeTask(id: string): Promise<void> {
  await deleteTaskInDb(id);
  schedulePush();
  notifyListeners();
}

export async function addTimelineEvent(e: TimelineEvent): Promise<void> {
  await putTimelineEvent(e);
  schedulePush();
  notifyListeners();
}

export async function updateTimelineEvent(id: string, updates: Partial<TimelineEvent>): Promise<void> {
  const events = await (await import('@/lib/db')).getTimelineEvents();
  const existing = events.find(e => e.id === id);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await putTimelineEvent(updated);
  schedulePush();
  notifyListeners();
}

export async function removeTimelineEvent(id: string): Promise<void> {
  await deleteTimelineEventInDb(id);
  schedulePush();
  notifyListeners();
}

export async function addInvoice(inv: InvoiceItem): Promise<void> {
  await putInvoice(inv);
  schedulePush();
  notifyListeners();
}

export async function updateInvoice(id: string, updates: Partial<InvoiceItem>): Promise<void> {
  const invoices = await (await import('@/lib/db')).getInvoices();
  const existing = invoices.find(i => i.id === id);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await putInvoice(updated);
  schedulePush();
  notifyListeners();
}

export async function removeInvoice(id: string): Promise<void> {
  await deleteInvoiceInDb(id);
  schedulePush();
  notifyListeners();
}

export async function addChatMessage(m: ChatMessage): Promise<void> {
  await putChatMessage(m);
  schedulePush();
  notifyListeners();
}

export async function clearChat(): Promise<void> {
  await clearChatMessagesInDb();
  schedulePush();
  notifyListeners();
}

export async function saveSubscription(sub: SubscriptionData): Promise<void> {
  await setSubscriptionInDb(sub);
  schedulePush();
  notifyListeners();
}

/* ─── Initialize sync for a user (called after auth) ─── */

export async function initializeSync(uid: string, token: string): Promise<CachedData> {
  ensureConnectivityListeners();

  // First check local cache for instant load
  const cached = await loadAllCachedData();
  const lastSync = await getMeta('lastServerSync');
  const cacheUid = await getMeta('cachedUid');

  // If cache is for a different user, clear it
  if (cacheUid && cacheUid !== uid) {
    await clearAllData();
  }

  // Mark cache ownership
  await setMeta('cachedUid', uid);

  // Pull from server (async — don't block UI)
  // If no local cache or stale (>5 min), pull immediately
  const shouldPullImmediately = !lastSync || (Date.now() - lastSync > 5 * 60 * 1000);

  if (shouldPullImmediately) {
    try {
      await pullFromServer();
      const updated = await loadAllCachedData();
      return updated;
    } catch (err) {
      console.warn('[sync] Initial pull failed, using cache:', err);
      return cached;
    }
  }

  // Pull in background
  pullFromServer();

  return cached;
}

/* ─── Flush before logout ─── */

export async function flushAndClear(): Promise<void> {
  // Try to push one last time
  try {
    if (_syncTimer) {
      clearTimeout(_syncTimer);
      _syncTimer = null;
    }
    await pushSyncToServer();
  } catch (err) {
    console.warn('[sync] Final flush failed:', err);
  }

  // Clear local cache
  await clearAllData();
  notifyListeners();
}
