/**
 * IndexedDB local cache layer using `idb` library.
 *
 * Provides instant reads, write-through persistence, and offline support.
 * All business data (cases, clients, documents, etc.) is cached here.
 * The sync layer (sync-layer.ts) handles background sync to the server.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type {
  CaseItem, Client, ProfileData, DocumentItem, TaskItem,
  TimelineEvent, InvoiceItem, ChatMessage, SubscriptionData,
} from '@/lib/types';

/* ─── Database name / version ─── */
const DB_NAME = 'ai-draft-cache';
const DB_VERSION = 1;

/* ─── Store names ─── */
const STORES = {
  profile: 'profile',
  cases: 'cases',
  clients: 'clients',
  documents: 'documents',
  tasks: 'tasks',
  timelineEvents: 'timelineEvents',
  invoices: 'invoices',
  chatMessages: 'chatMessages',
  subscription: 'subscription',
  syncQueue: 'syncQueue',
  meta: 'meta',
} as const;

/* ─── Singleton DB instance ─── */
let _db: IDBPDatabase | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Profile (single doc keyed by 'current')
      if (!db.objectStoreNames.contains(STORES.profile)) {
        db.createObjectStore(STORES.profile);
      }
      // Collections (keyed by item id)
      for (const name of [
        STORES.cases, STORES.clients, STORES.documents,
        STORES.tasks, STORES.timelineEvents, STORES.invoices,
        STORES.chatMessages,
      ]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
      // Subscription (single doc)
      if (!db.objectStoreNames.contains(STORES.subscription)) {
        db.createObjectStore(STORES.subscription);
      }
      // Sync queue (auto-increment keys)
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        db.createObjectStore(STORES.syncQueue, { keyPath: undefined, autoIncrement: true });
      }
      // Meta (key-value store)
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta);
      }
    },
  });

  return _db;
}

/* ─── Types for sync queue ─── */
export interface SyncQueueItem {
  action: 'save' | 'saveProfile' | 'deleteCase';
  collection: string;
  data: any;
  timestamp: number;
}

/* ─── Generic collection helpers ─── */

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return db.getAll(storeName);
}

async function putToStore<T>(storeName: string, value: T, key?: string): Promise<void> {
  const db = await getDb();
  await db.put(storeName, value, key);
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await getDb();
  await db.delete(storeName, key);
}

async function clearStore(storeName: string): Promise<void> {
  const db = await getDb();
  await db.clear(storeName);
}

/* ─── Profile operations ─── */

export async function getProfile(): Promise<ProfileData | null> {
  const db = await getDb();
  return db.get(STORES.profile, 'current');
}

export async function setProfile(profile: ProfileData): Promise<void> {
  await putToStore(STORES.profile, profile, 'current');
}

/* ─── Collection operations ─── */

export async function getCases(): Promise<CaseItem[]> {
  return getAllFromStore<CaseItem>(STORES.cases);
}
export async function putCase(c: CaseItem): Promise<void> {
  await putToStore(STORES.cases, c, c.id);
}
export async function putCases(cases: CaseItem[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.cases, 'readwrite');
  await Promise.all(cases.map(c => tx.store.put(c, c.id)));
  await tx.done;
}
export async function deleteCase(id: string): Promise<void> {
  await deleteFromStore(STORES.cases, id);
}

export async function getClients(): Promise<Client[]> {
  return getAllFromStore<Client>(STORES.clients);
}
export async function putClient(c: Client): Promise<void> {
  await putToStore(STORES.clients, c, c.id);
}
export async function putClients(clients: Client[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.clients, 'readwrite');
  await Promise.all(clients.map(c => tx.store.put(c, c.id)));
  await tx.done;
}
export async function deleteClient(id: string): Promise<void> {
  await deleteFromStore(STORES.clients, id);
}

export async function getDocuments(): Promise<DocumentItem[]> {
  return getAllFromStore<DocumentItem>(STORES.documents);
}
export async function putDocument(d: DocumentItem): Promise<void> {
  await putToStore(STORES.documents, d, d.id);
}
export async function putDocuments(docs: DocumentItem[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.documents, 'readwrite');
  await Promise.all(docs.map(d => tx.store.put(d, d.id)));
  await tx.done;
}
export async function deleteDocument(id: string): Promise<void> {
  await deleteFromStore(STORES.documents, id);
}

export async function getTasks(): Promise<TaskItem[]> {
  return getAllFromStore<TaskItem>(STORES.tasks);
}
export async function putTask(t: TaskItem): Promise<void> {
  await putToStore(STORES.tasks, t, t.id);
}
export async function putTasks(tasks: TaskItem[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.tasks, 'readwrite');
  await Promise.all(tasks.map(t => tx.store.put(t, t.id)));
  await tx.done;
}
export async function deleteTask(id: string): Promise<void> {
  await deleteFromStore(STORES.tasks, id);
}

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  return getAllFromStore<TimelineEvent>(STORES.timelineEvents);
}
export async function putTimelineEvent(e: TimelineEvent): Promise<void> {
  await putToStore(STORES.timelineEvents, e, e.id);
}
export async function putTimelineEvents(events: TimelineEvent[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.timelineEvents, 'readwrite');
  await Promise.all(events.map(e => tx.store.put(e, e.id)));
  await tx.done;
}
export async function deleteTimelineEvent(id: string): Promise<void> {
  await deleteFromStore(STORES.timelineEvents, id);
}

export async function getInvoices(): Promise<InvoiceItem[]> {
  return getAllFromStore<InvoiceItem>(STORES.invoices);
}
export async function putInvoice(inv: InvoiceItem): Promise<void> {
  await putToStore(STORES.invoices, inv, inv.id);
}
export async function putInvoices(invoices: InvoiceItem[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.invoices, 'readwrite');
  await Promise.all(invoices.map(i => tx.store.put(i, i.id)));
  await tx.done;
}
export async function deleteInvoice(id: string): Promise<void> {
  await deleteFromStore(STORES.invoices, id);
}

