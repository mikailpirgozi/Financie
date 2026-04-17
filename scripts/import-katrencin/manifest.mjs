// Manifest of all vehicles for Matúš Katrenčín import.
//
// Filled in iteratively by reading each vehicle's PDFs (TP via OCR/vision,
// splátkový kalendár + poistka via text extraction).
//
// Schema per vehicle:
//   {
//     folder: 'BMW M5_AA620SM',          // exact folder name under ROOT_DIR
//     license_plate: 'AA620SM',
//     name: 'BMW M5 Competition',         // human-readable display name
//     make: 'BMW', model: 'M5 Competition',
//     year, color, body_type, fuel_type, engine_capacity (cm³), engine_power (kW),
//     transmission, drive_type, seats, doors, vin,
//     registered_company,                  // from splátkový kalendár (klient)
//     loan: { lender, contract_number, principal, annual_rate, term_months,
//             start_date, fee_setup, monthly_payment, schedule: [...] | null,
//             day_count_convention, name },
//     insurances: [
//       { type: 'pzp_kasko' | 'pzp' | 'kasko',
//         insurer, policy_number, valid_from, valid_to, price,
//         green_card_valid_from, green_card_valid_to,
//         coverage_amount, deductible_amount, deductible_percentage }
//     ],
//     vehicle_documents: [
//       { document_type: 'technical_certificate', valid_to: '2099-12-31' },
//       { document_type: 'vignette', country: 'SK', valid_to: '2026-07-03' }
//     ],
//     files: [
//       { filename, attach_to: 'loan', doc_type: 'payment_schedule' | 'contract' },
//       { filename, attach_to: 'insurance', insurance_type: 'pzp_kasko' },
//       { filename, attach_to: 'vehicle_document', document_type: 'vignette' }
//     ]
//   }

import fs from 'node:fs';
import path from 'node:path';

export const ROOT_DIR = '/Users/mikailpirgozi/Desktop/Matus katrencin';
export const CLIENT_EMAIL = 'matus@allingroup.sk';

// Enriched data built by build-enriched.mjs (parsed PDFs + OCR).
// Optional — if missing, the importer falls back to auto-discovery stubs.
const ENRICHED_PATH = '/tmp/finapp-import/enriched-data.json';
const ENRICHED = fs.existsSync(ENRICHED_PATH)
  ? JSON.parse(fs.readFileSync(ENRICHED_PATH, 'utf8'))
  : { loans: {}, insurancesByPlate: {}, vins: {} };

// Helper to convert DDMMYY (filename date) to YYYY-MM-DD ISO date
export function fileDate(ddmmyy) {
  const dd = ddmmyy.slice(0, 2);
  const mm = ddmmyy.slice(2, 4);
  const yy = ddmmyy.slice(4, 6);
  return `20${yy}-${mm}-${dd}`;
}

