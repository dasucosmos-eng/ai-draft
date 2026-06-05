'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 max-w-md text-center">
        <p className="text-sm font-medium text-destructive">Something went wrong</p>
        <p className="mt-2 text-xs text-muted-foreground break-all">{error.message}</p>
        {error.digest && (
          <p className="mt-1 text-[10px] text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
