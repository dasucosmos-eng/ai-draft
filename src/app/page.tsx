'use client';

import { useState, useEffect } from 'react';
import { verifyAndRestore, handleTokenFromUrl } from '@/lib/auth-store';
import { useAppStore } from '@/store/app-store';
import { LoginView } from '@/components/auth/login-view';
import { AppLayout } from '@/components/shared/app-layout';
import { Loader2 } from 'lucide-react';
import { loadAllCachedData } from '@/lib/db';

export default function HomePage() {
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'unauth'>('loading');
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    async function init() {
      // Check for token in URL (Google OAuth callback)
      const urlToken = await handleTokenFromUrl();
      if (urlToken) {
        setAuthState('auth');
        setDataReady(true);
        return;
      }

      // Check existing token
      const valid = await verifyAndRestore();
      if (valid) {
        setAuthState('auth');
        // Small delay to let IndexedDB data propagate to stores
        setTimeout(() => setDataReady(true), 100);
      } else {
        setAuthState('unauth');
      }
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
