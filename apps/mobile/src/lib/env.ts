/**
 * Environment variable validation for mobile app.
 *
 * Manual validation — avoids importing Zod at the module-scope
 * entry-point chain to keep startup lightweight.
 */

interface Env {
  EXPO_PUBLIC_API_URL: string;
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  EXPO_PUBLIC_REVENUECAT_IOS_KEY?: string;
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?: string;
  EXPO_PUBLIC_SENTRY_DSN?: string;
  EXPO_PUBLIC_SENTRY_ENVIRONMENT?: string;
}

/** Holds the env validation error message if env vars are missing */
export let envError: string | null = null;

function validateEnv(): Env {
  const rawEnv = {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
  };

  const missing: string[] = [];

  if (!rawEnv.EXPO_PUBLIC_API_URL) missing.push('EXPO_PUBLIC_API_URL');
  if (!rawEnv.EXPO_PUBLIC_SUPABASE_URL) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    envError = `Missing environment variables: ${missing.join(', ')}`;
    console.error('[env] Validation failed:', envError);

    return {
      EXPO_PUBLIC_API_URL: rawEnv.EXPO_PUBLIC_API_URL ?? 'https://missing-api-url.invalid',
      EXPO_PUBLIC_SUPABASE_URL:
        rawEnv.EXPO_PUBLIC_SUPABASE_URL ?? 'https://missing-supabase-url.invalid',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-key',
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
      EXPO_PUBLIC_SENTRY_ENVIRONMENT: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
    };
  }

  return {
    EXPO_PUBLIC_API_URL: rawEnv.EXPO_PUBLIC_API_URL!,
    EXPO_PUBLIC_SUPABASE_URL: rawEnv.EXPO_PUBLIC_SUPABASE_URL!,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: rawEnv.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: rawEnv.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    EXPO_PUBLIC_SENTRY_DSN: rawEnv.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: rawEnv.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
  };
}

export const env = validateEnv();
