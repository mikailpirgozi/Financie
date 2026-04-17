#!/usr/bin/env bash
# =====================================================
# Security & Performance Invariants Check
# =====================================================
# Pre-flight: vyzaduje DATABASE_URL alebo SUPABASE_DB_URL.
# Pouziva psql pre spustenie supabase/tests/security_invariants.sql
# a parsuje vystup — ak sa najde ktorykolvek "(<n> row)" output kde
# n > 0, exit-code = 1.
# =====================================================
set -euo pipefail

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [ -z "$DB_URL" ]; then
  echo "::warning::DATABASE_URL/SUPABASE_DB_URL not set — skipping invariant check"
  exit 0
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "::error::psql not installed (need PostgreSQL client)"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SQL_FILE="$ROOT_DIR/supabase/tests/security_invariants.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "::error::Missing $SQL_FILE"
  exit 1
fi

echo "Running security/performance invariants from $SQL_FILE"
echo "----------------------------------------------------"

# -A: unaligned, -t: tuples-only, -F$'\t': tab separator, -X: no .psqlrc
OUTPUT=$(psql "$DB_URL" -At -F $'\t' -X -v ON_ERROR_STOP=1 -f "$SQL_FILE" 2>&1)
echo "$OUTPUT"

# Kazdy riadok ktory vyzera ako "<check_name>\t..." je invariant violation.
# psql v -At rezime nevypise hlavicky.
VIOLATIONS=$(printf '%s\n' "$OUTPUT" | grep -Ev '^(==|Ak |Pouzitie:|$)' || true)

if [ -n "$VIOLATIONS" ]; then
  echo ""
  echo "::error::SECURITY INVARIANT VIOLATIONS DETECTED:"
  echo "$VIOLATIONS"
  exit 1
fi

echo "OK — all invariants satisfied"
