/**
 * Minimal RFC-4180-ish CSV parser. SK bank exports use either `;` or `,`
 * as separator and quoted fields containing commas. We avoid pulling in a
 * heavy dependency (papaparse) since the call site is small and well-known.
 */

export function splitCsvLines(input: string): string[] {
  return input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0);
}

export function parseCsvLine(line: string, separator: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === separator) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Parse SK-locale formatted amount like `-1 234,56` or `"1.234,56"` into
 * a Number. Negative sign and thousand separators are tolerated.
 */
export function parseSkAmount(raw: string): number {
  const stripped = raw.replace(/\u00a0/g, '').replace(/\s/g, '');
  let cleaned: string;
  if (stripped.includes(',')) {
    // SK locale: thousands `.` and decimal `,` (e.g. `1.234,56`).
    cleaned = stripped.replace(/\./g, '').replace(',', '.');
  } else {
    // US/EN locale: keep `.` as decimal.
    cleaned = stripped;
  }
  cleaned = cleaned.replace(/[^\d.\-+]/g, '');
  const n = Number(cleaned);
  if (Number.isNaN(n)) {
    throw new Error(`Cannot parse amount: ${raw}`);
  }
  return n;
}

/**
 * Parse SK date in formats `dd.mm.yyyy`, `d.m.yyyy`, or ISO `yyyy-mm-dd`.
 */
export function parseSkDate(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) throw new Error(`Cannot parse date: ${raw}`);
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
