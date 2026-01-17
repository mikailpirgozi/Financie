import { z } from 'zod';

/**
 * Environment variable schema for server-side
 * These are only available on the server
 */
const serverEnvSchema = z.object({
  // Supabase (server-side service role - optional for some operations)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Environment variable schema for client-side
 * These are exposed to the browser (NEXT_PUBLIC_ prefix)
 */
const clientEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  
  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().default('http://localhost:3000'),
  
  // Stripe (client-side)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validate and get server environment variables
 * Only call this on the server-side
 */
function getServerEnv(): ServerEnv {
  const env = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    return serverEnvSchema.parse(env);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const missingVars = err.issues.map((e: z.ZodIssue) => e.path.join('.')).join(', ');
      console.error(`[ENV] Server env validation failed: ${missingVars}`);
    }
    throw err;
  }
}

/**
 * Validate and get client environment variables
 * Safe to use on both server and client
 */
function getClientEnv(): ClientEnv {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
  };

  try {
    return clientEnvSchema.parse(env);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const missingVars = err.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `Missing or invalid environment variables:\n${missingVars}\n` +
        'Please check your .env.local file and ensure all required variables are set.'
      );
    }
    throw err;
  }
}

// Lazy initialization to avoid errors during build
let _serverEnv: ServerEnv | null = null;
let _clientEnv: ClientEnv | null = null;

/**
 * Server environment variables
 * Only use in server components and API routes
 */
export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    if (_serverEnv === null) {
      _serverEnv = getServerEnv();
    }
    return _serverEnv[prop];
  },
});

/**
 * Client environment variables
 * Safe to use anywhere (server and client)
 */
export const env = new Proxy({} as ClientEnv, {
  get(_target, prop: keyof ClientEnv) {
    if (_clientEnv === null) {
      _clientEnv = getClientEnv();
    }
    return _clientEnv[prop];
  },
});
