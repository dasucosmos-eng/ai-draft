/**
 * Firestore Sync Module
 *
 * Provides real-time sync between Zustand store and Firestore for cases and other data.
 * Only activates when a user is authenticated (uid available).
 *
 * Usage: Call `initFirestoreSync(uid)` after auth, and `stopFirestoreSync()` on logout.
 */

import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { useAppStore, type CaseItem, type CaseStageDate } from '@/store/app-store'

/* ─── Firestore ↔ Store Conversion ─── */

function caseItemToFirestore(caseItem: CaseItem): Record<string, unknown> {
  return {
    id: caseItem.id,
    caseNumber: caseItem.caseNumber || null,
    title: caseItem.title,
    description: caseItem.description || null,
    caseType: caseItem.caseType,
    subType: caseItem.subType || null,
    status: caseItem.status,
    priority: caseItem.priority,
    jurisdiction: caseItem.jurisdiction || null,
    courtName: caseItem.courtName || null,
    judgeName: caseItem.judgeName || null,
    filingDate: caseItem.filingDate ? Timestamp.fromDate(new Date(caseItem.filingDate)) : null,
    nextHearing: caseItem.nextHearing ? Timestamp.fromDate(new Date(caseItem.nextHearing)) : null,
    clientName: caseItem.clientName || null,
    clientEmail: caseItem.clientEmail || null,
    clientPhone: caseItem.clientPhone || null,
    tasksCount: caseItem.tasksCount || 0,
    documentsCount: caseItem.documentsCount || 0,
    upcomingEvents: caseItem.upcomingEvents || 0,
    aiInsights: caseItem.aiInsights || null,
    caseStage: caseItem.caseStage || null,
    caseStageDates: caseItem.caseStageDates || [],
    createdAt: caseItem.createdAt ? Timestamp.fromDate(new Date(caseItem.createdAt)) : null,
    updatedAt: Timestamp.fromDate(new Date()),
  }
}

function firestoreToCaseItem(data: Record<string, unknown>): CaseItem {
  const filingDate = data.filingDate as { seconds: number; nanoseconds: number } | null
  const nextHearing = data.nextHearing as { seconds: number; nanoseconds: number } | null
  const createdAt = data.createdAt as { seconds: number; nanoseconds: number } | null
  const updatedAt = data.updatedAt as { seconds: number; nanoseconds: number } | null

  return {
    id: data.id as string,
    caseNumber: (data.caseNumber as string) || undefined,
    title: data.title as string,
    description: (data.description as string) || undefined,
    caseType: data.caseType as string,
    subType: (data.subType as string) || undefined,
    status: data.status as string,
    priority: data.priority as string,
    jurisdiction: (data.jurisdiction as string) || undefined,
    courtName: (data.courtName as string) || undefined,
    judgeName: (data.judgeName as string) || undefined,
    filingDate: filingDate ? new Date(filingDate.seconds * 1000).toISOString() : undefined,
    nextHearing: nextHearing ? new Date(nextHearing.seconds * 1000).toISOString() : undefined,
    clientName: (data.clientName as string) || undefined,
    clientEmail: (data.clientEmail as string) || undefined,
    clientPhone: (data.clientPhone as string) || undefined,
    tasksCount: (data.tasksCount as number) || undefined,
    documentsCount: (data.documentsCount as number) || undefined,
    upcomingEvents: (data.upcomingEvents as number) || undefined,
    aiInsights: (data.aiInsights as string) || undefined,
    caseStage: (data.caseStage as CaseItem['caseStage']) || undefined,
    caseStageDates: (data.caseStageDates as CaseStageDate[]) || undefined,
    createdAt: createdAt ? new Date(createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
    updatedAt: updatedAt ? new Date(updatedAt.seconds * 1000).toISOString() : new Date().toISOString(),
  }
}

/* ─── Sync State ─── */

let casesUnsubscribe: Unsubscribe | null = null
let syncEnabled = false
let isSyncingFromFirestore = false

/* ─── Push cases to Firestore ─── */

async function pushCasesToFirestore(uid: string): Promise<void> {
  try {
    const cases = useAppStore.getState().cases
    const casesRef = collection(db, 'users', uid, 'cases')

    for (const caseItem of cases) {
      const caseDoc = doc(casesRef, caseItem.id)
      await setDoc(caseDoc, caseItemToFirestore(caseItem), { merge: true })
    }
  } catch (err) {
    console.error('[firestore-sync] Error pushing cases:', err)
  }
}

/* ─── Subscribe to Firestore cases (real-time listener) ─── */

function subscribeToCases(uid: string): void {
  if (casesUnsubscribe) return

  const casesRef = collection(db, 'users', uid, 'cases')
  const q = query(casesRef)

  casesUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (!syncEnabled) return

      isSyncingFromFirestore = true
      const firestoreCases: CaseItem[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        firestoreCases.push(firestoreToCaseItem({ ...data, id: doc.id }))
      })

      // Sort by updatedAt descending
      firestoreCases.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )

      // Update store
      const currentStoreCases = useAppStore.getState().cases

      // Only update if different to avoid loops
      const storeIds = new Set(currentStoreCases.map((c) => c.id))
      const firestoreIds = new Set(firestoreCases.map((c) => c.id))
      const hasChanges =
        firestoreIds.size !== storeIds.size ||
        firestoreCases.some((fc) => {
          const sc = currentStoreCases.find((c) => c.id === fc.id)
          if (!sc) return true
          return sc.updatedAt !== fc.updatedAt
        })

      if (hasChanges) {
        useAppStore.getState().setCases(firestoreCases)
      }

      // Delay to prevent rapid back-and-forth sync
      setTimeout(() => {
        isSyncingFromFirestore = false
      }, 500)
    },
    (err) => {
      console.error('[firestore-sync] Firestore listener error:', err)
    }
  )
}

