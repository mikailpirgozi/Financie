'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';

/**
 * Top-level error boundary required by @sentry/nextjs to capture errors that
 * bubble up past the per-route error.tsx (e.g. errors thrown in the root
 * layout). See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="sk">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
