/**
 * Shared utilities for exporting loan schedules and amortization tables to CSV.
 * Locale-aware (sk-SK comma decimals, ; as column separator) so that
 * Slovak users can open the CSV directly in Excel / Numbers.
 */

export interface LoanScheduleExportEntry {
  installment_no: number;
  due_date: string;
  principal_due: string | number;
  interest_due: string | number;
  fees_due?: string | number;
  total_due: string | number;
  principal_balance_after?: string | number;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string | null;
}

export interface BuildScheduleCsvOptions {
  /** Column separator (default ';' for sk-SK Excel compatibility). */
  separator?: ';' | ',' | '\t';
  /** Decimal separator (default ',' for sk-SK). */
  decimalSeparator?: ',' | '.';
  /** Include header row (default true). */
  includeHeader?: boolean;
  /** BOM prefix so Excel detects UTF-8 (default true). */
  prefixBom?: boolean;
}

const DEFAULT_OPTIONS: Required<BuildScheduleCsvOptions> = {
  separator: ';',
  decimalSeparator: ',',
  includeHeader: true,
  prefixBom: true,
};

function toNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(amount: number, decimalSeparator: ',' | '.'): string {
  const fixed = amount.toFixed(2);
  return decimalSeparator === ',' ? fixed.replace('.', ',') : fixed;
}

function escapeCsvField(value: string, separator: string): string {
  const needsQuotes =
    value.includes(separator) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');
  if (!needsQuotes) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function statusLabel(status: LoanScheduleExportEntry['status']): string {
  switch (status) {
    case 'paid':
      return 'Uhradená';
    case 'overdue':
      return 'Po splatnosti';
    default:
      return 'Neuhradená';
  }
}

/**
 * Build CSV string from a loan schedule.
 * Header uses Slovak labels so users can open directly in Excel.
 */
export function buildLoanScheduleCsv(
  schedule: LoanScheduleExportEntry[],
  options?: BuildScheduleCsvOptions
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { separator, decimalSeparator, includeHeader, prefixBom } = opts;

  const lines: string[] = [];

  if (includeHeader) {
    const headers = [
      'Č. splátky',
      'Dátum splatnosti',
      'Istina',
      'Úrok',
      'Poplatky',
      'Spolu',
      'Zostatok istiny',
      'Stav',
      'Dátum úhrady',
    ];
    lines.push(headers.map((h) => escapeCsvField(h, separator)).join(separator));
  }

  for (const entry of schedule) {
    const row = [
      String(entry.installment_no),
      entry.due_date,
      formatAmount(toNumber(entry.principal_due), decimalSeparator),
      formatAmount(toNumber(entry.interest_due), decimalSeparator),
      formatAmount(toNumber(entry.fees_due ?? 0), decimalSeparator),
      formatAmount(toNumber(entry.total_due), decimalSeparator),
      formatAmount(toNumber(entry.principal_balance_after ?? 0), decimalSeparator),
      statusLabel(entry.status),
      entry.paid_at ? (entry.paid_at.split('T')[0] ?? '') : '',
    ];
    lines.push(row.map((v) => escapeCsvField(v, separator)).join(separator));
  }

  const csv = lines.join('\r\n');
  return prefixBom ? `\uFEFF${csv}` : csv;
}

/**
 * Suggest a filename for a schedule export based on the loan name and current date.
 */
export function buildLoanScheduleFilename(loanName: string | null | undefined): string {
  const safeName = (loanName ?? 'uver')
    .toLowerCase()
    .replace(/[áäâà]/g, 'a')
    .replace(/[éëêè]/g, 'e')
    .replace(/[íïîì]/g, 'i')
    .replace(/[óöôò]/g, 'o')
    .replace(/[úüûù]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/[čč]/g, 'c')
    .replace(/[ďď]/g, 'd')
    .replace(/[ľĺ]/g, 'l')
    .replace(/[ňń]/g, 'n')
    .replace(/[ŕř]/g, 'r')
    .replace(/[šś]/g, 's')
    .replace(/[ťţ]/g, 't')
    .replace(/[žź]/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const today = new Date().toISOString().split('T')[0];
  return `splatkovy-kalendar-${safeName || 'uver'}-${today}.csv`;
}