export async function getChatMessages(): Promise<ChatMessage[]> {
  return getAllFromStore<ChatMessage>(STORES.chatMessages);
}
export async function putChatMessage(m: ChatMessage): Promise<void> {
  await putToStore(STORES.chatMessages, m, m.id);
}
export async function putChatMessages(messages: ChatMessage[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORES.chatMessages, 'readwrite');
  await Promise.all(messages.map(m => tx.store.put(m, m.id)));
  await tx.done;
}
export async function clearChatMessages(): Promise<void> {
  await clearStore(STORES.chatMessages);
}

/* ─── Subscription ─── */

export async function getSubscription(): Promise<SubscriptionData | null> {
  const db = await getDb();
  return db.get(STORES.subscription, 'current');
}
export async function setSubscription(sub: SubscriptionData): Promise<void> {
  await putToStore(STORES.subscription, sub, 'current');
}

/* ─── Sync Queue ─── */

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDb();
  await db.add(STORES.syncQueue, item);
}

export async function drainSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const items = await db.getAll(STORES.syncQueue) as SyncQueueItem[];
  await clearStore(STORES.syncQueue);
  return items;
}

export async function getSyncQueueSize(): Promise<number> {
  const db = await getDb();
  return db.count(STORES.syncQueue);
}

/* ─── Meta store ─── */

export async function getMeta(key: string): Promise<any> {
  const db = await getDb();
  return db.get(STORES.meta, key);
}

export async function setMeta(key: string, value: any): Promise<void> {
  const db = await getDb();
  await db.put(STORES.meta, value, key);
}

/* ─── Clear all data (for logout / uid change) ─── */

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    [STORES.profile, STORES.cases, STORES.clients, STORES.documents,
     STORES.tasks, STORES.timelineEvents, STORES.invoices,
     STORES.chatMessages, STORES.subscription, STORES.syncQueue, STORES.meta],
    'readwrite'
  );
  await Promise.all([
    ...Array.from(tx.objectStoreNames).map(name => tx.objectStore(name).clear()),
    tx.done,
  ]);
}

/* ─── Load all data from IndexedDB (for initial hydration) ─── */

export interface CachedData {
  profile: ProfileData | null;
  cases: CaseItem[];
  clients: Client[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  timelineEvents: TimelineEvent[];
  invoices: InvoiceItem[];
  chatMessages: ChatMessage[];
  subscription: SubscriptionData | null;
}

export async function loadAllCachedData(): Promise<CachedData> {
  const [profile, cases, clients, documents, tasks, timelineEvents, invoices, chatMessages, subscription] = await Promise.all([
    getProfile(),
    getCases(),
    getClients(),
    getDocuments(),
    getTasks(),
    getTimelineEvents(),
    getInvoices(),
    getChatMessages(),
    getSubscription(),
  ]);

  return {
    profile,
    cases,
    clients,
    documents,
    tasks,
    timelineEvents,
    invoices,
    chatMessages,
    subscription,
  };
}

/* ─── Write entire snapshot from server (server wins) ─── */

export async function writeServerSnapshot(data: {
  profile?: ProfileData;
  cases?: CaseItem[];
  clients?: Client[];
  documents?: DocumentItem[];
  tasks?: TaskItem[];
  timelineEvents?: TimelineEvent[];
  invoices?: InvoiceItem[];
  chatMessages?: ChatMessage[];
  subscription?: SubscriptionData;
}): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    [STORES.profile, STORES.cases, STORES.clients, STORES.documents,
     STORES.tasks, STORES.timelineEvents, STORES.invoices,
     STORES.chatMessages, STORES.subscription, STORES.meta],
    'readwrite'
  );

  // Clear and write each collection
  await tx.objectStore(STORES.cases).clear();
  if (data.cases?.length) {
    await Promise.all(data.cases.map(c => tx.objectStore(STORES.cases).put(c, c.id)));
  }

  await tx.objectStore(STORES.clients).clear();
  if (data.clients?.length) {
    await Promise.all(data.clients.map(c => tx.objectStore(STORES.clients).put(c, c.id)));
  }

  await tx.objectStore(STORES.documents).clear();
  if (data.documents?.length) {
    await Promise.all(data.documents.map(d => tx.objectStore(STORES.documents).put(d, d.id)));
  }

  await tx.objectStore(STORES.tasks).clear();
  if (data.tasks?.length) {
    await Promise.all(data.tasks.map(t => tx.objectStore(STORES.tasks).put(t, t.id)));
  }

  await tx.objectStore(STORES.timelineEvents).clear();
  if (data.timelineEvents?.length) {
    await Promise.all(data.timelineEvents.map(e => tx.objectStore(STORES.timelineEvents).put(e, e.id)));
  }

  await tx.objectStore(STORES.invoices).clear();
  if (data.invoices?.length) {
    await Promise.all(data.invoices.map(i => tx.objectStore(STORES.invoices).put(i, i.id)));
  }

  await tx.objectStore(STORES.chatMessages).clear();
  if (data.chatMessages?.length) {
    await Promise.all(data.chatMessages.map(m => tx.objectStore(STORES.chatMessages).put(m, m.id)));
  }

  if (data.profile) {
    await tx.objectStore(STORES.profile).put(data.profile, 'current');
  }
  if (data.subscription) {
    await tx.objectStore(STORES.subscription).put(data.subscription, 'current');
  }

  // Update meta with sync timestamp
  await tx.objectStore(STORES.meta).put(Date.now(), 'lastServerSync');
  await tx.done;
}
