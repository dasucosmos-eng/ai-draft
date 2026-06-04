/**
 * Profile Store — DELEGATED to sync-layer.
 *
 * This is a compatibility shim. New code should use `useProfile()` from
 * `@/hooks/use-user-data.ts` instead.
 *
 * The store reads from sync-layer and delegates mutations.
 */

import { create } from 'zustand';
import type { ProfileData } from '@/lib/types';
import { updateProfile as syncUpdateProfile, saveProfileDirect as syncSaveProfileDirect, onDataChange } from '@/lib/sync-layer';
import { getProfile } from '@/lib/db';

const defaultProfile: ProfileData = {
  fullName: '',
  email: '',
  phone: '',
  barCouncilNumber: '',
  firmName: '',
  city: '',
  firmAddress: '',
  practiceArea: '',
  stampLine: '',
  logoUrl: '',
  isComplete: false,
  completedAt: null,
};

interface ProfileState {
  profile: ProfileData;
  setProfile: (profile: ProfileData) => void;
  updateProfile: (updates: Partial<ProfileData>) => void;
  loadProfile: (profile?: ProfileData) => void;
  clearProfile: () => void;
  saveProfileToFirestore: () => Promise<void>;
  _synced: boolean;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: { ...defaultProfile },
  _synced: false,

  setProfile: (profile) => {
    set({ profile: profile || { ...defaultProfile } });
    syncSaveProfileDirect(profile || { ...defaultProfile });
  },
  updateProfile: (updates) => {
    set((s) => ({
      profile: { ...s.profile, ...updates },
    }));
    syncUpdateProfile(updates);
  },
  loadProfile: (profile) => {
    set({ profile: profile || { ...defaultProfile } });
  },
  clearProfile: () => set({ profile: { ...defaultProfile } }),
  saveProfileToFirestore: async () => {
    await syncSaveProfileDirect(get().profile);
  },
}));
