/**
 * Sync layer — bridges IndexedDB (local cache) and Firestore (server).
 *
 * Goal: social-app experience.
 * - Instant UI from IndexedDB cache
 * - Writes are optimistic + debounced
 * - Firestore is the source of truth
 * - Firestore SDK provides offline persistence (IndexedDB) separately
 */

import {
  loadAllCachedData,
  writeServerSnapshot,
  clearAllData,
  setMeta,
  getMeta,
  putCase,
  putClient,
  putDocument,
  putTask,
  putTimelineEvent,
  putInvoice,
  putChatMessage,
  setProfile as setProfileInDb,
  setSubscription as setSubscriptionInDb,
  deleteCase as deleteCaseInDb,
  deleteClient as deleteClientInDb,
  deleteDocument as deleteDocumentInDb,
  deleteTask as deleteTaskInDb,
  deleteTimelineEvent as deleteTimelineEventInDb,
  deleteInvoice as deleteInvoiceInDb,
  clearChatMessages as clearChatMessagesInDb,
  type CachedData,
} from '@/lib/db';

// Re-export for use in hooks
export type { CachedData } from '@/lib/db';

import type {
  CaseItem,
  Client,
  ProfileData,
  DocumentItem,
  TaskItem,
  TimelineEvent,
  InvoiceItem,
  ChatMessage,
  SubscriptionData,
  UserDataPayload,
} from '@/lib/types';

import { getFirebaseDb } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore';

/* ─── Sync state ─── */
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _syncInProgress = false;
let _pullInProgress = false;
let _listeners: Set<() => void> = new Set();
let _currentUid: string | null = null;
let _firestoreUnsubscribe: Unsubscribe | null = null;

/* ─── Event emitter: notify hooks when data changes ─── */

export function onDataChange(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

/* ─── Firestore document helpers ─── */

function userDataDoc(uid: string): DocumentReference {
  // Single-document shape for now (compatible with existing payload).
  // Later: migrate to subcollections: clients/, drafts/, etc.
  return doc(getFirebaseDb(), 'users', uid, 'app', 'data');
}

function _isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

/* ─── Debounced push to Firestore ─── */

async function pushSyncToServer() {
  if (_syncInProgress || !_isOnline()) {
    if (_isOnline()) _syncTimer = setTimeout(pushSyncToServer, 2000);
    return;
  }

  const uid = _currentUid;
  if (!uid) return;

  if (_syncTimer) {
    clearTimeout(_syncTimer);
    _syncTimer = null;
  }

  _syncInProgress = true;
  try {
    const data = await loadAllCachedData();

    const payload: UserDataPayload & {
      _meta?: { updatedAt?: unknown; schemaVersion?: number };
    } = {
      cases: data.cases,
      documents: data.documents,
      tasks: data.tasks,
      timelineEvents: data.timelineEvents,
      invoices: data.invoices,
      clients: data.clients,
      profile: data.profile || undefined,
      chatMessages: data.chatMessages,
      subscription: data.subscription || undefined,
      _meta: {
        updatedAt: serverTimestamp(),
        schemaVersion: 1,
      },
    };

    // merge:true prevents accidental wipe of fields if we add more later.
    await setDoc(userDataDoc(uid), payload, { merge: true });
    await setMeta('lastPushSync', Date.now());
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isPermissionDenied = errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission-denied');
    console.error('[sync] Push to Firestore failed:', isPermissionDenied ? 'PERMISSION_DENIED — check Firestore rules' : errMsg);
    if (!isPermissionDenied) {
      _syncTimer = setTimeout(pushSyncToServer, 5000);
    }
  } finally {
    _syncInProgress = false;
  }
}

function schedulePush(delay = 1000) {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(pushSyncToServer, delay);
}

/* ─── Pull from Firestore ─── */

export async function pullFromServer(): Promise<void> {
  if (_pullInProgress) return;

  const uid = _currentUid;
  if (!uid) return;

  if (_syncTimer) {
    clearTimeout(_syncTimer);
    _syncTimer = null;
  }

  _pullInProgress = true;
  try {
    const snap = await getDoc(userDataDoc(uid));
    if (snap.exists()) {
      const data = snap.data() as UserDataPayload;
      await writeServerSnapshot(data);
      notifyListeners();
      await setMeta('lastPullSync', Date.now());
    } else {
      // New user doc not yet created: do nothing (keep cached data)
      // The first write will create it.
      await setMeta('lastPullSync', Date.now());
    }
  } catch (err) {
    console.warn('[sync] Pull from Firestore failed:', err);
  } finally {
    _pullInProgress = false;
  }
}

/* ─── Connectivity listeners ─── */

function installConnectivityListeners() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('[sync] Back online — syncing');
    schedulePush(1000);
    pullFromServer();
  });

  // Pull on tab visibility change (multi-tab sync)
  let lastPull = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      if (now - lastPull < 30000) return;
      lastPull = now;
      pullFromServer();
    }
  });

  // Best-effort flush on unload.
  // Note: Firestore writes are async; browsers may cancel them.
  window.addEventListener('beforeunload', () => {
    try {
      if (_currentUid) {
        // Trigger a debounced flush immediately.
        schedulePush(0);
      }
    } catch {
      // best-effort
    }
  });
}

