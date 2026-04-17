#!/usr/bin/env node
// Importer for Matúš Katrenčín client data.
//
// Reads manifest.mjs (one entry per vehicle) and idempotently:
//   1. Inserts/updates `assets` (kind=vehicle)
//   2. Inserts loans + loan_schedules (linked via linked_asset_id)
//   3. Inserts insurances (typed by file kind: pzp / kasko / pzp_kasko)
//   4. Inserts vehicle_documents (technical_certificate, vignette + green/white card)
//   5. Uploads every original PDF to Supabase Storage and links it via
//      `loan_documents` (loans) or `file_paths` JSONB (insurances, vehicle_documents)
//
// All inserts are guarded by unique keys so re-running is safe.
//
// CLI:
//   node import.mjs --dry-run         # prints what would happen, writes nothing
//   node import.mjs                   # runs for real
//   node import.mjs --only=AA620SM    # filters by license plate substring

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { manifest, CLIENT_EMAIL, ROOT_DIR } from './manifest.mjs';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const ONLY = [...args].find(a => a.startsWith('--only='))?.split('=')[1];

// All credentials come from environment variables (see ../../.env).
// Required: SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL, KATRENCIN_CLIENT_PASSWORD
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenvConfig({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const CLIENT_PASSWORD = process.env.KATRENCIN_CLIENT_PASSWORD;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? 'documents';

for (const [k, v] of Object.entries({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  DATABASE_URL,
  KATRENCIN_CLIENT_PASSWORD: CLIENT_PASSWORD,
})) {
  if (!v) throw new Error(`Missing required env var: ${k}`);
}

const log = (...a) => console.log('[import]', ...a);
const warn = (...a) => console.warn('[import]', ...a);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sql = new pg.Client({ connectionString: DATABASE_URL });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getOrCreateInsurer(householdId, name) {
  if (!name) return null;
  const { rows } = await sql.query(
    `SELECT id FROM insurers WHERE household_id = $1 AND name = $2`,
    [householdId, name],
  );
  if (rows[0]) return rows[0].id;
  const ins = await sql.query(
    `INSERT INTO insurers (household_id, name) VALUES ($1, $2) RETURNING id`,
    [householdId, name],
  );
  return ins.rows[0].id;
}

// Encode for Supabase storage path: spaces, diacritics OK; just url-encode segments.
function safeStorageName(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // safe chars only
}

async function uploadPdf(localPath, storageKey) {
  if (DRY_RUN) {
    log(`  [DRY] upload ${path.basename(localPath)} → ${storageKey}`);
    return { size: fs.statSync(localPath).size };
  }
  const buf = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storageKey, buf, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (error) throw new Error(`Upload failed for ${storageKey}: ${error.message}`);
  return { size: buf.length };
}

async function ensureStorageAuth() {
  if (DRY_RUN) return;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: CLIENT_EMAIL,
    password: CLIENT_PASSWORD,
  });
  if (error) throw new Error(`Cannot login as ${CLIENT_EMAIL}: ${error.message}`);
  log(`Authenticated as ${data.user.email} (uid=${data.user.id})`);
}

// ---------------------------------------------------------------------------
// Per-entity importers
// ---------------------------------------------------------------------------

async function getHouseholdId() {
  const { rows } = await sql.query(
    `SELECT hm.household_id, hm.user_id
       FROM household_members hm
       JOIN profiles p ON p.id = hm.user_id
      WHERE p.email = $1
      LIMIT 1`,
    [CLIENT_EMAIL],
  );
  if (!rows[0]) throw new Error(`No household found for ${CLIENT_EMAIL}`);
  return { householdId: rows[0].household_id, userId: rows[0].user_id };
}

