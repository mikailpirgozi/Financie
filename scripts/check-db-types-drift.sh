#!/usr/bin/env bash
# Verify that packages/core/src/database.types.ts is up to date with the linked
# Supabase schema. Used in CI to fail builds when migrations were committed but
# the regenerated types weren't.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT_DIR/packages/core/src/database.types.ts"
TMP_OUT="$(mktemp -t db-types-XXXXXX.ts)"

trap 'rm -f "$TMP_OUT"' EXIT

cd "$ROOT_DIR"

# Re-generate into a temp file using the same logic as gen-db-types.sh.
TARGET="$TMP_OUT" bash scripts/gen-db-types.sh >/dev/null

if ! diff -u "$TARGET" "$TMP_OUT" > /tmp/db-types.diff; then
  echo "❌ packages/core/src/database.types.ts is out of date." >&2
  echo "   Run \`pnpm db:types\` and commit the result." >&2
  echo "   Diff:" >&2
  cat /tmp/db-types.diff >&2
  exit 1
fi

echo "✅ database.types.ts is in sync"
