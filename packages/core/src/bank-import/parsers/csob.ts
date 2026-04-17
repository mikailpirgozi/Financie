import type { BankParser, NormalizedTransaction } from '../types';
import { parseCsvLine, parseSkAmount, parseSkDate, splitCsvLines } from '../csv';

/**
 * ČSOB SK — CSV export "Pohyby na účte". Separator `,`, hlavička v EN
 * v novom IB ("Date,Amount,Currency,Description,Counterparty,Reference").
 * Stará verzia (SK) používa `;` a iné stĺpce — tento parser detekuje
 * separator dynamicky podľa prvého riadka.
 */
export const csobParser: BankParser = {
  bank: 'csob',
  parse(csv) {
    const lines = splitCsvLines(csv);
    if (lines.length === 0) return [];

    const sepCandidate = lines[0].includes(';') ? ';' : ',';
    const header = parseCsvLine(lines[0], sepCandidate).map((s) => s.toLowerCase());
    const idx = (needle: string) => header.findIndex((h) => h.includes(needle));

    const dateIdx = idx('date') >= 0 ? idx('date') : idx('dátum');
    const amountIdx = idx('amount') >= 0 ? idx('amount') : idx('suma');
    const currencyIdx = idx('currency') >= 0 ? idx('currency') : idx('mena');
    const counterpartyIdx = idx('counterparty') >= 0 ? idx('counterparty') : idx('protistrana');
    const descriptionIdx = idx('description') >= 0 ? idx('description') : idx('popis');
    const refIdx = idx('reference') >= 0 ? idx('reference') : idx('referencia');

    if (dateIdx < 0 || amountIdx < 0) {
      throw new Error('ČSOB CSV: missing required columns');
    }

    const out: NormalizedTransaction[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i], sepCandidate);
      if (cells.length < amountIdx + 1) continue;
      try {
        out.push({
          date: parseSkDate(cells[dateIdx]),
          amount: parseSkAmount(cells[amountIdx]),
          currency: currencyIdx >= 0 ? cells[currencyIdx] || 'EUR' : 'EUR',
          counterparty: counterpartyIdx >= 0 ? cells[counterpartyIdx] || undefined : undefined,
          description: descriptionIdx >= 0 ? cells[descriptionIdx] || undefined : undefined,
          externalRef: refIdx >= 0 ? cells[refIdx] || undefined : undefined,
        });
      } catch {
        // skip
      }
    }
    return out;
  },
};
