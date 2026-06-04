'use client';

import { useState, useEffect } from 'react';
import { verifyAndRestore, handleTokenFromUrl } from '@/lib/auth-store';
import { useAppStore } from '@/store/app-store';
import { useProfileStore } from '@/store/profile-store';
import { useClientsStore } from '@/store/clients-store';
import { useSubscriptionStore } from '@/store/subscription-store';
import { LoginView } from '@/components/auth/login-view';
import { AppLayout } from '@/components/shared/app-layout';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'unauth'>('loading');
  const dataLoaded = useAppStore((s) => s.dataLoaded);
  const profile = useProfileStore((s) => s.profile);

  useEffect(() => {
    async function init() {
      // Check for token in URL (Google OAuth callback)
      const urlToken = await handleTokenFromUrl();
      if (urlToken) {
        setAuthState('auth');
        return;
      }

      // Check existing token
      const valid = await verifyAndRestore();
      setAuthState(valid ? 'auth' : 'unauth');
    }
    init();
  }, []);

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading AI Draft Bond...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauth') {
    return <LoginView />;
  }

  // BUG #2 FIX: Wait for data to be fully loaded from Firestore before rendering UI
  // This prevents showing empty dashboard (perceived data loss) while data is still loading
  if (!dataLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Syncing your data...</p>
        </div>
      </div>
    );
  }

  return <AppLayout />;
}
