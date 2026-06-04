import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProfileData } from '@/lib/types';
import { apiCall, getAuthToken, getCurrentUid } from '@/lib/api-client';
import { debouncedSave } from './app-store';

interface ProfileState {
  profile: ProfileData;
  setProfile: (profile: ProfileData) => void;
  updateProfile: (updates: Partial<ProfileData>) => void;
  loadProfile: (profile?: ProfileData) => void;
  clearProfile: () => void;
  saveProfileToFirestore: () => Promise<void>;
}

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

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: { ...defaultProfile },

      setProfile: (profile) => {
        set({ profile: profile || { ...defaultProfile } });
        debouncedSave();
      },
      updateProfile: (updates) => {
        set((s) => ({
          profile: { ...s.profile, ...updates },
        }));
        // Use debounced save — don't fire immediate write on every keystroke
        debouncedSave();
      },
      loadProfile: (profile) => {
        // IMPORTANT: Don't overwrite local persisted profile with empty/undefined data
        // during refresh. Only load when profile has actual values.
        if (!profile) return;
        set({ profile: { ...defaultProfile, ...profile } });
      },
      clearProfile: () => set({ profile: { ...defaultProfile } }),
      saveProfileToFirestore: async () => {
        const token = getAuthToken();
        const uid = getCurrentUid();
        if (!token || !uid) return;
        try {
          await apiCall(
            '/user-data',
            {
              action: 'saveProfile',
              uid,
              data: get().profile,
            },
            token,
          );
        } catch (err) {
          console.error('Failed to save profile:', err);
        }
      },
    }),
    {
      name: 'aidraft_profile_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profile: state.profile }),
    },
  ),
);
