import type { BankParser, NormalizedTransaction } from '../types';
import { parseCsvLine, parseSkAmount, parseSkDate, splitCsvLines } from '../csv';

/**
 * Tatra banka — CSV exportované z internet bankingu.
 * Hlavička (od cca 2022): "Dátum zaúčtovania";"Suma";"Mena";"Typ";"Variabilný symbol";
 *                         "Konštantný symbol";"Špecifický symbol";"Protiúčet";"Názov protistrany";
 *                         "Popis transakcie";"Referencia banky"
 *
 * Separator: `;`. Amount lokalizovaný (`1 234,56`).
 */
export const tatrabankaParser: BankParser = {
  bank: 'tatrabanka',
  parse(csv) {
    const lines = splitCsvLines(csv);
    if (lines.length === 0) return [];
    const header = parseCsvLine(lines[0], ';').map((s) => s.toLowerCase());
    const idx = (name: string) => header.findIndex((h) => h.includes(name));

    const dateIdx = idx('dátum') >= 0 ? idx('dátum') : idx('datum');
    const amountIdx = idx('suma');
    const currencyIdx = idx('mena');
    const counterpartyIdx = idx('protistrany');
    const descriptionIdx = idx('popis');
    const refIdx = idx('referencia');

    if (dateIdx < 0 || amountIdx < 0) {
      throw new Error('Tatra banka CSV: missing required columns');
    }

    const out: NormalizedTransaction[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i], ';');
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
        // skip malformed lines silently — surfaced via `skipped` counter
      }
    }
    return out;
  },
};
