'use client';

import { useState, useEffect } from 'react';
import { verifyAndRestore, handleTokenFromUrl, onAuthStateChange } from '@/lib/auth-store';
import { useAppStore } from '@/store/app-store';
import { LoginView } from '@/components/auth/login-view';
import { AppLayout } from '@/components/shared/app-layout';
import { Loader2 } from 'lucide-react';
import { loadAllCachedData } from '@/lib/db';
import type { User } from 'firebase/auth';

export default function HomePage() {
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'unauth'>('loading');
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function init() {
      // Check for token in URL (old Google OAuth callback — backward compat)
      const urlToken = await handleTokenFromUrl();
      if (urlToken && mounted) {
        setAuthState('auth');
        setDataReady(true);
        return;
      }

      // Try to restore from existing Firebase session
      const valid = await verifyAndRestore();
      if (valid && mounted) {
        setAuthState('auth');
        setTimeout(() => setDataReady(true), 100);
        return;
      }

      // If no existing session, listen for auth state changes
      // (e.g., user signs in via popup/redirect)
      if (!mounted) return;
      unsubscribe = onAuthStateChange((user: User | null) => {
        if (!mounted) return;

        if (user) {
          setAuthState('auth');
          setTimeout(() => setDataReady(true), 100);
        } else {
          setAuthState('unauth');
        }
      });
    }

    init();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
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

  // Wait for IndexedDB data to hydrate stores
  if (!dataReady) {
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