async function upsertVehicle(householdId, v) {
  const fields = {
    household_id: householdId,
    kind: 'vehicle',
    name: v.name,
    license_plate: v.license_plate,
    vin: v.vin ?? null,
    make: v.make,
    model: v.model,
    year: v.year ?? null,
    color: v.color ?? null,
    body_type: v.body_type ?? null,
    fuel_type: v.fuel_type ?? null,
    engine_capacity: v.engine_capacity ?? null,
    engine_power: v.engine_power ?? null,
    transmission: v.transmission ?? null,
    drive_type: v.drive_type ?? null,
    seats: v.seats ?? null,
    doors: v.doors ?? null,
    registered_company: v.registered_company ?? null,
    mileage: v.mileage ?? null,
    acquisition_value: v.acquisition_value ?? 0,
    current_value: v.current_value ?? v.acquisition_value ?? 0,
    acquisition_date: v.acquisition_date ?? new Date().toISOString().slice(0, 10),
  };

  // idempotent on (household_id, license_plate)
  const existing = await sql.query(
    `SELECT id FROM assets WHERE household_id = $1 AND license_plate = $2 AND kind = 'vehicle'`,
    [householdId, v.license_plate],
  );

  if (existing.rows[0]) {
    const id = existing.rows[0].id;
    if (!DRY_RUN) {
      const cols = Object.keys(fields).filter(k => k !== 'household_id' && k !== 'kind' && k !== 'license_plate');
      const setClause = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
      await sql.query(
        `UPDATE assets SET ${setClause}, updated_at = NOW() WHERE id = $1`,
        [id, ...cols.map(c => fields[c])],
      );
    }
    log(`  vehicle ${v.license_plate} → updated (${id})`);
    return id;
  }

  if (DRY_RUN) {
    log(`  [DRY] vehicle ${v.license_plate} → would CREATE`);
    return crypto.randomUUID();
  }

  const cols = Object.keys(fields);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const ins = await sql.query(
    `INSERT INTO assets (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    cols.map(c => fields[c]),
  );
  log(`  vehicle ${v.license_plate} → created (${ins.rows[0].id})`);
  return ins.rows[0].id;
}

async function upsertLoan(householdId, assetId, loan) {
  if (!loan) return null;

  // Idempotency: a vehicle has at most 1 active loan, so linked_asset_id is the key.
  // (For refinancing scenarios the older loan would be marked status='paid_off'.)
  const existing = await sql.query(
    `SELECT id FROM loans
       WHERE household_id = $1 AND linked_asset_id = $2 AND status = 'active'
       ORDER BY created_at LIMIT 1`,
    [householdId, assetId],
  );

  let loanId;
  if (existing.rows[0]) {
    loanId = existing.rows[0].id;
    if (!DRY_RUN) {
      await sql.query(
        `UPDATE loans
            SET lender = $2,
                principal = $3,
                annual_rate = $4,
                term_months = $5,
                start_date = $6,
                fee_setup = $7,
                fee_monthly = $8,
                insurance_monthly = $9,
                linked_asset_id = $10,
                name = $11,
                loan_purpose = 'vehicle_purchase',
                day_count_convention = COALESCE($12, day_count_convention),
                updated_at = NOW()
          WHERE id = $1`,
        [
          loanId,
          loan.lender,
          loan.principal,
          loan.annual_rate,
          loan.term_months,
          loan.start_date,
          loan.fee_setup ?? 0,
          loan.fee_monthly ?? 0,
          loan.insurance_monthly ?? 0,
          assetId,
          loan.name ?? `${loan.lender} – ${loan.contract_number ?? ''}`.trim(),
          loan.day_count_convention ?? null,
        ],
      );
    }
    log(`    loan ${loan.lender}/${loan.contract_number ?? '?'} → updated (${loanId})`);
  } else {
    if (DRY_RUN) {
      loanId = crypto.randomUUID();
      log(`    [DRY] loan ${loan.lender}/${loan.contract_number ?? '?'} → would CREATE`);
    } else {
      const ins = await sql.query(
        `INSERT INTO loans (
           household_id, linked_asset_id, lender, loan_type,
           principal, annual_rate, rate_type, day_count_convention,
           start_date, term_months, fee_setup, fee_monthly, insurance_monthly,
           balloon_amount, status, name, loan_purpose, currency
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id`,
        [
          householdId,
          assetId,
          loan.lender,
          loan.loan_type ?? 'annuity',
          loan.principal,
          loan.annual_rate,
          loan.rate_type ?? 'fixed',
          loan.day_count_convention ?? '30E/360',
          loan.start_date,
          loan.term_months,
          loan.fee_setup ?? 0,
          loan.fee_monthly ?? 0,
          loan.insurance_monthly ?? 0,
          loan.balloon_amount ?? null,
          'active',
          loan.name ?? `${loan.lender} – ${loan.contract_number ?? ''}`.trim(),
          'vehicle_purchase',
          loan.currency ?? 'EUR',
        ],
      );
      loanId = ins.rows[0].id;
      log(`    loan ${loan.lender}/${loan.contract_number ?? '?'} → created (${loanId})`);
    }
  }

  // Schedule
  if (loan.schedule && loan.schedule.length) {
    if (DRY_RUN) {
      log(`    [DRY] schedule: would insert ${loan.schedule.length} installments`);
    } else {
      for (const row of loan.schedule) {
        await sql.query(
          `INSERT INTO loan_schedules
             (loan_id, installment_no, due_date, principal_due, interest_due,
              fees_due, total_due, principal_balance_after, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
           ON CONFLICT (loan_id, installment_no) DO UPDATE SET
             due_date = EXCLUDED.due_date,
             principal_due = EXCLUDED.principal_due,
             interest_due = EXCLUDED.interest_due,
             fees_due = EXCLUDED.fees_due,
             total_due = EXCLUDED.total_due,
             principal_balance_after = EXCLUDED.principal_balance_after`,
          [
            loanId,
            row.installment_no,
            row.due_date,
            row.principal_due,
            row.interest_due,
            row.fees_due ?? 0,
            row.total_due,
            // Clamp tiny negative residuals (e.g. -0.01 from rounding) to 0
            row.principal_balance_after < 0 ? 0 : row.principal_balance_after,
          ],
        );
      }
      log(`    schedule: ${loan.schedule.length} installments upserted`);
    }
  }

  return loanId;
}

async function upsertInsurance(householdId, assetId, insurance) {
  // policy_number is NOT NULL — generate a synthetic one if missing
  const policyNumber = insurance.policy_number
    ?? `AUTO-${insurance.type}-${assetId.slice(0, 8)}`;

  const insurerId = await getOrCreateInsurer(householdId, insurance.insurer);

  const existing = await sql.query(
    `SELECT id FROM insurances WHERE household_id = $1 AND policy_number = $2`,
    [householdId, policyNumber],
  );

  const fields = {
    household_id: householdId,
    asset_id: assetId,
    insurer_id: insurerId,
    type: insurance.type, // 'pzp' | 'kasko' | 'pzp_kasko'
    policy_number: policyNumber,
    company: insurance.insurer ?? null,
    valid_from: insurance.valid_from,
    valid_to: insurance.valid_to,
    price: insurance.price ?? 0,
    payment_frequency: insurance.payment_frequency ?? 'yearly',
    green_card_valid_from: insurance.green_card_valid_from ?? null,
    green_card_valid_to: insurance.green_card_valid_to ?? null,
    coverage_amount: insurance.coverage_amount ?? null,
    deductible_amount: insurance.deductible_amount ?? null,
    deductible_percentage: insurance.deductible_percentage ?? null,
    notes: insurance.notes ?? null,
  };

  if (existing.rows[0]) {
    const id = existing.rows[0].id;
    if (!DRY_RUN) {
      const cols = Object.keys(fields).filter(k => k !== 'household_id' && k !== 'policy_number');
      const setClause = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
      await sql.query(
        `UPDATE insurances SET ${setClause}, updated_at = NOW() WHERE id = $1`,
        [id, ...cols.map(c => fields[c])],
      );
    }
    log(`    insurance ${insurance.type} #${insurance.policy_number} → updated (${id})`);
    return id;
  }

  if (DRY_RUN) {
    log(`    [DRY] insurance ${insurance.type} #${insurance.policy_number} → would CREATE`);
    return crypto.randomUUID();
  }

  const cols = Object.keys(fields);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const ins = await sql.query(
    `INSERT INTO insurances (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    cols.map(c => fields[c]),
  );
  log(`    insurance ${insurance.type} #${insurance.policy_number} → created (${ins.rows[0].id})`);
  return ins.rows[0].id;
}

async function upsertVehicleDocument(householdId, assetId, doc) {
  const existing = await sql.query(
    `SELECT id FROM vehicle_documents
      WHERE asset_id = $1 AND document_type = $2 AND valid_to = $3`,
    [assetId, doc.document_type, doc.valid_to],
  );

  const fields = {
    household_id: householdId,
    asset_id: assetId,
    document_type: doc.document_type, // technical_certificate | vignette
    valid_from: doc.valid_from ?? null,
    valid_to: doc.valid_to,
    document_number: doc.document_number ?? null,
    price: doc.price ?? null,
    country: doc.country ?? null,
    is_required: doc.is_required ?? true,
    notes: doc.notes ?? null,
  };

  if (existing.rows[0]) {
    const id = existing.rows[0].id;
    if (!DRY_RUN) {
      const cols = Object.keys(fields).filter(k => k !== 'household_id' && k !== 'asset_id' && k !== 'document_type' && k !== 'valid_to');
      if (cols.length) {
        const setClause = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
        await sql.query(
          `UPDATE vehicle_documents SET ${setClause}, updated_at = NOW() WHERE id = $1`,
          [id, ...cols.map(c => fields[c])],
        );
      }
    }
    log(`    vehicle_doc ${doc.document_type} valid_to=${doc.valid_to} → updated (${id})`);
    return id;
  }

  if (DRY_RUN) {
    log(`    [DRY] vehicle_doc ${doc.document_type} valid_to=${doc.valid_to} → would CREATE`);
    return crypto.randomUUID();
  }

  const cols = Object.keys(fields);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const ins = await sql.query(
    `INSERT INTO vehicle_documents (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    cols.map(c => fields[c]),
  );
  log(`    vehicle_doc ${doc.document_type} valid_to=${doc.valid_to} → created (${ins.rows[0].id})`);
  return ins.rows[0].id;
}

async function upsertLoanDocument(householdId, loanId, name, filePath, fileSize, type) {
  const existing = await sql.query(
    `SELECT id FROM loan_documents WHERE loan_id = $1 AND file_path = $2`,
    [loanId, filePath],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  if (DRY_RUN) {
    log(`    [DRY] loan_document ${name} → would CREATE`);
    return crypto.randomUUID();
  }
  const ins = await sql.query(
    `INSERT INTO loan_documents (household_id, loan_id, document_type, name, file_path, file_size, mime_type)
     VALUES ($1,$2,$3,$4,$5,$6,'application/pdf') RETURNING id`,
    [householdId, loanId, type, name, filePath, fileSize],
  );
  log(`    loan_document ${name} → created (${ins.rows[0].id})`);
  return ins.rows[0].id;
}

async function setFilePath(table, id, filePath) {
  if (DRY_RUN) return;
  await sql.query(
    `UPDATE ${table} SET file_paths = COALESCE(file_paths, '[]'::jsonb) || to_jsonb($2::text)
       WHERE id = $1
         AND NOT (file_paths @> to_jsonb($2::text))`,
    [id, filePath],
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function processVehicle(householdId, v) {
  log(`\n=== ${v.folder} ===`);
  const folderPath = path.join(ROOT_DIR, v.folder);
  if (!fs.existsSync(folderPath)) throw new Error(`Folder missing: ${folderPath}`);

  const assetId = await upsertVehicle(householdId, v);

  // Loan
  let loanId = null;
  if (v.loan) loanId = await upsertLoan(householdId, assetId, v.loan);

  // Insurances (array — may be 1 (komplet) or 2 (pzp + kasko))
  const insuranceIds = [];
  for (const ins of v.insurances ?? []) {
    insuranceIds.push({ id: await upsertInsurance(householdId, assetId, ins), type: ins.type });
  }

  // Vehicle documents (technical_certificate, vignette)
  const docIds = [];
  for (const doc of v.vehicle_documents ?? []) {
    docIds.push({ id: await upsertVehicleDocument(householdId, assetId, doc), kind: doc.document_type });
  }

  // ---- File uploads ----
  for (const file of v.files ?? []) {
    const localPath = path.join(folderPath, file.filename);
    if (!fs.existsSync(localPath)) {
      warn(`  ⚠ file not found, skipping: ${file.filename}`);
      continue;
    }
    let storageKey;
    let linkId;
    let linkTable;
    if (file.attach_to === 'loan' && loanId) {
      storageKey = `${householdId}/loans/${loanId}/${safeStorageName(file.filename)}`;
      const { size } = await uploadPdf(localPath, storageKey);
      await upsertLoanDocument(householdId, loanId, file.filename, storageKey, size, file.doc_type ?? 'payment_schedule');
      continue;
    }
    if (file.attach_to === 'insurance') {
      const match = insuranceIds.find(x => x.type === file.insurance_type);
      if (!match) {
        warn(`  ⚠ no insurance ${file.insurance_type} for ${file.filename}`);
        continue;
      }
      linkId = match.id;
      linkTable = 'insurances';
      storageKey = `${householdId}/insurances/${linkId}/${safeStorageName(file.filename)}`;
    } else if (file.attach_to === 'vehicle_document') {
      const match = docIds.find(x => x.kind === file.document_type);
      if (!match) {
        warn(`  ⚠ no vehicle_document ${file.document_type} for ${file.filename}`);
        continue;
      }
      linkId = match.id;
      linkTable = 'vehicle_documents';
      storageKey = `${householdId}/vehicle_documents/${linkId}/${safeStorageName(file.filename)}`;
    } else {
      warn(`  ⚠ unknown attach_to: ${file.attach_to} (${file.filename})`);
      continue;
    }
    await uploadPdf(localPath, storageKey);
    await setFilePath(linkTable, linkId, storageKey);
  }
}

async function main() {
  log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${ONLY ? ` (only=${ONLY})` : ''}`);
  await sql.connect();
  await ensureStorageAuth();
  const { householdId, userId } = await getHouseholdId();
  log(`Household: ${householdId}, user: ${userId}`);

  const filtered = ONLY
    ? manifest.filter(v => v.license_plate.includes(ONLY) || v.folder.includes(ONLY))
    : manifest;
  log(`Vehicles to process: ${filtered.length}`);

  let ok = 0;
  let failed = 0;
  for (const v of filtered) {
    try {
      await processVehicle(householdId, v);
      ok++;
    } catch (e) {
      failed++;
      console.error(`[import] ✗ ${v.folder}: ${e.message}`);
    }
  }

  log(`\n=== DONE: ${ok} ok / ${failed} failed ===`);
  await sql.end();
}

main().catch(e => {
  console.error('[import] FATAL:', e);
  process.exit(1);
});
