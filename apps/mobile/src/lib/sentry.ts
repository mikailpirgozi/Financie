/**
 * Sentry — React Native init for the mobile app.
 *
 * Initialised once at startup from app/_layout.tsx via initSentry(). The DSN
 * comes from the EXPO_PUBLIC_SENTRY_DSN env (set via EAS Secrets — see
 * apps/mobile/EAS_SECRETS.md). When the DSN is missing we no-op so dev builds
 * stay silent and don't pollute a production project with simulator events.
 */
import * as Sentry from '@sentry/react-native';
import { env } from './env';

let initialised = false;

export function initSentry(): void {
  if (initialised) return;
  initialised = true;

  const dsn = env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      console.log('[sentry] EXPO_PUBLIC_SENTRY_DSN not set — skipping init');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || (__DEV__ ? 'development' : 'production'),
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    enableNativeFramesTracking: !__DEV__,
    attachStacktrace: true,
    beforeSend(event) {
      if (__DEV__ && env.EXPO_PUBLIC_SENTRY_ENVIRONMENT !== 'development') {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