/* ─── Watch store changes and push to Firestore ─── */

let lastPushedCasesMap: Map<string, string> = new Map() // id -> updatedAt

function watchStoreCases(uid: string): () => void {
  // Initial state
  const initial = useAppStore.getState().cases
  initial.forEach((c) => lastPushedCasesMap.set(c.id, c.updatedAt))

  const unsub = useAppStore.subscribe(
    (state, prevState) => {
      if (!syncEnabled || isSyncingFromFirestore) return
      if (state.cases === prevState.cases) return

      // Check if any case actually changed
      const currentMap = new Map(state.cases.map((c) => [c.id, c.updatedAt]))
      let hasChanged = false

      for (const [id, updatedAt] of currentMap) {
        const lastPushed = lastPushedCasesMap.get(id)
        if (updatedAt !== lastPushed) {
          hasChanged = true
          break
        }
      }

      // Also check for added/removed cases
      if (currentMap.size !== lastPushedCasesMap.size) {
        hasChanged = true
      }

      if (!hasChanged) return

      // Debounced push
      lastPushedCasesMap = currentMap
      pushCasesToFirestore(uid).catch(() => {})
    }
  )

  return unsub
}

/* ─── Public API ─── */

let storeUnsubscribe: (() => void) | null = null

/**
 * Initialize Firestore sync for the given user.
 * Sets up real-time listener for cases and store watchers for bidirectional sync.
 */
export function initFirestoreSync(uid: string): void {
  if (syncEnabled) {
    // If uid changed, restart
    stopFirestoreSync()
  }

  syncEnabled = true
  console.log('[firestore-sync] Initialized for user:', uid)

  // Subscribe to Firestore changes
  subscribeToCases(uid)

  // Watch store changes and push to Firestore
  storeUnsubscribe = watchStoreCases(uid)
}

/**
 * Stop all Firestore sync listeners and watchers.
 */
export function stopFirestoreSync(): void {
  syncEnabled = false

  if (casesUnsubscribe) {
    casesUnsubscribe()
    casesUnsubscribe = null
  }

  if (storeUnsubscribe) {
    storeUnsubscribe()
    storeUnsubscribe = null
  }

  lastPushedCasesMap.clear()
  isSyncingFromFirestore = false

  console.log('[firestore-sync] Stopped')
}

/**
 * Force push all local cases to Firestore.
 */
export async function forceSyncCasesToFirestore(uid: string): Promise<void> {
  await pushCasesToFirestore(uid)
}
