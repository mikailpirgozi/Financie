#!/usr/bin/env node
// Combine parsed-loans.json (text PDFs) + loan-headers-ocr.json (scanned PDFs)
// + parsed-insurances.json into a single enriched-data.json keyed by license plate.
//
// For loans missing a schedule, we synthesize an annuity schedule from
// principal / term / monthly_payment (annual_rate solved via bisection).
// For composite/balloon loans we approximate using a single residual.

import fs from 'node:fs';

const TEXT_LOANS = JSON.parse(
  fs.readFileSync('/tmp/finapp-import/parsed-loans.json', 'utf8'),
);
const SCANNED_HEADERS = JSON.parse(
  fs.readFileSync('/tmp/finapp-import/loan-headers-ocr.json', 'utf8'),
);
const INSURANCES = JSON.parse(
  fs.readFileSync('/tmp/finapp-import/parsed-insurances.json', 'utf8'),
);

// ---------------------------------------------------------------------------
// Annuity helpers
// ---------------------------------------------------------------------------

function pmt(principal, rateMonthly, n) {
  if (rateMonthly === 0) return principal / n;
  const r = rateMonthly;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// Bisection to find annual rate (compounded monthly) that produces the given
// monthly payment for principal P and n months. Bounds: 0–30 % p.a.
function solveAnnualRate(principal, n, monthly) {
  if (!monthly || !n || !principal) return 0;
  let lo = 0;
  let hi = 0.30; // 30 % p.a. annual cap is plenty for vehicle leasing
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const calc = pmt(principal, mid / 12, n);
    if (calc < monthly) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function buildSchedule(principal, annualRate, n, monthly, startISODate) {
  const r = annualRate / 12;
  const schedule = [];
  let bal = principal;
  const [y, m, d] = startISODate.split('-').map(Number);
  for (let i = 1; i <= n; i++) {
    const due = new Date(Date.UTC(y, m - 1 + (i - 1), d));
    const interest = round2(bal * r);
    let principalDue = round2(monthly - interest);
    let total = round2(monthly);
    if (i === n) {
      // last installment closes the balance
      principalDue = round2(bal);
      total = round2(principalDue + interest);
    }
    bal = round2(bal - principalDue);
    schedule.push({
      installment_no: i,
      due_date: due.toISOString().slice(0, 10),
      principal_due: principalDue,
      interest_due: interest,
      fees_due: 0,
      total_due: total,
      principal_balance_after: Math.max(0, bal),
    });
  }
  return schedule;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Build per-plate loan entries
// ---------------------------------------------------------------------------

const loans = {};

// Plate aliases — typos in source filenames map to the canonical folder plate.
const PLATE_ALIAS = {
  AA717NE: 'AA711NE', // BMW 730Ld typo: SPLÁTKOVÝkalendár_AA717NE.pdf
  BL566PC: 'BL556PC', // PORSCHE Panamera typo: SPLÁTKOVÝkalendár_BL566PC.pdf
  AA620CM: 'AA620SM', // BMW M5 Competition: insurance file uses CM not SM
};
const canon = p => PLATE_ALIAS[p] ?? p;

// 1. Already-parsed text loans → use directly (schedule already there).
// Rate is computed from the first installment: r_monthly = interest_due_1 / principal.
function rateFromFirstInstallment(principal, schedule) {
  if (!schedule?.length || !principal) return 0;
  const r1 = schedule[0];
  if (!r1.interest_due) return 0;
  const monthlyRate = r1.interest_due / principal;
  return round2(monthlyRate * 12 * 100); // % p.a.
}

for (const [rawPlate, data] of Object.entries(TEXT_LOANS)) {
  if (!data.schedule || !data.schedule.length) continue;
  const plate = canon(rawPlate);
  const annualRatePct = rateFromFirstInstallment(data.principal, data.schedule);
  loans[plate] = {
    lender: data.lender,
    contract_number: data.contract_number,
    principal: data.principal,
    annual_rate: annualRatePct,
    term_months: data.term_months,
    start_date: data.start_date ?? data.schedule[0]?.due_date,
    monthly_payment: data.schedule[0]?.total_due,
    schedule: data.schedule,
    source: 'text',
  };
}

// 2. Scanned loans → synthesize schedule from header.
// Some are leasing with residual (kúpna cena at end) → at 0 % the
// monthly_payment is still LESS than principal/n.  In that case we treat
// the loan as effectively interest-free with a balloon residual = principal
// - (n × monthly_payment).
function buildSyntheticSchedule(h) {
  const baseMonthly = h.monthly_payment;
  const total = baseMonthly * h.term_months;
  const advance = h.balloon_amount ?? 0; // ZAL up-front (Škoda fin)
  const remaining = h.principal - advance;
  let annualRatePct;
  let residual = 0;
  let annualRate;
  if (total < remaining * 0.999) {
    // pure leasing with residual: residual = principal - advance - sum(monthly)
    annualRate = 0;
    annualRatePct = 0;
    residual = round2(remaining - total);
  } else {
    annualRate = solveAnnualRate(remaining, h.term_months, baseMonthly);
    annualRatePct = round2(annualRate * 100);
  }
  const schedule = buildSchedule(
    remaining,
    annualRate,
    h.term_months,
    baseMonthly,
    h.first_due_date ?? h.start_date,
  );
  if (residual > 0 && schedule.length) {
    schedule[schedule.length - 1].principal_balance_after = residual;
  }
  return { schedule, annualRatePct, residual };
}

for (const [plate, h] of Object.entries(SCANNED_HEADERS)) {
  if (loans[plate]) continue;
  const { schedule, annualRatePct, residual } = buildSyntheticSchedule(h);
  loans[plate] = {
    lender: h.lender,
    contract_number: h.contract_number,
    principal: h.principal,
    annual_rate: annualRatePct,
    term_months: h.term_months,
    start_date: h.start_date,
    monthly_payment: h.monthly_payment,
    balloon_amount: residual || h.balloon_amount || null,
    vin: h.vin ?? null,
    registered_company: h.registered_company ?? null,
    schedule,
    source: 'ocr-synthesized',
  };
}

// ---------------------------------------------------------------------------
// Build per-plate insurance arrays
// ---------------------------------------------------------------------------

const insurancesByPlate = {};
for (const [, data] of Object.entries(INSURANCES)) {
  const plate = canon(data.license_plate);
  if (!insurancesByPlate[plate]) insurancesByPlate[plate] = [];

  // Some PZP-only entries from KOMUNÁLNA produced valid_to == valid_from
  // because the regex only catches one date.  In those cases shift +1 year.
  let validTo = data.valid_to;
  if (validTo && data.valid_from && validTo === data.valid_from) {
    const dt = new Date(data.valid_from);
    dt.setUTCFullYear(dt.getUTCFullYear() + 1);
    validTo = dt.toISOString().slice(0, 10);
  } else if (!validTo && data.valid_from) {
    const dt = new Date(data.valid_from);
    dt.setUTCFullYear(dt.getUTCFullYear() + 1);
    validTo = dt.toISOString().slice(0, 10);
  }

  insurancesByPlate[plate].push({
    type: data.type,
    insurer: data.insurer,
    policy_number: data.policy_number,
    valid_from: data.valid_from,
    valid_to: validTo,
    price: data.price,
  });
}

// ---------------------------------------------------------------------------
// VIN map (optional — only for those we OCR'd)
// ---------------------------------------------------------------------------

const VINS = {
  AA032PM: 'WV2ZZZSTXSH010601', // VW Multivan
  AA869BT: 'WP1ZZZ953PLB10550', // Porsche Macan
  BT727HE: 'WP1ZZZ952PLB05663', // Porsche Macan
  BT357HH: 'WVWZZZ3HZPE003110', // VW Arteon
  AA620SM: 'WBS81CH050CM17756', // BMW M5 (already in manifest manual entry)
};

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const out = {
  loans,
  insurancesByPlate,
  vins: VINS,
};

fs.writeFileSync('/tmp/finapp-import/enriched-data.json', JSON.stringify(out, null, 2));

const loanCount = Object.keys(loans).length;
const insurancePlateCount = Object.keys(insurancesByPlate).length;
const insuranceTotal = Object.values(insurancesByPlate).reduce((a, b) => a + b.length, 0);
const synthesized = Object.values(loans).filter(l => l.source === 'ocr-synthesized').length;
const textLoans = loanCount - synthesized;

console.log(`Loans: ${loanCount} (${textLoans} text-parsed, ${synthesized} OCR-synthesized)`);
console.log(`Insurances: ${insuranceTotal} across ${insurancePlateCount} plates`);
console.log('Sample loans:');
for (const plate of ['AA102KL', 'AA869BT', 'BT641BN', 'AA032PM']) {
  const l = loans[plate];
  if (!l) {
    console.log(`  ${plate}: MISSING`);
    continue;
  }
  console.log(
    `  ${plate}: ${l.lender} #${l.contract_number} P=${l.principal} term=${l.term_months} rate=${l.annual_rate}% schedule=${l.schedule.length} source=${l.source}`,
  );
}
console.log('Sample insurances (AA032PM):', JSON.stringify(insurancesByPlate.AA032PM, null, 2));
