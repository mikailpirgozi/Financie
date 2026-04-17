/**
 * !!! PLACEHOLDER — REGENERATE BEFORE USE !!!
 *
 * This file is a stub committed to keep the build green until the first real
 * generation runs. To replace it with the actual Supabase schema types:
 *
 *   1. supabase login
 *   2. supabase link --project-ref <ref-from-supabase/config.toml>
 *   3. pnpm db:types
 *
 * In CI the same is achieved via SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN
 * secrets — see .github/workflows/ci.yml -> "db-types-drift" job.
 *
 * Until regenerated this file exposes a permissive `Database` type so the
 * Supabase clients compile, but they will fall back to runtime-only typing.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Minimal shape that satisfies @supabase/supabase-js generic constraints.
// The real generated file replaces every `any` with the concrete row/insert/
// update/relationship types from the linked project.
export interface Database {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any; Relationships: any[] }>;
    Views: Record<string, { Row: any; Relationships: any[] }>;
    Functions: Record<string, { Args: any; Returns: any }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
}
