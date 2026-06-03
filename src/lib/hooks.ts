'use client'

import { useSyncExternalStore } from 'react'

/**
 * Returns `false` on the server and `true` on the client after hydration.
 * Uses useSyncExternalStore to avoid the React 19 lint rule
 * that prohibits calling setState inside useEffect.
 */
const emptySubscribe = () => () => {}

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,  // client snapshot
    () => false  // server snapshot
  )
}
