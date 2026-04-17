import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
// TODO: parameterize SupabaseClient<Database> once db:types are real (see
// packages/core/src/database.types.ts).
import { env, serverEnv } from '@/lib/env';

let _adminClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client authenticated with the service role key.
 *
 * USE WITH CARE: this client bypasses Row Level Security and must NEVER be
 * exposed to the browser or returned from any API endpoint that takes user
 * input directly.
 *
 * Valid use cases:
 *   - Stripe / external webhooks (no user session available, but signature
 *     of the request has already been verified)
 *   - Cron jobs / Edge Functions running on a schedule
 *   - Admin maintenance scripts running server-side
 */
export function createAdminClient(): SupabaseClient {
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
        'This key is required for admin operations (Stripe webhooks, cron jobs).'
    );
  }

  if (_adminClient) {
    return _adminClient;
  }

  _adminClient = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
