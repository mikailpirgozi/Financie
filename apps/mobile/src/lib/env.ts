/**
 * Environment variable validation for mobile app.
 *
 * NOTE: Manual validation instead of Zod because Zod v4 crashes in
 * Hermes standalone builds (accesses navigator.userAgent which doesn't
 * exist in React Native runtime). Zod is still used elsewhere in the app
 * where it runs lazily (not at module-load time).
 */

interface Env {
  EXPO_PUBLIC_API_URL: string;
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  EXPO_PUBLIC_REVENUECAT_IOS_KEY?: string;
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?: string;
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
      EXPO_PUBLIC_SUPABASE_URL: rawEnv.EXPO_PUBLIC_SUPABASE_URL ?? 'https://missing-supabase-url.invalid',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-key',
    };
  }

  return {
    EXPO_PUBLIC_API_URL: rawEnv.EXPO_PUBLIC_API_URL!,
    EXPO_PUBLIC_SUPABASE_URL: rawEnv.EXPO_PUBLIC_SUPABASE_URL!,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: rawEnv.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: rawEnv.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  };
}

export const env = validateEnv();
