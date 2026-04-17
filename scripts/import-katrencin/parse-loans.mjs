#!/usr/bin/env node
// Parser for splátkový kalendár text files (extracted via pdftotext -layout).
// Reads all SPLÁTKOVÝ*.txt files in TEXT_DIR, detects lender format,
// and writes structured loan data to OUT_FILE.
//
// IMPORTANT: regex tokens are non-overlapping (digit/comma/dot/space tokens
// separated by whitespace) to avoid catastrophic backtracking on long lines.

import fs from 'node:fs';
import path from 'node:path';

const TEXT_DIR = '/tmp/finapp-import/text';
const OUT_FILE = '/tmp/finapp-import/parsed-loans.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// "1 234,56" → 1234.56 ; "1.234,56" → 1234.56 ; "1234.56" → 1234.56
function num(s) {
  if (s == null) return null;
  let cleaned = String(s).trim().replace(/\u00A0/g, ' ');
  if (!cleaned) return null;
  // remove thousand separators: spaces between digits, or "." when followed by 3 digits
  cleaned = cleaned.replace(/(\d)\s+(\d{3}\b)/g, '$1$2');
  cleaned = cleaned.replace(/(\d)\.(\d{3}\b)/g, '$1$2');
  cleaned = cleaned.replace(',', '.');
  cleaned = cleaned.replace(/[€\sEUR]/gi, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isoDate(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function subMonths(iso, m) {
  const [y, mo, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1 - m, d));
  return dt.toISOString().slice(0, 10);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function dedupeSchedule(schedule) {
  const seen = new Map();
  for (const r of schedule) {
    const prev = seen.get(r.installment_no);
    if (!prev || (r.principal_balance_after !== null && (prev.principal_balance_after === null || prev.principal_balance_after === undefined))) {
      seen.set(r.installment_no, r);
    }
  }
  return [...seen.values()].sort((a, b) => a.installment_no - b.installment_no);
}

// Extract digit/comma/dot tokens from a line, respecting "1 234,56" thousand-spaces.
// Returns array of strings (no spaces inside any token).
function extractNumberTokens(line) {
  const tokens = [];
  // first: collapse internal "digit space digit{3}" → "digitdigit{3}" so that
  // "1 234,56" becomes a single token.
  let s = line.replace(/(\d)\s(?=\d{3}(?:\s|$|[^\d]))/g, '$1');
  // then split on whitespace and keep tokens that look numeric.
  for (const t of s.split(/\s+/)) {
    if (!t) continue;
    if (/^[-]?[\d]+([.,]\d+)*$/.test(t)) tokens.push(t);
  }
  return tokens;
}

// Match "DD.MM.YYYY" inside a line. Returns { match, idx } where idx is char position.
function findDate(line) {
  const m = line.match(/(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/);
  if (!m) return null;
  return { date: isoDate(m[1].replace(/\s/g, '')), str: m[1], idx: m.index };
}

// ---------------------------------------------------------------------------
// Lender detection
// ---------------------------------------------------------------------------

function detectLender(text) {
  const T = text;
  if (/Porsche Finance Slovakia/i.test(T)) return { lender: 'Porsche Finance Slovakia s.r.o.', adapter: 'porsche' };
  if (/VOLKSWAGEN Finančné služby Slovensko/i.test(T)) return { lender: 'VOLKSWAGEN Finančné služby Slovensko s.r.o.', adapter: 'porsche' };
  if (/Oberbank Leasing/i.test(T)) return { lender: 'Oberbank Leasing s.r.o.', adapter: 'oberbank' };
  if (/UniCredit Leasing Slovakia/i.test(T)) return { lender: 'UniCredit Leasing Slovakia, a.s.', adapter: 'unicredit' };
  if (/ČSOB Leasing/i.test(T) || /CSOB Leasing/i.test(T)) return { lender: 'ČSOB Leasing, a.s.', adapter: 'csob' };
  if (/VÚB,?\s*a\.s\./i.test(T)) return { lender: 'VÚB, a.s.', adapter: 'vub' };
  if (/Mercedes-Benz Financial/i.test(T)) return { lender: 'Mercedes-Benz Financial Services Slovakia s.r.o.', adapter: 'mbfs' };
  if (/Home Credit Slovakia/i.test(T)) return { lender: 'Home Credit Slovakia, a.s.', adapter: 'homecredit' };
  if (/AMORTIZA[CČ]N[AÁ]\s+TABU[LĽ]KA/i.test(T)) return { lender: 'Tatra-leasing, s.r.o.', adapter: 'amortizacna' };
  return null;
}

// ---------------------------------------------------------------------------
// Generic schedule line parser:
//   "no  date  num  num  num [...]"
// installmentIdx — index of "no" column in tokens (default 0)
// dateIdx — index of date column among tokens (1)
// numCols — { principal, interest, total, balance, fees? }
// ---------------------------------------------------------------------------

function parseScheduleLine(line) {
  const dt = findDate(line);
  if (!dt) return null;
  const before = line.slice(0, dt.idx).trim();
  const after = line.slice(dt.idx + dt.str.length).trim();
  // installment number must be a small integer (1..400)
  const noMatch = before.match(/(\d{1,3})\.?$/);
  if (!noMatch) return null;
  const no = parseInt(noMatch[1], 10);
  if (!Number.isFinite(no) || no < 1 || no > 400) return null;
  const tokens = extractNumberTokens(after);
  if (!tokens.length) return null;
  return { no, due_date: dt.date, tokens, raw: line };
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

function parsePorsche(text) {
  const out = {};
  const m1 = text.match(/(?:AUTOKREDITE\s*Č\.|Zmluva\s+č\.:)\s*(\d+)/i);
  if (m1) out.contract_number = m1[1];
  const m2 = text.match(/Dátum\s+vystavenia:?\s*(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i);
  if (m2) out.start_date = isoDate(m2[1].replace(/\s/g, ''));
  const m3 = text.match(/Doba\s+splácania\s+v\s+mesiacoch:?\s*(\d+)/i);
  if (m3) out.term_months = parseInt(m3[1], 10);
  const m4 = text.match(/Výška\s+úveru\s*\(istiny\):?\s*([\d\s.,]+?)\s*€/i);
  if (m4) out.principal = num(m4[1]);
  const m5 = text.match(/Spracovateľský\s+poplatok[^:\n]*:?\s*([\d\s.,]+?)\s*€/i);
  if (m5) out.fee_setup = num(m5[1]);

  const schedule = [];
  for (const line of text.split('\n')) {
    const p = parseScheduleLine(line);
    if (!p) continue;
    if (p.tokens.length < 4) continue;
    // Porsche columns: Časť_istiny(principal), Zostatok_istiny(balance), Úrok, Splátka(istina+úrok), PZP, HP, Celkom
    const principal_due = num(p.tokens[0]);
    const balance = num(p.tokens[1]);
    const interest_due = num(p.tokens[2]);
    const total_due = num(p.tokens[3]);
    const pzp = num(p.tokens[4]) ?? 0;
    const hp = num(p.tokens[5]) ?? 0;
    if (principal_due == null || interest_due == null || total_due == null || balance == null) continue;
    if (Math.abs(principal_due + interest_due - total_due) > Math.max(0.05, total_due * 0.02)) continue;
    schedule.push({ installment_no: p.no, due_date: p.due_date, principal_due, interest_due, fees_due: round2(pzp + hp), total_due: round2(total_due + pzp + hp), principal_balance_after: balance });
  }
  out.schedule = dedupeSchedule(schedule);
  if (out.schedule.length) out.monthly_payment = out.schedule[0].total_due;
  out.fee_setup = out.fee_setup ?? 0;
  return out;
}

function parseOberbank(text) {
  const out = {};
  const m1 = text.match(/úveru\s*č\.\s*(\d+)/i);
  if (m1) out.contract_number = m1[1];
  const m2 = text.match(/Výška\s+úveru:\s*([\d\s.,]+?)\s*€/i);
  if (m2) out.principal = num(m2[1]);
  const m3 = text.match(/Počet\s+splátok:\s*(\d+)/i);
  if (m3) out.term_months = parseInt(m3[1], 10);

  const schedule = [];
  // Oberbank rows: "DD.MM.YYYY no principal € interest € total € total €"
  // → date BEFORE the no; but no is also a token. Use a different layout:
  // "    10.7.2025               1              463,42 €           191,68 €              655,10 €               655,10 €"
  for (const line of text.split('\n')) {
    const dt = findDate(line);
    if (!dt) continue;
    const after = line.slice(dt.idx + dt.str.length).trim();
    // strip € from line for tokenization
    const cleanedAfter = after.replace(/€/g, ' ');
    const tokens = cleanedAfter.split(/\s+/).filter(Boolean);
    if (tokens.length < 5) continue;
    const no = parseInt(tokens[0], 10);
    if (!Number.isFinite(no) || no < 1 || no > 400) continue;
    const principal_due = num(tokens[1]);
    const interest_due = num(tokens[2]);
    const total_due = num(tokens[3]);
    if (principal_due == null || interest_due == null || total_due == null) continue;
    if (Math.abs(principal_due + interest_due - total_due) > Math.max(0.05, total_due * 0.02)) continue;
    schedule.push({ installment_no: no, due_date: dt.date, principal_due, interest_due, fees_due: 0, total_due, principal_balance_after: null });
  }
  out.schedule = dedupeSchedule(schedule);
  if (out.schedule.length) {
    out.monthly_payment = out.schedule[0].total_due;
    let bal = out.principal ?? out.schedule.reduce((a, b) => a + b.principal_due, 0);
    out.principal = out.principal ?? round2(bal);
    for (const r of out.schedule) {
      bal -= r.principal_due;
      r.principal_balance_after = round2(Math.max(0, bal));
    }
    out.start_date = out.start_date ?? subMonths(out.schedule[0].due_date, 1);
  }
  out.fee_setup = 0;
  return out;
}

function parseUniCredit(text) {
  const out = {};
  const m1 = text.match(/Úverová\s+zmluva\s+číslo:\s*(\d+)/i);
  if (m1) out.contract_number = m1[1];

  const schedule = [];
  for (const line of text.split('\n')) {
    const p = parseScheduleLine(line);
    if (!p || p.tokens.length < 3) continue;
    const cols = p.tokens.map(num).filter(v => v != null);
    if (cols.length < 3) continue;
    let principal_due, interest_due, total_due, balance;
    if (cols.length >= 4) {
      [principal_due, interest_due, total_due, balance] = cols;
    } else {
      [principal_due, interest_due, total_due] = cols;
      balance = null;
    }
    if (principal_due == null || interest_due == null || total_due == null) continue;
    if (Math.abs(principal_due + interest_due - total_due) > Math.max(0.05, total_due * 0.02)) continue;
    schedule.push({ installment_no: p.no, due_date: p.due_date, principal_due, interest_due, fees_due: 0, total_due, principal_balance_after: balance });
  }
  out.schedule = dedupeSchedule(schedule);
  if (out.schedule.length) {
    out.monthly_payment = out.schedule[0].total_due;
    out.principal = round2(out.schedule.reduce((a, b) => a + b.principal_due, 0));
    out.start_date = subMonths(out.schedule[0].due_date, 1);
    out.term_months = out.schedule.length;
    if (out.schedule[0].principal_balance_after === null) {
      let bal = out.principal;
      for (const r of out.schedule) {
        bal -= r.principal_due;
        r.principal_balance_after = round2(Math.max(0, bal));
      }
    }
  }
  out.fee_setup = 0;
  return out;
}

function parseCsob(text) {
  const out = {};
  const m1 = text.match(/úvere\s+č\.\s*([A-Z\/\d]+)/i);
  if (m1) out.contract_number = m1[1];

  const schedule = [];
  for (const line of text.split('\n')) {
    // ČSOB rows start with "  1.  date  ..."  — installment has trailing dot
    const dt = findDate(line);
    if (!dt) continue;
    const before = line.slice(0, dt.idx).trim();
    const noMatch = before.match(/(\d{1,3})\.\s*$/);
    if (!noMatch) continue;
    const no = parseInt(noMatch[1], 10);
    if (!Number.isFinite(no) || no < 1 || no > 400) continue;
    const after = line.slice(dt.idx + dt.str.length).trim().replace(/EUR/gi, '');
    const tokens = extractNumberTokens(after);
    if (tokens.length < 5) continue;
    const principal_due = num(tokens[0]);
    const interest_due = num(tokens[1]);
    const total_credit = num(tokens[2]);
    const insurance_due = num(tokens[3]);
    const total_due = num(tokens[4]);
    if (principal_due == null || interest_due == null || total_due == null) continue;
    if (Math.abs(principal_due + interest_due - total_credit) > Math.max(0.05, total_credit * 0.02)) continue;
    schedule.push({ installment_no: no, due_date: dt.date, principal_due, interest_due, fees_due: insurance_due ?? 0, total_due, principal_balance_after: null });
  }
  out.schedule = dedupeSchedule(schedule);
  if (out.schedule.length) {
    out.monthly_payment = out.schedule[0].total_due;
    out.start_date = subMonths(out.schedule[0].due_date, 1);
    out.term_months = out.schedule.length;
    out.principal = round2(out.schedule.reduce((a, b) => a + b.principal_due, 0));
    let bal = out.principal;
    for (const r of out.schedule) {
      bal -= r.principal_due;
      r.principal_balance_after = round2(Math.max(0, bal));
    }
  }
  out.fee_setup = 0;
  return out;
}

function parseVub(text) {
  const out = {};
  const m1 = text.match(/zmluve\s+č\.\s*([A-Z\/\d]+)/i);
  if (m1) out.contract_number = m1[1];
  const m2 = text.match(/Obstarávacia\s+cena\s+([\d\s.,]+?)\s*EUR/i);
  if (m2) out.principal = num(m2[1]);
  const m3 = text.match(/Dátum\s+poskytnutia\s+úveru\s+(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i);
  if (m3) out.start_date = isoDate(m3[1].replace(/\s/g, ''));
  const m4 = text.match(/Doba\s+splácania\s+v\s+mesiacoch\s+(\d+)/i);
  if (m4) out.term_months = parseInt(m4[1], 10);

  const schedule = [];
  for (const line of text.split('\n')) {
    const p = parseScheduleLine(line);
    if (!p || p.tokens.length < 9) continue;
    // VUB cols: nevyfakturovaná_istina(=balance_after), istina, úrok, splátka, kasko, pzp, prav, splátkové, finančnej, celkom
    const balance = num(p.tokens[0]);
    const principal_due = num(p.tokens[1]);
    const interest_due = num(p.tokens[2]);
    const principal_plus_interest = num(p.tokens[3]);
    let fees_total = 0;
    for (let i = 4; i < p.tokens.length - 1; i++) fees_total += num(p.tokens[i]) ?? 0;
    const total_due = num(p.tokens[p.tokens.length - 1]);
    if (principal_due == null || interest_due == null || total_due == null) continue;
    if (Math.abs(principal_due + interest_due - principal_plus_interest) > Math.max(0.05, principal_plus_interest * 0.02)) continue;
    schedule.push({ installment_no: p.no, due_date: p.due_date, principal_due, interest_due, fees_due: round2(fees_total), total_due, principal_balance_after: balance });
  }
  out.schedule = dedupeSchedule(schedule);
  if (out.schedule.length) {
    out.monthly_payment = out.schedule[0].total_due;
    if (!out.term_months) out.term_months = out.schedule.length;
  }
  out.fee_setup = 0;
  return out;
}

function parseMbfs(text) {
  const out = {};
  const m1 = text.match(/zmluve\s+číslo:\s*([A-Z\/\d-]+)/i);
  if (m1) out.contract_number = m1[1];

  const schedule = [];
  for (const line of text.split('\n')) {
    const p = parseScheduleLine(line);
    if (!p || p.tokens.length < 4) continue;
    // MBFS cols: total, principal, interest, [unpaid_interest], balance
    const total_due = num(p.tokens[0]);
    const principal_due = num(p.tokens[1]);
    const interest_due = num(p.tokens[2]);
    const balance = num(p.tokens[p.tokens.length - 1]);
    if (principal_due == null || interest_due == null || total_due == null) continue;
    if (Math.abs(principal_due + interest_due - total_due) > Math.max(0.05, total_due * 0.02)) continue;
    schedule.push({ installment_no: p.no, due_date: p.due_date, principal_due, interest_due, fees_due: 0, total_due, principal_balance_after: balance });
  }
  out.schedule = dedupeSchedule(schedule);
  if (out.schedule.length) {
    out.monthly_payment = out.schedule[0].total_due;
    out.term_months = out.schedule.length;
    out.start_date = subMonths(out.schedule[0].due_date, 1);
    out.principal = round2(out.schedule.reduce((a, b) => a + b.principal_due, 0) + (out.schedule[0].principal_balance_after ?? 0) - out.schedule[0].principal_due);
    if (out.principal <= 0) out.principal = round2(out.schedule.reduce((a, b) => a + b.principal_due, 0));
  }
  out.fee_setup = 0;
  return out;
}

function parseAmortizacna(text) {
  const out = {};
  const m1 = text.match(/Variabilný\s+symbol:\s*(\d+)/i);
  if (m1) out.contract_number = m1[1];
  const m2 = text.match(/Výška\s+úveru:\s*([\d\s.,]+)/);
  if (m2) out.principal = num(m2[1]);

  const schedule = [];
  for (const line of text.split('\n')) {
    const p = parseScheduleLine(line);
    if (!p || p.tokens.length < 3) continue;
    const total_due = num(p.tokens[0]);
    const principal_due = num(p.tokens[1]);
    const interest_due = num(p.tokens[2]);
    if (principal_due == null || interest_due == null || total_due == null) continue;
    if (Math.abs(principal_due + interest_due - total_due) > Math.max(0.05, total_due * 0.02)) continue;
    schedule.push({ installment_no: p.no, due_date: p.due_date, principal_due, interest_due, fees_due: 0, total_due, principal_balance_after: null });
  }
  out.schedule = dedupeSchedule(schedule);
  if (out.schedule.length) {
    out.monthly_payment = out.schedule[0].total_due;
    out.term_months = out.schedule.length;
    out.start_date = subMonths(out.schedule[0].due_date, 1);
    let bal = out.principal ?? round2(out.schedule.reduce((a, b) => a + b.principal_due, 0));
    out.principal = out.principal ?? bal;
    for (const r of out.schedule) {
      bal -= r.principal_due;
      r.principal_balance_after = round2(Math.max(0, bal));
    }
  }
  out.fee_setup = 0;
  return out;
}

function parseHomeCredit(text) {
  const out = {};
  const m1 = text.match(/Č\.\s*([A-Z\d\/]+)/i);
  if (m1) out.contract_number = m1[1];
  const m2 = text.match(/VIN:\s*([A-Z0-9]+)/i);
  if (m2) out.vin = m2[1];

  const schedule = [];
  let downpayment = 0;
  for (const line of text.split('\n')) {
    const dt = findDate(line);
    if (!dt) continue;
    const before = line.slice(0, dt.idx).trim();
    const noMatch = before.match(/(\d{1,3})\s*$/);
    if (!noMatch) continue;
    const no = parseInt(noMatch[1], 10);
    if (!Number.isFinite(no) || no < 0 || no > 400) continue;
    const after = line.slice(dt.idx + dt.str.length).trim().replace(/€/g, ' ');
    const tokens = extractNumberTokens(after);
    if (no === 0) {
      // mimoriadna splátka (akontácia): tokens[0] is total, ignore for amortization
      downpayment = num(tokens[0]) ?? 0;
      continue;
    }
    if (tokens.length < 4) continue;
    const principal_due = num(tokens[0]);
    const interest_due = num(tokens[1]);
    const total_due = num(tokens[3]);
    if (principal_due == null || interest_due == null || total_due == null) continue;
    if (Math.abs(principal_due + interest_due - total_due) > Math.max(0.05, total_due * 0.02)) continue;
    schedule.push({ installment_no: no, due_date: dt.date, principal_due, interest_due, fees_due: 0, total_due, principal_balance_after: null });
  }
  out.schedule = dedupeSchedule(schedule);
  if (out.schedule.length) {
    out.monthly_payment = out.schedule[0].total_due;
    out.term_months = out.schedule.length;
    out.start_date = subMonths(out.schedule[0].due_date, 1);
    out.principal = round2(out.schedule.reduce((a, b) => a + b.principal_due, 0));
    let bal = out.principal;
    for (const r of out.schedule) {
      bal -= r.principal_due;
      r.principal_balance_after = round2(Math.max(0, bal));
    }
  }
  out.fee_setup = downpayment;
  return out;
}

// Approximate annual nominal rate from first installment.
function computeAnnualRate(principal, schedule) {
  if (!principal || principal <= 0 || !schedule.length) return null;
  return round2((schedule[0].interest_due / principal) * 12 * 100);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const PARSERS = {
  porsche: parsePorsche,
  oberbank: parseOberbank,
  unicredit: parseUniCredit,
  csob: parseCsob,
  vub: parseVub,
  mbfs: parseMbfs,
  amortizacna: parseAmortizacna,
  homecredit: parseHomeCredit,
};

const files = fs.readdirSync(TEXT_DIR).filter(f => /^SPL.*KOVÝkalendár.*\.txt$/i.test(f));
const results = {};
const stats = { total: files.length, parsed: 0, empty: 0, unknown: 0, byLender: {} };

for (const f of files) {
  const fullPath = path.join(TEXT_DIR, f);
  const text = fs.readFileSync(fullPath, 'utf8');
  const plate = f.replace(/^SPL.*KOVÝkalendár_/i, '').replace(/\.txt$/, '').replace(/_\d{4}$/, '');
  const start = Date.now();
  process.stdout.write(`Parsing ${plate}... `);

  if (text.trim().length < 100) {
    results[plate] = { license_plate: plate, file: f, error: 'EMPTY (scanned PDF, needs OCR)' };
    stats.empty++;
    console.log(`EMPTY (${Date.now() - start}ms)`);
    continue;
  }

  const detected = detectLender(text);
  if (!detected) {
    results[plate] = { license_plate: plate, file: f, error: 'UNKNOWN format', preview: text.slice(0, 300) };
    stats.unknown++;
    console.log(`UNKNOWN (${Date.now() - start}ms)`);
    continue;
  }

  const parsed = PARSERS[detected.adapter](text);
  parsed.lender = detected.lender;
  parsed.adapter = detected.adapter;
  parsed.license_plate = plate;
  parsed.source_file = f;
  parsed.day_count_convention = '30E/360';
  parsed.annual_rate = computeAnnualRate(parsed.principal, parsed.schedule);

  results[plate] = parsed;
  stats.parsed++;
  stats.byLender[detected.lender] = (stats.byLender[detected.lender] ?? 0) + 1;
  console.log(`${detected.adapter} ${parsed.contract_number ?? '?'} – ${parsed.principal ?? '?'}€ × ${parsed.term_months ?? '?'}m, ${parsed.schedule.length} rows (${Date.now() - start}ms)`);
}

fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
console.log('\n--- LOAN PARSER SUMMARY ---');
console.log(JSON.stringify(stats, null, 2));
console.log(`Wrote ${Object.keys(results).length} entries to ${OUT_FILE}`);
