import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url('Invalid API URL'),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().optional(),
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

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

  const result = envSchema.safeParse(rawEnv);

  if (result.success) {
    return result.data;
  }

  // Build error message but DON'T throw - let the app render an error screen
  const missingVars = result.error.issues.map((e: z.ZodIssue) => e.path.join('.')).join(', ');
  envError =
    `Missing or invalid environment variables: ${missingVars}\n` +
    `NODE_ENV: ${process.env.NODE_ENV ?? 'undefined'}\n` +
    'Ensure EAS Secrets or .env.production are configured correctly.';

  console.error('[env] Validation failed:', envError);
  console.error('[env] Raw values:', JSON.stringify(rawEnv, null, 2));

  // Return fallback so the app can at least render the error screen
  return {
    EXPO_PUBLIC_API_URL: rawEnv.EXPO_PUBLIC_API_URL ?? 'https://missing-api-url.invalid',
    EXPO_PUBLIC_SUPABASE_URL: rawEnv.EXPO_PUBLIC_SUPABASE_URL ?? 'https://missing-supabase-url.invalid',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-key',
  };
}

export const env = validateEnv();

