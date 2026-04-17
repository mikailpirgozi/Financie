#!/usr/bin/env node
// Parser for poistka text files. Extracts insurer name + annual price.

import fs from 'node:fs';
import path from 'node:path';

const TEXT_DIR = '/tmp/finapp-import/text';
const OUT_FILE = '/tmp/finapp-import/parsed-insurances.json';

function detectInsurer(text) {
  const T = text;
  if (/Allianz\s*[-–]\s*Slovenská poisťovňa/i.test(T)) return 'Allianz - Slovenská poisťovňa, a.s.';
  if (/KOMUNÁLNA poisťovňa/i.test(T)) return 'KOMUNÁLNA poisťovňa, a.s. (Vienna Insurance Group)';
  if (/Kooperativa poisťovňa/i.test(T)) return 'Kooperativa poisťovňa, a.s. (Vienna Insurance Group)';
  if (/Generali Poisťovňa/i.test(T) || /Generali Pojišťovna/i.test(T)) return 'Generali Poisťovňa';
  if (/UNIQA poisťovňa/i.test(T)) return 'UNIQA poisťovňa, a.s.';
  if (/Wüstenrot poisťovňa/i.test(T)) return 'Wüstenrot poisťovňa, a.s.';
  if (/UNION poisťovňa/i.test(T)) return 'UNION poisťovňa, a.s.';
  if (/ČSOB Poisťovňa/i.test(T) || /CSOB Poistovna/i.test(T)) return 'ČSOB Poisťovňa, a.s.';
  if (/Groupama/i.test(T)) return 'Groupama poisťovňa, a.s.';
  if (/AXA pojišťovna/i.test(T) || /AXA poisťovňa/i.test(T)) return 'AXA poisťovňa';
  return null;
}

function detectType(filename) {
  if (/POISTKAkomplet/i.test(filename)) return 'pzp_kasko';
  if (/POISTKApzp/i.test(filename)) return 'pzp';
  if (/POISTKAhp/i.test(filename)) return 'kasko';
  return null;
}

function findPrice(text) {
  const candidates = [];
  const patterns = [
    /Ročné\s+poistné[^:]*:?\s*([\d\s.,]+)\s*(?:EUR|€)/gi,
    /Poistné\s+spolu[^:]*:?\s*([\d\s.,]+)\s*(?:EUR|€)/gi,
    /Poistné\s+celkom[^:]*:?\s*([\d\s.,]+)\s*(?:EUR|€)/gi,
    /Celkové\s+ročné\s+poistné[^:]*:?\s*([\d\s.,]+)\s*(?:EUR|€)/gi,
    /Celková\s+výška\s+poistného[^:]*:?\s*([\d\s.,]+)\s*(?:EUR|€)/gi,
    /Splátka\s+poistného[^:\n]*:?\s*([\d\s.,]+)\s*(?:EUR|€)/gi,
    /Bežné\s+poistné[^:]*:?\s*([\d\s.,]+)\s*(?:EUR|€)/gi,
  ];
  for (const re of patterns) {
    const matches = text.matchAll(re);
    for (const m of matches) {
      const n = num(m[1]);
      if (n != null && n > 50 && n < 50000) candidates.push({ n, label: m[0].slice(0, 60) });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.n - a.n);
  return candidates[0];
}

function num(s) {
  if (s == null) return null;
  let cleaned = String(s).trim().replace(/\u00A0/g, ' ');
  cleaned = cleaned.replace(/(\d)\s+(\d{3}\b)/g, '$1$2');
  cleaned = cleaned.replace(/(\d)\.(\d{3}\b)/g, '$1$2');
  cleaned = cleaned.replace(',', '.');
  cleaned = cleaned.replace(/[€\sEUR]/gi, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function findValidity(text) {
  const from = text.match(/Začiatok\s+poistenia\s*(?:od)?[^:\d\n]*[:.]?\s*(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i);
  const to = text.match(/Koniec\s+poistenia[^:\d\n]*[:.]?\s*(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i);
  return {
    valid_from: from ? isoDate(from[1].replace(/\s/g, '')) : null,
    valid_to: to ? isoDate(to[1].replace(/\s/g, '')) : null,
  };
}

function isoDate(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const files = fs.readdirSync(TEXT_DIR).filter(f => /^POISTKA/i.test(f));
const results = {};
const stats = { total: files.length, parsed: 0, noInsurer: 0, noPrice: 0 };

for (const f of files) {
  const text = fs.readFileSync(path.join(TEXT_DIR, f), 'utf8');

  const fnMatch = f.match(/^POISTKA(komplet|pzp|hp)_([^_]+)_(\d+)\./i);
  let plate, policy_number;
  if (fnMatch) {
    plate = fnMatch[2];
    policy_number = fnMatch[3];
  } else {
    const m2 = f.match(/^POISTKA(komplet|pzp|hp)_([^_.]+)\./i);
    plate = m2 ? m2[2] : null;
    policy_number = null;
  }

  const insurer = detectInsurer(text);
  const priceObj = findPrice(text);
  const validity = findValidity(text);
  const type = detectType(f);

  if (!insurer) stats.noInsurer++;
  if (!priceObj) stats.noPrice++;
  stats.parsed++;

  const key = `${plate}_${policy_number ?? 'unknown'}`;
  results[key] = {
    license_plate: plate,
    policy_number,
    type,
    insurer,
    price: priceObj?.n ?? null,
    price_label: priceObj?.label,
    valid_from: validity.valid_from,
    valid_to: validity.valid_to,
    source_file: f,
  };

  console.log(
    `${plate} ${type} #${policy_number ?? '-'}: ${insurer ?? 'UNKNOWN'} – ${priceObj?.n ?? '?'} € ${validity.valid_from ?? ''}→${validity.valid_to ?? ''}`,
  );
}

fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
console.log('\n--- INSURANCE PARSER SUMMARY ---');
console.log(JSON.stringify(stats, null, 2));
console.log(`Wrote ${Object.keys(results).length} entries to ${OUT_FILE}`);
