import { createBrowserClient } from '@supabase/ssr';
// Once `pnpm db:types` has produced a real schema (replacing the placeholder
// in packages/core/src/database.types.ts), import { Database } from '@finapp/core'
// and pass it as the generic to createBrowserClient<Database>(...).
import { env } from '@/lib/env';

export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
