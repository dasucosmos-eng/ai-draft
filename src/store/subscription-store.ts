/**
 * Subscription Store — DELEGATED to sync-layer.
 *
 * This is a compatibility shim. New code should use `useSubscription()` from
 * `@/hooks/use-user-data.ts` instead.
 */

import { create } from 'zustand';
import type { SubscriptionData } from '@/lib/types';

interface SubscriptionState {
  subscription: SubscriptionData;
  setSubscription: (sub: SubscriptionData) => void;
  clearSubscription: () => void;
}

const defaultSubscription: SubscriptionData = {
  plan: 'free',
  status: 'active',
  features: [],
};

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscription: { ...defaultSubscription },
  setSubscription: (sub) => set({ subscription: sub || { ...defaultSubscription } }),
  clearSubscription: () => set({ subscription: { ...defaultSubscription } }),
}));
