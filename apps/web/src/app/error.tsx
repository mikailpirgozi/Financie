'use client';

import { useEffect } from 'react';
import { Button } from '@finapp/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry)
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Niečo sa pokazilo!</h2>
        <p className="text-muted-foreground mb-6">
          Ospravedlňujeme sa, vyskytla sa neočakávaná chyba. Skúste to prosím znova.
        </p>
        {error.message && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        )}
        <div className="flex gap-4 justify-center">
          <Button onClick={() => reset()}>Skúsiť znova</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
            Späť na dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

