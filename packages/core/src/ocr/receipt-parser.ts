/**
 * Heuristický parser slovenských pokladničných bločkov.
 *
 * Vstup: surový OCR text (po riadkoch). Výstup: kandidáti pre `merchant`,
 * `date`, `total`, `vatAmount`, `currency`. Nikdy nehádže — vracia
 * `confidence` 0..1 a klient sa rozhodne či ich predvyplní do formulára.
 *
 * Cieľ: pokryť 80 % bežných bločkov (Tesco, Lidl, Kaufland, Billa,
 * malé prevádzky), nie byť dokonalý.
 */

export interface ReceiptParseResult {
  merchant?: string;
  date?: string;
  total?: number;
  vatAmount?: number;
  currency: string;
  confidence: number;
  rawLines: string[];
}

const TOTAL_KEYWORDS = [
  'spolu',
  'celkom',
  'k úhrade',
  'k uhrade',
  'suma celkom',
  'total',
  'sumár',
  'sumar',
];

const VAT_KEYWORDS = ['dph', 'vat'];

const DATE_REGEXES: RegExp[] = [
  /\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\b/,
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
];

const AMOUNT_REGEX = /(-?\d{1,3}(?:[.\s]\d{3})*[.,]\d{2}|-?\d+[.,]\d{2})/g;

export function parseReceipt(text: string): ReceiptParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const merchant = guessMerchant(lines);
  const date = guessDate(lines);
  const total = guessTotal(lines);
  const vatAmount = guessVat(lines);

  let confidence = 0;
  if (merchant) confidence += 0.25;
  if (date) confidence += 0.25;
  if (total !== undefined) confidence += 0.4;
  if (vatAmount !== undefined) confidence += 0.1;

  return {
    merchant,
    date,
    total,
    vatAmount,
    currency: 'EUR',
    confidence: Math.min(1, confidence),
    rawLines: lines,
  };
}

function guessMerchant(lines: string[]): string | undefined {
  // First non-empty line that doesn't look like an address/IČO is usually
  // the merchant name.
  for (const line of lines.slice(0, 5)) {
    if (/^(ičo|dič|ic\sdph|tel\.|adresa|ulica|fakturačná)/i.test(line)) continue;
    if (/^\d/.test(line)) continue;
    if (line.length < 2 || line.length > 40) continue;
    return capitalise(line);
  }
  return undefined;
}

function guessDate(lines: string[]): string | undefined {
  for (const line of lines) {
    for (const re of DATE_REGEXES) {
      const m = line.match(re);
      if (!m) continue;
      // Capture groups [1..3] are guaranteed to be present when the regex
      // matches; TS with noUncheckedIndexedAccess types them as optional.
      const a = m[1]!;
      const b = m[2]!;
      const c = m[3]!;
      if (a.length === 4) {
        // ISO yyyy-mm-dd
        return `${a}-${b}-${c}`;
      }
      const day = a.padStart(2, '0');
      const month = b.padStart(2, '0');
      return `${c}-${month}-${day}`;
    }
  }
  return undefined;
}

function parseLocaleAmount(raw: string): number | undefined {
  const stripped = raw.replace(/\s/g, '');
  let cleaned: string;
  if (stripped.includes(',')) {
    cleaned = stripped.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = stripped;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function extractAmounts(line: string): number[] {
  // Remove date patterns first so we don't accidentally treat `15.04.2026`
  // as the amount `15.04`.
  const stripped = line
    .replace(/\b\d{1,2}\.\s*\d{1,2}\.\s*\d{4}\b/g, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');
  const matches = stripped.match(AMOUNT_REGEX);
  if (!matches) return [];
  return matches.map((m) => parseLocaleAmount(m)).filter((n): n is number => n !== undefined);
}

function guessTotal(lines: string[]): number | undefined {
  // Find the line containing a TOTAL_KEYWORD and take the largest amount
  // on that or the next line. If nothing matches, fall back to the
  // largest amount across the whole receipt.
  const lc = lines.map((l) => l.toLowerCase());
  for (let i = 0; i < lc.length; i += 1) {
    const lcLine = lc[i]!;
    if (TOTAL_KEYWORDS.some((kw) => lcLine.includes(kw))) {
      const currentLine = lines[i]!;
      const nextLine = i + 1 < lines.length ? lines[i + 1]! : undefined;
      const fromCurrent = extractAmounts(currentLine);
      const fromNext = nextLine !== undefined ? extractAmounts(nextLine) : [];
      const candidates = [...fromCurrent, ...fromNext].filter((n) => n > 0);
      if (candidates.length > 0) return Math.max(...candidates);
    }
  }
  const all = lines.flatMap(extractAmounts).filter((n) => n > 0);
  if (all.length === 0) return undefined;
  return Math.max(...all);
}

function guessVat(lines: string[]): number | undefined {
  const lc = lines.map((l) => l.toLowerCase());
  for (let i = 0; i < lc.length; i += 1) {
    const lcLine = lc[i]!;
    if (VAT_KEYWORDS.some((kw) => lcLine.includes(kw))) {
      const amounts = extractAmounts(lines[i]!);
      if (amounts.length > 0) return amounts[amounts.length - 1];
    }
  }
  return undefined;
}

function capitalise(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ');
}
