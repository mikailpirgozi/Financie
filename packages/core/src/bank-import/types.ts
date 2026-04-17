/**
 * Generic bank-statement import pipeline.
 *
 * Each Slovak bank exports CSV in a slightly different shape (headers,
 * separators, locale-formatted amounts). We normalise everything into
 * `NormalizedTransaction` and then the application decides whether to
 * insert it as `expense` or `income` based on the sign of the amount.
 */

export type SupportedBank = 'tatrabanka' | 'vub' | 'csob';

export interface NormalizedTransaction {
  /** ISO `YYYY-MM-DD` date of posting. */
  date: string;
  /** Negative = expense, positive = income. Always EUR for SK exports. */
  amount: number;
  currency: string;
  /** Counterparty name / merchant (raw, no categorisation yet). */
  counterparty?: string;
  /** Free-text variable symbol / description / payment note. */
  description?: string;
  /** Bank-supplied reference id, used as dedup key when present. */
  externalRef?: string;
}

export interface BankParser {
  bank: SupportedBank;
  /** Parse raw CSV (UTF-8 or windows-1250 already decoded). */
  parse(csv: string): NormalizedTransaction[];
}

export interface ParseResult {
  bank: SupportedBank;
  transactions: NormalizedTransaction[];
  /** Lines we skipped (header, blank, malformed) for diagnostics. */
  skipped: number;
}