// Auto-discover a single vehicle folder and produce a manifest entry.
// Manual entries (in `manualEntries` below) override auto-discovery for
// fields they specify — manual data wins over inferred data.
function discoverFolder(folderName) {
  const dir = path.join(ROOT_DIR, folderName);
  // folder format: "MAKE Model_PLATE"  (PLATE may contain digits/letters)
  const lastUnderscore = folderName.lastIndexOf('_');
  if (lastUnderscore < 0) return null;
  const makeAndModel = folderName.slice(0, lastUnderscore);
  const license_plate = folderName.slice(lastUnderscore + 1);
  const spaceIdx = makeAndModel.indexOf(' ');
  const make = spaceIdx > 0 ? makeAndModel.slice(0, spaceIdx) : makeAndModel;
  const model = spaceIdx > 0 ? makeAndModel.slice(spaceIdx + 1) : '';

  const files = fs
    .readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.pdf') && !f.startsWith('~$'));

  // file name patterns are tolerant to diacritic variants (Č/C, Ď/D)
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

  const insurances = [];
  const vehicle_documents = [];
  const manifestFiles = [];
  let greenCardValidTo = null;
  let pzpKaskoPolicy = null;
  let pzpPolicy = null;
  let kaskoPolicy = null;

  for (const f of files) {
    const N = norm(f);

    if (N.startsWith('+TP_') || N.startsWith('+TPSTARY_')) {
      vehicle_documents.push({
        document_type: 'technical_certificate',
        valid_to: '2099-12-31',
        notes: 'TP – sken (technický preukaz)',
      });
      manifestFiles.push({
        filename: f,
        attach_to: 'vehicle_document',
        document_type: 'technical_certificate',
      });
      continue;
    }

    // DIALNIČNÁznámka_<plate>_DDMMYY.pdf  (Č/Ď variants)
    let m = N.match(/^.?DIALNICNAZNAMKA_[^_]+_(\d{6})\./);
    if (m) {
      vehicle_documents.push({
        document_type: 'vignette',
        country: 'SK',
        valid_to: fileDate(m[1]),
      });
      manifestFiles.push({
        filename: f,
        attach_to: 'vehicle_document',
        document_type: 'vignette',
      });
      continue;
    }

    // BIELAkarta_<plate>_DDMMYY.pdf  → green/white card (PZP doc)
    m = N.match(/^BIELAKARTA_[^_]+_(\d{6})\./);
    if (m) {
      greenCardValidTo = fileDate(m[1]);
      manifestFiles.push({ filename: f, attach_to: 'pending_green_card' });
      continue;
    }

    // POISTKAkomplet_<plate>[_<policy>].pdf  → PZP + kasko spolu
    m = N.match(/^POISTKAKOMPLET_[^_.]+(?:_([^_.]+))?\./);
    if (m) {
      pzpKaskoPolicy = m[1] ?? `AUTO-pzpkasko-${license_plate}`;
      manifestFiles.push({
        filename: f,
        attach_to: 'insurance',
        insurance_type: 'pzp_kasko',
      });
      continue;
    }
    // POISTKApzp_...
    m = N.match(/^POISTKAPZP_[^_]+_([^_.]+)\./);
    if (m) {
      pzpPolicy = m[1];
      manifestFiles.push({
        filename: f,
        attach_to: 'insurance',
        insurance_type: 'pzp',
      });
      continue;
    }
    // POISTKAhp_...  (HP = havarijné poistenie / kasko)
    m = N.match(/^POISTKAHP_[^_]+_([^_.]+)\./);
    if (m) {
      kaskoPolicy = m[1];
      manifestFiles.push({
        filename: f,
        attach_to: 'insurance',
        insurance_type: 'kasko',
      });
      continue;
    }

    // SPLÁTKOVÝkalendár_<plate>.pdf
    if (N.startsWith('SPLATKOVYKALENDAR_')) {
      manifestFiles.push({
        filename: f,
        attach_to: 'loan',
        doc_type: 'payment_schedule',
      });
      continue;
    }

    // KONFIGURÁCIA_<plate>.pdf  → attach as loan contract (it's the spec sheet)
    if (N.startsWith('KONFIGURACIA_')) {
      manifestFiles.push({
        filename: f,
        attach_to: 'loan',
        doc_type: 'other',
      });
      continue;
    }
  }

  // Build insurance stubs.
  // Defaults: 1-year policy, valid_from = greenCardValidTo - 1 year (or today),
  // valid_to = greenCardValidTo (or today + 1y), price = 0 (to be enriched).
  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = (iso) => {
    const d = new Date(iso);
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    return d.toISOString().slice(0, 10);
  };
  const yearAhead = (iso) => {
    const d = new Date(iso);
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  if (pzpKaskoPolicy) {
    const validTo = greenCardValidTo ?? yearAhead(today);
    insurances.push({
      type: 'pzp_kasko',
      insurer: null,
      policy_number: pzpKaskoPolicy,
      valid_from: yearAgo(validTo),
      valid_to: validTo,
      green_card_valid_from: greenCardValidTo ? yearAgo(greenCardValidTo) : null,
      green_card_valid_to: greenCardValidTo,
      price: 0,
      notes: 'Stub – cena/poisťovňa doplnené z PDF v Phase 2',
    });
  }
  if (pzpPolicy) {
    const validTo = greenCardValidTo ?? yearAhead(today);
    insurances.push({
      type: 'pzp',
      insurer: null,
      policy_number: pzpPolicy,
      valid_from: yearAgo(validTo),
      valid_to: validTo,
      green_card_valid_from: greenCardValidTo ? yearAgo(greenCardValidTo) : null,
      green_card_valid_to: greenCardValidTo,
      price: 0,
      notes: 'Stub – cena/poisťovňa doplnené z PDF v Phase 2',
    });
  }
  if (kaskoPolicy) {
    insurances.push({
      type: 'kasko',
      insurer: null,
      policy_number: kaskoPolicy,
      valid_from: today,
      valid_to: yearAhead(today),
      price: 0,
      notes: 'Stub – cena/poisťovňa doplnené z PDF v Phase 2',
    });
  }

  // Determine which insurance the BIELAkarta belongs to.
  // Priority: pzp_kasko > pzp > kasko (kasko nemá zelenú kartu).
  const primaryInsuranceType = pzpKaskoPolicy
    ? 'pzp_kasko'
    : pzpPolicy
    ? 'pzp'
    : null;
  for (const f of manifestFiles) {
    if (f.attach_to === 'pending_green_card') {
      if (primaryInsuranceType) {
        f.attach_to = 'insurance';
        f.insurance_type = primaryInsuranceType;
      } else {
        // No PZP found — drop the file from manifest (won't be uploaded anywhere)
        f.skip = true;
      }
    }
  }

  // Loan stub: only if SPLÁTKOVÝkalendár exists.
  const hasSchedule = manifestFiles.some(f => f.attach_to === 'loan');
  let loan = null;
  if (hasSchedule) {
    loan = {
      lender: 'Bude doplnené z PDF',
      contract_number: null,
      principal: 0.01, // CHECK > 0 — placeholder
      annual_rate: 0,
      term_months: 1,
      start_date: '2025-01-01',
      fee_setup: 0,
      name: `${make} ${model} – ${license_plate} (TBD)`,
      day_count_convention: '30E/360',
      loan_type: 'annuity',
      schedule: null,
    };
  }

  // ---------- Apply enriched data (parsed PDFs / OCR) -----------------------
  const enrichedLoan = ENRICHED.loans?.[license_plate];
  if (enrichedLoan && hasSchedule) {
    loan = {
      name: `${enrichedLoan.lender} #${enrichedLoan.contract_number} (${make} ${model} – ${license_plate})`,
      lender: enrichedLoan.lender,
      contract_number: enrichedLoan.contract_number,
      principal: enrichedLoan.principal,
      annual_rate: enrichedLoan.annual_rate ?? 0,
      term_months: enrichedLoan.term_months,
      start_date: enrichedLoan.start_date,
      fee_setup: 0,
      day_count_convention: '30E/360',
      loan_type: 'annuity',
      balloon_amount: enrichedLoan.balloon_amount ?? null,
      schedule: enrichedLoan.schedule,
    };
  }

  // Enriched insurance details overwrite stubs (insurer, validity, price).
  const enrichedInsurances = ENRICHED.insurancesByPlate?.[license_plate] ?? [];
  for (const stub of insurances) {
    const match = enrichedInsurances.find(e => e.policy_number === stub.policy_number)
      ?? enrichedInsurances.find(e => e.type === stub.type);
    if (match) {
      stub.insurer = match.insurer ?? stub.insurer;
      if (match.valid_from) stub.valid_from = match.valid_from;
      if (match.valid_to) stub.valid_to = match.valid_to;
      if (match.price != null) stub.price = match.price;
      stub.notes = `Cena/poisťovňa z PDF (Phase 2)`;
    }
  }

  // Add insurances that exist in enriched data but weren't matched by filename
  // (e.g. POISTKAkomplet_AA525TA.txt has no policy number → stub uses null)
  for (const e of enrichedInsurances) {
    const already = insurances.some(s =>
      s.policy_number === e.policy_number || s.type === e.type,
    );
    if (!already) {
      insurances.push({
        type: e.type,
        insurer: e.insurer,
        policy_number: e.policy_number,
        valid_from: e.valid_from,
        valid_to: e.valid_to,
        price: e.price ?? 0,
        notes: 'Pridané z parsed-insurances.json',
      });
    }
  }

  const vin = ENRICHED.vins?.[license_plate] ?? null;

  return {
    folder: folderName,
    license_plate,
    name: `${make} ${model}`.trim(),
    make,
    model,
    vin,
    registered_company: enrichedLoan?.registered_company ?? null,
    acquisition_value: enrichedLoan?.principal ?? 1,
    acquisition_date: enrichedLoan?.start_date ?? today,
    files: manifestFiles.filter(f => !f.skip),
    insurances,
    vehicle_documents,
    loan,
  };
}

function discoverAll() {
  return fs
    .readdirSync(ROOT_DIR)
    .filter(f => fs.statSync(path.join(ROOT_DIR, f)).isDirectory())
    .filter(f => !f.startsWith('.'))
    .sort()
    .map(discoverFolder)
    .filter(Boolean);
}

// Merge manual overrides into discovered entries: manual fields win over auto.
function mergeManual(autoEntries, manualEntries) {
  const map = new Map(autoEntries.map(e => [e.license_plate, e]));
  for (const m of manualEntries) {
    const existing = map.get(m.license_plate);
    if (!existing) {
      map.set(m.license_plate, m);
    } else {
      // shallow merge top-level + replace insurances/vehicle_documents/loan/files entirely if manual provides them
      map.set(m.license_plate, {
        ...existing,
        ...m,
        // insurances / vehicle_documents / files / loan: manual overrides if present
        insurances: m.insurances ?? existing.insurances,
        vehicle_documents: m.vehicle_documents ?? existing.vehicle_documents,
        files: m.files ?? existing.files,
        loan: m.loan ?? existing.loan,
      });
    }
  }
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// MANUAL ENTRIES — override auto-discovery for vehicles that have been
// fully processed (TP read, splátkový kalendár parsed, poistka parsed).
// ---------------------------------------------------------------------------

const _manualEntriesArray = [
  // ============================================================
  // BMW M5 Competition – AA620SM (Čester plus, s.r.o)
  // Loan: Porsche Finance Slovakia č. 1300053
  // Insurance: Allianz #9300111209 (komplet)
  // ============================================================
  {
    folder: 'BMW M5_AA620SM',
    license_plate: 'AA620SM',
    name: 'BMW M5 Competition',
    make: 'BMW',
    model: 'M5 Competition',
    year: 2022,
    color: 'Zelená metalíza tmavá',
    body_type: 'sedan',
    fuel_type: 'petrol',
    engine_capacity: 4395,
    engine_power: 460,
    transmission: 'automatic',
    drive_type: 'awd',
    seats: 5,
    vin: 'WBS81CH050CM17756',
    registered_company: 'Čester plus, s.r.o.',
    acquisition_value: 67120,
    acquisition_date: '2025-06-18',

    loan: {
      name: 'AutoKredit Porsche Finance #1300053 (BMW M5)',
      lender: 'Porsche Finance Slovakia s. r. o.',
      contract_number: '1300053',
      principal: 67120.0,
      annual_rate: 5.49, // 307.07 / 67120 * 12 = 5.49 %; verified via full amortization
      term_months: 60,
      start_date: '2025-06-18',
      fee_setup: 120.0,
      day_count_convention: '30E/360',
      // Full schedule from PDF:
      schedule: buildPorscheSchedule({
        startDueDate: '2025-07-18',
        installments: [
          [974.69, 307.07, 1281.76, 66145.31],
          [979.15, 302.61, 1281.76, 65166.16],
          [983.62, 298.14, 1281.76, 64182.54],
          [988.12, 293.64, 1281.76, 63194.42],
          [992.65, 289.11, 1281.76, 62201.77],
          [997.19, 284.57, 1281.76, 61204.58],
          [1001.75, 280.01, 1281.76, 60202.83],
          [1006.33, 275.43, 1281.76, 59196.50],
          [1010.94, 270.82, 1281.76, 58185.56],
          [1015.56, 266.20, 1281.76, 57170.00],
          [1020.21, 261.55, 1281.76, 56149.79],
          [1024.87, 256.89, 1281.76, 55124.92],
          [1029.56, 252.20, 1281.76, 54095.36],
          [1034.27, 247.49, 1281.76, 53061.09],
          [1039.01, 242.75, 1281.76, 52022.08],
          [1043.76, 238.00, 1281.76, 50978.32],
          [1048.53, 233.23, 1281.76, 49929.79],
          [1053.33, 228.43, 1281.76, 48876.46],
          [1058.15, 223.61, 1281.76, 47818.31],
          [1062.99, 218.77, 1281.76, 46755.32],
          [1067.85, 213.91, 1281.76, 45687.47],
          [1072.74, 209.02, 1281.76, 44614.73],
          [1077.65, 204.11, 1281.76, 43537.08],
          [1082.58, 199.18, 1281.76, 42454.50],
          [1087.53, 194.23, 1281.76, 41366.97],
          [1092.51, 189.25, 1281.76, 40274.46],
          [1097.50, 184.26, 1281.76, 39176.96],
          [1102.53, 179.23, 1281.76, 38074.43],
          [1107.57, 174.19, 1281.76, 36966.86],
          [1112.64, 169.12, 1281.76, 35854.22],
          [1117.73, 164.03, 1281.76, 34736.49],
          [1122.84, 158.92, 1281.76, 33613.65],
          [1127.98, 153.78, 1281.76, 32485.67],
          [1133.14, 148.62, 1281.76, 31352.53],
          [1138.32, 143.44, 1281.76, 30214.21],
          [1143.53, 138.23, 1281.76, 29070.68],
          [1148.76, 133.00, 1281.76, 27921.92],
          [1154.02, 127.74, 1281.76, 26767.90],
          [1159.30, 122.46, 1281.76, 25608.60],
          [1164.60, 117.16, 1281.76, 24444.00],
          [1169.93, 111.83, 1281.76, 23274.07],
          [1175.28, 106.48, 1281.76, 22098.79],
          [1180.66, 101.10, 1281.76, 20918.13],
          [1186.06, 95.70, 1281.76, 19732.07],
          [1191.49, 90.27, 1281.76, 18540.58],
          [1196.94, 84.82, 1281.76, 17343.64],
          [1202.41, 79.35, 1281.76, 16141.23],
          [1207.91, 73.85, 1281.76, 14933.32],
          [1213.44, 68.32, 1281.76, 13719.88],
          [1218.99, 62.77, 1281.76, 12500.89],
          [1224.57, 57.19, 1281.76, 11276.32],
          [1230.17, 51.59, 1281.76, 10046.15],
          [1235.80, 45.96, 1281.76, 8810.35],
          [1241.45, 40.31, 1281.76, 7568.90],
          [1247.13, 34.63, 1281.76, 6321.77],
          [1252.84, 28.92, 1281.76, 5068.93],
          [1258.57, 23.19, 1281.76, 3810.36],
          [1264.33, 17.43, 1281.76, 2546.03],
          [1270.11, 11.65, 1281.76, 1275.92],
          [1275.92, 5.84, 1281.76, 0.00],
        ],
      }),
    },

    insurances: [
      {
        type: 'pzp_kasko',
        insurer: 'Allianz - Slovenská poisťovňa',
        policy_number: '9300111209',
        valid_from: '2025-10-09',
        valid_to: '2026-10-09', // green card from filename BIELAkarta_..._091026
        green_card_valid_from: '2025-10-09',
        green_card_valid_to: '2026-10-09',
        price: null, // unknown without reading the policy detail page
        notes: 'Komplet PZP + havarijná (Allianz MOJE AUTO)',
      },
    ],

    vehicle_documents: [
      {
        document_type: 'technical_certificate',
        valid_to: '2099-12-31',
        notes: 'OE číslo TP – nevyplnené (sken)',
      },
      {
        document_type: 'vignette',
        country: 'SK',
        valid_to: '2026-07-03', // from filename DIALNIČNÁznámka_AA620SM_030726
      },
    ],

    files: [
      { filename: 'SPLÁTKOVÝkalendár_AA620SM.pdf', attach_to: 'loan', doc_type: 'payment_schedule' },
      { filename: 'POISTKAkomplet_AA620CM_9300111209.pdf', attach_to: 'insurance', insurance_type: 'pzp_kasko' },
      { filename: 'BIELAkarta_AA620CM_091026.pdf', attach_to: 'insurance', insurance_type: 'pzp_kasko' },
      { filename: '+TP_AA620SM.pdf', attach_to: 'vehicle_document', document_type: 'technical_certificate' },
      { filename: 'DIALNIČNÁznámka_AA620SM_030726.pdf', attach_to: 'vehicle_document', document_type: 'vignette' },
    ],
  },
]; // end of _manualEntriesArray

// Final exported manifest = auto-discovered entries with manual overrides applied.
export const manifest = mergeManual(discoverAll(), _manualEntriesArray);

// Helper: build schedule from Porsche Finance amortization table.
// Each row: [principal_due, interest_due, total, balance_after]
// Due dates: monthly from startDueDate (DD same as start, month+1 each step).
function buildPorscheSchedule({ startDueDate, installments }) {
  const [y, m, d] = startDueDate.split('-').map(Number);
  return installments.map((row, i) => {
    const date = new Date(Date.UTC(y, m - 1 + i, d));
    return {
      installment_no: i + 1,
      due_date: date.toISOString().slice(0, 10),
      principal_due: row[0],
      interest_due: row[1],
      total_due: row[2],
      principal_balance_after: row[3],
      fees_due: 0,
    };
  });
}
