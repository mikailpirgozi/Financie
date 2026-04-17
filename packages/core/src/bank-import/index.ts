export * from './types';
export { tatrabankaParser } from './parsers/tatrabanka';
export { vubParser } from './parsers/vub';
export { csobParser } from './parsers/csob';

import type { BankParser, NormalizedTransaction, ParseResult, SupportedBank } from './types';
import { tatrabankaParser } from './parsers/tatrabanka';
import { vubParser } from './parsers/vub';
import { csobParser } from './parsers/csob';

const PARSERS: Record<SupportedBank, BankParser> = {
  tatrabanka: tatrabankaParser,
  vub: vubParser,
  csob: csobParser,
};

export function parseBankCsv(bank: SupportedBank, csv: string): ParseResult {
  const parser = PARSERS[bank];
  if (!parser) {
    throw new Error(`Unsupported bank: ${bank}`);
  }
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0).length;
  const txs = parser.parse(csv);
  // -1 for header row.
  const skipped = Math.max(0, lines - 1 - txs.length);
  return { bank, transactions: txs, skipped };
}

/**
 * Best-effort dedup against an existing list. If `externalRef` is present,
 * use it as primary key. Otherwise fall back to `(date, amount, counterparty)`.
 */
export function dedupTransactions(
  incoming: NormalizedTransaction[],
  existing: Pick<NormalizedTransaction, 'date' | 'amount' | 'counterparty' | 'externalRef'>[]
): NormalizedTransaction[] {
  const seenRefs = new Set<string>();
  const seenComposites = new Set<string>();
  for (const e of existing) {
    if (e.externalRef) seenRefs.add(e.externalRef);
    seenComposites.add(`${e.date}|${e.amount}|${e.counterparty ?? ''}`);
  }
  return incoming.filter((tx) => {
    if (tx.externalRef && seenRefs.has(tx.externalRef)) return false;
    const key = `${tx.date}|${tx.amount}|${tx.counterparty ?? ''}`;
    if (seenComposites.has(key)) return false;
    seenComposites.add(key);
    return true;
  });
}
