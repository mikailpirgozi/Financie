/**
 * Sentry — browser SDK init.
 *
 * Loaded automatically by @sentry/nextjs when the file exists at the project
 * root. We make the DSN optional: if it isn't configured we no-op so local
 * dev / forks don't get noisy warnings or accidentally send events to a
 * production project.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    // Performance: 10 % of transactions in prod, 100 % everywhere else.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Replay: only on errors in prod to keep the bundle small.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      // Drop events from local dev unless explicitly opted in.
      if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT !== 'development'
      ) {
        return null;
      }
      return event;
    },
  });
}
