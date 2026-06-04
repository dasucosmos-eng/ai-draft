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
