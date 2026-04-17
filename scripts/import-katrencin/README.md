# Import Matúš Katrenčín

Jednorazový (idempotentný) import dát klienta `matus@allingroup.sk` z lokálnej
zložky `~/Desktop/Matus katrencin/` do Supabase databázy.

## Štruktúra

- `manifest.mjs` — auto-discovery 31 vozidiel zo zložkového stromu + manuálny override pre BMW M5 Competition; mergovanie s `enriched-data.json`
- `parse-loans.mjs` — text-extraction parser splátkových kalendárov (poppler `pdftotext` výstup → JSON)
- `parse-insurances.mjs` — text-extraction parser poistiek (PZP / kasko / pzp_kasko)
- `build-enriched.mjs` — kombinuje text-parsed loans + OCR loan headers + insurances do `/tmp/finapp-import/enriched-data.json`, syntetizuje anuitné rozpisy pre OCR-only úvery
- `import.mjs` — idempotentný importér (assets → loans → schedules → insurances → vehicle_documents → upload PDFs do Supabase Storage)
- `cleanup-orphans.mjs` — utility na vyčistenie storage po manuálnom DELETE z DB

## Pre-requisites

```bash
# 1. Inštalácia poppler (pdftotext) a pdftoppm pre OCR pipeline
brew install poppler

# 2. Inštalácia Node závislostí
npm install
```

V repo `.env` musia byť nastavené:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `KATRENCIN_CLIENT_PASSWORD` (heslo klientskeho účtu pre Storage upload)
- voliteľne `KATRENCIN_CLIENT_EMAIL` (default `matus@allingroup.sk`)

## Workflow

```bash
# Phase 1 — text extraction
mkdir -p /tmp/finapp-import/text
for f in "/Users/mikailpirgozi/Desktop/Matus katrencin"/*/*.pdf; do
  base=$(basename "$f" .pdf)
  pdftotext -layout "$f" "/tmp/finapp-import/text/${base}.txt" 2>/dev/null
done

# Phase 2 — parse extracted text
node parse-loans.mjs        # → /tmp/finapp-import/parsed-loans.json
node parse-insurances.mjs   # → /tmp/finapp-import/parsed-insurances.json

# Phase 3 — OCR scanned loan headers (manual; výstupy v loan-headers-ocr.json)
# Phase 4 — Skombinovať všetko
node build-enriched.mjs     # → /tmp/finapp-import/enriched-data.json

# Phase 5 — Import
node import.mjs --dry-run    # report čo by sa zmenilo
node import.mjs              # naostro
node import.mjs --only=AA620SM   # iba 1 vozidlo
```

## Idempotencia

Všetky inserty kontrolujú existenciu podľa unikátnych kľúčov:

- `assets`: `(household_id, license_plate)` (pre vehicle kind)
- `loans`: `(household_id, linked_asset_id)` so `status = 'active'` — 1 aktívny úver na vozidlo
- `loan_schedules`: `(loan_id, installment_no)` — DB UNIQUE constraint, použité `ON CONFLICT DO UPDATE`
- `insurances`: `(household_id, policy_number)` — pre file bez čísla v názve sa generuje `AUTO-...` placeholder
- `vehicle_documents`: `(asset_id, document_type, valid_to)`
- `loan_documents`: `(loan_id, file_path)`

Pri opakovanom spustení sa nič neduplikuje.

## Konvencia `file_path` v Storage

```
documents/{household_id}/loans/{loan_id}/<filename>
documents/{household_id}/insurances/{insurance_id}/<filename>
documents/{household_id}/vehicle_documents/{document_id}/<filename>
```

Diakritika v názvoch súborov sa pri uploade transliteruje (`safeStorageName`).

## Známé hranice

- TP scany sú väčšinou ČASŤ II → neobsahujú technické špecifikácie (motor, výkon, farba, palivo). Tieto polia sú v DB `NULL` (treba doplniť ručne alebo z ČASTI I, ak existuje).
- Skenované splátkové kalendáre (Oberbank, Toyota, Porsche, ČSOB, ŠKODA Financial, VW Financial) → ročná sadzba a rozpis sú **syntetizované** z hlavičky (principal / term / monthly_payment). Pre leasingy s reziduálom je sadzba 0% a `balloon_amount` obsahuje kúpnu cenu na konci.
- VIN sa extrahuje len pre 5 vozidiel (AA032PM, AA869BT, BT727HE, BT357HH, AA620SM); ostatné majú VIN `NULL`.
- Cena poistky chýba u veriteľov, ktorí ju neuvádzajú v hlavičke (Komunálna, Wüstenrot, Kooperativa).