let _connectivityInstalled = false;
export function ensureConnectivityListeners() {
  if (!_connectivityInstalled) {
    _connectivityInstalled = true;
    installConnectivityListeners();
  }
}

/* ─── Public mutation functions (write-through cache + schedule push) ─── */

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
  const existing = cases.find((c) => c.id === id);
  if (!existing) return;
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
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
  const existing = clients.find((c) => c.id === id);
  if (!existing) return;
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
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
  const existing = docs.find((d) => d.id === id);
  if (!existing) return;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
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
  const existing = tasks.find((t) => t.id === id);
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
  const existing = events.find((e) => e.id === id);
  if (!existing) return;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
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
  const existing = invoices.find((i) => i.id === id);
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

export async function initializeSync(uid: string): Promise<CachedData> {
  ensureConnectivityListeners();
  _currentUid = uid;

  const cached = await loadAllCachedData();
  const lastSync = await getMeta('lastServerSync');
  const cacheUid = await getMeta('cachedUid');

  if (cacheUid && cacheUid !== uid) {
    await clearAllData();
  }

  await setMeta('cachedUid', uid);

  // Set up real-time Firestore listener for instant cross-tab/cross-device sync
  setupFirestoreListener(uid);

  const shouldPullImmediately = !lastSync || Date.now() - lastSync > 5 * 60 * 1000;

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

  pullFromServer();
  return cached;
}

/* ─── Real-time Firestore listener ─── */

function setupFirestoreListener(uid: string) {
  // Detach previous listener if any
  if (_firestoreUnsubscribe) {
    _firestoreUnsubscribe();
    _firestoreUnsubscribe = null;
  }

  try {
    const docRef = userDataDoc(uid);
    _firestoreUnsubscribe = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as UserDataPayload;

      // Write server snapshot to local IndexedDB
      writeServerSnapshot(data).then(() => {
        notifyListeners();
        return setMeta('lastPullSync', Date.now());
      }).catch((err) => {
        console.warn('[sync] Failed to write server snapshot to IndexedDB:', err);
      });
    }, (err) => {
      // Log permission errors clearly — this means Firestore rules are wrong
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission-denied')) {
        console.error('[sync] Firestore listener PERMISSION_DENIED — check Firestore rules at users/{uid}/app/{docId}');
      }
    });
  } catch (err) {
    console.warn('[sync] Failed to set up Firestore listener:', err);
  }
}

/* ─── Flush before logout ─── */

export async function flushAndClear(): Promise<void> {
  try {
    if (_syncTimer) {
      clearTimeout(_syncTimer);
      _syncTimer = null;
    }
    // Detach Firestore real-time listener
    if (_firestoreUnsubscribe) {
      _firestoreUnsubscribe();
      _firestoreUnsubscribe = null;
    }
    await pushSyncToServer();
  } catch (err) {
    console.warn('[sync] Final flush failed:', err);
  }

  _currentUid = null;
  await clearAllData();
  notifyListeners();
}
