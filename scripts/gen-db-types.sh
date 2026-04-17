#!/usr/bin/env bash
# Generate Supabase TypeScript types from the linked project schema.
#
# Usage:
#   scripts/gen-db-types.sh                 # uses linked project (supabase link)
#   SUPABASE_PROJECT_REF=xxx \
#     SUPABASE_ACCESS_TOKEN=sbp_... \
#     scripts/gen-db-types.sh               # CI-style, no `supabase login` needed
#
# The output is written to packages/core/src/database.types.ts and consumed by
# `apps/web/src/lib/supabase/*` and `apps/mobile/src/lib/supabase.ts` as
# `createClient<Database>(...)`. Always commit the regenerated file.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Allow callers (drift checker) to override the destination via $TARGET.
OUT_FILE="${TARGET:-$ROOT_DIR/packages/core/src/database.types.ts}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ supabase CLI not found. Install with: brew install supabase/tap/supabase" >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "ℹ️  Generating types from project-id=$SUPABASE_PROJECT_REF (CI mode)"
  supabase gen types typescript \
    --project-id "$SUPABASE_PROJECT_REF" \
    --schema public \
    > "$OUT_FILE.tmp"
else
  echo "ℹ️  Generating types from linked project (run \`supabase link\` if missing)"
  supabase gen types typescript \
    --linked \
    --schema public \
    > "$OUT_FILE.tmp"
fi

# Prepend a banner so reviewers understand the file is generated.
{
  cat <<'BANNER'
/**
 * !!! AUTO-GENERATED — DO NOT EDIT BY HAND !!!
 *
 * Regenerate with:  pnpm db:types
 *
 * Source:  supabase gen types typescript --linked --schema public
 * Owner:   Supabase project (see supabase/config.toml -> project_id)
 */
/* eslint-disable */
// @ts-nocheck-disabled — keep type errors visible

BANNER
  cat "$OUT_FILE.tmp"
} > "$OUT_FILE"

rm -f "$OUT_FILE.tmp"

echo "✅ Wrote $OUT_FILE"
