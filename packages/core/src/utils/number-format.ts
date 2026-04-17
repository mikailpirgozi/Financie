/**
 * Locale-aware number parsing and formatting utilities.
 *
 * Handles both `.` and `,` as decimal separators (sk-SK users often type comma),
 * strips thousand separators (space, `\u00A0`, `'`, and also `.` for locales where
 * dot is the thousand separator). The formatter uses Intl under the hood.
 */

export interface NumberFormatOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

const DEFAULT_LOCALE = 'sk-SK';

/**
 * Parse a user-typed numeric string into a finite number or null.
 *
 * Rules:
 *  - Empty / whitespace only  → null
 *  - Non-numeric after clean  → null
 *  - Treats both `,` and `.` as decimal separators. If both are present, the LAST
 *    occurrence is treated as decimal and the others as thousand grouping.
 *  - Strips spaces, non-breaking spaces and apostrophes (common thousand separators).
 *  - Supports leading `-` for negatives.
 */
export function parseLocaleNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;

  const raw = String(input).trim();
  if (raw === '') return null;

  // Strip whitespace and apostrophes used as thousand separators
  let cleaned = raw.replace(/[\s\u00A0']/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === ',' || cleaned === '.') return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Whichever comes last is the decimal separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Comma is decimal, dots are thousand grouping
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal, commas are thousand grouping
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma present — treat as decimal separator
    // If multiple commas (e.g. "1,000,50") take last as decimal
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      const decimal = parts.pop();
      cleaned = `${parts.join('')}.${decimal}`;
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  } else if (hasDot) {
    // Only dots present. If there are multiple (e.g. "1.000.50") treat last as decimal.
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      const decimal = parts.pop();
      cleaned = `${parts.join('')}.${decimal}`;
    }
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Format a number using Intl.NumberFormat with sensible defaults (sk-SK grouping).
 */
export function formatLocaleNumber(
  value: number | null | undefined,
  options: NumberFormatOptions = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const {
    locale = DEFAULT_LOCALE,
    minimumFractionDigits,
    maximumFractionDigits = 2,
    useGrouping = true,
  } = options;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping,
  }).format(value);
}

/**
 * Get the decimal separator used by a locale (e.g. "," for sk-SK, "." for en-US).
 */
export function getDecimalSeparator(locale: string = DEFAULT_LOCALE): string {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.1);
    return parts.find((p) => p.type === 'decimal')?.value ?? '.';
  } catch {
    return '.';
  }
}

/**
 * Get the group (thousand) separator used by a locale.
 */
export function getGroupSeparator(locale: string = DEFAULT_LOCALE): string {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1000);
    return parts.find((p) => p.type === 'group')?.value ?? ' ';
  } catch {
    return ' ';
  }
}

/**
 * Sanitize input while the user is typing. Keeps digits, at most one decimal
 * separator (`,` or `.`), optional leading `-`. Thousand separators (spaces, NBSP,
 * apostrophes) are stripped. Useful for onChangeText before formatting.
 */
export function sanitizeNumericInput(
  input: string,
  options: { allowNegative?: boolean; allowDecimal?: boolean } = {}
): string {
  const { allowNegative = false, allowDecimal = true } = options;
  if (!input) return '';

  // Normalize: strip thousand separators
  let cleaned = input.replace(/[\s\u00A0']/g, '');

  // Handle sign
  let sign = '';
  if (cleaned.startsWith('-')) {
    if (allowNegative) sign = '-';
    cleaned = cleaned.slice(1);
  }

  // Remove everything that's not a digit or a decimal mark
  cleaned = cleaned.replace(/[^0-9.,]/g, '');

  if (!allowDecimal) {
    cleaned = cleaned.replace(/[.,]/g, '');
    return sign + cleaned;
  }

  // Keep only the first decimal separator, convert rest to nothing
  // We allow both `.` and `,` — keep the FIRST one, whichever it is
  const firstSepIdx = cleaned.search(/[.,]/);
  if (firstSepIdx >= 0) {
    const sep = cleaned[firstSepIdx];
    const head = cleaned.slice(0, firstSepIdx);
    const tail = cleaned.slice(firstSepIdx + 1).replace(/[.,]/g, '');
    cleaned = `${head}${sep}${tail}`;
  }

  return sign + cleaned;
}

/**
 * Clamp a number between min/max, returning null if input is null/NaN.
 */
export function clampNumber(value: number | null, min?: number, max?: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  let result = value;
  if (typeof min === 'number' && result < min) result = min;
  if (typeof max === 'number' && result > max) result = max;
  return result;
}
